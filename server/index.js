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

async function generateData() {
  try {
    getMembers().then((members) => {
      members.forEach((member) => {
        if (member.username === "ADMIN") return;
        storage.members.push({ ...member, socketID: null });
      });
    });
    getRooms().then((rooms) => {
      rooms.forEach((room) => {
        getMembersOfRoom(room.name).then((result) => {
          storage.rooms.push({
            name: room.name,
            members: result.map((record) => record.username_member),
          });
        });
      });
    });
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
  socket.on("sendUsername", (data) => {
    let { username } = data;
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
  });

  socket.on("joinChatRoom", (data) => {
    let { nameRoom, passwordRoom, username } = data;
    getRoomWithName(nameRoom)
      .then((recordset) => {
        let room = recordset[0];
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
});

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
