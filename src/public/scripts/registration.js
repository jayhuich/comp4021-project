const Registration = (function() {
    // This function sends a register request to the server
    // * `username`         - The username for the sign-in
    // * `displayName`      - The display-name of the user
    // * `password`         - The password of the user
    // * `carId`            - The car icon of the user
    // * `raceCount`        - Number of played game, = 0 when initialize
    // * `winCount`         - Number of winned game, = 0 when initialize
    // * `recentWPM`        - The array that stores the recent WPM form the last played 10 games
    // * `onSuccess`        - This is a callback function to be called when the
    //                          request is successful in this form `onSuccess()`
    // * `onError`          - This is a callback function to be called when the
    //                          request fails in this form `onError(error)`
    const register = function(username, displayName, carId, password, onSuccess, onError) {

        const jsonData = JSON.stringify({username, displayName, carId, password});
            
        fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonData
        })
        .then((res) => res.json() )
        
        .then((json) => {
            if (json.status == "success") {
                if(onSuccess) onSuccess();
            }
            else{
                if (onError) onError(json.error);
            }
        })
        .catch((error) => {
            if (onError) onError(error);
        });
        
    };

    return { register };
})();
