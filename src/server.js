const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");
const app = express();

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

io.on("connection", (socket) => {

    // add a new user to the online user list
    if (socket.request.session.user) {
        const { username, carId, displayName } = socket.request.session.user;
        onlineUsers[username] = { carId, displayName };

        // broadcast the signed-in user
        io.emit("add user", JSON.stringify(socket.request.session.user));
    }

    socket.on("disconnect", () => {

        // remove the user from the online user list
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username]) delete onlineUsers[username];

            // broadcast the signed-out user
            io.emit("remove user", JSON.stringify(socket.request.session.user));
        }
    });
});

// Use a web server to listen at port 8000
const port = 8000;
httpServer.listen(port, () => {
    console.log(`server running on http://localhost:${port}`);
});
