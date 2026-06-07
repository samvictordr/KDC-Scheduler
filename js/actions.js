// ═══════════════════════════════════════════════════════
//  ACTIONS — user-triggered behaviour: state mutations + view orchestration
// ═══════════════════════════════════════════════════════
import { DEFAULT_NAMES, MAX_VACATIONS } from "./config.js";
import { state, engineerById } from "./state.js";
import { computeMonthStart } from "./scheduler.js";
import { byId, escapeHtml, showToast } from "./dom.js";
import { renderMonthly } from "./views/monthly.js";
import { renderWeekly } from "./views/weekly.js";
import { renderEngConfig } from "./views/engineers.js";
import { renderSummary } from "./views/summary.js";
import { renderVacations } from "./views/vacations.js";
import { exportExcel } from "./excel.js";

export { exportExcel };

// Tab id → render function. Adding a tab = add a panel/button in HTML + one
// entry here; switchTab needs no changes (Open/Closed).
const VIEW_RENDERERS = {
    monthly: renderMonthly,
    weekly: renderWeekly,
    engineers: renderEngConfig,
    summary: renderSummary,
    vacations: renderVacations,
};

// ── Orchestration ──────────────────────────────────────────────────────────
// Re-render every data view (the engineer config form is rendered on demand).
export function renderAll() {
    renderMonthly();
    renderWeekly();
    renderSummary();
    renderVacations();
}

export function populateEngFilter() {
    const sel = byId("monthly-eng-filter");
    const cur = sel.value;
    sel.innerHTML =
        `<option value="all">All engineers</option>` +
        state.engineers
            .map(
                (e) =>
                    `<option value="${e.id}"${e.id == parseInt(cur) ? " selected" : ""}>${escapeHtml(e.name)}</option>`,
            )
            .join("");
}

export function populateVacEngSel() {
    byId("vac-eng-sel").innerHTML =
        `<option value="">Select engineer…</option>` +
        state.engineers
            .map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`)
            .join("");
}

export function updateVacTabBadge() {
    byId("vac-tab-btn").textContent =
        state.vacations.length > 0
            ? `Vacations (${state.vacations.length})`
            : "Vacations";
}

// ── Navigation / filters ─────────────────────────────────────────────────────
export function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active", "tab-vac-active");
    });
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add(tab === "vacations" ? "tab-vac-active" : "active");

    document
        .querySelectorAll(".view-panel")
        .forEach((p) => p.classList.remove("active"));
    byId(`panel-${tab}`).classList.add("active");

    VIEW_RENDERERS[tab]?.();
}

export function setShiftFilter(filter) {
    state.shiftFilter = filter;
    document
        .querySelectorAll("#shift-filter .pill-btn")
        .forEach((b) => (b.className = "pill-btn"));
    const btn = document.querySelector(
        `#shift-filter .pill-btn[data-shift="${filter}"]`,
    );
    if (btn)
        btn.classList.add(
            filter === "all"
                ? "active"
                : filter === "M"
                  ? "active-m"
                  : filter === "A"
                    ? "active-a"
                    : "active-n",
        );
    renderMonthly();
}

export function onMonthChange() {
    state.monthStart = computeMonthStart(byId("month-sel").value || null);
    renderAll();
}

// ── Engineers ────────────────────────────────────────────────────────────────
function deriveInitials(name) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function applyEngNames() {
    state.engineers.forEach((e) => {
        const inp = byId(`eng-name-${e.id}`);
        if (inp) {
            e.name = inp.value.trim() || e.name;
            e.initials = deriveInitials(e.name);
        }
    });
    populateEngFilter();
    populateVacEngSel();
    renderAll();
    showToast("Changes saved");
}

export function resetEngNames() {
    state.engineers.forEach((e, i) => {
        e.name = DEFAULT_NAMES[i];
        e.initials = deriveInitials(DEFAULT_NAMES[i]);
    });
    renderEngConfig();
    applyEngNames();
}

// ── Vacations ────────────────────────────────────────────────────────────────
function showFormError(msg) {
    const el = byId("vac-form-error");
    el.textContent = msg;
    el.style.display = "block";
}

export function addVacation() {
    byId("vac-form-error").style.display = "none";

    const engId = parseInt(byId("vac-eng-sel").value);
    const startStr = byId("vac-start").value;
    const endStr = byId("vac-end").value;
    const note = byId("vac-note").value.trim();

    if (isNaN(engId)) return showFormError("Please select an engineer.");
    if (!startStr) return showFormError("Please choose a start date.");
    if (!endStr) return showFormError("Please choose a return date.");

    const startDate = new Date(startStr + "T00:00:00");
    const endDate = new Date(endStr + "T00:00:00");
    if (endDate <= startDate)
        return showFormError("Return date must be after the start date.");

    if (state.vacations.length >= MAX_VACATIONS)
        return showFormError(
            `Maximum ${MAX_VACATIONS} simultaneous vacations allowed. Remove one first.`,
        );

    const overlap = state.vacations.find((v) => {
        if (v.engId !== engId) return false;
        return startDate < new Date(v.endDate) && endDate > new Date(v.startDate);
    });
    if (overlap)
        return showFormError(
            `${engineerById(engId).name} already has a vacation that overlaps these dates.`,
        );

    state.vacations.push({
        id: state.vacIdCounter++,
        engId,
        startDate,
        endDate,
        note,
    });
    byId("vac-start").value = "";
    byId("vac-end").value = "";
    byId("vac-note").value = "";
    byId("vac-eng-sel").value = "";

    renderVacations();
    renderAll();
    updateVacTabBadge();
    showToast("Vacation added");
}

export function removeVacation(vid) {
    state.vacations = state.vacations.filter((v) => v.id !== vid);
    renderVacations();
    renderAll();
    updateVacTabBadge();
    showToast("Vacation removed");
}

export function clearAllVacations() {
    if (state.vacations.length === 0) return;
    state.vacations = [];
    renderVacations();
    renderAll();
    updateVacTabBadge();
    showToast("All vacations cleared");
}
