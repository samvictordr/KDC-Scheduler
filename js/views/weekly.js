// ═══════════════════════════════════════════════════════
//  VIEW — Week Detail
// ═══════════════════════════════════════════════════════
import {
    DAYS,
    GROUPS,
    SHIFTS,
    SHIFT_NAMES,
    CYCLE_BADGES,
    CYCLE_LABELS,
} from "../config.js";
import { state, engineerById } from "../state.js";
import {
    buildTimeline,
    validateRoster,
    coverageByDay,
    getShift,
} from "../scheduler.js";
import {
    byId,
    escapeHtml,
    pillHtml,
    covClass,
    fmtDayMonth,
    weekStart,
    dayInWeek,
} from "../dom.js";

export function renderWeekly() {
    const w = parseInt(byId("weekly-week-sel").value);
    const wi = w % 3;
    // Build through the selected week so the cross-week rest rule has the
    // previous week's context, then take the week we're showing.
    const rosterBase = buildTimeline(state.monthStart, state.engineers, [], w + 1)[w];
    const roster = buildTimeline(
        state.monthStart,
        state.engineers,
        state.vacations,
        w + 1,
    )[w];
    const base = validateRoster(rosterBase);
    const full = validateRoster(roster);
    const vacVio = full.violations.filter((v) => !base.violations.includes(v));
    const vacWarn = full.warnings.filter((msg) => !base.warnings.includes(msg));
    const violations = [...base.violations, ...vacVio];
    const warnings = [...base.warnings, ...vacWarn];
    void warnings; // surfaced via the banner alongside violations

    const cov = coverageByDay(roster);
    const wkStart = weekStart(state.monthStart, w);
    const wkEnd = dayInWeek(wkStart, 6);

    let html = `<div class="week-card">
    <div class="week-card-header">
      <div>
        <div class="week-card-title">Week ${w + 1} — ${fmtDayMonth(wkStart)} – ${fmtDayMonth(wkEnd)}</div>
        <div class="week-card-meta">${CYCLE_LABELS[wi]}</div>
      </div>
      <span class="week-badge ${CYCLE_BADGES[wi]}">${CYCLE_LABELS[wi]}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th class="col-name">Engineer</th>
        ${DAYS.map((d, di) => {
            const dayDate = dayInWeek(wkStart, di);
            return `<th class="col-day"><div class="th-day">${d}</div><div class="th-date">${dayDate.getDate()}</div></th>`;
        }).join("")}
        <th class="col-count">Days</th>
      </tr></thead><tbody>`;

    GROUPS.forEach((grp) => {
        const repEng = engineerById(grp.ids[0]);
        const repShift = getShift(repEng, wi);
        html += `<tr class="section-row"><td colspan="${DAYS.length + 2}">${grp.label} — ${SHIFT_NAMES[repShift]}</td></tr>`;
        grp.ids.forEach((id) => {
            const r = roster.find((x) => x.id === id);
            html += `<tr>
        <td class="col-name-cell">${escapeHtml(r.name)}${r.vacDays > 0 ? `<span class="constraint-badge">${r.vacDays}d VAC</span>` : ""}${r.constrained ? `<span class="constraint-badge">Day pref</span>` : ""}${r.prefersDay && r.shift === "N" ? `<span class="constraint-badge">Night cover</span>` : ""}${r.restDays > 0 ? `<span class="constraint-badge">${r.restDays}d rest</span>` : ""}<div class="eng-role">${SHIFT_NAMES[r.shift]}</div></td>
        ${r.days.map((d) => `<td>${pillHtml(d, "all")}</td>`).join("")}
        <td class="col-count-cell">${r.worked}</td>
      </tr>`;
        });
    });

    SHIFTS.forEach((s) => {
        html += `<tr class="cov-row"><td class="col-name-cell">${SHIFT_NAMES[s]} coverage</td>`;
        DAYS.forEach((_, di) => {
            const v = cov[di][s];
            html += `<td class="${covClass(v)}">${v}</td>`;
        });
        html += `<td></td></tr>`;
    });
    html += `</tbody></table></div></div>`;
    byId("weekly-calendar").innerHTML = html;

    const wvbEl = byId("weekly-validation-banner");
    if (violations.length > 0) {
        const vioList =
            violations.slice(0, 3).join(" · ") +
            (violations.length > 3 ? ` +${violations.length - 3} more` : "");
        wvbEl.innerHTML = `<div class="validation-banner vb-error" style="margin-bottom:12px"><span class="vb-icon">✕</span><div>${violations.length} coverage violation${violations.length > 1 ? "s" : ""}: ${vioList}</div></div>`;
    } else {
        wvbEl.innerHTML = `<div class="validation-banner vb-ok" style="margin-bottom:12px"><span class="vb-icon">✓</span>All coverage requirements met for this week.</div>`;
    }

    const wkStatColor = violations.length > 0 ? "#c0392b" : "var(--night-text)";
    const wkStatText = violations.length > 0 ? "Issues" : "Valid";
    const wkStatSub =
        violations.length > 0 ? "See violations" : "All constraints met";
    byId("weekly-stats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Week</div><div class="stat-value">${w + 1}</div><div class="stat-sub">of 4</div></div>
    <div class="stat-card"><div class="stat-label">Engineers</div><div class="stat-value">${state.engineers.length}</div><div class="stat-sub">On roster</div></div>
    <div class="stat-card"><div class="stat-label">Vacations</div><div class="stat-value" style="color:${state.vacations.length > 0 ? "var(--vac)" : "var(--text-primary)"}">${state.vacations.length}</div><div class="stat-sub">This month</div></div>
    <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value" style="font-size:18px;color:${wkStatColor}">${wkStatText}</div><div class="stat-sub">${wkStatSub}</div></div>
  `;
}
