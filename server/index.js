const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const GameManager = require("./gameManager");

const app = express();
const server = http.createServer(app);

// ❌ You had two io declarations — removed the wrong one
// ❌ You were calling server before it was created — fixed
const io = new Server(server, {
    cors: { origin: "*" }
});

const game = new GameManager();

// WebSocket connections
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);
    game.addPlayer(socket.id);

    socket.on("playerInput", (input) => {
        game.setInput(socket.id, input);
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        game.removePlayer(socket.id);
    });
});

// Game loop
setInterval(() => {
    game.update(1);
    io.emit("gameState", { 
        cars: game.cars, 
        powerUps: game.powerUps 
    });
}, 33);

server.listen(5000, () => {
    console.log("Server running on port 5000");
});
