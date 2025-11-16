# BikeStreamPro9000

A local mini-app that connects to a BLE cycling cadence sensor and turns your pedaling into a real-time, stream-friendly visual experience.
Ideal for Twitch, YouTube, or self-torture fitness challenges.

## Features
### Core BLE Functionality
- Connects to a CYCPLUS / BLE CSC cadence sensor
- Reads real-time crank revolution data
- Calculates cadence (RPM), speed (km/h), and distance
- Auto-detects inactivity and sets speed to 0
- Fully automatic disconnect → reconnect handling (no user action needed)
### Stream-Ready Dashboard
- Clean, high-contrast fullscreen UI
- Giant live pedal revolution counter
- Speed display updates in real time
- Three penalty buttons (e.g. for Twitch chat redemptions)
- Dramatic screen shake + blood-red flash on penalties
(great for punishing donations)
### Persistent State
- Counter is saved to state.json
- Survives:
  - page refresh
  - server restart
  - sensor sleep/wake cycle
- Distance is computed internally (optional display)
### WebSocket Live Sync
- Backend broadcasts:
  - counter updates
  - speed/cadence metrics
- Frontend receives data instantly and updates UI