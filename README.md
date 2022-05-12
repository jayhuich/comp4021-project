# COMP4021 Group Project - Typeracer
This is a node.js web application developed by Jay Hui (@jay-hui), Marco Chow (@marcochowhy-xx) and Jeff Chan (@NamingBot), as a group project for the 2021-2022 Spring HKUST course COMP4021 (Internet Computing). This web application imitates the current game TypeRacer, which puts a player's typing speed to the test with other online players.

## Installation
As a prerequisite, npm and node.js is required before running this project. If they are not installed in your computer, please visit <https://nodejs.org/en/> to install node.js first.

To host this project,
1. Clone the source code via GitHub with `git clone https://github.com/jay-hui/comp4021-project.git`
2. Start a terminal of your choice and navigate to project folder, then run the [`npm install` command](https://docs.npmjs.com/downloading-and-installing-packages-locally) to download all modules in `node_modules`.
3. After all terminals have been installed, go to the ``src/`` folder and run `node server.js`.
4. When the server shows `server running on http://localhost:8000`, you can visit our website at <http://localhost:8000>.

## External modules used
- [jQuery](https://jquery.com/)
    - jQuery was used to retrieve and set attributes of DOM elements faster, for binding keydown and click events.
- [Chart.js](https://www.chartjs.org/)
    - Chart.js is used in the statistics page to show a line graph for users' overall performance throughout each game.
- [bcrypt](https://www.npmjs.com/package/bcrypt)
    - This node module uses [bcrypt](https://en.wikipedia.org/wiki/Bcrypt) to hash user passwords before storing it in a JSON file.
- [express](https://expressjs.com/) and [express-session](https://github.com/expressjs/session#readme)
    - Used to set up the server-side JavaScript code
- [socket.io](https://socket.io/)
    - WebSocket connections with socket.io are used for communication between client-side and server-side scripts.
- [fetch](https://www.npmjs.com/package/fetch)
    - For fetching external API calls from node (server-side).

## Functions

### Account system
- There is a sign-in and register page which can be switched by pressing a button in the modal.
- Players need to first create an account and sign in to play.
- Data of players will be stored in `src/data/users.json` locally.
- User attributes stored:
    - `username` (for logging in)
    - `password` (bcrypt hash)
    - `displayName` (for displaying purposes)
    - `recentWPM` (array storing the WPM of the player's most recent 10 games)
    - `carId` (users can choose a car with the color they like, and the id of that car is stored)

### Singleplayer / multiplayer typing race
- Once the player has signed in, he/she can start a game pressing the 'ready' button.
- The server receives this and changes from 'idle' to 'ready' state, and starts counting down from 10 seconds.
- The player's chosen car would also appear in the lane, indicating the player joins this game.
- If more players join, the server will reset the 10-second timer. The lanes will also get filled up.
- When the countdown expires, the game will start, and all players who pressed 'ready' will be able to start typing one randomly generated quote.
- Players need to finish typing the paragraph as soon as possible, and the first one who finishes wins the race.
- Sound effects are also included in the game.

### Cheat key
When typing, you can instead type the word `4021` (followed by a space) as a cheat key. This treats the player as completing the race, and speeds up the development and testing process of this project. However, since the player has skipped the remaining words, the graph in the statistics page will not show up.

### State management
The server remembers its state, so whenever a new client joins, the server can give them appropriate responses based on its own state at the moment. The client would also cope with the current server state. For example:
- If a game is ongoing in the server and a new client connects, it cannot initiate another game, and must wait until the current game finishes. The client would switch to spectating mode, and can still watch the cars of current partipants moving.
- If a client disconnects in the middle of a game, the server will relay this information in real time to other participants as well. If there are no participants left, the server will automatically change its state to idle again.

### Statistics
After everyone completes the race, the statistics page will be shown to all players, with statistics like:
- Their rank, along with other participants of the game
- The quote they typed and its author
- A graph showing their performance throughout the game

### Generating random quotes
The server uses an async function to fetch this external API to generate random quotes for each typing race:
```
https://api.quotable.io/random?minLength=200&maxLength=300
```
The quote would be the same for all participants, with a character count set between 200 and 300.

## Contact us
For enquiries, feel free to reach out to the developers for this project:
- Jay Hui (chhuiah@connect.ust.hk)
- Marco Chow (hychowak@connect.ust.hk)
- Jeff Chan (phchanav@connect.ust.hk)