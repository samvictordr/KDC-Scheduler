// ═══════════════════════════════════════════════════════
//  MAIN — entry point: event wiring + initial render
// ═══════════════════════════════════════════════════════
import { state } from "./state.js";
import { computeMonthStart } from "./scheduler.js";
import { byId } from "./dom.js";
import { renderMonthly } from "./views/monthly.js";
import { renderWeekly } from "./views/weekly.js";
import {
    onMonthChange,
    switchTab,
    setShiftFilter,
    applyEngNames,
    resetEngNames,
    addVacation,
    removeVacation,
    clearAllVacations,
    populateEngFilter,
    populateVacEngSel,
    exportExcel,
} from "./actions.js";

// Map of data-action values → handlers. Handlers receive the triggering element.
const clickActions = {
    export: () => exportExcel(),
    "apply-eng-names": () => applyEngNames(),
    "reset-eng-names": () => resetEngNames(),
    "add-vacation": () => addVacation(),
    "clear-vacations": () => clearAllVacations(),
    "switch-tab": (el) => switchTab(el.dataset.tab),
    "set-shift-filter": (el) => setShiftFilter(el.dataset.shift),
    "vac-remove": (el) => removeVacation(parseInt(el.dataset.vacId)),
};

function bindEvents() {
    // Delegated click handling — covers both static and dynamically rendered controls.
    document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;
        const handler = clickActions[el.dataset.action];
        if (handler) handler(el);
    });

    // Select inputs.
    byId("month-sel").addEventListener("change", onMonthChange);
    byId("monthly-eng-filter").addEventListener("change", renderMonthly);
    byId("weekly-week-sel").addEventListener("change", renderWeekly);
}

function init() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const monthVal = `${yyyy}-${mm}`;

    byId("month-sel").value = monthVal;
    state.monthStart = computeMonthStart(monthVal);

    populateEngFilter();
    populateVacEngSel();
    bindEvents();
    renderMonthly();

    // Default the vacation date inputs to the bounds of the current month.
    byId("vac-start").value = `${yyyy}-${mm}-01`;
    const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
    byId("vac-end").value = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
}

init();
