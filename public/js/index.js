

const socket = io('http://localhost:3000') 

// kiểm tra xem đẫ kết nối chưa 
let isLogin = true

const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)
const containerLogin = $("#container-login")
const containerChat = $("#container-chat")
const formlogin = $("#form-login")
const inputUsername = $("input[name='username']")
const btnNewChatRoom = $("#btn-new-chat-room") 





changeScreen()





// tiếp theo là bắt đầu sự kiện send đi nè. 
// lấy ra sự kiện nó submit 

// lưu lại biến username sau khi submit đi. 




// * EVENT 
formlogin.addEventListener('submit',function(event) { 
    event.preventDefault();
    // ! chưa check
    emitSendUserName({username: inputUsername.value})
    isLogin = false     
    changeScreen()
}) 
btnNewChatRoom.addEventListener('click', function(event) { 
    let nameRoom= $("input[name='name-chat-room']").value 
    let passwordRoom = $("input[name='password-chat-room']").value 
    emitNewChatRoom(nameRoom, passwordRoom, inputUsername.value)
})




// * EMIT 
let emitSendUserName = function(data) { 
    socket.emit("sendUsername", data)
}

let emitNewChatRoom = function(data) { 
    socket.emit("newChatRoom", data)
}


// * ON 
socket.on('sendListRoom', roomsDto => { 
    const ulRooms = $("#ul-rooms") 
    // tiếp theo là chuẩn bị render 
    let iconScope
    // nhận ở đây là object không phải là là array. 
    let listRoomHtml = ""
    for (const nameRoom in roomsDto) {
        if (roomsDto[nameRoom].isPassword == true) {    
            iconScope = '<i class="fa-solid fa-lock"></i>'
        }
        else { 
            iconScope = '<i class="fa-solid fa-globe"></i>'
        }
        listRoomHtml +=  `
            <li class="clearfix">
                <img src="https://bootdey.com/img/Content/avatar/avatar1.png" alt="avatar" />
                <div class="about">
                    <div class="name">${nameRoom}</div>
                    <div class="status">${iconScope}</div>
                </div>
         </li>`
    }
    ulRooms.innerHTML = listRoomHtml
})


// * FUNC
function changeScreen() { 
    if (isLogin) { 
        containerChat.style.display = "none"
        containerLogin.style.display = "block"
    }
    else { 
        containerChat.style.display = "block"
        containerLogin.style.display = "none"
    }
}