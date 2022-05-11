const SignInForm = (() => {
    const initialize = () => {
        $("#signin-modal").hide();
        $("#register-modal-content").hide();

        // click event for switching between forms
        $(".signin-switch-button").on("click", () => {
            $("#signin-message").text("");
            $("#register-message").text("");
            if ($("#signin-modal-content").is(":hidden")) {
                $("#register-modal-content").hide();
                $("#signin-modal-content").show();
            }
            else {
                $("#signin-modal-content").hide();
                $("#register-modal-content").show();
            }
        });

        // submit event for the signin form
        $("#signin-form").on("submit", (e) => {

            // prevent submitting the form
            e.preventDefault();

            // get the input fields
            const username = $("#signin-username").val().trim();
            const password = $("#signin-password").val().trim();

            // send a signin request
            Authentication.signin(username, password,
                () => {
                    hide();
                    UserPanel.update(Authentication.getUser());
                    UserPanel.show();
                    Socket.connect();
                },
                (error) => { $("#signin-message").text(error); }
            );
        });

        $("#register-carid").on("change", (e) => {
            let carId = e.target.value;
            $("#register-carid-display").css("background-image", `url("img/car${carId}.svg")`);
        })

        // submit event for the register form
        $("#register-form").on("submit", (e) => {

            // prevent submitting the form
            e.preventDefault();

            // get the input fields
            const username = $("#register-username").val().toLowerCase().trim();
            const displayName = $("#register-displayname").val().trim();
            const carId = $("#register-carid").val();
            const password = $("#register-password").val().trim();
            const confirmPassword = $("#register-confirm").val().trim();

            // check passwords
            if (password != confirmPassword) {
                $("#register-message").text("passwords don't match.");
                return;
            }

            // send a register request
            Registration.register(username, displayName, carId, password,
                () => {
                    $("#register-form").get(0).reset();
                    $("#register-message").text("account created! redirecting to sign-in page...");
                    setTimeout(() => {
                        $(".signin-switch-button").first().trigger('click');
                    }, 2000);
                },
                (error) => { $("#register-message").text(error); }
            );
        });
    };

    const show = () => $("#signin-modal").fadeIn(500);
    const hide = () => {
        $("#signin-form").get(0).reset();
        $("#signin-message").text("");
        $("#register-message").text("");
        $("#signin-modal").fadeOut(500);
    };

    return { initialize, show, hide };
})();

const UserPanel = (() => {
    const initialize = () => {
        $("#user-panel").hide();

        // click event for signout button
        $("#signout-button").on("click", () => {
            // send a signout request
            Authentication.signout(
                () => {
                    Socket.disconnect();
                    hide();
                    SignInForm.show();
                }
            );
        });
    };

    const show = () => $("#user-panel").show();
    const hide = () => $("#user-panel").hide();

    // updates user panel
    const update = (user) => {
        if (user) {
            $("#user-panel .user-displayname").text(`hello, ${user.displayName}!`);
        }
        else {
            $("#user-panel .user-displayname").text("");
        }

        playBGM();
    };

    const playSFX = (source) => {
        const sfx = new Audio(`audio/${source}.wav`);
        sfx.play();
        sfx.volume = 0.3;
        sfx.loop = false;
    }

    const playBGM = () => {
        const bgm = new Audio(`audio/bgm.wav`);
        bgm.play();
        bgm.volume = 0.5;
        bgm.loop = true;
    }

    return { initialize, show, hide, update, playSFX, playBGM };
})();

