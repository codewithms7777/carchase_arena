const canvas = document.getElementById("game");
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext("2d");

// Connect to server (Ensure port matches server/index.js)
const socket = io("https://carchase-arena.onrender.com");


// --- Game State ---
let cars = [];
let powerUps = [];
let particles = [];
let playerId = null;

const inputs = { up: false, down: false, left: false, right: false, nitro: false };

// --- Input Handling ---
function handleKey(e, state) {
    if(e.key === "ArrowUp" || e.key === "w") inputs.up = state;
    if(e.key === "ArrowDown" || e.key === "s") inputs.down = state;
    if(e.key === "ArrowLeft" || e.key === "a") inputs.left = state;
    if(e.key === "ArrowRight" || e.key === "d") inputs.right = state;
    if(e.key === " " || e.key === "Shift") inputs.nitro = state;
}

document.addEventListener("keydown", e => handleKey(e, true));
document.addEventListener("keyup", e => handleKey(e, false));

// Mobile Touch Handling
const bindTouch = (id, prop) => {
    const el = document.getElementById(id);
    el.addEventListener("touchstart", (e) => { e.preventDefault(); inputs[prop] = true; });
    el.addEventListener("touchend", (e) => { e.preventDefault(); inputs[prop] = false; });
};
bindTouch("up", "up");
bindTouch("down", "down");
bindTouch("left", "left");
bindTouch("right", "right");
bindTouch("nitro", "nitro");

// Send input to server
setInterval(() => socket.emit("playerInput", inputs), 33);

// --- Networking ---
socket.on("connect", () => {
    playerId = socket.id;
});

socket.on("gameState", state => {
    // Basic Reconciliation / Interpolation setup
    // Instead of snapping, we update the target data
    powerUps = state.powerUps;
    
    // Update UI
    document.getElementById("player-count").innerText = state.cars.length;
    const leader = state.cars.sort((a,b) => b.score - a.score)[0];
    if(leader) document.getElementById("leader-name").innerText = `${leader.name} (${leader.score})`;

    // Sync Cars
    state.cars.forEach(serverCar => {
        let localCar = cars.find(c => c.id === serverCar.id);
        if (!localCar) {
            localCar = { ...serverCar, displayX: serverCar.x, displayY: serverCar.y, displayAngle: serverCar.angle };
            cars.push(localCar);
        } else {
            // Target values
            localCar.targetX = serverCar.x;
            localCar.targetY = serverCar.y;
            localCar.targetAngle = serverCar.angle;
            localCar.hp = serverCar.hp;
            localCar.shield = serverCar.shield;
            localCar.score = serverCar.score;
            localCar.color = serverCar.color; // sync color
            
            // Add particles if boosting
            if (serverCar.nitroTimer > 50) {
                addParticles(localCar.displayX, localCar.displayY, "orange", 2);
            }
        }
    });

    // Remove disconnected cars
    cars = cars.filter(c => state.cars.find(sc => sc.id === c.id));
});

// --- Visuals System ---

// Linear Interpolation for smooth movement
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Particle System
class Particle {
    constructor(x, y, color, speed) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

function addParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color, Math.random() * 2));
    }
}

function drawCar(car) {
    // Interpolate positions for smoothness
    if (car.targetX !== undefined) {
        car.displayX = lerp(car.displayX, car.targetX, 0.2);
        car.displayY = lerp(car.displayY, car.targetY, 0.2);
        
        // Smooth rotation (handling the wrap-around PI to -PI)
        let dAngle = car.targetAngle - car.displayAngle;
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
        car.displayAngle += dAngle * 0.2;
    }

    ctx.save();
    ctx.translate(car.displayX, car.displayY);
    ctx.rotate(car.displayAngle);

    // Glow Effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = car.color;

    // Body
    ctx.fillStyle = car.color;
    // Main Chassis
    ctx.beginPath();
    ctx.roundRect(-20, -12, 40, 24, 5);
    ctx.fill();

    // Windshield (Black)
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, -10, 10, 20);

    // Headlights
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#fff";
    ctx.fillRect(18, -10, 4, 6);
    ctx.fillRect(18, 4, 4, 6);
    
    // Headlight Beams
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(22, -8);
    ctx.lineTo(150, -40);
    ctx.lineTo(150, 40);
    ctx.lineTo(22, 8);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Shield Visual
    if (car.shield) {
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // HP Bar (Floating above)
    const hpW = 40;
    ctx.fillStyle = "#333";
    ctx.fillRect(car.displayX - hpW/2, car.displayY - 35, hpW, 6);
    ctx.fillStyle = car.hp > 30 ? "#0f0" : "#f00";
    ctx.fillRect(car.displayX - hpW/2, car.displayY - 35, hpW * (car.hp / 100), 6);
    
    // Name
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(car.name, car.displayX, car.displayY - 42);
}

function drawGrid() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const size = 50;
    for (let x = 0; x <= canvas.width; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawPowerUps() {
    for (let pu of powerUps) {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.shadowBlur = 10;
        
        if (pu.type === "repair") {
            ctx.fillStyle = "#0f0";
            ctx.shadowColor = "#0f0";
            ctx.fillText("✚", -5, 5);
        } else if (pu.type === "shield") {
            ctx.fillStyle = "cyan";
            ctx.shadowColor = "cyan";
            ctx.fillText("🛡", -5, 5);
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.stroke();
        ctx.restore();
    }
}

// --- Main Loop ---
function loop() {
    // Clear with semi-transparency for trail effect? No, clean clear for crisp graphics.
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawPowerUps();

    // Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Draw Cars
    for (let car of cars) {
        if (car.hp > 0) drawCar(car);
        else {
            // Death explosion (once)
             if(Math.random() < 0.1) addParticles(car.displayX, car.displayY, "red", 5);
        }
    }

    requestAnimationFrame(loop);
}

// Fix canvas blurry text on High DPI screens
function resize() {
    // (Optional: Implement responsive canvas scaling here if desired)
}
window.addEventListener('resize', resize);


loop();
