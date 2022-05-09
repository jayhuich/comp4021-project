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
rank = []

io.on("connection", (socket) => {

    // add a new user to the online user list
    if (socket.request.session.user) {
        const { username, carId, displayName } = socket.request.session.user;
        onlineUsers[username] = { carId, displayName, ready:false, username };
        console.log("onlineUsers:");
        console.log(onlineUsers);
        console.log("GameStarted:");
        console.log(GameStarted);
        // broadcast the signed-in user
        io.emit("add user", JSON.stringify(socket.request.session.user));
    }

    socket.on("disconnect", () => {
        // remove the user from the online user list
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username]) delete onlineUsers[username];
            index = GamePlayer.findIndex(obj => obj.username == username);
            if (index>=0) GamePlayer.splice(index, 1);
            console.log("onlineUsers:");
            console.log(onlineUsers);
            console.log("GamePlayer:");
            console.log(GamePlayer);
            console.log(Object.keys(onlineUsers).length)
            if(Object.keys(onlineUsers).length==0) GameStarted = false;
            console.log("GameStarted:")
            console.log(GameStarted);
            // broadcast the signed-out user
            io.emit("remove user", JSON.stringify(socket.request.session.user));
        }
    });

    socket.on("get users", () => {
        socket.emit("users", JSON.stringify(onlineUsers));
    });

    socket.on("ready", () => {
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username] && !GameStarted && !onlineUsers[username].ready){
                onlineUsers[username].ready = true;
                GamePlayer.push(onlineUsers[username]);     //adds user to players array
            }
        console.log("onlineUsers:")
        console.log(onlineUsers);
        io.emit("join", JSON.stringify(GamePlayer));  // broadcast “join game” request (parameters should have players array)
        //Object.keys(onlineUsers)
        if(GamePlayer.length>1){
            paragraph = "I go to school by bus"
            io.emit("start", JSON.stringify({players:GamePlayer,paragraph:paragraph})); // broadcast “start” request (parameters: players array, paragraph)
            console.log("GamePlayer:");
            console.log(GamePlayer);
            GameStarted = true;
            console.log("GameStarted:")
            console.log(GameStarted);
        }
        
        function intervalTimer(time) {
            let counter = 1;
            const startTime = Date.now();

            function main() {
              const nowTime = Date.now();
              const nextTime = startTime + counter * time;
              if (nowTime - nextTime >= 0) {
                console.log(counter);
                counter += 1;
              }
            }

            while (counter<=10) {
              main();
            }
        }
        intervalTimer(1000);
        /*
        timeRemaining = 10;
        num_players = GamePlayer.length;
        var x = setInterval(function() {            
            timeRemaining--;
            // Continue the countdown if there is still time;
            if (timeRemaining>0 && num_players>=GamePlayer.length){
                console.log(timeRemaining)
                //io.emit("countdown", JSON.stringify({players:GamePlayer,timeremain:timeRemaining}));  // broadcast “countdown” request (parameters should have players array), 10s
                num_players = GamePlayer.length;
            }
            else if(timeRemaining<=0){   // otherwise, start the game when the time is up
                clearInterval(x);
                paragraph = "I go to school by bus"
                io.emit("start", JSON.stringify({players:GamePlayer,paragraph:paragraph})); // broadcast “start” request (parameters: players array, paragraph)
                console.log("GamePlayer:");
                console.log(GamePlayer);
                GameStarted = true;
                console.log("GameStarted:")
                console.log(GameStarted);
            }else{
                clearInterval(x);
            }
        },1000);
        */
        // timeout 10s
        
        }
    });
    
    
    // set up the typing event listener for "typing" event from socket.js
    socket.on("current wpm", ({wpm, width}) => {
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            index = GamePlayer.findIndex(obj => obj.username == username);
            io.emit("update wpm", JSON.stringify({user:GamePlayer[index], wpm:wpm, width:width}));
        }
    });

    socket.on("complete", (wpm) => {
        if(socket.request.session.user){
            const { username } = socket.request.session.user;
            console.log("This guy just finish:");
            console.log(username);
            index = GamePlayer.findIndex(obj => obj.username == username);
            if (index>=0)
            {
                GamePlayer[index].ready = false;
                onlineUsers[username].ready = false;
                rank.push(GamePlayer[index])
                console.log(rank)
                ranking = rank.findIndex(obj => obj.username == username)+1;
                const users = JSON.parse(fs.readFileSync("data/users.json", "utf-8"));
                users[username].raceCount += 1 ;   
                if(ranking==1) users[username].winCount += 1 ;
                users[username].recentWPM.unshift(wpm);                                                     // adds new elements to the beginning of an array. 
                users[username].recentWPM.pop(); 
                SumWPM = users[username].recentWPM.reduce((x, y) => x + y, 0) ;
                NumberofGames = users[username].recentWPM.filter(x => x !== null).length ;                  //incase it is new user with null array
                AverageWPM = SumWPM/NumberofGames
                fs.writeFileSync("data/users.json", JSON.stringify(users, null, "\t"));
                author = "Anonymous"
                users[username]["username"] = username;
                io.emit("stats",JSON.stringify({user: users[username],rank:ranking,author:author,recentWPM:AverageWPM}));
                //io.emit("update Topnav WPM", AverageWPM);\
                /*
                var element = GamePlayer[index];
                GamePlayer.splice(index, 1);
                GamePlayer.splice(Object.keys(GamePlayer).length, 0, element);
                */
            }
            console.log("GamePlayer:");
            console.log(GamePlayer);
        }
        allFinish = true;
        for (const user in GamePlayer) {
            if(GamePlayer[user].ready == true) 
                allFinish = false;
        }
        if (allFinish & GameStarted){    //check if the game has started
            GameStarted = false;
            rank = [];
            GamePlayer = [];
            console.log("onlineUsers:");
            console.log(onlineUsers);
        }
    });
});

// Use a web server to listen at port 8000
const port = 8000;
httpServer.listen(port, () => {
    console.log(`server running on http://localhost:${port}`);
});


/*
     const RANDOM_QUOTE_API_URL = 'https://api.quotable.io/random?maxLength=20'
    function renderNewQuote() {
        return fetch(RANDOM_QUOTE_API_URL)
            .then(response => response.json())
            .then(data => data)
    }
    async function getRandomQuote() {
        quote = await renderNewQuote()
    }
    getRandomQuote()
*/

