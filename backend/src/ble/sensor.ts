import noble from "@abandonware/noble";

const TARGET_UUID = "2315f21157f95d2a998673c0713cf0c3";
const CSC_SERVICE = "1816";
const CSC_MEASUREMENT = "2a5b";

// Broadcast handler (sends metrics to backend)
let broadcast: ((msg: any) => void) | null = null;
export function setMetricBroadcast(fn: (msg: any) => void) {
    broadcast = fn;
}

let isConnecting = false;
let isConnected = false;

// --------------------------------------------------------------------
// Start scanning for BLE device
// --------------------------------------------------------------------
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

// --------------------------------------------------------------------
// Connect and subscribe
// --------------------------------------------------------------------
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
            (_err, _services, chars) => {
                const csc = chars[0];
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

        // Restart scan after 1s
        setTimeout(() => {
            console.log("🔎 Resuming BLE scan…");
            noble.startScanning([], true);
        }, 1000);
    });
}

// --------------------------------------------------------------------
// CSC Parsing (cadence only)
// --------------------------------------------------------------------
let lastRevs = 0;
let lastEvent = 0;

function handleCSCMeasurement(data: Buffer) {
    const flags = data.readUInt8(0);
    let i = 1;

    const hasWheel = !!(flags & 1);
    const hasCrank = !!(flags & 2);

    if (hasWheel) i += 6;
    if (!hasCrank) return;

    const crankRevs = data.readUInt16LE(i);
    const crankEvent = data.readUInt16LE(i + 2);

    // First packet → initialize state
    if (lastRevs === 0 && lastEvent === 0) {
        lastRevs = crankRevs;
        lastEvent = crankEvent;
        return;
    }

    // Compute deltas
    let deltaRevs = crankRevs - lastRevs;
    let deltaTimeRaw = crankEvent - lastEvent;

    if (deltaTimeRaw <= 0) deltaTimeRaw += 65536;

    lastRevs = crankRevs;
    lastEvent = crankEvent;

    if (deltaRevs <= 0) return;

    // Cadence RPM
    const cadenceRpm = (deltaRevs * 60 * 1024) / deltaTimeRaw;

    console.log(`🔄 +${deltaRevs} rev | cadence ${cadenceRpm.toFixed(1)} rpm`);

    // Emit only revolutions + cadence
    if (broadcast) {
        broadcast({
            deltaRevs,
            cadenceRpm
        });
    }
}
