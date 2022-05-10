const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");
const app = express();
const fetch = require("node-fetch");

app.use(express.static("public"));
app.use(express.json());

const gameSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});
app.use(gameSession);

// checks whether the text only contains word characters
let containWordCharsOnly = (s) => /^\w+$/.test(s);

app.post("/register", (req, res) => {
    const { username, displayName, carId, password } = req.body;
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    // username, displayName, carId and password cannot be empty
    if (!username || !displayName || !carId || !password) {
        res.json({
            status: "error",
            error: "All fields must not be empty."
        });
        return;
    }
    // username only contains underscores, letters or numbers
    if (!containWordCharsOnly(username)) {
        res.json({
            status: "error",
            error: "The username can only contain underscores, letters or numbers."
        });
        return;
    }
    // username does not exist in the current list of users
    if (username in users) {
        res.json({
            status: "error",
            error: "The username is already used."
        });
        return;
    }

    users[username] = { displayName, carId, password: bcrypt.hashSync(password, 10), recentWPM: new Array(10), raceCount: 0, winCount: 0 }

    fs.writeFileSync("data/users.json", JSON.stringify(users, null, "\t"));
    res.json({ status: "success" });
});

app.post("/signin", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    // check username and password
    if (username in users) {
        let user = users[username];
        if (bcrypt.compareSync(password, user.password)) {
            req.session.user = { username, carId: user.carId, recentWPM: user.recentWPM, displayName: user.displayName };
            res.json({
                status: "success",
                user: { username, carId: user.carId, recentWPM: user.recentWPM, displayName: user.displayName }
            })
            return;
        }
    }
    res.json({
        status: "error",
        error: "Incorrect username/password."
    });
});

app.get("/validate", (req, res) => {
    if (!req.session.user) {
        res.json({
            status: "error",
            error: "You have not signed in."
        });
        return;
    }
    let user = req.session.user;
    res.json({
        status: "success",
        user: { username: user.username, carId: user.carId, recentWPM: user.recentWPM, displayName: user.displayName }
    })
});

app.get("/signout", (req, res) => {
    if (req.session.user) delete req.session.user;
    res.json({ status: "success" });
});

// create the socket.io server
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

// use the session in the socket.io server
io.use((socket, next) => {
    gameSession(socket.request, {}, next);
})

// a js object storing the online users
const onlineUsers = {};
var GamePlayer = [];
GameStarted = false;
winner = true;
rank = [];
quote = {};

const RANDOM_QUOTE_API_URL = 'https://api.quotable.io/random?minLength=200&maxLength=300'

function renderNewQuote() {
    return fetch(RANDOM_QUOTE_API_URL)
        .then(response => response.json())
        .then(data => data)
}
async function getRandomQuote() {
    quote = {}
    data = await renderNewQuote()
    quote = {
        content: data.content,
        author: data.author
    }
}

