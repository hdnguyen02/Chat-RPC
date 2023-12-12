import mssql from "mssql";

const config = {
  user: "sa", // thay
  password: "123456", // thay
  server: "127.0.0.1", // thay
  database: "Chat RPC", // thay
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

function getMembers() {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = "select * from members";
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function getRooms() {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = "select * from rooms";
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function getRoomAndQuantity() {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery =
        "select name_room as name, count(*) as quantity from room_member group by name_room";
      request
        .query(sqlQuery)
        .then((result) => {
          resolve(result.recordset);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          mssql.close();
        });
    });
  });
}

function getLogOfRoom(nameRoom) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `select * from logs where name_room = N'${nameRoom}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function insertLog(username, nameRoom, activity, time, data) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const colums = "(username_member, name_room,activity,time,data)";
      const sqlQuery = `INSERT INTO logs ${colums} VALUES (@Value1,@Value2,@Value3,@Value4,@Value5)`;
      request.input("Value1", mssql.NVarChar, username);
      request.input("Value2", mssql.NVarChar, nameRoom);
      request.input("Value3", mssql.VarChar, activity);
      request.input("Value4", mssql.NVarChar, time);
      request.input("Value5", mssql.NVarChar, data);
      request
        .query(sqlQuery)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          mssql.close();
        });
    });
  });
}

function getRoomWithName(nameRoom) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `select * from rooms where name = N'${nameRoom}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function getMemberWithName(nameMember) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `select * from members where username = N'${nameMember}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function insertMember(username) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = "INSERT INTO members (username) VALUES (@Value1)";
      request.input("Value1", mssql.NVarChar, username);
      request
        .query(sqlQuery)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          mssql.close();
        });
    });
  });
}

function insertRoom(nameRoom, password, username) {
  return new Promise(async (resolve, reject) => {
    let pool;
    try {
      pool = await mssql.connect(config);
      const request = pool.request();
      request.input("nameRoom", mssql.NVarChar, nameRoom);
      request.input("password", mssql.NVarChar, password);
      request.input("username", mssql.NVarChar, username);
      const result = await request.execute("spNewChatRoom");
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
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      request.input("nameRoom", mssql.NVarChar, nameRoom);
      request.input("username", mssql.NVarChar, username);
      request
        .execute("spInsertMemberToRoom")
        .then((result) => {
          mssql.close();
          resolve(result);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function getMembersOfRoom(nameRoom) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `SELECT username_member FROM room_member WHERE name_room = N'${nameRoom}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function lockRoom(nameRoom) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `UPDATE rooms SET isLock = 1 WHERE name = N'${nameRoom}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function unlockRoom(nameRoom) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `UPDATE rooms SET isLock = 0 WHERE name = N'${nameRoom}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function lockMember(nameMember) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `UPDATE members SET enable = 0 WHERE username = N'${nameMember}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function LogOutRoom(nameRoom, nameMember) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `DELETE FROM room_member WHERE name_room = N'${nameRoom}' AND username_member = N'${nameMember}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });
  });
}

function unlockMember(nameMember) {
  return new Promise((resolve, reject) => {
    mssql.connect(config, (error) => {
      if (error) reject(error);
      let request = new mssql.Request();
      const sqlQuery = `UPDATE members SET enable = 1 WHERE username = N'${nameMember}'`;
      request
        .query(sqlQuery)
        .then((result) => {
          mssql.close();
          resolve(result.recordset);
        })
        .catch((error) => {
          mssql.close();
          reject(error);
        });
    });


    
    
  });
}
export {
  getMembers,
  getRooms,
  getRoomAndQuantity,
  getLogOfRoom,
  insertLog,
  getRoomWithName,
  insertMember,
  insertRoom,
  insertMemberToRoom,
  getMembersOfRoom,
  lockRoom,
  unlockRoom,
  lockMember,
  unlockMember,
  getMemberWithName,
  LogOutRoom,
};