const GamePanel = (() => {

    const states = {
        idle: 'idle',
        ready: 'ready',
        game: 'game'
    }

    const flexboxWidth = 10;
    const localPlayers = [];

    // used for stats
    const wpmArray = [];


    let gameState = states.idle;
    let gameStateObj = null;


    let gameParagraph;
    let gameInput;

    let startTime = null;

    const initialize = () => {

        // set up jquery objects
        gameParagraph = $("#game-paragraph");
        gameInput = $("#game-input");
        gameReadyButton = $("#game-ready-button");

        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
            $(`#game-flexbox-${i}`).css("width", flexboxWidth + '%');
            $(`#game-userdata-${i}`).empty();
            $(`#game-userrank-${i}`).empty();
            $(`#game-flag-${i}`).css("background-image", "none");
        }
        gameInput.val("type here...");
        gameInput.prop("disabled", true);
        gameInput.css("color", "#96989d");
        gameParagraph.text("press 'ready' to start!");
        gameReadyButton.prop("disabled", false);
        localPlayers.length = 0;
        startTime = null;

        // click event for ready
        $("#game-ready-button").on("click", () => {
            Socket.ready();
            UserPanel.playSFX('engine');
        });
    };

    const changeGameState = (val = null, res = null) => {
        if (val) gameState = states[val];
        if (res) {
            gameStateObj = res;
            recalibratePlayers(gameStateObj.map((e) => e.user), gameStateObj.map((e) => e.rank));
        }

        switch (gameState) {
            case states['idle']:
                initialize();
                break;
            case states['game']:
                if (gameStateObj != null)
                    for (e of gameStateObj) updateWPM(e.user, e.wpm || 0, e.width || flexboxWidth);
                if (!localPlayers.some((e) => e.username == selfPlayer().username)) wait();
                break;
        }
        return gameState;
    }

    // updates the ui with player changes from server
    const recalibratePlayers = (players, ranks = []) => {

        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
            $(`#game-userdata-${i}`).empty();
            $(`#game-userrank-${i}`).empty();
            $(`#game-flag-${i}`).css("background-image", "none");
        }
        localPlayers.length = 0;

        // add cars one by one
        for (let i = 0; i < players.length; i++) {

            // if player is inside, disable ready button
            if (selfPlayer().username == players[i].username && gameState == states['ready']) {
                gameReadyButton.prop("disabled", true);
                gameParagraph.empty();
            }
            const avg = Math.floor(players[i].recentWPM.reduce((a, b) => a + b) / players[i].recentWPM.length);
            localPlayers.push(players[i]);
            if (ranks.length && ranks[i]) finished(players[i], ranks[i]);
            $(`#game-car-${i}`).css("background-image", `url("img/car${players[i].carId}.svg")`);
            $(`#game-flexbox-${i}`).css("width", flexboxWidth + '%');
            $(`#game-car-${i}`).show();
            $(`#game-userdata-${i}`).html(`${players[i].displayName} (${players[i].username})<br>recent: ${avg} wpm`);
        }
    }

    // displays the countdown
    const countdown = (time) => {
        gameInput.val(`the game will automatically start in ${time} seconds...`)
    }

    // starts the game
    const startGame = (players, paragraph) => {

        // if someone isn't playing receives this, immediately deny them from joining the game.
        if (!players.some((e) => e.username == selfPlayer().username)) { return wait(); }

        recalibratePlayers(players);

        const wordArray = paragraph.split(' ');
        let currentWordIndex = 0;

        const charCountArray = [];
        let charCount = 0;
        for (word of wordArray) {
            charCount += word.length + 1;
            charCountArray.push(charCount);
        }

        let currentWpm = 0;
        let currentWidth = flexboxWidth;
        gameParagraph.empty();

        wordArray.forEach((word) => {
            const wordSpan = $("<span></span>").text(word + ' ');
            gameParagraph.append(wordSpan);
        });

        wpmArray.length = 0;
        gameInput.val("");
        gameInput.css("color", "white");
        gameInput.prop("disabled", false);
        gameInput.focus();
        startTime = new Date();

        // handle keydown event
        gameInput.keydown((e) => {
            const inputValue = gameInput.val().trim();

            if (e.key == ' ') {

                // cheat key
                if (inputValue == '4021') {
                    currentWordIndex = wordArray.length - 1;
                    currentWpm = 100;
                    currentWidth = Math.floor(charCountArray[currentWordIndex] / paragraph.length * (100 - flexboxWidth)) + flexboxWidth;
                    $(`#game-flexbox-${playerIndex(selfPlayer())}`).css("width", currentWidth + '%');
                    $('#game-paragraph > span').css("color", "#96989d");
                    currentWordIndex = wordArray.length;
                }

                // if word is correct
                if (inputValue == wordArray[currentWordIndex]) {
                    currentWpm = Math.floor((charCountArray[currentWordIndex] / 5) / timeElapsed('min'));
                    currentWidth = Math.floor(charCountArray[currentWordIndex] / paragraph.length * (100 - flexboxWidth)) + flexboxWidth;
                    $(`#game-flexbox-${playerIndex(selfPlayer())}`).css("width", currentWidth + '%');
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "#96989d");
                    wpmArray.push({ time: Math.floor(timeElapsed()), wpm: currentWpm, word: wordArray[currentWordIndex] });
                    gameInput.val('');
                    currentWordIndex++;
                }

                // if word is incorrect
                else {
                    currentWpm = currentWordIndex ? Math.floor((charCountArray[currentWordIndex - 1] / 5) / timeElapsed('min')) : 0;
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "red");
                }

                // call function in socket.js to emit "current wpm" event
                Socket.sendWPM(currentWpm, currentWidth);

                // if the player has finished
                if (currentWordIndex >= wordArray.length) {
                    gameInput.off("keydown");
                    StatsPanel.drawChart(wpmArray);
                    // call function in socket.js to emit "complete" event
                    Socket.complete(currentWpm);
                    UserPanel.playSFX('congrats');
                }
            }
        });
    };

    // updates WPM and position of cars
    const updateWPM = (user, wpm, width) => {

        // if someone isn't playing receives this, immediately deny them from joining the game.
        if (!localPlayers.some((e) => e.username == selfPlayer().username)) wait();

        $(`#game-flexbox-${playerIndex(user)}`).css("width", width + '%');
        $(`#game-userdata-${playerIndex(user)}`).html(`${user.displayName} (${user.username})<br>${wpm} wpm`);
    }

    const finished = (user, rank) => {
        $(`#game-flag-${playerIndex(user)}`).css("background-image", 'url("img/flag.svg")');
        $(`#game-userrank-${playerIndex(user)}`).text(`${rank}${['st', 'nd', 'rd', 'th'][rank - 1]}`);
    }

    const timeElapsed = (unit = 'sec', zero = false) => {
        let n = (new Date() - startTime) / (unit == 'min' ? 60000 : 1000);
        if (unit == 'rsec') n %= 60;
        if (zero) return Math.floor(n) > 10 ? Math.floor(n) : '0' + Math.floor(n);
        return n;
    }

    const playerIndex = (user) => localPlayers.findIndex((player) => player.username == user.username);
    const selfPlayer = () => Authentication.getUser();

    const endGame = (res) => {
        if (localPlayers.some((e) => e.username == selfPlayer().username)) {
            StatsPanel.loadRank(res);
            // `(time: ${timeElapsed('min', true)}'${timeElapsed('rsec', true)}")`
        }
        gameInput.val("game ended! starting a new game in a moment...");
        gameInput.prop("disabled", true);
        gameInput.css("color", "#96989d");
        setTimeout(initialize, 10000);
    }

    const wait = () => {
        gameReadyButton.prop("disabled", true);
        gameParagraph.text("game in progress...");
        gameInput.val("please wait for the current game to finish");
        gameInput.prop("disabled", true);
        gameInput.css("color", "#96989d");
    }

    return {
        initialize,
        changeGameState,
        recalibratePlayers,
        countdown,
        startGame,
        timeElapsed,
        updateWPM,
        finished,
        selfPlayer,
        endGame,
        wait
    };
})();

