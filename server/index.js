const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const app = express()  
const server = http.createServer(app)
const io = socketIO(server)
const hbs = require('hbs')
app.set('view engine', 'hbs')
hbs.registerPartials('/views', error => {})
app.use(express.static( 'public'))
io.on('connection', socket => {
    console.log('Máy khách đã kết nối')

    socket.on('client_event', (data) => {
        console.log('Dữ liệu từ máy khách:', data)
    });
    socket.emit('server_event', { message: 'Chào mừng đến với máy chủ!' })
})


app.get('/', (req, res) => {
    res.render('home') 
});

const PORT = 3000
// ipv4: 10.251.8.76 
server.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại cổng ${PORT}`)
});
