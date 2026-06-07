// ═══════════════════════════════════════════════════════
//  STATE — single mutable source of truth for the app
// ═══════════════════════════════════════════════════════
import { DEFAULT_ENGINEERS } from "./config.js";

export const state = {
    // Working copy of the roster (engineers are renamed in-place).
    engineers: DEFAULT_ENGINEERS.map((e) => ({ ...e })),

    // Active vacation requests: [{ id, engId, startDate, endDate, note }]
    vacations: [],
    vacIdCounter: 0,

    // Monday on or before the 1st of the selected month (set during init).
    monthStart: null,

    // Monthly-view shift filter: "all" | "M" | "A" | "N".
    shiftFilter: "all",
};

// Convenience lookup used across views.
export function engineerById(id) {
    return state.engineers.find((e) => e.id === id);
}
