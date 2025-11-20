const counterEl = document.getElementById("counter");

let state = {
    counter: 0
};

function render() {
    const padded = state.counter.toString().padStart(5, "0");
    counterEl.textContent = padded;
}


render();

const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "state") {
        state.counter = msg.counter;
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

        // Shake + flash animation
        document.body.classList.add("shake", "flash");
        setTimeout(() => {
            document.body.classList.remove("shake", "flash");
        }, 220);
    });
});
