const socket = io("/")


let myVideoStream;
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

//var peer = new Peer(userid.toString(), {
//    path: "/peerjs",
//    host: "/",
//    port: "3001",
//})


//Chat
document.getElementById("text-submit").addEventListener("keypress", e => {
    if(e.key === "Enter") {
        console.log("submited chat")
        var text = document.getElementById("text-submit").value
        console.log(text)
        socket.emit("user-send-text", {"text" : text, "userid": userid})
    }
})
socket.on("load-database-text-chat" , (data) => {
    
    console.log(data)
})

socket.on("user-sent-a-text-message", (data) => {
    console.log(data)
    var textdata = data.text
    var username = data.username
    var profile_picture = data.user_profile
    document.getElementById("chat-messages").insertAdjacentHTML("beforeend", `
        <div class="message" id="text-user`+ username + `">
            <img src="`+ profile_picture + `" alt="avatar" style="width:15%; height:15%;">
            <div class="message__info">
                <h4>`+ username + `</h4>
                <p> `+textdata+`</p>
            </div>
        </div>
    `)
})









//VOICE
var channelIDs = []
var stream;
navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
})
.then((navStream) => {
    stream = navStream
});

socket.emit("userInfo", { "userid": userid })

//end call
document.getElementById("endCall").addEventListener("click", () => {
    console.log("endcall")
    document.getElementById("user" + userdata["username"]).remove()

    socket.emit("userleftChannel", userdata["username"])
    peer.close()
})
socket.on("userleftChannelResponse", (data) => {
    console.log(data)
    document.getElementById("user" + data).remove()
})
//render channels when i connect to the server
socket.on("User-connected", (data) => {
    var channels_data = data[0]["channels_voice"]
    for (var channels = 0; channels < channels_data.length; channels++) {

        document.getElementById("channels").insertAdjacentHTML("afterbegin", `
        <br> 
    
        <div class="sidebar__user" id="channel` + channels_data[channels]["name"] + `">
            <div>
                <span class="status"></span>
                <i class="fa-solid fa-volume-high"></i>
                <br>
                
            </div>
            <h4>` + channels_data[channels]["name"] + ` </h4>
        </div>
        <div id="user` + channels_data[channels]["name"] + `" > 
                
        </div>
        `)
        ChannelClickEvent(channels_data[channels]["name"])
    }

})

//when i click on a channel
function ChannelClickEvent(name) {
    document.getElementById("channel" + name).addEventListener("click", () => {
        //add id to channel 
        //add css so you can see channel
        //data {"userid" : userid, "channelName" : name}
        socket.emit("JoinedChannel", { "userid": userid, "channelName": name })

        socket.emit("getChannels", {});

        socket.on("JoinedChannelResponse", (data) => {
            if (data.status == 406) {
                alert("you are allready in channel")
            } else {
                document.getElementById("user" + name).insertAdjacentHTML("afterbegin", `
                    <div class="message" id="user`+ userdata["username"] + `">
                        <img src="`+ userdata["profile_picture"] + `" alt="avatar" style="width:15%; height:15%;">
                        <div class="message__info">
                            <h4>`+ userdata["username"] + `</h4>
                        </div>
                    </div>
                `)
            }
        })
    })
}
//when I join the channel
socket.on("getChannelsResponse", (data) => {
    console.log("channel data " + JSON.stringify(data))
    for (var i = 0; i < data["channelInfo"].length; i++) {
        console.log("channel data " + JSON.stringify(data["channelInfo"][i]["connected-users"]))

        for (var ii = 0; ii < data["channelInfo"][i]["connected-users"].length; ii++) {
            if (data["channelInfo"][i]["connected-users"][ii] != userid) {
                //connectToNewUser(data["channelInfo"][i]["connected-users"][ii])
                var myID = createMyID(userid, data["channelInfo"][i]['connected-users'][ii])
                createNewPeerOnCall(myID)
                socket.emit("UserIsInChannelSendCall", myID)
            }
        }

    }
})
//when a user joins a channel dont depend on if im in it or not
socket.on("UserJoinedChannel", (data) => {
    console.log(data)
    var userdata = data["userdata"]["userdata"]
    console.log(userdata)
    data["channels"].forEach(element => {

        document.getElementById("user" + element).insertAdjacentHTML("afterbegin", `
            <div class="message" id="user`+ userdata["username"] + `">
                <img src="`+ userdata["profile_picture"] + `" alt="avatar" style="width:15%; height:15%;">
                <div class="message__info">
                    <h4>`+ userdata["username"] + `</h4>
                </div>
            </div>
        `)
    })
})

