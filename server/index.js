const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const path = require('path')
const hbs = require('hbs')
const bodyParser = require('body-parser')
const mssql = require('mssql')  
const { sign } = require('crypto')


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
    
    socket.on('sendUsername', data => { 
        let user = {idSocket: socket.id, username: data.username}
        if (isUserExist(user)) return 
        users.push(user)    
        socket.emit('sendListRoom',roomsDto)
        
    }) 

    socket.on('joinRoom', (nameRoom, passwordRoom, username) => { 
        let room = rooms[nameRoom]
        if (room.password != passwordRoom) { 
            // không thể join vào room này
            console.log("Sai mật khẩu rồi")
            return 
        }
        // cho người dùng join vào room
        room.users.add(username) 
        socket.join(nameRoom)
    })



    socket.on('newChatRoom',(nameRoom, passwordRoom, username) => { // data: name: password
        let isPassword = false ? passwordRoom == '' : true
        
        rooms[nameRoom] = { 
            password: passwordRoom,
            users: new Set(username)
        }

        roomsDto[nameRoom] = { 
            isPassword, 
            users: new Set(username)
        }
        // cho socket join vào cái room đó. 
        socket.join(nameRoom)
        io.emit('sendListRoom',roomsDto) // * Thông báo đến tất cả người dùng là có room mới
    })
})




app.get('/', (req, res) => {
    res.render('client') 
}) 





const PORT = 3000
// ipv4: 10.251.8.76 
server.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại cổng ${PORT}`)
});

