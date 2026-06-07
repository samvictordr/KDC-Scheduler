// ═══════════════════════════════════════════════════════
//  VIEW — Monthly
// ═══════════════════════════════════════════════════════
import {
    DAYS,
    GROUPS,
    SHIFTS,
    SHIFT_NAMES,
    WEEKS_PER_MONTH,
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

export function renderMonthly() {
    const engSel = byId("monthly-eng-filter").value;
    let allBaseVio = [],
        allBaseWarn = [];
    let allVacVio = [],
        allVacWarn = [];
    let html = "";

    const baseTimeline = buildTimeline(
        state.monthStart,
        state.engineers,
        [],
        WEEKS_PER_MONTH,
    );
    const fullTimeline = buildTimeline(
        state.monthStart,
        state.engineers,
        state.vacations,
        WEEKS_PER_MONTH,
    );

    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
        const wi = w % 3;
        const rosterBase = baseTimeline[w];
        const roster = fullTimeline[w];
        const shown =
            engSel === "all"
                ? roster
                : roster.filter((r) => r.id === parseInt(engSel));
        const base = validateRoster(rosterBase);
        const full = validateRoster(roster);
        allBaseVio = allBaseVio.concat(base.violations);
        allBaseWarn = allBaseWarn.concat(base.warnings);
        allVacVio = allVacVio.concat(
            full.violations.filter((v) => !base.violations.includes(v)),
        );
        allVacWarn = allVacWarn.concat(
            full.warnings.filter((msg) => !base.warnings.includes(msg)),
        );

        const cov = coverageByDay(roster);
        const wkStart = weekStart(state.monthStart, w);
        const wkEnd = dayInWeek(wkStart, 6);
        const dateRange = `${fmtDayMonth(wkStart)} – ${fmtDayMonth(wkEnd)}`;

        html += `<div class="week-card">
      <div class="week-card-header">
        <div>
          <div class="week-card-title">Week ${w + 1} <span style="font-size:13px;font-weight:400;color:var(--text-secondary)">${dateRange}</span></div>
          <div class="week-card-meta">${shown.length} engineer${shown.length !== 1 ? "s" : ""} · ${CYCLE_LABELS[wi]}</div>
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
            const grpEngs = shown.filter((r) => grp.ids.includes(r.id));
            if (!grpEngs.length) return;
            const repEng = engineerById(grp.ids[0]);
            const repShift = getShift(repEng, wi);
            html += `<tr class="section-row"><td colspan="${DAYS.length + 2}">${grp.label} — ${SHIFT_NAMES[repShift]} this week</td></tr>`;
            grpEngs.forEach((r) => {
                const rowStyle =
                    r.vacDays > 0
                        ? ' style="background:rgba(255,159,10,.04)"'
                        : "";
                html += `<tr${rowStyle}>
          <td class="col-name-cell">${escapeHtml(r.name)}${r.vacDays > 0 ? `<span class="constraint-badge">${r.vacDays}d VAC</span>` : ""}${r.constrained ? `<span class="constraint-badge">Day pref</span>` : ""}${r.prefersDay && r.shift === "N" ? `<span class="constraint-badge">Night cover</span>` : ""}${r.restDays > 0 ? `<span class="constraint-badge">${r.restDays}d rest</span>` : ""}<div class="eng-role">${SHIFT_NAMES[r.shift]}</div></td>
          ${r.days.map((d) => `<td>${pillHtml(d, state.shiftFilter)}</td>`).join("")}
          <td class="col-count-cell">${r.worked}</td>
        </tr>`;
            });
        });

        if (engSel === "all") {
            SHIFTS.forEach((s) => {
                html += `<tr class="cov-row"><td class="col-name-cell">${SHIFT_NAMES[s]} coverage</td>`;
                DAYS.forEach((_, di) => {
                    const v = cov[di][s];
                    html += `<td class="${covClass(v)}">${v}</td>`;
                });
                html += `<td></td></tr>`;
            });
        }
        html += `</tbody></table></div></div>`;
    }

    byId("monthly-calendar").innerHTML = html;

    const allVio = [...allBaseVio, ...allVacVio];
    renderBanner(allVio, allBaseVio);
    renderStats(engSel, allVio);
}

function renderBanner(allVio, allBaseVio) {
    const vbEl = byId("validation-banner");
    const summarise = (list) =>
        list.slice(0, 3).join(" · ") +
        (list.length > 3 ? ` +${list.length - 3} more` : "");

    if (allVio.length > 0) {
        vbEl.innerHTML = `<div class="validation-banner vb-error"><span class="vb-icon">✕</span><div>${allVio.length} coverage violation${allVio.length > 1 ? "s" : ""}: ${summarise(allVio)}</div></div>`;
    } else if (allBaseVio.length > 0) {
        vbEl.innerHTML = `<div class="validation-banner vb-error"><span class="vb-icon">✕</span><div>${allBaseVio.length} structural violation${allBaseVio.length > 1 ? "s" : ""}: ${summarise(allBaseVio)}</div></div>`;
    } else {
        vbEl.innerHTML = `<div class="validation-banner vb-ok"><span class="vb-icon">✓</span>All coverage requirements met — Night ≥ 2, Morning/Afternoon ≥ 1 on every shift.</div>`;
    }
}

function renderStats(engSel, allVio) {
    const vacCount = state.vacations.length;
    const engCount = engSel === "all" ? state.engineers.length : 1;
    const statColor = allVio.length > 0 ? "#c0392b" : "var(--night-text)";
    const statText = allVio.length > 0 ? "Issues" : "Valid";
    const statSub =
        allVio.length > 0
            ? "See violations"
            : vacCount > 0
              ? "Vacation applied"
              : "All clear";
    byId("monthly-stats").innerHTML = `
    <div class="stat-card"><div class="stat-label">Engineers</div><div class="stat-value">${engCount}</div><div class="stat-sub">On roster</div></div>
    <div class="stat-card"><div class="stat-label">Avg shifts/week</div><div class="stat-value">5</div><div class="stat-sub">Per engineer</div></div>
    <div class="stat-card"><div class="stat-label">Vacations</div><div class="stat-value" style="color:${vacCount > 0 ? "var(--vac)" : "var(--text-primary)"}">${vacCount}</div><div class="stat-sub">${vacCount > 0 ? "Active this month" : "None scheduled"}</div></div>
    <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value" style="font-size:18px;color:${statColor}">${statText}</div><div class="stat-sub">${statSub}</div></div>
  `;
}
