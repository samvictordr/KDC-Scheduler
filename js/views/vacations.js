// ═══════════════════════════════════════════════════════
//  VIEW — Vacations (list, conflict analysis, roster preview)
// ═══════════════════════════════════════════════════════
import {
    DAYS,
    SHIFT_NAMES,
    CYCLE_BADGES,
    WEEKS_PER_MONTH,
    DAY_MS,
} from "../config.js";
import { state, engineerById } from "../state.js";
import { buildTimeline, validateRoster } from "../scheduler.js";
import {
    byId,
    escapeHtml,
    pillHtml,
    fmtLongDate,
    fmtDayMonth,
    weekStart,
    dayInWeek,
} from "../dom.js";

const dayCount = (v) =>
    Math.round((new Date(v.endDate) - new Date(v.startDate)) / DAY_MS);

export function renderVacations() {
    const listEl = byId("vac-list");
    const conflEl = byId("vac-conflicts");
    const previewEl = byId("vac-calendar-preview");

    if (state.vacations.length === 0) {
        listEl.innerHTML = `<div class="vac-empty"><div class="vac-empty-icon">🗓</div>No vacations scheduled. Use the form above to add one.</div>`;
        conflEl.innerHTML = "";
        previewEl.innerHTML = "";
        return;
    }

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

    renderList(listEl);
    renderConflicts(conflEl, baseTimeline, fullTimeline);
    renderPreview(previewEl, fullTimeline);
}

function renderList(listEl) {
    listEl.innerHTML = state.vacations
        .map((v) => {
            const eng = engineerById(v.engId);
            const days = dayCount(v);
            return `<div class="vac-entry">
      <div class="vac-entry-avatar">${escapeHtml(eng.initials)}</div>
      <div class="vac-entry-info">
        <div class="vac-entry-name">${escapeHtml(eng.name)} <span style="font-size:11px;color:var(--vac-text);font-weight:400">(${SHIFT_NAMES[eng.baseCohort]} cohort)</span></div>
        <div class="vac-entry-dates">${fmtLongDate(v.startDate)} → ${fmtLongDate(v.endDate)} · ${days} calendar day${days !== 1 ? "s" : ""} ${v.note ? "· " + escapeHtml(v.note) : ""}</div>
      </div>
      <span class="vac-entry-badge">${days}d</span>
      <button class="vac-remove" data-action="vac-remove" data-vac-id="${v.id}" title="Remove vacation">✕</button>
    </div>`;
        })
        .join("");
}

function renderConflicts(conflEl, baseTimeline, fullTimeline) {
    // Only flag NEW issues introduced by vacation, not pre-existing structural gaps.
    const conflicts = [];
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
        const base = validateRoster(baseTimeline[w]);
        const full = validateRoster(fullTimeline[w]);
        const newVio = full.violations.filter(
            (v) => !base.violations.includes(v),
        );
        const newWarn = full.warnings.filter(
            (msg) => !base.warnings.includes(msg),
        );
        [...newVio, ...newWarn].forEach((msg) =>
            conflicts.push({ week: w + 1, msg }),
        );
    }

    if (conflicts.length === 0) {
        conflEl.innerHTML = `<div style="margin-top:16px;padding:12px 16px;background:#edfaf2;border-radius:var(--radius-md);border:.5px solid #b0e8c4;font-size:13px;font-weight:500;color:#1a6b30">✓ No coverage violations — minimum staffing is maintained throughout the vacation period.</div>`;
        return;
    }

    // Suggest substitutes: same-cohort engineers who are not themselves on vacation.
    const suggestions = state.vacations.map((v) => {
        const eng = engineerById(v.engId);
        const notOnVac = state.engineers
            .filter((e) => e.baseCohort === eng.baseCohort && e.id !== v.engId)
            .filter(
                (e) =>
                    !state.vacations.find(
                        (ov) => ov.engId === e.id && ov.id !== v.id,
                    ),
            );
        return { eng, sub: notOnVac[0], v };
    });

    conflEl.innerHTML = `<div class="conflict-card">
      <div class="conflict-title">⚠ Coverage impact detected</div>
      ${conflicts
          .slice(0, 6)
          .map((c) => `<div class="conflict-item">Week ${c.week}: ${c.msg}</div>`)
          .join("")}
      ${conflicts.length > 6 ? `<div class="conflict-item">+${conflicts.length - 6} more shifts affected</div>` : ""}
      ${
          suggestions.length > 0
              ? `<div style="margin-top:10px;font-size:12px;font-weight:600;color:var(--vac-text)">Suggested cover:</div>
        ${suggestions.map((sg) => (sg.sub ? `<div class="conflict-item">${escapeHtml(sg.eng.name)}'s ${SHIFT_NAMES[sg.eng.baseCohort]} shifts → consider <span class="suggest-chip">${escapeHtml(sg.sub.name)}</span> for additional cover</div>` : `<div class="conflict-item">${escapeHtml(sg.eng.name)}: no same-cohort substitute available — consider temporary reassignment</div>`)).join("")}`
              : ""
      }
    </div>`;
}

function renderPreview(previewEl, fullTimeline) {
    const vacEngIds = state.vacations.map((v) => v.engId);
    let phtml = "";
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
        const wi = w % 3;
        const roster = fullTimeline[w];
        const vacEngs = roster.filter((r) => vacEngIds.includes(r.id));
        if (vacEngs.length === 0) continue;
        const wkStart = weekStart(state.monthStart, w);
        const wkEnd = dayInWeek(wkStart, 6);

        phtml += `<div class="week-card">
      <div class="week-card-header">
        <div><div class="week-card-title">Week ${w + 1} <span style="font-size:13px;font-weight:400;color:var(--text-secondary)">${fmtDayMonth(wkStart)} – ${fmtDayMonth(wkEnd)}</span></div>
        <div class="week-card-meta">Vacation engineers only</div></div>
        <span class="week-badge ${CYCLE_BADGES[wi]}">Rotation ${wi + 1}</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th class="col-name">Engineer</th>${DAYS.map((d, di) => {
            const dd = dayInWeek(wkStart, di);
            return `<th class="col-day"><div class="th-day">${d}</div><div class="th-date">${dd.getDate()}</div></th>`;
        }).join("")}<th class="col-count">Days</th></tr></thead>
        <tbody>`;
        vacEngs.forEach((r) => {
            phtml += `<tr>
        <td class="col-name-cell">${escapeHtml(r.name)}<div class="eng-role">${SHIFT_NAMES[r.shift]}</div></td>
        ${r.days.map((d) => `<td>${pillHtml(d, "all")}</td>`).join("")}
        <td class="col-count-cell">${r.worked}</td>
      </tr>`;
        });
        phtml += `</tbody></table></div></div>`;
    }
    previewEl.innerHTML =
        phtml ||
        `<div style="padding:20px;color:var(--text-tertiary);font-size:14px">No vacation days fall within the current 4-week window.</div>`;
}
