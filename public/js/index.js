const socket = io("http://localhost:3000");
let isLogin = true;
let username;
let rooms = {};
let curentChatRoom;
let curentJoinChatRoom;

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const containerLogin = $("#container-login");
const containerChat = $("#container-chat");
const formlogin = $("#form-login");
const inputUsername = $("input[name='username']");
const btnNewChatRoom = $("#btn-new-chat-room");
const inputEnterPassword = $("input[name='enter-password']");
const containerRoomChat = $("#container-room-chat");
const btnCloseModelEpcr = $("#btn-close-model-epcr");
const btnJoinChatRoom = $("#btn-join-chat-room");

changeScreen();

// * EVENT
formlogin.addEventListener("submit", function (event) {
  event.preventDefault();
  username = inputUsername.value.trim();
  if (username == "") {
    alert("Không để trống username!");
    return;
  }
  socket.emit("sendUsername", { username}, function(check){
    if (check) {
      containerChat.style.display = "none";
      containerLogin.style.display = "block";
    } else {
      containerChat.style.display = "block";
      containerLogin.style.display = "none";
    }
  });
});
btnNewChatRoom.addEventListener("click", function () {
  let nameRoom = $("input[name='name-chat-room']").value.trim();
  // Kiểm tra xem room này đã tồn tại chưa.
  if (nameRoom == "") {
    alert("Không để trống name room chat!");
    return;
  }
  // ! Chưa kiểm tra password

  if (rooms[nameRoom]) {
    alert("Đã tồn tại chat room này!");
    return;
  }
  let passwordRoom = $("input[name='password-chat-room']").value;
  socket.emit("newChatRoom", {
    nameRoom,
    passwordRoom,
    username: inputUsername.value,
  });
});

function changeScreen() {
  if (isLogin) {
    containerChat.style.display = "none";
    containerLogin.style.display = "block";
  } else {
    containerChat.style.display = "block";
    containerLogin.style.display = "none";
  }
}

btnCloseModelEpcr.addEventListener("click", function () {
  $("#modelEnterPassWordChatRoom").style.display = "none  ";
});

btnJoinChatRoom.addEventListener("click", function () {
  // lấy ra giá trị chat room.
  let textEnterPassword = $("input[name='enter-password']").value;
  // sau khi nó nhấp vào tiến hành reset value
  $("#modelEnterPassWordChatRoom").style.display = "none";
  $("input[name='enter-password']").value = "";
  socket.emit("joinChatRoom", {
    nameRoom: curentJoinChatRoom,
    passwordRoom: textEnterPassword,
    username,
  });
});

function handerJoinChat(event) {
  const curentTarget = event.currentTarget;
  const nameRoom = curentTarget.dataset.chatRoom;
  console.log(nameRoom);
  
  if (nameRoom in sessionStorage) {
    let password = sessionStorage.getItem(nameRoom);
    if (password === "null") {
      password = null;
    }
    socket.emit("joinChatRoom", { nameRoom, passwordRoom: password, username });
  } else if (rooms[nameRoom].isPassword) {
    $("#modelEnterPassWordChatRoom").style.display = "block";
    curentJoinChatRoom = nameRoom;
  } else {
    socket.emit("joinChatRoom", { nameRoom, passwordRoom: null, username });
  }
}

function onSendMessage(event) {
  if (event.key === "Enter") {
    let message = event.target.value;
    if (message == "") return;
    event.target.value = "";
    socket.emit("sendMessage", { username, message, nameRoom: curentChatRoom });
  }
}

// * EMIT
function emitSendUserName(data) {
  socket.emit("sendUsername", data);
}

socket.on("notify", (data) => {
  alert(data);
});

socket.on("receiveMessage", (data) => {
  let { usernameSend, activity, message, time } = data;
  if(activity){
    if(activity == "SEND_OUT"){
      $("#container-chat-history").innerHTML += messageOut(
        usernameSend,
        time
      );
      return;
    }
  }
  if (username == usernameSend) {
    $("#container-chat-history").innerHTML += messageSenderTemplate(
      username,
      time,
      message
    );
    return;
  }
  $("#container-chat-history").innerHTML += messageReceiverTemplate(
    usernameSend,
    time,
    message
  );
});

