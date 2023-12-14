import express from "express";
import http from "http";
import { Server } from "socket.io";
import hbs from "hbs";


import {
  getMembers,
  getRooms,
  getRoomAndQuantity,
  getLogOfRoom,
  insertLog,
  getRoomWithName,
  insertMember,
  insertRoom,
  insertMemberToRoom,
  getMembersOfRoom,
  lockRoom,
  unlockRoom,
  lockMember,
  unlockMember,
  getMemberWithName,
  LogOutRoom,
} from "./methodDB.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
hbs.registerPartials("./views/partials");
app.set("view engine", "hbs");
app.use(express.static("public"));

const adminPassword = "123";
let storage = { members: [], rooms: [] };
// member: {username, enable, socketID}
// rooms: {name, members: []}
generateData();

async function generateData(callback) {
  try {
    getMembers().then((members) => {
      members.forEach((member) => {
        if (member.username === "ADMIN") return;
        storage.members.push({ ...member, socketID: null });
      });
    });
    storage.rooms.length = 0;
    // Fetch rooms and members of each room
    const rooms = await getRooms();
    for (const room of rooms) {
      const result = await getMembersOfRoom(room.name);
      storage.rooms.push({
        name: room.name,
        members: result.map((record) => record.username_member),
        isLock: room.isLock,
      });
    }
    if (callback !== null && typeof callback === 'function') {
      console.log("Callback");
      storage.rooms.forEach((room) => {
        console.log(room.isLock);
      });
      await callback(storage.rooms);
    }
  } catch (error) {
    console.log(error);
  }
}

function sendListRoom(typeSend) {
  getRooms()
    .then((rooms) => {
      let roomsDto = {};
      rooms.forEach((room) => {
        let isPassword = !room.password ? false : true;
        roomsDto[room.name] = {
          isPassword,
        };
      });
      typeSend.emit("sendListRoom", roomsDto);
    })
    .catch((error) => {
      console.log(error.message);
    });
}

