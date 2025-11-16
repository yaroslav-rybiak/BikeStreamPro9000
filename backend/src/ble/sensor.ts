import noble from "@abandonware/noble";

// --------------------------------------------------------------------
// BLE identifiers
// --------------------------------------------------------------------

const TARGET_UUID = "2315f21157f95d2a998673c0713cf0c3";
const CSC_SERVICE = "1816";
const CSC_MEASUREMENT = "2a5b";

// Simple speed model
const SPEED_FACTOR = 0.33;

// --------------------------------------------------------------------
// Connection flags
// --------------------------------------------------------------------

let isConnecting = false;
let isConnected = false;

// --------------------------------------------------------------------
// Metric broadcast handler (sent to WebSocket clients)
// --------------------------------------------------------------------

let broadcast: ((msg: any) => void) | null = null;

export function setMetricBroadcast(fn: (msg: any) => void) {
    broadcast = fn;
}

// --------------------------------------------------------------------
// Start BLE scan
// --------------------------------------------------------------------

export function startSensorScan() {
    console.log("🔍 Starting BLE scan for target CYCPLUS…");

    noble.on("stateChange", (state) => {
        if (state === "poweredOn") {
            console.log("Bluetooth ON → scanning for specific UUID…");
            noble.startScanning([], true);
        } else {
            noble.stopScanning();
        }
    });

    noble.on("discover", (peripheral) => {
        if (peripheral.uuid !== TARGET_UUID) return;
        if (isConnecting || isConnected) return;

        isConnecting = true;

        console.log("🎯 Found CYCPLUS sensor:", peripheral.uuid);
        noble.stopScanning();
        connectToSensor(peripheral);
    });
}

// --------------------------------------------------------------------
// Connect + subscribe
// --------------------------------------------------------------------

function connectToSensor(peripheral: noble.Peripheral) {
    console.log("🔗 Connecting to sensor...");

    peripheral.connect((err) => {
        if (err) {
            console.error("Connection error:", err);
            isConnecting = false;
            return;
        }

        isConnected = true;
        console.log("✅ Connected to CYCPLUS");

        peripheral.discoverSomeServicesAndCharacteristics(
            [CSC_SERVICE],
            [CSC_MEASUREMENT],
            (err, services, characteristics) => {
                if (err) {
                    console.error("Service discovery error:", err);
                    return;
                }

                const cscChar = characteristics[0];

                if (!cscChar) {
                    console.error("❌ CSC Measurement characteristic NOT FOUND");
                    return;
                }

                console.log("📡 Subscribing to CSC measurement…");

                cscChar.on("data", handleCSCMeasurement);
                cscChar.subscribe();
            }
        );
    });

    peripheral.once("disconnect", () => {
        console.log("🔌 Sensor disconnected");
        isConnected = false;
        isConnecting = false;
    });
}

// --------------------------------------------------------------------
// CSC parsing + metrics
// --------------------------------------------------------------------

let lastCrankRevs = 0;
let lastCrankEvent = 0;

let totalDistanceKm = 0;
let currentSpeedKmh = 0;

let lastPacketTime = Date.now();

// --------------------------------------------------------------------
// Inactivity detection — force speed=0
// --------------------------------------------------------------------

let inactivityTimer: NodeJS.Timeout | null = null;
const INACTIVITY_MS = 2000;

// Background idle checker (extra safety net)
setInterval(() => {
    const idleMs = Date.now() - lastPacketTime;

    if (idleMs > INACTIVITY_MS && currentSpeedKmh !== 0) {
        currentSpeedKmh = 0;

        if (broadcast) {
            broadcast({
                type: "metrics",
                deltaRevs: 0,
                cadenceRpm: 0,
                speedKmh: 0,
                distanceKm: totalDistanceKm,
            });
        }
    }
}, 200);

// --------------------------------------------------------------------
// Handle CSC Measurement
// --------------------------------------------------------------------

function handleCSCMeasurement(data: Buffer) {
    lastPacketTime = Date.now();

    const flags = data.readUInt8(0);
    let index = 1;

    const hasWheel = (flags & 0x01) !== 0;
    const hasCrank = (flags & 0x02) !== 0;

    if (hasWheel) index += 6; // skip wheel data

    if (!hasCrank) return;

    const crankRevs = data.readUInt16LE(index);
    const crankEvent = data.readUInt16LE(index + 2);

    // First packet: init baseline
    if (lastCrankRevs === 0 && lastCrankEvent === 0) {
        lastCrankRevs = crankRevs;
        lastCrankEvent = crankEvent;
        return;
    }

    let deltaRevs = crankRevs - lastCrankRevs;
    let deltaTimeRaw = crankEvent - lastCrankEvent;

    // Timer wrap
    if (deltaTimeRaw <= 0) deltaTimeRaw += 65536;

    lastCrankRevs = crankRevs;
    lastCrankEvent = crankEvent;

    if (deltaRevs <= 0) return;

    const deltaTimeSec = deltaTimeRaw / 1024;

    const cadenceRpm = (deltaRevs * 60 * 1024) / deltaTimeRaw;
    const speedKmh = cadenceRpm * SPEED_FACTOR;

    currentSpeedKmh = speedKmh;

    const deltaHours = deltaTimeSec / 3600;
    totalDistanceKm += speedKmh * deltaHours;

    // -------- RESET INACTIVITY TIMER --------
    if (inactivityTimer) clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        console.log("⛔ No movement → forcing speed=0");
        currentSpeedKmh = 0;

        if (broadcast) {
            broadcast({
                type: "metrics",
                deltaRevs: 0,
                cadenceRpm: 0,
                speedKmh: 0,
                distanceKm: totalDistanceKm,
            });
        }
    }, INACTIVITY_MS);

    console.log(
        `🔄 +${deltaRevs} rev | cadence ${cadenceRpm.toFixed(
            1
        )} rpm | speed ${speedKmh.toFixed(1)} km/h | dist ${totalDistanceKm.toFixed(3)} km`
    );

    if (broadcast) {
        broadcast({
            type: "metrics",
            deltaRevs,
            cadenceRpm,
            speedKmh,
            distanceKm: totalDistanceKm,
        });
    }
}
