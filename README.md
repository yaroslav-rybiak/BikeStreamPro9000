# BikeStreamPro9000

A local mini-app that connects to a BLE cycling cadence sensor and turns your pedaling into a real-time interactive stream overlay.

Features

- Reads BLE CSC cadence data (CYCPLUS bike sensor)
- Calculates cadence, speed, and total distance
- Live updates to a browser dashboard via WebSocket
- Large real-time pedal revolution counter
- Three interactive penalty buttons that subtract revolutions (for Twitch chat integration)
- Automatic zero-speed detection when you stop pedaling
- Clean, high-contrast UI designed for full-screen streaming