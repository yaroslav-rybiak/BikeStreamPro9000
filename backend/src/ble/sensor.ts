import noble from "@abandonware/noble";

const TARGET_UUID = "2315f21157f95d2a998673c0713cf0c3";
const CSC_SERVICE = "1816";
const CSC_MEASUREMENT = "2a5b";

const SPEED_FACTOR = 0.33; // simple model: cadence * factor = km/h

let broadcast: ((msg: any) => void) | null = null;
export function setMetricBroadcast(fn: (msg: any) => void) {
    broadcast = fn;
}

let isConnecting = false;
let isConnected = false;

export function startSensorScan() {
    console.log("🔍 Starting BLE scan…");

    noble.on("stateChange", (state) => {
        if (state === "poweredOn") noble.startScanning([], true);
        else noble.stopScanning();
    });

    noble.on("discover", (peripheral) => {
        if (peripheral.uuid !== TARGET_UUID) return;
        if (isConnecting || isConnected) return;

        isConnecting = true;
        console.log("🎯 Found sensor:", peripheral.uuid);
        noble.stopScanning();
        connect(peripheral);
    });
}

function connect(peripheral: noble.Peripheral) {
    console.log("🔗 Connecting…");

    peripheral.connect((err) => {
        if (err) {
            console.error("Connection error:", err);
            isConnecting = false;
            return;
        }

        isConnected = true;
        console.log("✅ Connected");

        peripheral.discoverSomeServicesAndCharacteristics(
            [CSC_SERVICE],
            [CSC_MEASUREMENT],
            (err, services, characteristics) => {
                const csc = characteristics[0];
                if (!csc) return console.error("❌ Missing CSC characteristic");

                csc.on("data", handleCSCMeasurement);
                csc.subscribe();
            }
        );
    });

    peripheral.once("disconnect", () => {
        console.log("🔌 Sensor disconnected");
        isConnected = false;
        isConnecting = false;

        setTimeout(() => {
            console.log("🔎 Resuming scan…");
            noble.startScanning([], true);
        }, 1000);
    });
}

// --- Speed variables ---
let lastRevs = 0;
let lastEvent = 0;
let currentSpeedKmh = 0;
let lastPacketTime = Date.now();

// --- Inactivity timeout ---
let inactivityTimer: NodeJS.Timeout | null = null;
const INACTIVITY_MS = 2000;

// Background safety net (if packet stream stalls weirdly)
setInterval(() => {
    const idle = Date.now() - lastPacketTime;

    if (idle > INACTIVITY_MS && currentSpeedKmh !== 0) {
        currentSpeedKmh = 0;
        if (broadcast) {
            broadcast({
                type: "metrics",
                speedKmh: 0,
                cadenceRpm: 0,
                deltaRevs: 0
            });
        }
    }
}, 200);


// -----------------------------------------------------
// Handle incoming CSC Measurement packets
// -----------------------------------------------------
function handleCSCMeasurement(data: Buffer) {
    lastPacketTime = Date.now();

    const flags = data.readUInt8(0);
    let i = 1;

    const hasWheel = !!(flags & 1);
    const hasCrank = !!(flags & 2);

    if (hasWheel) i += 6; // skip wheel part
    if (!hasCrank) return;

    const crankRevs = data.readUInt16LE(i);
    const crankEvent = data.readUInt16LE(i + 2); // 1/1024 sec ticks

    // Initial packet
    if (lastRevs === 0 && lastEvent === 0) {
        lastRevs = crankRevs;
        lastEvent = crankEvent;
        return;
    }

    let deltaRevs = crankRevs - lastRevs;
    let deltaTimeRaw = crankEvent - lastEvent;

    // wrap
    if (deltaTimeRaw <= 0) deltaTimeRaw += 65536;

    lastRevs = crankRevs;
    lastEvent = crankEvent;

    if (deltaRevs <= 0) return;

    const cadenceRpm = (deltaRevs * 60 * 1024) / deltaTimeRaw;
    const speedKmh = cadenceRpm * SPEED_FACTOR;

    currentSpeedKmh = speedKmh;

    // Reset inactivity timer
    if (inactivityTimer) clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        console.log("⛔ No movement → speed=0");
        currentSpeedKmh = 0;

        if (broadcast) {
            broadcast({
                type: "metrics",
                deltaRevs: 0,
                cadenceRpm: 0,
                speedKmh: 0
            });
        }
    }, INACTIVITY_MS);

    // DEBUG log
    console.log(
        `🔄 +${deltaRevs} rev | cadence ${cadenceRpm.toFixed(1)} rpm | speed ${speedKmh.toFixed(
            1
        )} km/h`
    );

    // Send to backend → backend increments counter & forwards speed to client
    if (broadcast) {
        broadcast({
            deltaRevs,
            cadenceRpm,
            speedKmh
        });
    }
}
