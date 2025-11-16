import noble from "@abandonware/noble";

// BLE identifiers for cadence-only CYCPLUS sensor
const TARGET_UUID = "2315f21157f95d2a998673c0713cf0c3";
const CSC_SERVICE = "1816";
const CSC_MEASUREMENT = "2a5b";

// Callback for broadcasting data to backend
let broadcast: ((msg: any) => void) | null = null;
export function setMetricBroadcast(fn: (msg: any) => void) {
    broadcast = fn;
}

// Connection state flags
let isConnecting = false;
let isConnected = false;

// Marks that next measurement is first after reconnect
let justReconnected = false;

// ------------------------------------------------------------
// Start BLE scanning
// ------------------------------------------------------------
export function startSensorScan() {
    console.log("Starting BLE scan…");

    noble.on("stateChange", (state) => {
        if (state === "poweredOn") {
            noble.startScanning([], true);
        } else {
            noble.stopScanning();
        }
    });

    noble.on("discover", (peripheral) => {
        if (peripheral.uuid !== TARGET_UUID) return;
        if (isConnecting || isConnected) return;

        isConnecting = true;
        console.log("Found sensor:", peripheral.uuid);

        noble.stopScanning();
        connect(peripheral);
    });
}

// ------------------------------------------------------------
// Connect and subscribe to CSC measurement
// ------------------------------------------------------------
function connect(peripheral: noble.Peripheral) {
    console.log("Connecting…");

    peripheral.connect((err) => {
        if (err) {
            console.error("Connection error:", err);
            isConnecting = false;
            return;
        }

        isConnected = true;
        justReconnected = true; // important

        console.log("Connected");

        peripheral.discoverSomeServicesAndCharacteristics(
            [CSC_SERVICE],
            [CSC_MEASUREMENT],
            (_err, _services, chars) => {
                const csc = chars[0];
                if (!csc) {
                    console.error("Missing CSC characteristic");
                    return;
                }

                csc.on("data", handleCSCMeasurement);
                csc.subscribe();
            }
        );
    });

    peripheral.once("disconnect", () => {
        console.log("Sensor disconnected");

        isConnected = false;
        isConnecting = false;

        setTimeout(() => {
            console.log("Resuming BLE scan…");
            noble.startScanning([], true);
        }, 200);
    });
}

// ------------------------------------------------------------
// CSC Parsing – crank-only mode
// ------------------------------------------------------------
let lastRevs = 0;
let lastEvent = 0;

function handleCSCMeasurement(data: Buffer) {
    const crankRevs = data.readUInt16LE(1);
    const crankEvent = data.readUInt16LE(3);

    // First packet EVER → just initialize
    if (lastRevs === 0 && lastEvent === 0) {
        lastRevs = crankRevs;
        lastEvent = crankEvent;
        return;
    }

    let deltaRevs = crankRevs - lastRevs;
    let deltaTime = crankEvent - lastEvent;

    // Fix wraparound
    if (deltaTime <= 0) deltaTime += 65536;

    // ------------------------------------------------------------
    // Handle reconnection logic
    // ------------------------------------------------------------
    if (justReconnected) {
        justReconnected = false;

        if (crankRevs >= lastRevs) {
            // No sensor reset, but we missed some revolutions
            deltaRevs = crankRevs - lastRevs;
            console.log(
                `Reconnected: catch-up +${deltaRevs} (from ${lastRevs} → ${crankRevs})`
            );
        } else {
            // Sensor reset after sleep
            deltaRevs = crankRevs;
            console.log(
                `Sensor reset detected: +${deltaRevs} (total restarted at ${crankRevs})`
            );
        }
    } else {
        // Normal operation: ignore negatives
        if (deltaRevs <= 0) return;
    }

    lastRevs = crankRevs;
    lastEvent = crankEvent;

    const cadenceRpm = (deltaRevs * 60 * 1024) / deltaTime;

    console.log(
        `+${deltaRevs} rev | total=${crankRevs} | cadence ${cadenceRpm.toFixed(1)} rpm`
    );

    if (broadcast) {
        broadcast({
            deltaRevs,
            cadenceRpm
        });
    }
}
