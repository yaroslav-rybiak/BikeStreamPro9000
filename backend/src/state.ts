import fs from "fs";
import path from "path";

const STATE_FILE = path.join(__dirname, "../state.json");

export interface AppState {
    counter: number;
}

// Default state if file missing
const defaultState: AppState = {
    counter: 0
};

let state: AppState = { ...defaultState };

// Load state from file
export function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = fs.readFileSync(STATE_FILE, "utf8");
            state = JSON.parse(raw);
            console.log("Loaded state:", state);
        } else {
            console.log("No state file found — starting fresh.");
        }
    } catch (e) {
        console.error("Failed to load state file, using defaults.", e);
    }
}

// Save to JSON file
export function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    } catch (e) {
        console.error("Failed to save state!", e);
    }
}

// Get + set
export function getCounter() {
    return state.counter;
}

export function incrementCounter(amount: number) {
    state.counter += amount;
    if (state.counter < 0) state.counter = 0;
    saveState();
}

export function setCounter(newValue: number) {
    state.counter = Math.max(0, newValue);
    saveState();
}
