// ═══════════════════════════════════════════════════════
//  VIEW — Engineer Configuration
// ═══════════════════════════════════════════════════════
import { AVATAR_CLASS, PILL_CLASS, SHIFT_NAMES } from "../config.js";
import { state } from "../state.js";
import { byId, escapeHtml } from "../dom.js";

export function renderEngConfig() {
    byId("eng-grid").innerHTML = state.engineers
        .map(
            (e) => `
    <div class="eng-config-card">
      <div class="eng-avatar ${AVATAR_CLASS[e.baseCohort]}">${escapeHtml(e.initials)}</div>
      <div class="eng-config-info">
        <input class="eng-config-input" id="eng-name-${e.id}" value="${escapeHtml(e.name)}" maxlength="32" placeholder="Name" />
        <div style="margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="shift-pill ${PILL_CLASS[e.baseCohort]}" style="font-size:10px;padding:2px 7px">${SHIFT_NAMES[e.baseCohort]}</span>
          <span style="font-size:11px;color:var(--text-tertiary)">Base cohort</span>
          ${e.prefersDay ? `<span style="font-size:10px;background:var(--vac-bg);color:var(--vac-text);padding:2px 7px;border-radius:980px;font-weight:600" title="Prefers daylight shifts; covers Night only when needed for staffing">Prefers day</span>` : ""}
        </div>
      </div>
    </div>
  `,
        )
        .join("");
}
