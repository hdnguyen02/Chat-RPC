


function formaTime(time) {
    var day = time.getDate().toString().padStart(2, '0');
    var month = (time.getMonth() + 1).toString().padStart(2, '0')
    var year = time.getFullYear();
    var hours = time.getHours().toString().padStart(2, '0');
    var minutes = time.getMinutes().toString().padStart(2, '0')
    return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

export { 
    formaTime
}