socket.on("joinedChatRoom", (data) => {
  let { nameRoom, password, members, logs } = data;
  sessionStorage.setItem(nameRoom, password);
  curentChatRoom = nameRoom;

  let htmlMessages = logs.map((log) => {
    if(log.activity){
      if(log.activity == "SEND_OUT"){
        return messageOut(log.usernameSend, log.time);
      }
    }
    if (username == log.usernameSend) {
      return messageSenderTemplate(username, log.time, log.message);
    }
    return messageReceiverTemplate(log.usernameSend, log.time, log.message);
  });

  let htmlTagLiMember = members.map((member) => `<li>${member}</li>`);
  let html = `
    <div class="d-flex justify-content-between">
    <div class="vh-100 w-100">
    <div class="chat-header clearfix">
        <div class="row">
            <div class="col-lg-6">
                <a href="javascript:void(0);" data-toggle="modal" data-target="#view_info">
                    <img src="https://bootdey.com/img/Content/avatar/avatar2.png" alt="avatar" />
                </a>
                <div class="chat-about">
                    <h6 class="mb-0">${curentChatRoom}</h6>
                    <small id="size-members-1">${
                      members.length
                    } thành viên</small>
                </div>
            </div>
            <div class="col-lg-6 hidden-sm text-right">
    <div class="dropdown">
        <button class="btn btn-outline-info dropdown-toggle" type="button" id="settingsDropdownButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i class="fa fa-cogs"></i>
        </button>
        <div class="dropdown-menu" aria-labelledby="settingsDropdownButton">
            <a class="dropdown-item" id="logoutButton" href="javascript:void(0);" onclick="handleLogout()">
                <i class="fa fa-sign-out-alt"></i> Logout
            </a>
        </div>
    </div>
</div>

        
        
        </div>
    </div>
    <div class="chat-history">
        <ul id="container-chat-history" class="m-b-0 h-100"
            style="overflow-y: auto; overflow-x: hidden">
           
        </ul>
    </div>
    <div class="chat-message clearfix">
        <div class="input-group mb-0">
            <div class="input-group-prepend"><span class="input-group-text"><i
                        class="fa fa-send"></i></span></div>
            <input onkeydown="onSendMessage(event)" type="text" class="form-control"
                placeholder="Enter text here..." />
        </div>
    </div>
    </div>
    <div class="vh-100" style="width: 280px; border-left: 2px solid #f4f7f6;">
        <div id="size-members-2" class="d-flex justify-content-center align-items-center" style="height: 10vh;font-weight: 500; ;border-bottom: 2px solid #f4f7f6;" >Thành viên (${
          members.length
        })</div>
        <div> <ul id="ul-members" style="overflow-y: auto; height: 90vh;">${htmlTagLiMember.join(
          ""
        )}</ul> </div>
    </div>
    </div>
    `;
    console.log(containerRoomChat.querySelector("#logoutButton"));
  containerRoomChat.innerHTML = html;
  document
  .querySelector("#logoutButton")
  .addEventListener("click", function() {
    console.log("Pressed the button");
    socket.emit("logout Room", {curentChatRoom, username});
  });
  $("#container-chat-history").innerHTML = htmlMessages.join("");
});

socket.on("logoutedRoom", (data) => {
  let { nameRoom} = data;
  sessionStorage.removeItem(nameRoom);

  let html = '<p style="font-size: 18px; text-align: center; display: flex; justify-content: center; align-items: center; height: 100%; width: 100%;">Chưa chọn đoạn chat nào</p>';
  containerRoomChat.innerHTML = html;
});

socket.on("sendListRoom", (roomsDto) => {
  const ulRooms = $("#ul-rooms");
  rooms = roomsDto;
  let iconScope;
  let listRoomHtml = "";
  for (const nameRoom in roomsDto) {
    if (roomsDto[nameRoom].isPassword == true) {
      iconScope = '<i class="fa-solid fa-lock"></i>';
    } else {
      iconScope = '<i class="fa-solid fa-globe"></i>';
    }
    listRoomHtml += `
            <li onclick="handerJoinChat(event)" data-chat-room="${nameRoom}" class="clearfix">
                <img src="https://bootdey.com/img/Content/avatar/avatar1.png" alt="avatar" />
                <div class="about">
                    <p class="name">${nameRoom}</p>
                    <div class="status">${iconScope}</div>
                </div>
           </li>`;
  }
  ulRooms.innerHTML = listRoomHtml;
});

socket.on("newMemberJoined", (data) => {
  let { members, sizeMembers } = data;
  let htmlTagLiMember = members.map((member) => `<li>${member}</li>`);
  $("#ul-members").innerHTML = htmlTagLiMember.join("");
  $("#size-members-1").innerText = `${sizeMembers} thành viên`;
  $("#size-members-2").innerText = `Thành viên (${sizeMembers})`;
});

socket.on("disconnect", function () {
  isLogin = true;
  changeScreen();
});

socket.on("beLocked", () => {
  isLogin = true;
  changeScreen();
  alert(`Tài khoản của bạn đã bị khóa!!!!`);
});

socket.on("roomBeLocked", (data) => {
  let { nameRoom } = data;
  alert(`Room chat ${nameRoom} đã bị khóa!!!`);
  let html = '<p style="font-size: 18px; text-align: center; display: flex; justify-content: center; align-items: center; height: 100%; width: 100%;">Chưa chọn đoạn chat nào</p>';
  containerRoomChat.innerHTML = html;
});

function messageOut(usernameSender, time) {
  return `<li style="text-align: center;" class="clearfix">
              <div style="text-align: center;"><smail style="font-size: 14px"></smail></div>
              <small class="message-data-time">(${time})</small>
              <div style="color: red; text-align: center;">"Người dùng ${usernameSender} đã rời khỏi cuộc trò truyện</div>
          </li>`;
}

function messageReceiverTemplate(usernameSender, time, message) {
  return `<li class="clearfix">
            <div class="message-data">
              <div><smail style="font-size: 14px"></smail></div>
              <small class="message-data-time">${usernameSender} (${time})</small>
            </div>
            <div class="message my-message">${message}</div>
          </li>`;
}

function messageSenderTemplate(username, time, message) {
  return `<li class="clearfix">
            <div class="message-data text-right">
                <small class="message-data-time">${username} (${time})</small>
            </div>
            <div class="message other-message float-right">${message}</div>
          </li>`;
}
