// ═══════════════════════════════════════════════════════
//  VIEW — Summary
// ═══════════════════════════════════════════════════════
import {
    DAYS,
    SHIFTS,
    SHIFT_NAMES,
    SHIFT_ABBR,
    AVATAR_CLASS,
    PILL_CLASS,
    WEEKS_PER_MONTH,
} from "../config.js";
import { state } from "../state.js";
import { buildTimeline, coverageByDay } from "../scheduler.js";
import { byId, escapeHtml, covClass } from "../dom.js";

export function renderSummary() {
    const timeline = buildTimeline(
        state.monthStart,
        state.engineers,
        state.vacations,
        WEEKS_PER_MONTH,
    );

    const engSummary = state.engineers.map((e) => {
        const weekData = timeline.map((week) =>
            week.find((r) => r.id === e.id),
        );
        const totalWorked = weekData.reduce((s, r) => s + r.worked, 0);
        const totalVac = weekData.reduce((s, r) => s + r.vacDays, 0);
        return {
            ...e,
            totalWorked,
            totalVac,
            totalOff: WEEKS_PER_MONTH * 7 - totalWorked - totalVac,
            weeklyShifts: weekData.map((r) => r.shift),
        };
    });

    byId("summary-grid").innerHTML = engSummary
        .map(
            (e) => `
    <div class="summary-card">
      <div class="sc-name">
        <div class="eng-avatar ${AVATAR_CLASS[e.baseCohort]}" style="width:28px;height:28px;font-size:11px">${escapeHtml(e.initials)}</div>
        ${escapeHtml(e.name)}
      </div>
      <div class="sc-row"><span class="sc-row-label">Shifts this month</span><span class="sc-row-val">${e.totalWorked}</span></div>
      <div class="sc-row"><span class="sc-row-label">Vacation days</span><span class="sc-row-val" style="${e.totalVac > 0 ? "color:var(--vac)" : ""}">${e.totalVac}</span></div>
      <div class="sc-row"><span class="sc-row-label">Days off</span><span class="sc-row-val">${e.totalOff}</span></div>
      <hr class="sc-divider">
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${e.weeklyShifts.map((s, wi) => `<span class="shift-pill ${PILL_CLASS[s]}" style="font-size:10px;padding:2px 7px">W${wi + 1}: ${SHIFT_ABBR[s]}</span>`).join("")}
      </div>
    </div>
  `,
        )
        .join("");

    let covHtml = `<div class="week-card"><div class="table-wrap"><table>
    <thead><tr><th class="col-name">Shift</th>${DAYS.map((d) => `<th class="col-day">${d}</th>`).join("")}<th class="col-count">Avg</th></tr></thead><tbody>`;
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
        const wi = w % 3;
        const roster = timeline[w];
        const cov = coverageByDay(roster);
        covHtml += `<tr class="section-row"><td colspan="${DAYS.length + 2}">Week ${w + 1} — Rotation ${wi + 1}</td></tr>`;
        SHIFTS.forEach((s) => {
            const vals = DAYS.map((_, di) => cov[di][s]);
            const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
            covHtml += `<tr class="cov-row"><td class="col-name-cell">${SHIFT_NAMES[s]}</td>
        ${vals.map((v) => `<td class="${covClass(v)}">${v}</td>`).join("")}
        <td class="col-count-cell">${avg}</td></tr>`;
        });
    }
    covHtml += `</tbody></table></div></div>`;
    byId("coverage-summary").innerHTML = covHtml;
}
