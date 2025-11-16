# BikeStreamPro9000

An app that connects to a BLE cycling cadence sensor and turns pedaling into a real-time, stream-friendly visual counter. It also includes three penalty buttons that subtract progress and can be triggered by donations.

## Features
### Real-Time Cadence Tracking
- Connects to a CYCPLUS cadence sensor
- Reads crank revolutions in real time
- Handles sensor sleep/wake cycle seamlessly

### Stream-Ready Dashboard
- High-contrast UI designed for OBS crop
- Huge live pedal revolution counter
- Three penalty buttons (-100, -1000, -9999)
- Dramatic screen shake and blood-red flash on penalties

### Persistent Progress
- Pedal counter is saved to state.json, DB-free design
- Survives:
  - page refresh
  - backend restart
  - sensor sleep/wake cycle

### WebSocket Live Sync
- Backend broadcasts counter updates instantly
- Frontend updates with zero delay
- Supports multiple connected clients