io.on("connection", (socket) => {
  console.log("Client vừa kết nối: " + socket.id);
  socket.on("sendUsername", (data, callback) => {
    let { username } = data;
    // Check tai khoan co bi khoa hay khong
    getMemberWithName(username)
    .then((recordset) => {
      let member = recordset[0];
      if(member){
        if(member.enable === false){
          callback(true);
          throw new Error("Tài khoản của bạn đã bị khóa!")
        }
      }
      callback(false);
      insertMember(username).catch((error) => {});
      sendListRoom(socket);
  
      let obj = storage.members.find((user) => user.username == username);
      if (!obj) {
        storage.members.push({ username, enable: true, socketID: socket.id });
      } else if (obj.socketID) {
        let prevID = obj.socketID;
        obj.socketID = socket.id;
        io.sockets.sockets.get(prevID).disconnect();
      } else {
        obj.socketID = socket.id;
      }
      io.of("/admin").emit("client-login", username, storage.members);
    })
      .catch((error) => {
        socket.emit("notify", error.message);
      });
  });

  socket.on("joinChatRoom", (data) => {
    let { nameRoom, passwordRoom, username } = data;
    getRoomWithName(nameRoom)
      .then((recordset) => {
        let room = recordset[0];
        if(room.isLock === true){
          throw new Error("Room chat đã bị khóa!")
        }
        if (room.password != passwordRoom) {
          throw new Error("Sai mật khẩu chat room!");
        }
        return insertMemberToRoom(username, nameRoom);
      })
      .then(() => {
        return getMembersOfRoom(nameRoom);
      })
      .then((recordsetGetMemberOfRoom) => {
        getLogOfRoom(nameRoom).then((recordsetGetLogOfRoom) => {
          let members = recordsetGetMemberOfRoom.map(
            (member) => member.username_member
          );
          socket.join(nameRoom);
          let logs = recordsetGetLogOfRoom.map((log) => {
            return {
              usernameSend: log.username_member,
              activity: log.activity,
              time: log.time,
              message: log.data,
            };
          });
          socket.emit("joinedChatRoom", {
            nameRoom,
            password: passwordRoom,
            members,
            logs,
          });
          socket.to(nameRoom).emit("newMemberJoined", {
            members,
            sizeMembers: recordsetGetMemberOfRoom.length,
          });

          const obj = storage.rooms.find((room) => room.name === nameRoom);
          if (!obj.members.includes(username)) {
            obj.members.push(username);
            io.of("/admin").emit("update rooms", storage.rooms);
          }
        });
      })
      .catch((error) => {
        socket.emit("notify", error.message);
      });
  });

  socket.on("sendMessage", (data) => {
        let { nameRoom, username, message } = data;
    let time = formaTime(new Date());
    insertLog(username, nameRoom, "SEND_MESSAGE", time, message)
      .then(() => {
        io.to(nameRoom).emit("receiveMessage", {
          usernameSend: username,
          message,
          time,
        });
      })
      .catch((error) => {
        console.log(error.message);
      });
  });

  socket.on("newChatRoom", (data) => {
    let { nameRoom, passwordRoom, username } = data;
    let isPassword = !passwordRoom ? false : true;
    let password = isPassword ? passwordRoom : null;

    insertRoom(nameRoom, password, username)
      .then(() => {
        socket.join(nameRoom);
        socket.emit("joinedChatRoom", {
          nameRoom,
          password: password,
          members: [username],
        });
        sendListRoom(io);

        storage.rooms.push({ name: nameRoom, members: [username] });
        io.of("/admin").emit("update rooms", storage.rooms);
      })
      .catch((error) => {
        console.log(error.message);
      });
  });

  socket.on("disconnect", function (username) {
    console.log(`Client ${socket.id} just disconnect`);
    let obj = storage.members.find((user) => user.socketID == socket.id);
    if (obj) {
      obj.socketID = null;
      io.of("/admin").emit("client-logout", storage.members);
    }
    console.log(obj);
  });

  socket.on("logout Room", (data) => {
    let { curentChatRoom, username } = data;
    console.log("Logout member " +  username + " from " + curentChatRoom);
    let time = formaTime(new Date());
    LogOutRoom(curentChatRoom, username)
      .then(() => {
        sendListRoom(io);
        socket.emit("logoutedRoom", {nameRoom: curentChatRoom});

        // Insert log for sending out
        insertLog(username, curentChatRoom, "SEND_OUT", time, "OUT");
      })
      .then(() => {
        io.to(curentChatRoom).emit("receiveMessage", {
          usernameSend: username,
          activity: "SEND_OUT",
          time,
        });
      })
      .then(() => {
        getMembersOfRoom(curentChatRoom)
          .then((memberRecords) => {
            let members = memberRecords.map(
              (member) => member.username_member
            );
            socket.to(curentChatRoom).emit("newMemberJoined", {
              members,
              sizeMembers: memberRecords.length,
            });
            const obj = storage.rooms.find((room) => room.name === curentChatRoom);
            obj.members = members;
            io.of("/admin").emit("update rooms", storage.rooms);
          })
          .catch((error) => {
            // Xử lý lỗi nếu có
            console.error(error);
          });
      })
      .catch((error) => {
        console.log(error.message);
        // Handle error, e.g., notify client about the error
        socket.emit("error", { message: error.message });
      });
  });
  

});

