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
            $("#register-carid-display").css("background-image", `url("img/car${carId}.png")`);
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
    };

    return { initialize, show, hide, update };
})();

const GamePanel = (() => {

    // used for stats
    let wpmArray = [];

    let gameParagraph = null;
    let gameInput = null;
    let localPlayers = [];
    let startTime = null;

    const initialize = () => {

        // set up jquery objects
        gameParagraph = $("#game-paragraph");
        gameInput = $("#game-input");

        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
            $(`#game-userdata-${i}`).text('');
            $(`#game-userrank-${i}`).text('');
        }
        gameInput.val('');
        gameInput.prop('disabled', true);

        // click event for ready
        $("#game-ready-button").on("click", () => {
            Socket.ready();
        });
    };

    // updates the ui with player changes from server
    const recalibratePlayers = (players) => {

        if (players.length == localPlayers.length && localPlayers.every((e, i) => e.username == players[i].username)) return;
        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
            $(`#game-userdata-${i}`).text('');
            $(`#game-userrank-${i}`).text('');
        }
        localPlayers = [];

        // add cars one by one
        for (let i = 0; i < players.length; i++) {
            const avg = Math.floor(players[i].recentWPM.reduce((a, b) => a + b) / players[i].recentWPM.length);
            localPlayers.push(players[i]);
            $(`#game-car-${i}`).css("background-image", `url("img/car${players[i].carId}.png")`);
            $(`#game-car-${i}`).show();
            $(`#game-userdata-${i}`).html(`${players[i].displayName} (${players[i].username})<br>recent: ${avg} wpm`);
        }
    }

    // starts the game
    const startGame = (players, paragraph) => {

        recalibratePlayers(players);

        // find the width of game-flexbox
        const flexboxWidth = parseInt($(".game-flexbox").clone().appendTo('body').wrap('<div style="display: none"></div>').css('width'));
        const wordArray = paragraph.split(' ');
        let currentWordIndex = 0;

        const charCountArray = [];
        let charCount = 0;
        for (word of wordArray) {
            charCount += word.length + 1;
            charCountArray.push(charCount);
        }

        let wpm = 0;
        let width = flexboxWidth;
        gameParagraph.empty();


        wordArray.forEach((word) => {
            const wordSpan = $("<span></span>").text(word + ' ');
            gameParagraph.append(wordSpan);
        });

        wpmArray = [];
        gameInput.prop('disabled', false);
        startTime = new Date();

        // handle keydown event
        gameInput.keydown((e) => {
            const inputValue = gameInput.val().trim();

            if (e.key == ' ') {
                // if word is correct
                if (inputValue == wordArray[currentWordIndex]) {
                    wpm = Math.floor((charCountArray[currentWordIndex] / 5) / timeElapsed('min'));
                    width = Math.floor(charCountArray[currentWordIndex] / paragraph.length * (100 - flexboxWidth)) + flexboxWidth;
                    $(`#game-flexbox-${playerIndex(selfPlayer())}`).css("width", width + '%');
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "grey");
                    gameInput.val('');
                    currentWordIndex++;
                }

                // if word is incorrect
                else {
                    wpm = currentWordIndex ? Math.floor((charCountArray[currentWordIndex - 1] / 5) / timeElapsed('min')) : 0;
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "red");
                }

                updateWPM(selfPlayer(), wpm, width);
                wpmArray.push({ time: Math.floor(timeElapsed()), wpm: wpm });

                // call function in socket.js to emit "current wpm" event
                Socket.currentWPM(wpm, width);

                // if the player has finished
                if (currentWordIndex >= wordArray.length) {

                    // call function in socket.js to emit "complete" event
                    Socket.complete(wpm);
                }
            }
        });
    };

    // updates WPM and position of cars
    const updateWPM = (user, wpm, width) => {
        $(`#game-flexbox-${playerIndex(user)}`).css("width", width + '%');
        $(`#game-userdata-${playerIndex(user)}`).html(`${user.displayName} (${user.username})<br>${wpm} wpm`);
    }

    const finished = (user, rank, author, recentWPM) => {
        $(`#game-userrank-${playerIndex(user)}`).text(`${rank}${['st', 'nd', 'rd', 'th'][rank - 1]} (time: ${timeElapsed('min', true)}'${timeElapsed('rsec', true)}")`);
        if (selfPlayer().username == user.username) {
            StatsPanel.show();
        }
    }

    const timeElapsed = (unit = 'sec', zero = false) => {
        let n = (new Date() - startTime) / (unit == 'min' ? 60000 : 1000);
        if (unit == 'rsec') n %= 60;
        if (zero) return Math.floor(n) > 10 ? Math.floor(n) : '0' + Math.floor(n);
        return n;
    }

    const playerIndex = (user) => localPlayers.findIndex((player) => player.username == user.username);
    const selfPlayer = () => Authentication.getUser();

    return { initialize, recalibratePlayers, startGame, timeElapsed, updateWPM, finished, selfPlayer };
})();

const StatsPanel = (() => {
    const initialize = () => {
        $("#stats-modal").hide();

        // click event for switching between forms
        $("#stats-close-button").on("click", () => {
            $("#stats-modal").fadeOut(500);
        });
    };

    const show = () => { $("#stats-modal").fadeIn(500) };
    const hide = () => { $("#stats-modal").fadeOut(500); };

    return { initialize, show, hide };
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
