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
mssql.connect(config, err => {
    if (err) { 
        console.log(err)
    }
    let request = new mssql.Request() 
    request.query('select * from activitys', function (err, wrapper) {
            
        if (err) console.log(err)
        console.log(wrapper.recordset)
    });
})

const urlencodedParser = bodyParser.urlencoded({ extended: false })  

const app = express()  
const server = http.createServer(app)
const io = socketIO(server)
app.set('view engine', 'hbs')
app.use(express.static( 'public'))
hbs.registerPartials(path.join(__dirname, 'views/layouts'))


const rooms = {}

let isAddUser = false 


// on lắng nghe cái gì đó  
io.on('connection', socket => { // sự kiến có người dùng kết nối
    
    if (!isAddUser) return 

    

    socket.on('client_event', (data) => {
        console.log('Dữ liệu từ máy khách:', data)
    });
    socket.emit('server_event', { message: 'Chào mừng đến với máy chủ!' })
})



app.get('/', (req, res) => {
    res.render('join', {layout: 'layouts/main'}) 
}) 


app.post('/join',urlencodedParser,(req, res) => {
    console.log(req.body.username)
    res.render('join', {layout: 'layouts/main'})
})

app.get('/chat', ((req, res) => {
    res.render('chat', {layout: 'layouts/main'})
}))  

const PORT = 3000
// ipv4: 10.251.8.76 
server.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại cổng ${PORT}`)
});