// -------ADMIN HANDLE REQUEST FROM CLIENT ------//
const adminIO = io.of("/admin");
adminIO.on("connection", (socket) => {
  console.log("Admin vừa kết nối: " + socket.id);
  socket.on("check login", (password, callback) => {
    if (password === adminPassword) {
      callback(null, {
        message: "Welcome to Master Chat",
        data: storage,
      });
    } else {
      callback("Incorrect Password", null);
    }
  });

  socket.on("new room", (newRoom, callback) => {
    if (storage.rooms.findIndex((room) => room.name == newRoom.name) != -1) {
      callback("Room existed", null);
    } else {
      storage.rooms.push({ ...newRoom });
      newRoom.members.forEach((member) => {
        let user = storage.members.find((user) => user.username === member);
        if (user.socket_id) {
          io.sockets.sockets.get(user.socket_id).join(newRoom.name);
        }
      });

      callback(null, {
        rooms: storage.rooms,
        message: `Room ${newRoom.name} was created`,
      });
    }
  });

  socket.on("send notify", ({ message, rooms }, callback) => {
    rooms.forEach((roomName) => {
      let time = formaTime(new Date());
      insertLog("ADMIN", roomName, "NOTIFY", time, message)
        .then(() => {
          io.to(roomName).emit("receiveMessage", {
            usernameSend: "ADMIN",
            message,
            time,
          });
          callback(null, "Send notify successfully");
        })
        .catch((error) => {
          console.log(error.message);
        });
    });
  });

  socket.on("lock room", ({ roomName }, callback) => {
    console.log("Lock room " + roomName);
    lockRoom(roomName)
      .then(() =>{
        const roomToChange = storage.rooms.find((room) => room.name === roomName);
        // Kiểm tra xem phòng có tồn tại không
        if (roomToChange) {
          // Thực hiện các thay đổi vào thuộc tính của phòng
          roomToChange.isLock = true; // Ví dụ: Thay đổi thuộc tính isLock thành true
          // Gửi thông báo hoặc cập nhật đến tất cả các clients, ví dụ:
          io.of("/admin").emit("update rooms", storage.rooms);
          io.to(roomName).emit("roomBeLocked", {nameRoom: roomName});
        } else {
          console.log("Phòng không tồn tại trong storage.rooms");
        }
      })
      .catch((error) => {
        console.log(error.message);
      });
  });

  socket.on("unlock room", ({ roomName }, callback) => {
    console.log("Unlock room " + roomName);
    unlockRoom(roomName)
      .then(() =>{
        const roomToChange = storage.rooms.find((room) => room.name === roomName);
        // Kiểm tra xem phòng có tồn tại không
        if (roomToChange) {
          // Thực hiện các thay đổi vào thuộc tính của phòng
          roomToChange.isLock = false; // Ví dụ: Thay đổi thuộc tính isLock thành true
          // Gửi thông báo hoặc cập nhật đến tất cả các clients, ví dụ:
          io.of("/admin").emit("update rooms", storage.rooms);
        } else {
          console.log("Phòng không tồn tại trong storage.rooms");
        }
      })
      .catch((error) => {
        console.log(error.message);
      });
  });

  socket.on("lock member", ({ memberName }, callback) => {
    console.log("Lock member " +  memberName);
    lockMember( memberName)
      .then(() => {
        const memberToChange = storage.members.find((member) => member.username === memberName);
        // Kiểm tra xem phòng có tồn tại không
        if (memberToChange) {
          // Thực hiện các thay đổi vào thuộc tính của phòng
          memberToChange.enable = false; // Ví dụ: Thay đổi thuộc tính isLock thành true
          // Gửi thông báo hoặc cập nhật đến tất cả các clients, ví dụ:
          io.of("/admin").emit("update members", storage.members);
          io.to(memberToChange.socketID).emit("beLocked");
          io.sockets.sockets.get(memberToChange.socketID).disconnect();
        } else {
          console.log("Member không tồn tại trong storage.rooms");
        }
      })
      .catch((error) => {
        console.log(error.message);
      });
  });

  socket.on("unlock member", ({ memberName }, callback) => {
    console.log("Unlock member " +  memberName);
    unlockMember( memberName)
      .then(() => {
        const memberToChange = storage.members.find((member) => member.username === memberName);
        // Kiểm tra xem phòng có tồn tại không
        if (memberToChange) {
          // Thực hiện các thay đổi vào thuộc tính của phòng
          memberToChange.enable = true; // Ví dụ: Thay đổi thuộc tính isLock thành true
          // Gửi thông báo hoặc cập nhật đến tất cả các clients, ví dụ:
          io.of("/admin").emit("update members", storage.members);
        } else {
          console.log("Member không tồn tại trong storage.rooms");
        }
        })
      .catch((error) => {
        console.log(error.message);
      });
  });
});


function formaTime(time) {
  var day = time.getDate().toString().padStart(2, "0");
  var month = (time.getMonth() + 1).toString().padStart(2, "0");
  var year = time.getFullYear();
  var hours = time.getHours().toString().padStart(2, "0");
  var minutes = time.getMinutes().toString().padStart(2, "0");
  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

app.get("/", (req, res) => {
  res.render("client");
});

app.get("/admin", (req, res) => {
  res.render("admin");
});

const PORT = 3000;
// ipv4: 10.251.8.76
server.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng ${PORT}`);
});
