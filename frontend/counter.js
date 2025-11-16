// DOM references
const counterEl = document.getElementById("counter");
const distanceEl = document.getElementById("distance");
const speedEl = document.getElementById("speed");

// Default values (in case WS is not connected yet)
let state = {
    counter: 96000,
    distanceKm: 1.0,
    speedKmh: 0.0,
};

// Render function
function render() {
    counterEl.textContent = state.counter.toString();
    distanceEl.textContent = state.distanceKm.toFixed(1);
    speedEl.textContent = state.speedKmh.toFixed(1);
}

render(); // initial render

// --- WebSocket connection to backend ---
// Assumes your Node backend runs on ws://localhost:3000
try {
    const ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
        console.log("WS connected");
        // Optionally ask backend for initial state here
        // ws.send(JSON.stringify({ type: "get_state" }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            // NEW CASE: BLE metrics updates
            if (msg.type === "metrics") {
                state.distanceKm = msg.distanceKm;
                state.speedKmh = msg.speedKmh;

                // Increase counter based on revolutions
                state.counter += msg.deltaRevs;

                render();
            }

            // OLD CASE: server initial state (optional)
            if (msg.type === "state") {
                state.counter = msg.counter ?? state.counter;
                state.distanceKm = msg.distanceKm ?? state.distanceKm;
                state.speedKmh = msg.speedKmh ?? state.speedKmh;
                render();
            }

        } catch (e) {
            console.error("Bad WS message:", event.data);
        }
    };

    ws.onerror = (err) => {
        console.error("WebSocket error", err);
    };
} catch (e) {
    console.warn("WebSocket not available, using static values only.");
}

// --- Optional: button clicks (for manual testing) ---
// These just adjust the counter locally; later you can send them to backend.
document.querySelectorAll(".penalty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const penalty = Number(btn.dataset.penalty || "0");
        state.counter = Math.max(0, state.counter - penalty);
        render();
        // Later: ws.send(JSON.stringify({ type: "penalty", amount: penalty }));
    });
});
