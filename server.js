const express = require("express")
const https = require("https")
const fs = require("fs")
const cors = require("cors")
const Login = require("./login")



const app = express()
const server = https.createServer({
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
}, app)
const { Server } = require("socket.io");
const io = new Server(server)

const ExpressPeerServer = require("peer").ExpressPeerServer;
const peerServer = ExpressPeerServer(server, {
  secure: true,
  debug : true,
  config: {
    'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
    ]
  }, /* Sample servers, please use appropriate ones */
});

app.use("/peerjs", peerServer)


app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs")




peerServer.on("connection", (client) => {console.log("connected")})
peerServer.on("error", (client) => {console.log(client)})

//status table
// 406 = user allready in channel
// 204 = user joined channel

//json scepatics
//channels = "channels_voice": [{"name": "nox channel 1","max": 5,"connected-users": []},{"name": "nox channel 2","max": 5,"connected-users": []}],

var channels = []
var allConnectedClients = []
var users = []
var readServerDatabase = fs.readFileSync(__dirname + "/Database/ServerDatabase.json")
readServerDatabase = JSON.parse(readServerDatabase)
readServerDatabase[0]["channels_voice"].forEach(element => {
  channels.push(element)
});
//console.log(channels)

app.get("/", (req, res) => {
  res.render("login")
})

app.post("/loginReq", (req, res) => {
  console.log(req.body)
  var logindata = new Login(req.body.username, req.body.password)
  var loginProcess = logindata.login()
  var userdata = logindata.database
  var userIndex = logindata.userIndex
  userdata[userIndex]["passwordhash"] = undefined

  res.json(loginProcess)
  app.get("/" + loginProcess.loginID, (req, res) => {
    users.push({ "userData": userdata[userIndex], "userid": loginProcess.loginID })
    res.render("room", { "userData": userdata[userIndex], "userid": loginProcess.loginID });
  })
})


io.on("connection", (socket) => {

  socket.on("userInfo", (data) => {
    allConnectedClients.push({ "userid": data.userid, "socket": socket})
    //console.log(allConnectedClients)
  })


  socket.on("UserIsInChannelSendCall", (myID) => {
    socket.broadcast.emit("UserIsInChannelSendCallResponse", myID)
  })

  socket.on("userleftChannel", (user) => {
    socket.broadcast.emit("userleftChannelResponse", user)
    allConnectedClients.forEach(clientData => {
      if (clientData.socket == socket) {
        channels.forEach(element => {
          var v = element["connected-users"].indexOf(clientData.userid)
          if (v != -1) {
            element["connected-users"].splice(v, 1)
          }
          //console.log(element)
        })
      }

    })
  })

  socket.on("getChannels", () => {
    socket.emit("getChannelsResponse", { "channelInfo": channels })
  })

  socket.on("getUser" , (data) => {
    
    var json = getUser(data)
    socket.emit("getUserResponse", json)
  })


  socket.on("JoinedChannel" , (data) => {
    for (var index = 0; index < channels.length; index++) {
      console.log(channels[index])
      if (data.channelName == channels[index]["name"]) {
        if (channels[index]["connected-users"].indexOf(data.userid) != -1) {
          socket.emit("JoinedChannelResponse", {"status" : "406"})
          return
        } else {
          channels[index]["connected-users"].push(data.userid)
          var json = getUser(data)
          socket.broadcast.emit("UserJoinedChannel", json)
          socket.emit("JoinedChannelResponse", {"status" : "204"})
          return
        }
      } else {
        console.log("no matching names")
      }
    }
  })


  socket.on("disconnect", () => {
    //allConnectedClients.forEach(clientData => {
    //  if (clientData.socket == socket) {
    //    channels.forEach(element => {
    //      var v = element["connected-users"].indexOf(clientData.userid)
     //     if (v != -1) {
      //      //element["connected-users"].splice(v, 1)
     //     }
    //      console.log(element)
     //   })
    //  }

    //})

  })
  socket.emit("channelInfo", { "channelInfo": channels })

  var readServerDatabase = fs.readFileSync(__dirname + "/Database/ServerDatabase.json")
  readServerDatabase = JSON.parse(readServerDatabase)
  socket.emit("User-connected", readServerDatabase)
})

function getUser(data) {
  var json = { "userdata": "", "channels": [] }
    for (var ii = 0; ii < channels.length; ii++) {
      if (channels[ii]["connected-users"].indexOf(data.userid) != -1) {
        json.channels.push(channels[ii]["name"])
      }
    }
    for (var i = 0; i < users.length; i++) {

      if (data.userid == users[i].userid) {

        json.userdata = { "userdata": users[i]["userData"] }
        
        return json
      }
    }
}

app.get("/test" , (req,res) => {
  
})

server.listen(3001, () => {
  console.log("running on port 8080")
})