//render people in channels if someone joins
socket.on("getUserResponse", (userdata) => {

    userdata["channels"].forEach(element => {

        document.getElementById("user" + element).insertAdjacentHTML("afterbegin", `
        <div class="message" id="user`+ userdata["userdata"]["userdata"]["username"] + `">
            <img src="`+ userdata["userdata"]["userdata"]["profile_picture"] + `" alt="avatar" style="width:15%; height:15%;">
            <div class="message__info">
            <h4>`+ userdata["userdata"]["userdata"]["username"] + `</h4>
            </div>
        </div>
    `)
    });
})


//information about channels connect to user even if you reload your page
socket.on("channelInfo", (data) => {
    console.log("channel info " + JSON.stringify(data))

    for (var i = 0; i < data["channelInfo"].length; i++) {
        for (var ii = 0; ii < data["channelInfo"][i]['connected-users'].length; ii++) {
            if (userid != data["channelInfo"][i]['connected-users'][ii]) {
                //connectToNewUser(data["channelInfo"][i]["connected-users"][ii])
                
            }
            
            socket.emit("getUser", { "userid": data["channelInfo"][i]["connected-users"][ii] })

        }

    }

})

//id will be your userid and the peers usersid
//exemple = you him = 823823A849230

//math for id gen n = users, n(2(n-1))
//exemple = n = 10, 10(2(10-1)) = 180 ids
//tot peer connections = (n(2(n-1)))/2
//exemple = 180 ids / 2 = 90

socket.on("UserIsInChannelSendCallResponse", (callID) => {
    peerid = callID.split("A")
    var myID = createMyID(userid, peerid[0])
    createNewCallPeer(callID, myID)
})


function createNewCallPeer(callID, myID) {
    var peer = new Peer(myID, {
        path: "/peerjs",
        host: "192.168.2.133",
        port: "3001",
    })
    peer.on("open", (id) => {
        console.log(myID, peer, "this is the open id: " + id)
        console.log("makes the call", callID)
        connectToNewUser(callID, peer)
    })
    
}

function createNewPeerOnCall(myID) {
    // create it with my id and other peers id
    
    var peer = new Peer(myID, {
        path: "/peerjs",
        host: "192.168.2.133",
        port: "3001",
    })
    peer.on("open", (id) => {
        console.log(myID, peer, "this is the open id: " + id)
        onCall(peer)
    })
    
}


const onCall = (peer) => {
    const video = document.createElement("video")
    peer.on("call", (call) => {
        console.log("Got call from: " + peer.id)
        
        video.setAttribute("id", userid)
        
        call.answer(stream)
        call.on("stream", (userVideoStream) => {
            console.log("tewst hehj ")
            addVideoStream(video, userVideoStream)
        });
    
    }); 
}

function createMyID(userid, peerid) {
    var yourid = userid.toString() + "a" + peerid.toString() 
    return yourid;
}

const connectToNewUser = (userid, peer) => {
    const video = document.createElement("video")
    video.setAttribute("id", userid)
    setTimeout(() => {
        const call = peer.call(userid, stream)
    
        call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream)
        })
    },2000)
    
}

//id not created when their is more then one

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
        videoGrid.append(video);
    });
};

async function postRequest(url = "", data = {}) {
    // Default options are marked with *
    const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            'Accept': 'application/json',
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });
    return response.json();
}
async function getRequest(url = "") {
    // Default options are marked with *
    const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            'Accept': 'application/json',
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    });
    return response.json();
}
