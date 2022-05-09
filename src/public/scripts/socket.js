const Socket = (function () {
    // stores the current Socket.IO socket
    let socket = null;

    // gets the socket from the module
    const getSocket = function () {
        return socket;
    };

    // connects the server and initializes the socket
    const connect = function () {
        socket = io();

        // wait for the socket to connect successfully
        socket.on("connect", () => {
            socket.emit("get users");
        });

        socket.on("users", (onlineUsers) => {
            onlineUsers = JSON.parse(onlineUsers);
        });

        socket.on("add user", (user) => {
            user = JSON.parse(user);
        });

        socket.on("remove user", (user) => {
            user = JSON.parse(user);
        });

        socket.on("join", (user) => {
            user = JSON.parse(user);
        });

        socket.on("start", (res) => {
            const { players, paragraph } = JSON.parse(res);
            GamePanel.startGame(players, paragraph);
        });

        socket.on("update wpm", (res) => {
            const { user, wpm, width } = JSON.parse(res);
            GamePanel.updateWPM(user, wpm, width);
        });

        socket.on("stats", (res) => {
            const { user, rank, author, recentWPM} = JSON.parse(res);
        });
    };

    // disconnects the socket from the server
    const disconnect = () => {
        socket.disconnect();
        socket = null;
    };

    const ready = () => {
        if (socket && socket.connected) {
            socket.emit("ready");
        }
    };

    const currentWPM = (wpm, width) => {
        if (socket && socket.connected) {
            socket.emit("current wpm", wpm, width);
        }
    };

    const complete = (wpm) => {
        if (socket && socket.connected) {
            socket.emit("complete", wpm);
        }
    };

    return { getSocket, connect, disconnect, ready, currentWPM, complete };
})();
