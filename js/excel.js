// ═══════════════════════════════════════════════════════
//  EXCEL EXPORT — builds a styled .xlsx via xlsx-js-style (loaded from CDN)
// ═══════════════════════════════════════════════════════
import { DAYS, GROUPS, SHIFTS, SHIFT_NAMES, WEEKS_PER_MONTH } from "./config.js";
import { state, engineerById } from "./state.js";
import { buildTimeline, coverageByDay, getShift } from "./scheduler.js";
import { fmtDayMonth, weekStart, dayInWeek, showToast } from "./dom.js";

// ── palette ──────────────────────────────────────────────────────────────
const C = {
    titleBg: "1D1D1F",
    titleFg: "FFFFFF",
    weekBg: "0071E3",
    weekFg: "FFFFFF",
    hdrBg: "2C2C2E",
    hdrFg: "FFFFFF",
    sectionBg: "E8E8ED",
    sectionFg: "6E6E73",
    morningBg: "D6EAFF",
    morningFg: "003E99",
    afternoonBg: "EFD9FF",
    afternoonFg: "5C1F92",
    nightBg: "C8F5D5",
    nightFg: "0F5520",
    vacBg: "FFE8B5",
    vacFg: "6B3800",
    offFg: "AEAEB2",
    covOk: "0F5520",
    covWarn: "6B3800",
    covBad: "C0392B",
    covBg: "F3F3F6",
    rowA: "F9F9FB",
    rowB: "FFFFFF",
    border: "DEDEDE",
};

// ── style factory ─────────────────────────────────────────────────────────
function s(bg, fg, { bold = false, center = false, sz = 10, border = true } = {}) {
    const o = {
        font: { name: "Calibri", sz, bold, color: { rgb: fg } },
        alignment: {
            vertical: "center",
            horizontal: center ? "center" : "left",
            wrapText: false,
        },
    };
    if (bg) o.fill = { patternType: "solid", fgColor: { rgb: bg } };
    if (border)
        o.border = {
            top: { style: "thin", color: { rgb: C.border } },
            bottom: { style: "thin", color: { rgb: C.border } },
            left: { style: "thin", color: { rgb: C.border } },
            right: { style: "thin", color: { rgb: C.border } },
        };
    return o;
}

function shiftStyle(code, opts) {
    if (code === "M") return s(C.morningBg, C.morningFg, opts);
    if (code === "A") return s(C.afternoonBg, C.afternoonFg, opts);
    if (code === "N") return s(C.nightBg, C.nightFg, opts);
    if (code === "VAC") return s(C.vacBg, C.vacFg, opts);
    return s(null, C.offFg, opts);
}

const cell = (v, style) => ({ v, s: style });
const blank = (style) => ({ v: "", s: style });

export function exportExcel() {
    const XL = window.XLSX;
    if (!XL) {
        alert("Excel library not loaded. Check your internet connection.");
        return;
    }

    const COLS = 10; // name + shift + 7 days + days-worked
    const today = new Date();

    const ws1 = buildScheduleSheet(XL, COLS, today);
    const ws2 = buildSummarySheet(XL);
    const ws3 = buildLegendSheet(XL);

    const wb = XL.utils.book_new();
    XL.utils.book_append_sheet(wb, ws1, "Schedule");
    XL.utils.book_append_sheet(wb, ws2, "Summary");
    XL.utils.book_append_sheet(wb, ws3, "Legend");

    const fname = `dc-schedule-${today.toISOString().slice(0, 10)}.xlsx`;
    XL.writeFile(wb, fname);
    showToast("Excel exported");
}

