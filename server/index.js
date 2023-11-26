const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const path = require('path')
const hbs = require('hbs')
const bodyParser = require('body-parser')
const mssql = require('mssql')  



const config = {
    user: 'sa', // thay
    password: '123456', // thay
    server: 'localhost:1433', // thay
    database: 'Chat RPC', // thay
    options: {
        encrypt: true,
        trustServerCertificate: true // Nếu bạn sử dụng Azure SQL, hãy thêm tùy chọn này
    },
};


// TEST kết nối cơ sở dữ liệu
// mssql.connect(config, err => {
//     if (err) { 
//         console.log(err)
//     }
//     let request = new mssql.Request() 
//     request.query('select * from activitys', function (err, wrapper) {
            
//         if (err) console.log(err)
//         console.log(wrapper.recordset)
//     });
// })

const urlencodedParser = bodyParser.urlencoded({ extended: false })  

const app = express()  
const server = http.createServer(app)
const io = socketIO(server)
hbs.registerPartials('D:/Chat RPC/views/partials')
app.set('view engine', 'hbs')
app.use(express.static( 'public'))


// nên lưu trữ thành object thay vì thành data 


const rooms = {} // Lưu trữ room trên hệ thống. 
const roomsDto = {} // không chứa passWord trong hệ thống. 
const users = []

// check user exist  

function isUserExist(userCheck) { 
    users.forEach(user => { 
        if (userCheck.username == user.username) {
            return true
        }
    })
    return false 
}

function isRoomExist(roomCheck) { 
    rooms.forEach(room => { 
        if (room.name == roomCheck.name) {
            return true
        }
    })
    return false 
}



// on lắng nghe cái gì đó  
io.on('connection', socket => { // sự kiến có người dùng kết nối

    console.log(`Người dùng đã join ${socket.id}`)
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    socket.on('sendUsername', data => { 
        let user = {idSocket: socket.id, username: data.username}
        console.log("có vào đây")
        users.push(user)    
        socket.emit('sendListRoom',roomsDto)
        
    }) 

    socket.on('joinRoom', (nameRoom, passwordRoom, username) => { 
        let room = rooms[nameRoom]
        if (room.password != passwordRoom) { 
            // không thể join vào room này
            socket.emit('wrongPasswordChatRoom', 'Sai mật khẩu chat room')
            return
        }
        let isPassword = room.password ? true : false
        room.users.add(username) 
        socket.join(nameRoom)
        socket.emit('joinedChatRoom', {nameRoom, password:passwordRoom})
    })

    socket.on('sendMessage', data => { 
        let { nameRoom, username, message } =data  
        let time = formaTime(new Date()); 
        


        io.to(nameRoom).emit('receiveMessage', {username, message, time})
    }) 



    socket.on('newChatRoom',(nameRoom, passwordRoom, username) => { // data: name: password
        let isPassword = !passwordRoom ? false : true
        let password = isPassword ? passwordRoom : null 
        
        rooms[nameRoom] = { 
            password,
            users: new Set(username)
        }

        roomsDto[nameRoom] = { 
            isPassword, 
            users: new Set(username)
        } 
        socket.join(nameRoom)
        socket.emit('joinedChatRoom',  {nameRoom, password: password}) 
        io.emit('sendListRoom',roomsDto) 
    })
})


function formaTime(time) {
    var day = time.getDate().toString().padStart(2, '0');
    var month = (time.getMonth() + 1).toString().padStart(2, '0'); // Thêm 1 vì tháng bắt đầu từ 0
    var year = time.getFullYear();
    var hours = time.getHours().toString().padStart(2, '0');
    var minutes = time.getMinutes().toString().padStart(2, '0');
  
    return `${day}-${month}-${year}, ${hours}:${minutes}`;
  }



app.get('/', (req, res) => {
    res.render('client') 
}) 





const PORT = 3000
// ipv4: 10.251.8.76 
server.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại cổng ${PORT}`)
});

