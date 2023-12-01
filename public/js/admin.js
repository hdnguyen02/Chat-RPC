const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// member == user
const onlineMemberText = $("div.online-member");
const totalMemberText = $("div.total-member");
const totalRoomText = $("div.total-room");
const roomArea = $("table.table-rooms tbody");
const memberArea = $("table.table-users tbody");

let userStorage; // [{ username, enable, socketID }]
let roomStorage; // [{ name, members} ]

let socket = io(location.href);
showLoginModal();

async function renderHomePage(data) {
  userStorage = data.members;
  roomStorage = data.rooms;
  console.log(roomStorage);
  let onlineNum = userStorage.reduce((prev, num, index) => {
    return prev + (userStorage[index]["socketID"] ? 1 : 0);
  }, 0);
  onlineMemberText.textContent = onlineNum;
  totalMemberText.textContent = userStorage.length;
  totalRoomText.textContent = roomStorage.length;
  await Promise.all([
    renderMemberCards(userStorage),
    renderRoomCards(roomStorage),
  ]);

  // Add event
}

async function renderMemberCards(userArray) {
  memberArea.innerHTML = "";
  userArray.forEach((user) => {
    renderSingleMemberCard(user.username, user.socketID ? "Online" : "Offline");
  });
  // Add event to user card
  $$(".table-users tbody tr td:last-child .drop-down-btn").forEach(
    (element) => {
      element.addEventListener("click", (event) => {
        element.parentElement
          .querySelector(".drop-down-list")
          .classList.toggle("d-none");
      });
    }
  );
}

function renderSingleMemberCard(username, status) {
  const template = `<tr class="d-flex justify-content-between align-items-center">
  <td class="d-flex flex-row">
      <div class="user-avatar" class="w-25 h-25">
          <img src="/images/user-avatar.png" alt="">
      </div>
      <div class="user-info ml-3">
          <h5 class="font-weight-bold text-dark">${username}</h5>
          <div class="small">
              <div class="status-dot ${
                status == "Online" ? "bg-success" : "bg-danger"
              } "></div>
              ${status}
          </div>
      </div>
  </td>
  <td>
    <div class="drop-down position-relative">
      <button class="btn-circle drop-down-btn">
          <i class="fa-solid fa-ellipsis"></i>
      </button>
      <div class="drop-down-list d-none">
          <div class="drop-down-item lock-member">Khóa tài khoản</div>
      </div>
    </div>
  </td>
</tr>`;
  memberArea.insertAdjacentHTML("beforeend", template);
  // Add event
  memberArea
    .querySelector("tr:last-child .drop-down-list .drop-down-item")
    .addEventListener("click", function (event) {
      if (event.target.classList.contains("lock-member")) {
        alert("Lock member function");
      } else {
        alert("Nope");
      }
      event.target.parentElement.classList.add("d-none");
    });
}

async function renderRoomCards(roomArray) {
  roomArea.innerHTML = "";
  console.log(roomArray);
  roomArray.forEach((room) => {
    renderSingleRoomCard(room.name, "unknown", room.members.length);
  });
  // Add event to room cards
  $$(".table-rooms tbody tr td:last-child .drop-down-btn").forEach(
    (element) => {
      element.addEventListener("click", (event) => {
        element.parentElement
          .querySelector(".drop-down-list")
          .classList.toggle("d-none");
      });
    }
  );
}

function renderSingleRoomCard(name, ownerName, quantity) {
  const template = `<tr class="d-flex justify-content-between align-items-center">
  <td class="d-flex flex-column align-items-start w-25">
      <h10 class="text-dark font-weight-bold">${name}</h10>
      <h11 class="text-gray-500">${quantity} members</h11>
  </td>
  
  <td>
    <div class="drop-down position-relative">
      <button class="btn-circle drop-down-btn">
          <i class="fa-solid fa-ellipsis"></i>
      </button>
      <div class="drop-down-list d-none">
          <div class="drop-down-item send-notify">Gửi thông báo</div>
          <div class="drop-down-item lock-group">Khóa phòng</div>
      </div>
    </div>
  </td>
</tr>`;
  roomArea.insertAdjacentHTML("beforeend", template);
  // Add event to dropdown item
  roomArea
    .querySelector("tr:last-child .drop-down-list .drop-down-item")
    .addEventListener("click", function (event) {
      if (event.target.classList.contains("send-notify")) {
        showSendNotifyModal();
      } else if (event.target.classList.contains("lock-group")) {
        // Confirm
      }
      event.target.parentElement.classList.add("d-none");
    });
}