// ── Sheet 1: Schedule ───────────────────────────────────────────────────────
function buildScheduleSheet(XL, COLS, today) {
    const rows = [];
    const merges = [];
    let ri = 0;

    function pushMergedRow(text, style) {
        rows.push([cell(text, style), ...Array(COLS - 1).fill(blank(style))]);
        merges.push({ s: { r: ri, c: 0 }, e: { r: ri, c: COLS - 1 } });
        ri++;
    }

    pushMergedRow(
        "DC Shift Roster — Monthly Schedule",
        s(C.titleBg, C.titleFg, { bold: true, sz: 14 }),
    );
    pushMergedRow(
        `Generated ${today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}  ·  ${state.engineers.length} engineers  ·  3 shifts  ·  Sun–Thu work week`,
        s("F0F0F2", "8E8E93", { sz: 9 }),
    );
    rows.push(Array(COLS).fill(blank(s(null, "FFFFFF", { border: false }))));
    ri++;

    const timeline = buildTimeline(
        state.monthStart,
        state.engineers,
        state.vacations,
        WEEKS_PER_MONTH,
    );

    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
        const wi = w % 3;
        const roster = timeline[w];
        const wkS = weekStart(state.monthStart, w);
        const wkE = dayInWeek(wkS, 6);
        const rotLbl = [
            "Rotation 1 of 3",
            "Rotation 2 of 3",
            "Rotation 3 of 3",
        ][wi];

        pushMergedRow(
            `WEEK ${w + 1}   ·   ${fmtDayMonth(wkS)} – ${fmtDayMonth(wkE)}   ·   ${rotLbl}`,
            s(C.weekBg, C.weekFg, { bold: true, sz: 11 }),
        );

        rows.push([
            cell("Engineer", s(C.hdrBg, C.hdrFg, { bold: true, sz: 9 })),
            cell("Shift", s(C.hdrBg, C.hdrFg, { bold: true, center: true, sz: 9 })),
            ...DAYS.map((d) =>
                cell(d, s(C.hdrBg, C.hdrFg, { bold: true, center: true, sz: 9 })),
            ),
            cell("Days", s(C.hdrBg, C.hdrFg, { bold: true, center: true, sz: 9 })),
        ]);
        ri++;

        let alt = false;
        GROUPS.forEach((grp) => {
            const repShift = getShift(engineerById(grp.ids[0]), wi);
            pushMergedRow(
                `${grp.label} — ${SHIFT_NAMES[repShift]} this week`,
                s(C.sectionBg, C.sectionFg, { bold: true, sz: 9 }),
            );

            grp.ids.forEach((id) => {
                const r = roster.find((x) => x.id === id);
                const bg = alt ? C.rowA : C.rowB;
                alt = !alt;
                const nameBg = r.vacDays > 0 ? C.vacBg : bg;

                rows.push([
                    cell(r.name, s(nameBg, "1D1D1F", { sz: 10 })),
                    cell(
                        SHIFT_NAMES[r.shift],
                        shiftStyle(r.shift, { bold: true, center: true, sz: 9 }),
                    ),
                    ...r.days.map((d) =>
                        cell(
                            d === "OFF" ? "—" : d === "REST" ? "RST" : d,
                            shiftStyle(d, {
                                bold: d !== "OFF" && d !== "REST",
                                center: true,
                                sz: 9,
                            }),
                        ),
                    ),
                    cell(
                        r.worked,
                        s(bg, "6E6E73", { bold: true, center: true, sz: 9 }),
                    ),
                ]);
                ri++;
            });
        });

        const cov = coverageByDay(roster);
        SHIFTS.forEach((sh) => {
            const lbl =
                sh === "M"
                    ? "Morning coverage"
                    : sh === "A"
                      ? "Afternoon coverage"
                      : "Night coverage";
            const covBg = sh === "M" ? "ECF4FF" : sh === "A" ? "F5EDFF" : "EDF9F1";
            const covFg = sh === "M" ? C.morningFg : sh === "A" ? C.afternoonFg : C.nightFg;
            rows.push([
                cell(lbl, s(covBg, covFg, { bold: true, sz: 9 })),
                blank(s(covBg, covFg, { sz: 9 })),
                ...DAYS.map((_, di) => {
                    const v = cov[di][sh];
                    const fg = v >= 2 ? C.covOk : v === 1 ? C.covWarn : C.covBad;
                    return cell(v, s(covBg, fg, { bold: v < 2, center: true, sz: 10 }));
                }),
                blank(s(covBg, covFg, { sz: 9 })),
            ]);
            ri++;
        });

        if (w < WEEKS_PER_MONTH - 1) {
            rows.push(Array(COLS).fill(blank(s(null, "FFFFFF", { border: false }))));
            ri++;
        }
    }

    const ws1 = XL.utils.aoa_to_sheet(rows);
    ws1["!merges"] = merges;
    ws1["!cols"] = [
        { wch: 24 },
        { wch: 12 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 7 },
        { wch: 6 },
    ];
    ws1["!rows"] = rows.map((_, i) => ({ hpt: i === 0 ? 28 : i === 1 ? 16 : 20 }));
    return ws1;
}

