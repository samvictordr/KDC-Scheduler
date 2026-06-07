// ═══════════════════════════════════════════════════════
//  DOM / FORMATTING HELPERS
// ═══════════════════════════════════════════════════════
import { DAY_MS, COVERAGE_GOOD } from "./config.js";

export const byId = (id) => document.getElementById(id);

// CSS class for a coverage count cell (shared by every view + summary).
export const covClass = (v) =>
    v >= COVERAGE_GOOD ? "cov-ok" : v === 1 ? "cov-warn" : "cov-bad";

// Escape user-controlled strings before injecting into innerHTML.
export function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );
}

// Render a shift cell as an HTML pill. `filter` dims non-matching shifts.
export function pillHtml(s, filter) {
    if (s === "VAC") return `<span class="sp-vac">VAC</span>`;
    if (s === "REST")
        return `<span class="sp-rest" title="Rest day — no morning after a night shift">RST</span>`;
    const dim = filter !== "all" && s !== "OFF" && s !== filter;
    if (s === "OFF")
        return `<span class="sp-off${dim ? " sp-dim" : ""}">—</span>`;
    const cls = s === "M" ? "sp-m" : s === "A" ? "sp-a" : "sp-n";
    return `<span class="shift-pill ${cls}${dim ? " sp-dim" : ""}">${s}</span>`;
}

// "1 Jun" style short date.
export const fmtDayMonth = (d) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// "1 Jun 2026" style long date (accepts Date or date-string).
export const fmtLongDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

// Monday Date for week `w` relative to monthStart.
export const weekStart = (monthStart, w) =>
    new Date(monthStart.getTime() + w * 7 * DAY_MS);

// Date of day `di` within a given week-start Date.
export const dayInWeek = (wkStart, di) =>
    new Date(wkStart.getTime() + di * DAY_MS);

let toastEl = null;
let toastTimer = null;
export function showToast(msg) {
    if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.id = "_toast";
        toastEl.style.cssText =
            "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1d1d1f;color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:980px;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:999;transition:opacity .3s;font-family:var(--font-text);letter-spacing:-.01em;pointer-events:none";
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.style.opacity = "0"), 2400);
}
