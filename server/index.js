import express from 'express'
import http from 'http'
import {Server} from 'socket.io'
import hbs from 'hbs'

import {getRooms,getLogOfRoom,insertLog,getRoomWithName,insertMember,insertRoom
    ,insertMemberToRoom,getMembersOfRoom,} from './methodDB.js'



const app = express()
const server = http.createServer(app)
const io = new Server(server)
hbs.registerPartials('D:/Chat RPC/views/partials')
app.set('view engine', 'hbs')
app.use(express.static('public'))


function sendListRoom(typeSend) {
    getRooms()
        .then(rooms => {
            let roomsDto = {}
            rooms.forEach(room => {
                let isPassword = !room.password ? false : true
                roomsDto[room.name] = {
                    isPassword
                }
            })
            typeSend.emit('sendListRoom', roomsDto)
        })
        .catch(error => {
            console.log(error.message)
        })
}


io.on('connection', socket => {
    socket.on('sendUsername', data => {
        let { username } = data
        insertMember(username)
            .catch(error => {})
        sendListRoom(socket)
    })

    socket.on('joinChatRoom', data => {
        let { nameRoom, passwordRoom, username } = data
        getRoomWithName(nameRoom)
        .then(recordset => {
            let room = recordset[0]
            if (room.password != passwordRoom){   
                throw new Error("Sai mật khẩu chat room!")
            }
            return insertMemberToRoom(username, nameRoom)
        })
        .then(() =>  {
            return getMembersOfRoom(nameRoom)
        })
        .then(recordsetGetMemberOfRoom => {
            getLogOfRoom(nameRoom)
            .then(recordsetGetLogOfRoom => {
                let members =  recordsetGetMemberOfRoom.map(member => member.username_member)
                socket.join(nameRoom)
                let logs = recordsetGetLogOfRoom.map(log => {
                    return { 
                        usernameSend: log.username_member, 
                        activity:log.activity, time:log.time, message:log.data
                    }
                })
                socket.emit('joinedChatRoom', { nameRoom, password: passwordRoom, members, logs})
                socket.to(nameRoom).emit("newMemberJoined", { members, sizeMembers: recordsetGetMemberOfRoom.length})
            }) 
        })
        .catch(error => {
            socket.emit('notify', error.message)
        })
    })

    socket.on('sendMessage', data => {
        let { nameRoom, username, message } = data
        let time = formaTime(new Date()) 
        insertLog(username, nameRoom, "SEND_MESSAGE",time,message)
        .then(() => {
            io.to(nameRoom).emit('receiveMessage', { usernameSend: username, message, time }) 
        })
        .catch(error=>{
            console.log(error.message)
        })
    })

    socket.on('newChatRoom', data => {
        let { nameRoom, passwordRoom, username } = data
        let isPassword = !passwordRoom ? false : true
        let password = isPassword ? passwordRoom : null

        insertRoom(nameRoom, password,username)
            .then(() => {
                socket.join(nameRoom)
                socket.emit('joinedChatRoom', { nameRoom, password: password, members: [username] })
                sendListRoom(io)
            })
            .catch(error => {
                console.log(error.message)
            })
    })
})

function formaTime(time) {
    var day = time.getDate().toString().padStart(2, '0');
    var month = (time.getMonth() + 1).toString().padStart(2, '0')
    var year = time.getFullYear();
    var hours = time.getHours().toString().padStart(2, '0');
    var minutes = time.getMinutes().toString().padStart(2, '0')
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

