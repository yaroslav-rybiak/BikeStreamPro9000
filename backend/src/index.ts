import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import path from "path";

const app = express();
const port = 3000;

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "../../frontend")));

// Start HTTP server
const server = app.listen(port, () =>
    console.log(`HTTP server running at http://localhost:${port}`)
);

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("Client connected via WebSocket");

    // Send welcome message
    ws.send(JSON.stringify({ msg: "Welcome to BikeStreamPro9000 backend!" }));

    // Listen for messages from client
    ws.on("message", (msg) => {
        console.log("Received from client:", msg.toString());
    });
});
