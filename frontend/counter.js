const counterEl = document.getElementById("counter");
const speedEl = document.getElementById("speed");

let state = {
    counter: 0,
    speed: 0
};

function render() {
    counterEl.textContent = state.counter.toString();
    speedEl.textContent = state.speed.toFixed(1);
}

render();

const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "state") {
        state.counter = msg.counter;
        render();
    }

    if (msg.type === "metrics") {
        state.speed = msg.speedKmh || 0;
        render();
    }
};

document.querySelectorAll(".penalty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const amount = Number(btn.dataset.penalty || "0");

        ws.send(JSON.stringify({
            type: "penalty",
            amount
        }));

        // Shake + flash
        document.body.classList.add("shake", "flash");
        setTimeout(() => {
            document.body.classList.remove("shake", "flash");
        }, 220);
    });
});