// ── Sheet 2: Engineer Summary ─────────────────────────────────────────────
function buildSummarySheet(XL) {
    const SCOLS = 9;
    const sRows = [];
    const sMerges = [];
    let si = 0;

    function sPushMerged(text, style) {
        sRows.push([cell(text, style), ...Array(SCOLS - 1).fill(blank(style))]);
        sMerges.push({ s: { r: si, c: 0 }, e: { r: si, c: SCOLS - 1 } });
        si++;
    }

    sPushMerged(
        "Engineer Summary — Monthly",
        s(C.titleBg, C.titleFg, { bold: true, sz: 13 }),
    );
    sRows.push(Array(SCOLS).fill(blank(s(null, "FFFFFF", { border: false }))));
    si++;

    const hdr = (t) => cell(t, s(C.hdrBg, C.hdrFg, { bold: true, center: true, sz: 9 }));
    sRows.push([
        cell("Engineer", s(C.hdrBg, C.hdrFg, { bold: true, sz: 9 })),
        hdr("Base Cohort"),
        hdr("Shifts/Month"),
        hdr("Vacation Days"),
        hdr("Days Off"),
        hdr("Week 1"),
        hdr("Week 2"),
        hdr("Week 3"),
        hdr("Week 4"),
    ]);
    si++;

    const timeline = buildTimeline(
        state.monthStart,
        state.engineers,
        state.vacations,
        WEEKS_PER_MONTH,
    );

    let alt = false;
    state.engineers.forEach((e) => {
        const wkData = timeline.map((week) => week.find((r) => r.id === e.id));
        const totalWorked = wkData.reduce((a, r) => a + r.worked, 0);
        const totalVac = wkData.reduce((a, r) => a + r.vacDays, 0);
        const totalOff = WEEKS_PER_MONTH * 7 - totalWorked - totalVac;
        const bg = alt ? C.rowA : C.rowB;
        alt = !alt;

        sRows.push([
            cell(e.name, s(bg, "1D1D1F", { sz: 10 })),
            cell(
                SHIFT_NAMES[e.baseCohort],
                shiftStyle(e.baseCohort, { bold: true, center: true, sz: 9 }),
            ),
            cell(totalWorked, s(bg, "1D1D1F", { bold: true, center: true, sz: 10 })),
            cell(
                totalVac,
                s(totalVac > 0 ? C.vacBg : bg, totalVac > 0 ? C.vacFg : "6E6E73", {
                    bold: totalVac > 0,
                    center: true,
                    sz: 10,
                }),
            ),
            cell(totalOff, s(bg, "6E6E73", { center: true, sz: 10 })),
            ...wkData.map((r) => {
                const abbr = r.shift === "M" ? "AM" : r.shift === "A" ? "PM" : "NGT";
                return cell(
                    abbr,
                    shiftStyle(r.shift, { bold: true, center: true, sz: 9 }),
                );
            }),
        ]);
        si++;
    });

    const ws2 = XL.utils.aoa_to_sheet(sRows);
    ws2["!merges"] = sMerges;
    ws2["!cols"] = [
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
    ];
    ws2["!rows"] = sRows.map((_, i) => ({ hpt: i === 0 ? 26 : 20 }));
    return ws2;
}

// ── Sheet 3: Legend ───────────────────────────────────────────────────────
function buildLegendSheet(XL) {
    const LCOLS = 3;
    const lRows = [];
    const lMerges = [];
    let li = 0;

    function lPushMerged(text, style) {
        lRows.push([cell(text, style), ...Array(LCOLS - 1).fill(blank(style))]);
        lMerges.push({ s: { r: li, c: 0 }, e: { r: li, c: LCOLS - 1 } });
        li++;
    }

    lPushMerged("Shift Legend", s(C.titleBg, C.titleFg, { bold: true, sz: 13 }));
    lRows.push(Array(LCOLS).fill(blank(s(null, "FFFFFF", { border: false }))));
    li++;

    [
        { code: "M", label: "Morning", time: "08:00 – 17:00" },
        { code: "A", label: "Afternoon", time: "15:00 – 23:00" },
        { code: "N", label: "Night", time: "23:00 – 08:00" },
        { code: "VAC", label: "Vacation", time: "Away from duty" },
        { code: "OFF", label: "Day off", time: "Scheduled rest" },
        { code: "REST", label: "Rest day", time: "No morning after a night" },
    ].forEach(({ code, label, time }) => {
        lRows.push([
            cell(code, shiftStyle(code, { bold: true, center: true, sz: 11 })),
            cell(label, shiftStyle(code, { bold: true, sz: 11 })),
            cell(time, shiftStyle(code, { sz: 10 })),
        ]);
        li++;
    });

    const ws3 = XL.utils.aoa_to_sheet(lRows);
    ws3["!merges"] = lMerges;
    ws3["!cols"] = [{ wch: 10 }, { wch: 16 }, { wch: 22 }];
    ws3["!rows"] = lRows.map((_, i) => ({ hpt: i === 0 ? 26 : 22 }));
    return ws3;
}