const StatsPanel = (() => {

    let playerRank = 'n/a';
    let statsParagraph = null;
    let statsAuthor = null;
    let statsTitle = null;
    let statsRecentWPM = [];
    let wpmChart = null;

    const initialize = () => {
        $("#stats-modal").hide();

        // set up jquery objects
        statsParagraph = $("#stats-paragraph");
        statsAuthor = $("#stats-author");
        statsTitle = $("#stats-title");

        // click event for switching between forms
        $("#stats-close-button").on("click", () => {
            hide();
        });

        // $("#stats-modal").show();
    };

    const loadInfo = (paragraph, author, recentWPM) => {
        statsParagraph.text(paragraph);
        statsAuthor.text(author);
        statsRecentWPM = recentWPM;
    }

    const drawChart = (wpmArray) => {
        const ctx = $("#stats-wpm-chart");
        const labels = wpmArray.map((e) => e.word);

        const data = {
            labels: labels,
            datasets: [{
                label: 'words per minute',
                backgroundColor: '#72767d',
                borderColor: '#5865f2',
                data: wpmArray.map((e) => e.wpm),
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };
        wpmChart = new Chart(
            ctx,
            config
        );
    }

    const loadRank = (res) => {
        for (let i = 0; i < res.length; i++) {
            $(`#stats-rank-${i}`).text(`${i + 1} - ${res[i].displayName} (${res[i].username})`);
            if (res[i].username == GamePanel.selfPlayer().username) {
                playerRank = `${i + 1}${['st', 'nd', 'rd', 'th'][i]}`;
                $(`#stats-rank-${i}`).css("color", "white");
            }
        }

        statsTitle.text(`well done! you came ${playerRank}!`);

        show();
    }

    const show = () => { $("#stats-modal").fadeIn(500) };

    const hide = () => {
        $("#stats-modal").fadeOut(500);

        playerRank = "n/a";
        statsParagraph.empty();
        statsAuthor.empty();
        wpmChart.destroy();
        wpmChart = null;
        for (let i = 0; i < 4; i++) {
            $(`#stats-rank-${i}`).empty();
            $(`#stats-rank-${i}`).css("color", "#96989d");
        }
    };

    return { initialize, loadInfo, loadRank, drawChart, show, hide };
})();

const UI = (() => {
    const getUserDisplay = (user) => {
        return $("<div class='row'></div>")
            .append($(`<span>hello, ${user.displayName}!</span>`));
    };

    // all components of ui
    const components = [SignInForm, UserPanel, GamePanel, StatsPanel];


    const initialize = () => {
        for (const component of components) {
            component.initialize();
        }
    };

    return { getUserDisplay, initialize };
})();
