const Socket = (() => {
    // stores the current Socket.IO socket
    let socket = null;

    // gets the socket from the module
    const getSocket = () => {
        return socket;
    };

    // connects the server and initializes the socket
    const connect = () => {
        socket = io();

        // wait for the socket to connect successfully
        socket.on("connect", () => {
            socket.emit("get users");
        });

        socket.on("change player", (res) => {
            const { players, paragraph } = JSON.parse(res);
            GamePanel.recalibratePlayers(players, paragraph);
        });

        socket.on("get players", (players) => {
            players = JSON.parse(players);
        });

        socket.on("countdown", (time) => {
            time = JSON.parse(time);
            GamePanel.countdown(time);
        });

        socket.on("start", (res) => {
            const { players, paragraph } = JSON.parse(res);
            GamePanel.startGame(players, paragraph);
        });

        // for receiving the wpm from other players to update ui
        socket.on("update wpm", (res) => {
            const { user, wpm, width } = JSON.parse(res);
            console.log( JSON.parse(res));
            GamePanel.updateWPM(user, wpm, width);
        });

        socket.on("stats", (res) => {
            const { user, rank, author, recentWPM } = JSON.parse(res);
            GamePanel.finished(user, rank, author, recentWPM);
        });

        socket.on("end", () => {
            GamePanel.endGame();
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

    // sends self wpm to server to update other players' clients
    const currentWPM = (wpm, width) => {
        if (socket && socket.connected) {
            socket.emit("current wpm", { wpm: wpm, width: width });
        }
    };

    const complete = (wpm) => {
        if (socket && socket.connected) {
            socket.emit("complete", wpm);
        }
    };

    return { getSocket, connect, disconnect, ready, currentWPM, complete };
})();
