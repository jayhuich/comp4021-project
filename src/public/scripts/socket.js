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
            //OnlineUsersPanel.update(onlineUsers);
        });

        // Set up the add user event
        socket.on("add user", (user) => {
            user = JSON.parse(user);
            //OnlineUsersPanel.addUser(user);
        });

        // Set up the remove user event
        socket.on("remove user", (user) => {
            user = JSON.parse(user);
            //OnlineUsersPanel.removeUser(user);
        });

        socket.on("typing", (user) => {
            const TypingUser = JSON.parse(user);
            if (TypingUser.username != Authentication.getUser().username)
                GamePanel.typing();
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
            GamePanel.startGame(GamePlayers, "Beginning today, treat everyone you meet as if they were going to be dead by midnight. Extend to them all the care, kindness and understanding you can muster, and do it with no thought of any reward. Your life will never be the same again.");
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

    return { getSocket, connect, disconnect, ready, typingMessage};
})();
