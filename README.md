# BikeStreamPro9000

A tiny local app that connects to a BLE cycling cadence sensor and turns your pedaling into a real-time, stream-friendly visual counter.
Perfect for Twitch, YouTube, charity rides, pain streams, and dystopian fitness challenges.

## Features
### Real-Time Cadence Tracking
- Connects automatically to a CYCPLUS / BLE CSC cadence sensor
- Reads crank revolutions in real time
- Handles disconnects + reconnects seamlessly
- No manual pairing needed — just start pedaling

### Stream-Ready Dashboard
- High-contrast fullscreen UI designed for OBS/Streamlabs crops
- Huge live pedal revolution counter
- Three penalty buttons (e.g., chat redemptions, donation triggers)
- Dramatic screen shake + blood-red flash on penalties

### Persistent Progress
- Pedal counter is saved to state.json
- Survives:
  - page refresh
  - backend restart
  - sensor sleep/wake cycle

### WebSocket Live Sync
- Backend broadcasts counter updates instantly
- Frontend updates with zero delay
- Supports multiple connected clients