io.on("connection", (socket) => {

    // add a new user to the online user list
    if (socket.request.session.user) {
        const { username, carId, displayName, recentWPM } = socket.request.session.user;
        onlineUsers[username] = { carId, displayName, ready: false, username, recentWPM };
        res = []
        if (!GameStarted && GamePlayer.length == 0) {
        }
        else if (GamePlayer.length > 0 && !GameStarted) {
            for (player in GamePlayer) {
                data = { user: GamePlayer[player], wpm: null, width: null, rank: null }
                res.push(data)
            }
        }
        else if (GamePlayer.length > 0 && GameStarted) {
            for (player in GamePlayer) {
                ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                if (ranking > -1) {
                    GamePlayer[player].rank = ranking + 1
                } else { GamePlayer[player].rank = null }

                if (GamePlayer[player].width == null)
                    data = { user: GamePlayer[player], wpm: 0, width: null, rank: null }
                else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                res.push(data)
            }
        }
        io.emit("status", JSON.stringify(res));
        // broadcast the signed-in user
        io.emit("add user", JSON.stringify(socket.request.session.user));
    }

    socket.on("get status", () => {
        if (socket.request.session.user) {
            res = []
            if (!GameStarted && GamePlayer.length == 0) {
            }
            else if (GamePlayer.length > 0 && !GameStarted) {
                for (player in GamePlayer) {
                    data = { user: GamePlayer[player], wpm: null, width: null, rank: null }
                    res.push(data)
                }
            }
            else if (GamePlayer.length > 0 && GameStarted) {
                for (player in GamePlayer) {
                    ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                    if (ranking > -1) {
                        GamePlayer[player].rank = ranking + 1
                    } else { GamePlayer[player].rank = null }

                    if (GamePlayer[player].width == null)
                        data = { user: GamePlayer[player], wpm: 0, width: null, rank: null }
                    else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                    res.push(data)
                }
            }
            socket.emit("status", JSON.stringify(res));
        }
    });

    socket.on("disconnect", () => {
        // remove the user from the online user list
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username]) delete onlineUsers[username];
            index = GamePlayer.findIndex(obj => obj.username == username);
            if (index >= 0) GamePlayer.splice(index, 1);
            res = []
            for (player in GamePlayer) {
                ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                if (ranking > -1) {
                    GamePlayer[player].rank = ranking + 1
                } else { GamePlayer[player].rank = null }

                if (GamePlayer[player].width == null)
                    data = { user: GamePlayer[player], wpm: null, width: null, rank: null }
                else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                res.push(data)
            }
            io.emit("status", JSON.stringify(res));
            if (Object.keys(onlineUsers).length == 0 || GamePlayer.length == 0) {
                GameStarted = false;
                getRandomQuote()
            }
            // broadcast the signed-out user
            io.emit("remove user", JSON.stringify(socket.request.session.user));
        }
    });

    socket.on("get users", () => {
        socket.emit("users", JSON.stringify(onlineUsers));
    });

    socket.on("ready", () => {
        timeRemaining = 10;
        function countdown() {
            // Decrease the remaining time
            timeRemaining--;
            // Continue the countdown if there is still time;
            if (timeRemaining > 0 && GamePlayer.length) {
                console.log("timeremain:", timeRemaining)
                io.emit("countdown", JSON.stringify({ players: GamePlayer, time: timeRemaining }))
                setTimeout(countdown, 1000);
            }
            else if (timeRemaining == 0 && GamePlayer.length) {   // otherwise, start the game when the time is up
                paragraph = "I go to school by bus"
                rank = [];
                io.emit("start", JSON.stringify({ players: GamePlayer, paragraph: quote["content"] })); // broadcast “start” request (parameters: players array, paragraph)
                GameStarted = true;
                console.log("GameStarted:", GameStarted)
            }
            else { }
        }

        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username] && !GameStarted && !onlineUsers[username].ready) {
                onlineUsers[username].ready = true;
                if (GamePlayer.length == 0) setTimeout(countdown, 1000);
                GamePlayer.push(onlineUsers[username]);     //adds user to players array
            }
            res = []
            if (!GameStarted && GamePlayer.length == 0) {
            }
            else if (GamePlayer.length > 0 && !GameStarted) {
                for (player in GamePlayer) {
                    data = { user: GamePlayer[player], wpm: null, width: null, rank: null }
                    res.push(data)
                }
            }
            else if (GamePlayer.length > 0 && GameStarted) {
                for (player in GamePlayer) {
                    ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                    if (ranking > -1) {
                        GamePlayer[player].rank = ranking + 1
                    } else { GamePlayer[player].rank = null }

                    if (GamePlayer[player].width == null)
                        data = { user: GamePlayer[player], wpm: 0, width: null, rank: null }
                    else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                    res.push(data)
                }
            }
            io.emit("status", JSON.stringify(res));
        }

    });


    // set up the typing event listener for "typing" event from socket.js
    socket.on("current wpm", ({ wpm, width }) => {
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            index = GamePlayer.findIndex(obj => obj.username == username);
            GamePlayer[index].wpm = wpm
            GamePlayer[index].width = width
            res = []
            if (!GameStarted && GamePlayer.length == 0) {
            }
            else if (GamePlayer.length > 0 && !GameStarted) {
                for (player in GamePlayer) {
                    data = { user: GamePlayer[player], wpm: null, width: null, rank: null }
                    res.push(data)
                }
            }
            else if (GamePlayer.length > 0 && GameStarted) {
                for (player in GamePlayer) {
                    ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                    if (ranking > -1) {
                        GamePlayer[player].rank = ranking + 1
                    } else { GamePlayer[player].rank = null }

                    if (GamePlayer[player].width == null)
                        data = { user: GamePlayer[player], wpm: 0, width: null, rank: null }
                    else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                    res.push(data)
                }
            }
            io.emit("status", JSON.stringify(res));
        }
    });

    socket.on("complete", (wpm) => {
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            index = GamePlayer.findIndex(obj => obj.username == username);
            if (index >= 0) {
                GamePlayer[index].ready = false;
                onlineUsers[username].ready = false;
                rank.push(GamePlayer[index])
                ranking = rank.findIndex(obj => obj.username == username) + 1;
                const users = JSON.parse(fs.readFileSync("data/users.json", "utf-8"));
                users[username].raceCount += 1;
                if (ranking == 1) users[username].winCount += 1;
                users[username].recentWPM.unshift(wpm);                                                     // adds new elements to the beginning of an array. 
                users[username].recentWPM.pop();
                SumWPM = users[username].recentWPM.reduce((x, y) => x + y, 0);
                NumberofGames = users[username].recentWPM.filter(x => x !== null).length;                  //incase it is new user with null array
                AverageWPM = SumWPM / NumberofGames
                fs.writeFileSync("data/users.json", JSON.stringify(users, null, "\t"));
                author = "Anonymous"
                users[username]["username"] = username;
                io.emit("stats", JSON.stringify({ user: users[username], rank: ranking, author: quote["author"], recentWPM: AverageWPM, paragraph: quote["content"] }));

                res = []
                for (player in GamePlayer) {
                    ranking = rank.findIndex(obj => obj.username == GamePlayer[player].username);
                    if (ranking > -1) {
                        GamePlayer[player].rank = ranking + 1
                    } else { GamePlayer[player].rank = null }

                    if (GamePlayer[player].width == null)
                        data = { user: GamePlayer[player], wpm: 0, width: null, rank: null }
                    else { data = { user: GamePlayer[player], wpm: GamePlayer[player].wpm, width: GamePlayer[player].width, rank: GamePlayer[player].rank } }
                    res.push(data)
                }
                io.emit("status", JSON.stringify(res));
            }
        }
        allFinish = true;
        for (const user in GamePlayer) {
            if (GamePlayer[user].ready == true)
                allFinish = false;
        }
        if (allFinish & GameStarted) {    //check if the game has started
            function cooldown() {
                GameStarted = false;
                console.log("cooldown complete")
            }
            setTimeout(cooldown, 10000);
            io.emit("end",JSON.stringify(rank))
            console.log("end")
            getRandomQuote()
            rank = [];
            GamePlayer = [];
        }
    });
});

// Use a web server to listen at port 8000
const port = 8000;
httpServer.listen(port, () => {
    console.log(`server running on http://localhost:${port}`);
    getRandomQuote()
});
