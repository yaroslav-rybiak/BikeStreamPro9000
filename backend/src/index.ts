import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import path from "path";

import { startSensorScan, setMetricBroadcast } from "./ble/sensor";
import { loadState, getCounter, incrementCounter, setCounter } from "./state";

const app = express();
const port = 3000;

// Load persistent counter
loadState();

// Serve frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Start HTTP server
const server = app.listen(port, () =>
    console.log(`HTTP server running at http://localhost:${port}`)
);

// Attach WebSocket server
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
    console.log("Client connected");
    clients.add(ws);

    // Immediately send current state
    ws.send(JSON.stringify({
        type: "state",
        counter: getCounter()
    }));

    ws.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            if (msg.type === "penalty") {
                incrementCounter(-msg.amount);

                // broadcast new state
                const payload = JSON.stringify({
                    type: "state",
                    counter: getCounter()
                });

                for (const client of clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                }
            }
        } catch (e) {
            console.error("Bad message from client:", raw.toString());
        }
    });

    ws.on("close", () => clients.delete(ws));
});

// BLE → increments counter
setMetricBroadcast((metrics) => {
    const { deltaRevs, speedKmh, cadenceRpm, distanceKm } = metrics;

    // --- 1) COUNTER UPDATE ---
    if (deltaRevs > 0) {
        incrementCounter(deltaRevs);

        const stateMsg = JSON.stringify({
            type: "state",
            counter: getCounter()
        });

        for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(stateMsg);
            }
        }
    }

    // --- 2) REAL-TIME METRICS (speed, cadence, distance) ---
    const metricsMsg = JSON.stringify({
        type: "metrics",
        speedKmh,
        cadenceRpm,
        distanceKm
    });

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(metricsMsg);
        }
    }
});


// Start BLE scanning
startSensorScan();