// Handle Animation Event

function showNotify(type, message) {
  // Create notify item
  let item = document.createElement("div");
  item.className = `item ${type}`;
  let icon = document.createElement("i");
  icon.className =
    type === "login"
      ? "fa-solid fa-wifi"
      : type === "infor"
      ? "fa-solid fa-circle-infor"
      : type === "fail"
      ? "fa-solid fa-xmark"
      : type === "success"
      ? "fa-solid fa-check"
      : "";
  item.insertAdjacentElement("afterbegin", icon);
  item.insertAdjacentHTML("beforeend", `<span>${message}</span>`);
  // Add to document
  $(".notify-container").insertAdjacentElement("afterbegin", item);
  // Config remove delay after 5s
  setTimeout(() => {
    $(".notify-container").removeChild(item);
  }, 5000);
}

function showCreateRoomModal() {
  const selectedUsers = [];
  const modalTemplate = `<div class="modal d-block" id="createRoomModal" style="">
  <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
          <div class="modal-header">
              <h5 class="modal-title">Create Room</h5>
              <button class="close">
                  <span>×</span>
              </button>
          </div>
          <div class="modal-body">
              <form action="" class="">
                  <label class="form-label">Enter room name</label>
                  <input type="text" class="form-control" placeholder="Room name" required>
                  <div class="custom-divider"></div>
                  <label for="" class="form-label">Members</label>
                  <div class="custom-table" style="max-height: 250px !important">
                      <table class="table custom-table-hover">
                          <tbody>
                              
                          </tbody>
                      </table>
                  </div>
                  
              </form>
          </div>
          <div class="modal-footer">
              <button class="btn btn-success">Create</button>
          </div>
      </div>
  </div>
  </div>`;
  $("body").insertAdjacentHTML("beforeend", modalTemplate);

  // Add event to modal
  $("#createRoomModal").addEventListener("click", function (event) {
    // Close modal
    if (
      event.target == this ||
      event.target == this.querySelector(".modal-header button.close span")
    ) {
      $("body").removeChild(this);
    } // Submit
    else if (event.target == this.querySelector(".modal-footer button")) {
      const roomName = $(
        "#createRoomModal .modal-body form input"
      ).value.trim();
      // Check room existed
      if (roomStorage.find((room) => room.name == roomName)) {
        alert("Room existed");
      } else {
        $("body").removeChild($("#createRoomModal"));
        const newRoom = {
          name: roomName,
          owner: "Admin",
          members: selectedUsers,
        };
        // Send event "new room" to socket /admin at server
        socket.emit("new room", newRoom, function (error, response) {
          if (error) {
            showNotify("fail", error);
          } else {
            roomStorage = response.rooms;
            renderRoomCards(roomStorage);
            totalRoomText.textContent = roomStorage.length;
            showNotify("success", response.message);
          }
        });
      }
    }
  });

  renderUsers(userStorage);
  // Use for filter if needed
  function renderUsers(users) {
    users.forEach((user) => {
      let userTemplate = `<tr class="d-flex justify-content-around align-items-center userCard" >
          <td class="d-flex flex-row align-items-center">     
              <div class="user-avatar" class="w-25 h-25">
                  <img src="/images/user-avatar.png" alt="">
              </div>
              <span class="text-dark ml-4 mb-0 pointer usernameLabel">${
                user.username
              }</span>
          </td>
          <td class=${
            selectedUsers.find((item) => item == user) ? "visible" : "invisible"
          }>
              <i class="fa-solid fa-check text-success"></i>
          </td>
        </tr>`;
      $("#createRoomModal .modal-body table tbody").insertAdjacentHTML(
        "beforeend",
        userTemplate
      );
    });
    // Add choose event to user card
    $$("#createRoomModal .modal-body table tbody .userCard").forEach(
      (element) =>
        element.addEventListener("click", function () {
          let currentUsername =
            this.querySelector("td .usernameLabel").textContent;
          let index = selectedUsers.findIndex(
            (user) => user === currentUsername
          );
          if (index == -1) {
            selectedUsers.push(currentUsername);
            this.querySelector("td:last-child").className = "visible";
          } else {
            selectedUsers.splice(index, 1);
            this.querySelector("td:last-child").className = "invisible";
          }
        })
    );
  }
}

