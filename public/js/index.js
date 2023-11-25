

const socket = io("http://localhost:3000");

// kiểm tra xem đẫ kết nối chưa
let isLogin = true;

// lưu danh sach phong da tham gia vao được
let username; // lưu trữ username
let joinedRooms = {}; // chứa danh sách dã join
let rooms = {};
let isShowRoomChat = false; // trạng thái room chat
let curentChatRoom;

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const containerLogin = $("#container-login");
const containerChat = $("#container-chat");
const formlogin = $("#form-login");
const inputUsername = $("input[name='username']");
const btnNewChatRoom = $("#btn-new-chat-room");
const inputEnterPassword = $("input[name='enter-password']");
const btnEnterPassword = $("#btn-enter-password")
const containerRoomChat = $("#container-room-chat")

changeScreen();

// tiếp theo là bắt đầu sự kiện send đi nè.
// lấy ra sự kiện nó submit

// lưu lại biến username sau khi submit đi.

// * EVENT
formlogin.addEventListener("submit", function (event) {
  event.preventDefault();
  // ! chưa check
  username = inputUsername.value;
  emitSendUserName({ username });

  isLogin = false;
  changeScreen();
});
btnNewChatRoom.addEventListener("click", function () {
  let nameRoom = $("input[name='name-chat-room']").value;
  let passwordRoom = $("input[name='password-chat-room']").value;
  socket.emit("newChatRoom", nameRoom, passwordRoom, inputUsername.value);
});

btnEnterPassword.addEventListener("click", function () {
  let valueEnterPassword = inputEnterPassword.value;
  // ngay tại chỗ này cho nó join vào đi.
});

function handerJoinChat(event) {
  const curentTarget = event.currentTarget;
  const nameRoom = curentTarget.dataset.chatRoom;
  // kiểm tra xem nó có trong danh sách kia không
  if (!joinedRooms[nameRoom]) {
    // * Chưa join vào room
    // người dùng đã join vào rồi
    // chia ra 2 trường hợp => room có password và room không có password
    if (rooms[nameRoom].isPassword) {
      // * có password
      $("#modelPassWordChatRoom").style.display = "block"; // show lên.
    } else {
      //trường hợp room này không hề có password
      // join thẳng vào
      socket.emit("joinRoom", nameRoom, null, username);
    }
  }
}

function onSendMessage(event) { 
    if (event.key === 'Enter') { 
        console.log("vào được send message")
        console.log({username, message: event.target.value})
        socket.emit("sendMessage", {username, message: event.target.value, nameRoom: curentChatRoom})
    }
    
}

// * EMIT
let emitSendUserName = function (data) {
  socket.emit("sendUsername", data);
};

socket.on('receiveMessage', data => { 
    let {username, message} = data
    // username gửi đến message này trên cái room này -> include nào vào cái room đó. 
    // đáng ra còn time ... đồ nữa. nhưng mà thôi. trước tiên check xem có phải là mình tin của mình không
    // ! nên check xem có phải tin của mình 
    console.log("vào đây", message)
    $("#container-chat-history").innerHTML += `
        <li class="clearfix">
            <div class="message-data"><span class="message-data-time">10:12 AM, Today</span></div>
            <div class="message my-message">${message}</div>
        </li>  `

})
// nhận lại sự kiện đã join
socket.on("joinedChatRoom", (nameRoom, isPassword) => {
  joinedRooms[nameRoom] = { isPassword };
  curentChatRoom = nameRoom
  let html = `
        <div class="chat-header clearfix">
        <div class="row">
            <div class="col-lg-6">
                <a href="javascript:void(0);" data-toggle="modal" data-target="#view_info">
                    <img src="https://bootdey.com/img/Content/avatar/avatar2.png" alt="avatar" />
                </a>
                <div class="chat-about"><h6 class="m-b-0">${curentChatRoom}</h6></div>
            </div>
            <div class="col-lg-6 hidden-sm text-right">
                <a href="javascript:void(0);" class="btn btn-outline-info"><i class="fa fa-cogs"></i></a>
            </div>
        </div>
        </div>
        <div class="chat-history">
            <ul id="container-chat-history" class="m-b-0 h-100" style="overflow-y: auto">
                <li class="clearfix">
                    <div class="message-data text-right">
                        <span class="message-data-time">10:10 AM, Today</span>
                        <img src="https://bootdey.com/img/Content/avatar/avatar7.png" alt="avatar" />
                    </div>
                    <div class="message other-message float-right">
                        Hi Aiden, how are you? How is the project coming along?
                    </div>
                </li>
                <li class="clearfix">
                    <div class="message-data"><span class="message-data-time">10:12 AM, Today</span></div>
                    <div class="message my-message">Are we meeting today?</div>
                </li>  
            </ul>
        </div>
        <div class="chat-message clearfix">
            <div class="input-group mb-0">
                <div class="input-group-prepend"><span class="input-group-text"><i class="fa fa-send"></i></span></div>
                <input onkeydown="onSendMessage(event)" type="text" class="form-control" placeholder="Enter text here..." />
            </div>
        </div> 
    `
    containerRoomChat.innerHTML = html
});

// * ON
socket.on("sendListRoom", (roomsDto) => {
  const ulRooms = $("#ul-rooms");
  // tiếp theo là chuẩn bị render
  // khi có room mới được gửi sang
  rooms = roomsDto;
  let iconScope;
  // nhận ở đây là object không phải là là array.
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

// * FUNC
function changeScreen() {
  if (isLogin) {
    containerChat.style.display = "none";
    containerLogin.style.display = "block";
  } else {
    containerChat.style.display = "block";
    containerLogin.style.display = "none";
  }
}
