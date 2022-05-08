const Socket = (function() {
    // This stores the current Socket.IO socket
    let socket = null;

    // This function gets the socket from the module
    const getSocket = function() {
        return socket;
    };

    // This function connects the server and initializes the socket
    const connect = function() {
        socket = io();

        // Wait for the socket to connect successfully
        socket.on("connect", () => {
            socket.emit("get users");
        });

        // Set up the users event
        socket.on("users", (onlineUsers) => {
            onlineUsers = JSON.parse(onlineUsers);
        });

        // Set up the add user event
        socket.on("add user", (user) => {
            user = JSON.parse(user);
        });

        // Set up the remove user event
        socket.on("remove user", (user) => {
            user = JSON.parse(user);
        });

        socket.on("typing", (user) => {
            const TypingUser = JSON.parse(user);
            if (TypingUser.username != Authentication.getUser().username);
        });

        socket.on("update progress", (chatroom) => {
            //RaceTrack.update(chatroom);
        });

        socket.on("update Topnav WPM", (AverageWPM) => {
            //document.getElementById("AverageWPM").innerHTML = AverageWPM;
        });

        socket.on("start", (GamePlayers) => {
            GamePlayers = JSON.parse(GamePlayers);
            console.log("start");
            GamePanel.startGame(GamePlayers, "Hi.");
        });

        socket.on("update WPM", (WPM) => {
            console.log("Updata WPM");
            socket.emit("update users_json WPM",(WPM));
        });

        socket.on("update data", (GamePlayers) => {
            GamePlayers = JSON.parse(GamePlayers);
            console.log("Updata all players' data");
            socket.emit("update users_json");
        });
    };

    // This function disconnects the socket from the server
    const disconnect = function() {
        socket.disconnect();
        socket = null;
    };

    const ready = function() {
        if (socket && socket.connected) {
            socket.emit("ready");
        }
    };

    const typingMessage = function() {
        if (socket && socket.connected) {
            socket.emit("typing");
        }
    };

    const finished = function(wpm) {
        console.log(wpm);
        if (socket && socket.connected) {
            socket.emit("complete",(wpm));
        }
    };

    return { getSocket, connect, disconnect, ready, typingMessage, finished};
})();
