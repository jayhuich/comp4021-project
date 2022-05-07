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
                    // Socket.connect();
                },
                (error) => { $("#signin-message").text(error); }
            );
        });

        // submit event for the register form
        $("#register-form").on("submit", (e) => {

            // prevent submitting the form
            e.preventDefault();

            // get the input fields
            const username = $("#register-username").val().trim();
            const displayName = $("#register-displayname").val().trim();
            const carId = 1;
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
                    // Socket.disconnect();
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
    let gameParagraph = null;
    let gameInput = null;

    const initialize = () => {

        // set up jquery objects
        gameParagraph = $("#game-paragraph");
        gameInput = $("#game-input");

        // click event for ready
        $("#game-ready-button").on("click", () => {
            startGame([Authentication.getUser()], "Beginning today, treat everyone you meet as if they were going to be dead by midnight. Extend to them all the care, kindness and understanding you can muster, and do it with no thought of any reward. Your life will never be the same again.");
            // Socket.ready();
        });
    };

    // starts the game
    const startGame = (players, paragraph) => {
        const startTime = new Date();
        const wordArray = paragraph.split(' ');
        let currentWordIndex = 0;

        const charCountArray = [];
        let charCount = 0;
        for (word of wordArray) {
            charCount += word.length;
            charCountArray.push(charCount);
        }

        let wpm = 0;

        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
        }
        gameParagraph.empty();

        // get the current user
        const currentUser = Authentication.getUser();

        // add cars one by one
        for (let i = 0; i < players.length; i++) {
            $(`#game-car-${i}`).css("background-image", `url("img/car${players[i].carId}.png")`)
            $(`#game-car-${i}`).show();
        }
        wordArray.forEach((word) => {
            const wordSpan = $("<span></span>").text(word + ' ');
            gameParagraph.append(wordSpan);
        });

        // handle keydown event
        gameInput.keydown((e) => {
            const inputValue = gameInput.val().trim();

            if (e.key == ' ') {
                if (inputValue == wordArray[currentWordIndex]) {
                    wpm = Math.floor((charCountArray[currentWordIndex] / 5) / ((new Date() - startTime) / 60000));
                    $(`#game-flexbox-${0}`).css("width", Math.floor(charCountArray[currentWordIndex]/paragraph.length * 100) + '%');
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "grey");
                    gameInput.val('');
                    currentWordIndex++;
                }
                else {
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "red");
                }
                if (currentWordIndex >= wordArray.length) {
                    console.log('end, your wpm is ' + wpm);
                }
            }

            // call function in socket.js to emit "typing" event
            // Socket.typingMessage();
        });
    };

    // typing
    const typing = () => {


    };

    return { initialize, startGame };
})();


const UI = (() => {
    const getUserDisplay = (user) => {
        return $("<div class='field-content row shadow'></div>")
            .append($(`<span class="user-displayname">hello, ${user.displayName}!</span>`));
    };

    // all components of ui
    const components = [SignInForm, UserPanel, GamePanel];

    const initialize = () => {
        for (const component of components) {
            component.initialize();
        }
    };

    return { getUserDisplay, initialize };
})();
