

const socket = io("http://localhost:3000")
let isLogin = true
let username 
let joinedRooms = {}
let rooms = {}
let isShowRoomChat = false
let curentChatRoom 
let curentJoinChatRoom 


const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const containerLogin = $("#container-login");
const containerChat = $("#container-chat")
const formlogin = $("#form-login");
const inputUsername = $("input[name='username']");
const btnNewChatRoom = $("#btn-new-chat-room");
const inputEnterPassword = $("input[name='enter-password']");
const containerRoomChat = $("#container-room-chat") 
const btnCloseModelEpcr =$("#btn-close-model-epcr")
const btnJoinChatRoom = $("#btn-join-chat-room")



changeScreen();


// * EVENT
formlogin.addEventListener("submit", function (event) {
  event.preventDefault();
  // ! chưa check
  username = inputUsername.value
  socket.emit('sendUsername', {username})

  isLogin = false;
  changeScreen();
});
btnNewChatRoom.addEventListener("click", function () {
  let nameRoom = $("input[name='name-chat-room']").value.trim()
  // Kiểm tra xem room này đã tồn tại chưa. 
  if (nameRoom == '') {
    alert('Không để trống name room chat!')
    return
  }
  // ! Chưa kiểm tra password 

  if (rooms[nameRoom]) { 
    alert("Đã tồn tại chat room này!")
    return
  }
  let passwordRoom = $("input[name='password-chat-room']").value;
  socket.emit("newChatRoom", nameRoom, passwordRoom, inputUsername.value)
});

btnCloseModelEpcr.addEventListener("click", function(){ 
  $("#modelEnterPassWordChatRoom").style.display = "none  "
})

btnJoinChatRoom.addEventListener('click', function(){
  // lấy ra giá trị chat room.  
  let textEnterPassword = $("input[name='enter-password']").value
  // sau khi nó nhấp vào tiến hành reset value
  $("#modelEnterPassWordChatRoom").style.display = "none"
  $("input[name='enter-password']").value = ''
  socket.emit("joinRoom", curentJoinChatRoom, textEnterPassword, username)
})


function handerJoinChat(event) {
  const curentTarget = event.currentTarget;
  const nameRoom = curentTarget.dataset.chatRoom

  if (nameRoom in sessionStorage) { 
    let password = sessionStorage.getItem(nameRoom)
    if (password === 'null') {
      password = null
    }
    socket.emit("joinRoom", nameRoom,password , username) 
  }
  else if (rooms[nameRoom].isPassword) {
    $("#modelEnterPassWordChatRoom").style.display = "block" 
    curentJoinChatRoom = nameRoom
  } else {
    socket.emit("joinRoom", nameRoom, null, username) 
  }
}

function onSendMessage(event) { 
    if (event.key === 'Enter') {
        let message =  event.target.value
        if (message == '') return
        event.target.value = ''
        socket.emit("sendMessage", {username, message, nameRoom: curentChatRoom})
    }
}

// * EMIT
function emitSendUserName (data) {
  socket.emit("sendUsername", data);
}  

socket.on('wrongPasswordChatRoom', data => { 
  alert("Password chat room không chính xác!")
})

socket.on('receiveMessage', data => { 
    let {username : usernameSend, message, time} = data
    if (username == usernameSend) {  
      $("#container-chat-history").innerHTML += `
        <li class="clearfix">
          <div class="message-data text-right">
              <small class="message-data-time">${username} (${time})</small>
             
          </div>
          <div class="message other-message float-right">
            ${message}
          </div>
        </li>`
    }
    else { 
      $("#container-chat-history").innerHTML += `
        <li class="clearfix">
            <div class="message-data">
              <div><smail style="font-size: 14px"></smail></div>
              <small class="message-data-time">${usernameSend} (${time})</small>
            </div>
            <div class="message my-message">${message}</div>
        </li>`
    }
    // kiểm tra xem người gửi có phải là mình nếu là mình thì render bên tay phải 

    
    

})
// nhận lại sự kiện đã join
socket.on("joinedChatRoom", (data) => {
  
  let {nameRoom, password} = data
  sessionStorage.setItem(nameRoom,password)

  curentChatRoom = nameRoom
  let html = `
        <div class="chat-header clearfix">
        <div class="row">
            <div class="col-lg-6">
                <a href="javascript:void(0);" data-toggle="modal" data-target="#view_info">
                    <img src="https://bootdey.com/img/Content/avatar/avatar2.png" alt="avatar" />
                </a>
                <div class="chat-about">
                    <h6 class="mb-0">${curentChatRoom}</h6>
                    <small>22 thành viên</small>
                </div>
            </div>
            <div class="col-lg-6 hidden-sm text-right">
                <a href="javascript:void(0);" class="btn btn-outline-info"><i class="fa fa-cogs"></i></a>
            </div>
        </div>
        </div>
        <div class="chat-history">
            <ul id="container-chat-history" class="m-b-0 h-100" style="overflow-y: auto; overflow-x: hidden">
                 
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
  console.log("sendlistRoom", rooms)
  const ulRooms = $("#ul-rooms");
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
           </li>`
  }
  ulRooms.innerHTML = listRoomHtml
});

// * FUNC
function changeScreen() {
  if (isLogin) {
    containerChat.style.display = "none"
    containerLogin.style.display = "block"
  } else {
    containerChat.style.display = "block"
    containerLogin.style.display = "none"
  }

  // join màn hình nào hay không 
  if (!isShowRoomChat) { 
    // tham gia nhóm chat hoặc tạo nhóm chat. 
  }
}

