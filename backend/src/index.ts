import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import path from "path";

import { startSensorScan, setMetricBroadcast } from "./ble/sensor";

const app = express();
const port = 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Start HTTP server
const server = app.listen(port, () => {
    console.log(`HTTP server running at http://localhost:${port}`);
});

// Attach WebSocket server
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
    console.log("Client connected via WebSocket");
    clients.add(ws);

    ws.send(JSON.stringify({
        type: "welcome",
        msg: "Welcome to BikeStreamPro9000 backend!"
    }));

    ws.on("close", () => clients.delete(ws));
});

// -----------------------------------------------------------------------
// BLE → Websocket broadcast via new setMetricBroadcast()
// -----------------------------------------------------------------------

setMetricBroadcast((msg) => {
    const json = JSON.stringify(msg);

    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    }
});

// Start BLE scanning
startSensorScan();
