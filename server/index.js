const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const GameManager=require("./gameManager");
const io = require("socket.io")(server, {
  cors: {
    origin: "*"
  }
});


const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"}});

const game=new GameManager();

io.on("connection",socket=>{
    console.log("Player connected:",socket.id);
    game.addPlayer(socket.id);

    socket.on("playerInput",input=>{
        game.setInput(socket.id,input);
    });

    socket.on("disconnect",()=>{
        game.removePlayer(socket.id);
        console.log("Player disconnected:",socket.id);
    });
});

setInterval(()=>{
    game.update(1);
    io.emit("gameState",{cars:game.cars,powerUps:game.powerUps});
},33);

server.listen(5000,()=>console.log("Server running on port 5000"));

