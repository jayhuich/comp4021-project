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
            console.log("connected to socket")
            getStatus();
        });

        socket.on("status", (res) => {
            res = JSON.parse(res);
            const state = (!res.length ? 'idle' : res[0].wpm == null ? 'ready' : 'game');
            console.log('status response: '+ state, res);
            GamePanel.changeGameState(state, res);
        });

        socket.on("countdown", (res) => {
            const { time, players } = JSON.parse(res);
            GamePanel.changeGameState('ready', players.map((e) => ({ user: e, wpm: null, width: null })));
            GamePanel.countdown(time);
        });

        socket.on("start", (res) => {
            const { players, paragraph } = JSON.parse(res);
            GamePanel.changeGameState('game');
            GamePanel.startGame(players, paragraph);
        });

        socket.on("stats", (res) => {
            const { user, rank, paragraph, author, recentWPM } = JSON.parse(res);
            GamePanel.changeGameState('game');
            GamePanel.finished(user, rank);
            StatsPanel.storeInfo(paragraph, author, recentWPM);
        });

        socket.on("end", () => {
            GamePanel.changeGameState('game');
            GamePanel.endGame();
        });
    };

    // disconnects the socket from the server
    const disconnect = () => {
        socket.disconnect();
        socket = null;
    };

    const getStatus = () => {
        socket.emit("get status");
    }

    const ready = () => {
        if (socket && socket.connected) {
            socket.emit("ready");
        }
    };

    // sends self wpm to server to update other players' clients
    const sendWPM = (wpm, width) => {
        if (socket && socket.connected) {
            socket.emit("current wpm", { wpm: wpm, width: width });
        }
    };

    const complete = (wpm) => {
        if (socket && socket.connected) {
            socket.emit("complete", wpm);
        }
    };

    return { getSocket, connect, disconnect, getStatus, ready, sendWPM, complete };
})();
