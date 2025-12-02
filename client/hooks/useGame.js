import { useEffect, useRef, useState } from "react";
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

const socket = io("http://localhost:5000");

export default function useGame() {
  const [cars, setCars] = useState([]);
  const inputs = useRef({ up:false, down:false, left:false, right:false });

  useEffect(() => {
    socket.on("gameState", setCars);
    const interval = setInterval(() => {
      socket.emit("playerInput", inputs.current);
    }, 33);
    return () => clearInterval(interval);
  }, []);

  return { cars, inputs };
}
