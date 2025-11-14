import noble from "@abandonware/noble";
import { EventEmitter } from "events";

class Sensor extends EventEmitter {
    private targetUuid = "99cee6d0e05aaba5df1571b5e51f6aa9";

    constructor() {
        super();

        noble.on("stateChange", async (state) => {
            if (state === "poweredOn") {
                console.log("Starting scan...");
                await noble.startScanningAsync([], false);
            } else {
                await noble.stopScanningAsync();
            }
        });

        noble.on("discover", async (peripheral) => {
            if (peripheral.uuid === this.targetUuid) {
                await noble.stopScanningAsync();
                console.log("Found target device:", peripheral.advertisement.localName);

                await peripheral.connectAsync();
                console.log("Connected to", peripheral.advertisement.localName);

                const { characteristics } =
                    await peripheral.discoverSomeServicesAndCharacteristicsAsync([], []);

                // Subscribe to all characteristics that support notify
                for (const char of characteristics) {
                    if (char.properties.includes("notify")) {
                        char.on("data", (data) => {
                            const hex = data.toString("hex");
                            let button = null;

                            // Map hex to button
                            if (hex === "01") button = "A";
                            else if (hex === "02") button = "B";

                            if (button) {
                                this.emit("button", button); // send to WebSocket
                            }
                        });

                        await char.subscribeAsync();
                    }
                }
            }
        });
    }
}

export default Sensor;
