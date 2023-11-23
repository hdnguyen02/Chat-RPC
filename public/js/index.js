




const userInfo = document.getElementById('user-info')
let socket 

userInfo.addEventListener('submit', event => { 
    socket = io('http://localhost:3000') // thực hiện kết nối. 
})
