const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const hbs = require('hbs')
const mssql = require('mssql')
const { error } = require('console')

const config = {
    user: 'sa', // thay
    password: '123456', // thay
    server: 'localhost:1433', // thay
    database: 'Chat RPC', // thay
    options: {
        encrypt: true,
        trustServerCertificate: true 
    },
};

const app = express()
const server = http.createServer(app)
const io = socketIO(server)
hbs.registerPartials('D:/Chat RPC/views/partials')
app.set('view engine', 'hbs')
app.use(express.static('public'))


function getRooms() {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const sqlQuery = 'select * from rooms'
            request.query(sqlQuery)
                .then(result => {
                    resolve(result.recordset)
                })
                .catch(error => {
                    reject(error)
                })
                .finally(() => {
                    mssql.close()
                })
        })
    })
}


function getLogOfRoom(nameRoom) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const sqlQuery = `select * from logs where name_room = N'${nameRoom}'`
            request.query(sqlQuery)
                .then(result => {
                    mssql.close()
                    resolve(result.recordset)
                })
                .catch(error => {
                    mssql.close()
                    reject(error)
                })
             
        })
    })
}




function insertLog (username, nameRoom, activity,time,data) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const colums = '(username_member, name_room,activity,time,data)'
            const sqlQuery = `INSERT INTO logs ${colums} VALUES (@Value1,@Value2,@Value3,@Value4,@Value5)`
            request.input('Value1', mssql.NVarChar, username)
            request.input('Value2', mssql.NVarChar, nameRoom)
            request.input('Value3', mssql.VarChar, activity)
            request.input('Value4', mssql.NVarChar, time)
            request.input('Value5', mssql.NVarChar, data)
            request.query(sqlQuery)
                .then(result => {
                    resolve(result.recordset)
                })
                .catch(error => {
                    reject(error)
                })
                .finally(() => {
                    mssql.close()
                })
        })
    })
}




function getRoomWithName(nameRoom) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const sqlQuery = `select * from rooms where name = N'${nameRoom}'`
            request.query(sqlQuery)
                .then(result => {
                    mssql.close()
                    resolve(result.recordset)
                })
                .catch(error => {
                    mssql.close()
                    reject(error)
                })
        })
    })
}

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

function insertMember(username) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const sqlQuery = "INSERT INTO members (username) VALUES (@Value1)"
            request.input('Value1', mssql.NVarChar, username)
            request.query(sqlQuery)
                .then(() => {
                    resolve()
                })
                .catch(error => {
                    reject(error)
                })
                .finally(() => {
                    mssql.close()
                })
        })
    })
}



function insertRoom(nameRoom, password, username) {
    return new Promise(async (resolve, reject) => {
        let pool;
        try {
            pool = await mssql.connect(config);
            const request = pool.request();
            request.input('nameRoom', mssql.NVarChar, nameRoom);
            request.input('password', mssql.NVarChar, password);
            request.input('username', mssql.NVarChar, username);
            const result = await request.execute('spNewChatRoom');
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            if (pool) {
                pool.close();
            }
        }
    });
}


function insertMemberToRoom(username, nameRoom) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            request.input('nameRoom', mssql.NVarChar, nameRoom)
            request.input('username', mssql.NVarChar, username)
            request.execute('spInsertMemberToRoom')
                .then((result) => {
                    mssql.close()
                    resolve(result)
                })
                .catch(error => {
                    mssql.close()
                    reject(error)
                })
        })
    })
   
  }
  
  
  

function getMembersOfRoom(nameRoom) {
    return new Promise((resolve, reject) => {
        mssql.connect(config, error => {
            if (error) reject(error)
            let request = new mssql.Request()
            const sqlQuery = `SELECT username_member FROM room_member WHERE name_room = N'${nameRoom}'`;
            request.query(sqlQuery)
                .then(result => {
                    mssql.close()
                    resolve(result.recordset)
                })
                .catch(error => {
                    mssql.close()
                    reject(error)
                })
        })
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

