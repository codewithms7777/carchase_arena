class GameManager {
    constructor() {
        this.cars = []; 
        this.colors = ["red","blue","green","orange","purple","yellow"];
        this.powerUps = [];
        this.roundOver = false;
    }

    addPlayer(id) {
        this.cars.push({
            id,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            angle: Math.random() * Math.PI * 2,
            vx: 0,
            vy: 0,
            hp: 100,
            score: 0,
            input: {},
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            name: "Racer-" + id.slice(-3),
            shield: false,
            nitroTimer: 0
        });
    }

    removePlayer(id) {
        this.cars = this.cars.filter(c => c.id !== id);
    }

    setInput(id, input) {
        const car = this.cars.find(c => c.id === id);
        if (car) car.input = input;
    }

    update(dt) {
        const ACCEL = 0.3;
        const ROTATE = 0.08;
        const FRICTION = 0.96;

        for (let car of this.cars) {
            if (car.hp <= 0) continue;

            if (car.input.left) car.angle -= ROTATE;
            if (car.input.right) car.angle += ROTATE;

            let thrust = ACCEL;
            if (car.input.nitro && car.nitroTimer <= 0) {
                thrust = ACCEL * 3;
                car.nitroTimer = 60;
            }
            if (car.nitroTimer > 0) car.nitroTimer--;

            if (car.input.up) {
                car.vx += Math.cos(car.angle) * thrust * dt;
                car.vy += Math.sin(car.angle) * thrust * dt;
            }
            if (car.input.down) {
                car.vx -= Math.cos(car.angle) * (thrust * 0.5) * dt;
                car.vy -= Math.sin(car.angle) * (thrust * 0.5) * dt;
            }

            car.x += car.vx;
            car.y += car.vy;

            car.vx *= FRICTION;
            car.vy *= FRICTION;

            if (car.x < 0 || car.x > 800) {
                car.vx *= -0.8;
                car.x = Math.max(0, Math.min(800, car.x));
            }
            if (car.y < 0 || car.y > 600) {
                car.vy *= -0.8;
                car.y = Math.max(0, Math.min(600, car.y));
            }
        }

        this.handleCollisions();
        this.handlePowerUps();
        this.respawnDeadCars();
    }

    handleCollisions() {
        const R = 20;

        for (let i = 0; i < this.cars.length; i++) {
            for (let j = i + 1; j < this.cars.length; j++) {
                const a = this.cars[i];
                const b = this.cars[j];
                if (a.hp <= 0 || b.hp <= 0) continue;

                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < R * 2) {
                    const impact = Math.sqrt(a.vx**2 + a.vy**2) + Math.sqrt(b.vx**2 + b.vy**2);
                    const damage = 5 + Math.floor(impact * 2);

                    if (!a.shield) a.hp -= damage;
                    if (!b.shield) b.hp -= damage;

                    if (a.hp <= 0) b.score++;
                    if (b.hp <= 0) a.score++;

                    const angle = Math.atan2(dy, dx);
                    const force = 5;

                    a.vx += Math.cos(angle) * force;
                    a.vy += Math.sin(angle) * force;
                    b.vx -= Math.cos(angle) * force;
                    b.vy -= Math.sin(angle) * force;

                    const overlap = R * 2 - dist + 1;
                    a.x += Math.cos(angle) * overlap / 2;
                    a.y += Math.sin(angle) * overlap / 2;
                    b.x -= Math.cos(angle) * overlap / 2;
                    b.y -= Math.sin(angle) * overlap / 2;
                }
            }
        }
    }

    handlePowerUps() {
        if (this.powerUps.length < 4 && Math.random() < 0.02) {
            const types = ["repair", "shield"];
            this.powerUps.push({
                x: Math.random() * 700 + 50,
                y: Math.random() * 500 + 50,
                type: types[Math.floor(Math.random() * types.length)],
                id: Math.random()
            });
        }

        for (let car of this.cars) {
            if (car.hp <= 0) continue;

            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const pu = this.powerUps[i];
                const dist = Math.sqrt((car.x - pu.x) ** 2 + (car.y - pu.y) ** 2);

                if (dist < 35) {
                    if (pu.type === "repair") car.hp = Math.min(100, car.hp + 30);
                    if (pu.type === "shield") car.shield = true;
                    this.powerUps.splice(i, 1);
                }
            }
        }

        for (let car of this.cars) {
            if (car.shield && car.input.nitro) car.shield = false;
        }
    }

    respawnDeadCars() {
        for (let car of this.cars) {
            if (car.hp <= 0) {
                if (Math.random() < 0.05) {
                    car.hp = 100;
                    car.x = Math.random() * 800;
                    car.y = Math.random() * 600;
                    car.vx = 0; 
                    car.vy = 0;
                    car.shield = true;
                }
            }
        }
    }
}

module.exports = GameManager;