function showSendNotifyModal() {
  const selectedRooms = [];
  const modalTemplate = `<div class="modal d-block" id="sendNotifyModal">
  <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
          <div class="modal-header">
              <h5 class="modal-title">Send Notify</h5>
              <button class="close" type="button">
                  <span aria-hidden="true">×</span>
              </button>
          </div>
          <div class="modal-body">
              <textarea class="form-control" style="min-height: 100px" placeholder="Type message . . ."
                  required></textarea>
              <div class="custom-divider"></div>
              <label for="" class="form-label">Rooms</label>
              <div class="custom-table" style="max-height: 200px !important">
                  <table class="table custom-table-hover">
                      <tbody>
                      </tbody>
                  </table>
              </div>
          </div>
          <div class="modal-footer">
              <button class="btn btn-success">Send</button>
          </div>
      </div>
  </div>
</div>`;
  $("body").insertAdjacentHTML("beforeend", modalTemplate);
  renderRooms(roomStorage);
  // Use for filter room if needed
  function renderRooms(rooms) {
    rooms.forEach((room) => {
      const template = `<tr class="d-flex justify-content-around align-items-center roomCard">
      <td class="d-flex flex-row align-items-center">
          <div class="user-avatar" class="w-25 h-25">
              <img src="/images/group.png" alt="">
          </div>
          <span class="text-dark ml-4 mb-0 pointer roomNameLabel">${room.name}</span>
      </td>
      <td class="invisible">
          <i class="fa-solid fa-check text-success"></i>
      </td>
    </tr>`;
      $("#sendNotifyModal .modal-body table tbody").insertAdjacentHTML(
        "beforeend",
        template
      );
    });
    $$("#sendNotifyModal .roomCard").forEach((element) => {
      element.addEventListener("click", (event) => {
        let roomName = element.querySelector(".roomNameLabel").textContent;
        let index = selectedRooms.findIndex((room) => room === roomName);
        if (index == -1) {
          selectedRooms.push(roomName);
          element.querySelector("td:last-child").className = "visible";
        } else {
          selectedRooms.splice(index, 1);
          element.querySelector("td:last-child").className = "invisible";
        }
      });
    });
  }
  // Add event to modal
  $("#sendNotifyModal").addEventListener("click", function (event) {
    // Close modal
    if (
      event.target == this ||
      event.target == this.querySelector(".modal-header button.close span")
    ) {
      $("body").removeChild(this);
    }
    // Submit
    else if (event.target == this.querySelector(".modal-footer button")) {
      if (selectedRooms.length == 0) {
        alert("Please select room to send message");
        return;
      }
      const message = this.querySelector(".modal-body textarea").value;
      socket.emit(
        "send notify",
        { message, rooms: selectedRooms },
        function (error, response) {
          if (error) {
            showNotify("fail", error);
          } else {
            showNotify("success", response);
          }
        }
      );
      $("body").removeChild(this);
    }
  });
}

function showLoginModal() {
  const template = `<div class="modal d-block" id="loginModal" style="background-color: rgba(0, 0, 0, 0.3);">
  <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
          <div class="modal-header">
              <h5 class="text-center w-100">Give me Password</h5>
          </div>
          <div class="modal-body">
              <label for="signinInput" class="form-label">Password</label>
              <input type="password" required class="form-control" id="signinInput">
          </div>
          <div class="modal-footer">
              <button class="btn btn-primary">Sign in</button>
          </div>
      </div>
  </div>
</div>`;
  document.body.insertAdjacentHTML("afterbegin", template);
  // Add event
  $("#loginModal .modal-footer .btn").addEventListener("click", function () {
    const pass = $("#loginModal .modal-body input").value;
    socket.emit("check login", pass, function (error, response) {
      if (error) {
        showNotify("fail", error);
      } else {
        // Defined global socket
        handleSocket(socket);
        document.body.removeChild($("#loginModal"));
        $("#wrapper").className = "";
        renderHomePage(response.data).then(() => {
          showNotify("login", response.message);
        });
      }
    });
  });
}

function handleSocket(socket) {
  socket.on("client-login", (username, members) => {
    showNotify("login", `${username} has just login`);
    userStorage = members;
    memberArea.innerHTML = "";
    renderMemberCards(userStorage);
    onlineMemberText.textContent = members.reduce(
      (prev, member) => (member.socketID ? prev + 1 : prev),
      0
    );
  });

  socket.on("update rooms", function (data) {
    roomStorage = data;
    renderRoomCards(roomStorage);
    totalRoomText.textContent = roomStorage.length;
  });

  socket.on("client-logout", (members) => {
    memberArea.innerHTML = "";
    userStorage = members;
    renderMemberCards(userStorage);
    onlineMemberText.textContent = members.reduce(
      (prev, member) => (member.socketID ? prev + 1 : prev),
      0
    );
  });
}
