// ═══════════════════════════════════════════════════════
//  SCHEDULING ENGINE — pure domain logic (no DOM, no state import)
// ═══════════════════════════════════════════════════════
import { DAYS, ROT, SHIFTS, DAY_MS, OFF_PATTERNS, MIN_COVERAGE } from "./config.js";

// Shift a day-preferring engineer falls back to when their rotation lands on Night.
const PREFERRED_DAY_SHIFT = "M";

// Raw rotation shift for a base cohort in a given week (ignores any preference).
// weekIdx may be negative (the week before the window), so wrap safely.
function rotationShift(baseCohort, weekIdx) {
    const n = ROT.length;
    return ROT[(((ROT.indexOf(baseCohort) + weekIdx) % n) + n) % n];
}

// eng may be an engineer object or a baseCohort string (string path ignores constraints).
export function getShift(eng, weekIdx) {
    const baseCohort = typeof eng === "string" ? eng : eng.baseCohort;
    const raw = rotationShift(baseCohort, weekIdx);
    // Display-only fallback for day-preferring engineers; the coverage-aware
    // decision (whether they actually work Night) is made in buildWeekRosterWithVac.
    if (typeof eng === "object" && eng.prefersDay && raw === "N")
        return PREFERRED_DAY_SHIFT;
    return raw;
}

export function isShiftConstrained(eng, weekIdx) {
    if (!eng.prefersDay) return false;
    return rotationShift(eng.baseCohort, weekIdx) === "N";
}

export function getOffDays(eng, weekIdx) {
    return (OFF_PATTERNS[eng.baseCohort] || [])[eng.posInCohort] || [5, 6];
}

// Cell value for a rest day forced by the "no morning after a night" rule.
export const REST = "REST";

// True when engineer `e` is on vacation on the absolute day `dayMs`.
function isVacDay(e, dayMs, vacations) {
    const dayDate = new Date(dayMs);
    dayDate.setHours(0, 0, 0, 0);
    for (const v of vacations) {
        if (v.engId !== e.id) continue;
        const s = new Date(v.startDate);
        s.setHours(0, 0, 0, 0);
        const en = new Date(v.endDate);
        en.setHours(0, 0, 0, 0);
        if (dayDate >= s && dayDate < en) return true;
    }
    return false;
}

// Decide each engineer's effective shift for the week, keyed by id.
// Day-preferring engineers default to PREFERRED_DAY_SHIFT during a Night
// rotation, but are pulled onto Night when removing them would drop night
// coverage below MIN_COVERAGE.N on any day they could actually work.
function effectiveShifts(weekIdx, engineers, weekStartMs, vacations) {
    const eff = {};
    engineers.forEach((e) => (eff[e.id] = rotationShift(e.baseCohort, weekIdx)));

    const worksNight = (e, di) =>
        eff[e.id] === "N" &&
        !getOffDays(e, weekIdx).includes(di) &&
        !isVacDay(e, weekStartMs + di * DAY_MS, vacations);

    engineers
        .filter((e) => e.prefersDay && eff[e.id] === "N")
        .forEach((e) => {
            const off = getOffDays(e, weekIdx);
            const needed = DAYS.some((_, di) => {
                if (off.includes(di)) return false; // can't help on a day off
                if (isVacDay(e, weekStartMs + di * DAY_MS, vacations)) return false;
                const others = engineers.filter(
                    (o) => o.id !== e.id && worksNight(o, di),
                ).length;
                return others < MIN_COVERAGE.N;
            });
            eff[e.id] = needed ? "N" : PREFERRED_DAY_SHIFT;
        });

    return eff;
}

// Build a single week's roster. `vacations` overlays VAC days; `prevWeekRoster`
// (the previous week's built roster, or null) enforces the rest rule across the
// week boundary. monthStart is the Sunday of Week 1.
export function buildWeekRosterWithVac(
    weekIdx,
    monthStart,
    engineers,
    vacations = [],
    prevWeekRoster = null,
) {
    const weekStartMs = monthStart.getTime() + weekIdx * 7 * DAY_MS;
    const eff = effectiveShifts(weekIdx, engineers, weekStartMs, vacations);

    return engineers.map((e) => {
        const originalShift = rotationShift(e.baseCohort, weekIdx);
        const shift = eff[e.id];
        // Flag day-preferring engineers kept off Night by their preference.
        const constrained = e.prefersDay && originalShift === "N" && shift !== "N";
        const off = getOffDays(e, weekIdx);
        const days = DAYS.map((_, di) => {
            if (off.includes(di)) return "OFF";
            if (isVacDay(e, weekStartMs + di * DAY_MS, vacations)) return "VAC";
            return shift;
        });

        // Rest rule: a Morning may not follow a Night shift. Convert the
        // offending morning to REST — across the week boundary first, then
        // any same-week adjacency (possible only if shifts ever mix).
        const prev = prevWeekRoster?.find((p) => p.id === e.id);
        if (prev && prev.days[DAYS.length - 1] === "N" && days[0] === "M")
            days[0] = REST;
        for (let di = 1; di < days.length; di++) {
            if (days[di] === "M" && days[di - 1] === "N") days[di] = REST;
        }

        return {
            ...e,
            shift,
            originalShift,
            constrained,
            days,
            worked: days.filter((d) => d !== "OFF" && d !== "VAC" && d !== REST)
                .length,
            vacDays: days.filter((d) => d === "VAC").length,
            restDays: days.filter((d) => d === REST).length,
        };
    });
}

// Build every week of the window as one timeline so coverage decisions and the
// cross-week rest rule are applied consistently. Returns an array of rosters.
export function buildTimeline(monthStart, engineers, vacations, weeks) {
    const timeline = [];
    // Seed with the week just before the window so the rest rule is correct on
    // the first displayed Sunday (the rotation is continuous month to month).
    let prev = buildWeekRosterWithVac(-1, monthStart, engineers, vacations, null);
    for (let w = 0; w < weeks; w++) {
        const roster = buildWeekRosterWithVac(
            w,
            monthStart,
            engineers,
            vacations,
            prev,
        );
        timeline.push(roster);
        prev = roster;
    }
    return timeline;
}

// Per-day coverage counts for each shift, keyed by shift code.
export function coverageByDay(roster) {
    return DAYS.map((_, di) => {
        const counts = {};
        SHIFTS.forEach((sh) => {
            counts[sh] = roster.filter((r) => r.days[di] === sh).length;
        });
        return counts;
    });
}

export function validateRoster(roster) {
    const violations = [];
    const warnings = [];
    DAYS.forEach((_, di) => {
        const m = roster.filter((r) => r.days[di] === "M").length;
        const a = roster.filter((r) => r.days[di] === "A").length;
        const n = roster.filter((r) => r.days[di] === "N").length;

        // Vacation attribution: evaluate based on the shift the engineer ACTUALLY
        // would have worked, so e.g. Engineer J's vacation isn't blamed on Night.
        const mVac = roster.filter(
            (r) => r.shift === "M" && r.days[di] === "VAC",
        ).length;
        const aVac = roster.filter(
            (r) => r.shift === "A" && r.days[di] === "VAC",
        ).length;
        const nVac = roster.filter(
            (r) => r.shift === "N" && r.days[di] === "VAC",
        ).length;

        if (m < MIN_COVERAGE.M)
            violations.push(
                `Morning unstaffed on ${DAYS[di]}${mVac > 0 ? " — " + mVac + " on vacation" : ""}`,
            );
        if (a < MIN_COVERAGE.A)
            violations.push(
                `Afternoon unstaffed on ${DAYS[di]}${aVac > 0 ? " — " + aVac + " on vacation" : ""}`,
            );
        if (n < 1)
            violations.push(
                `Night unstaffed on ${DAYS[di]}${nVac > 0 ? " — " + nVac + " on vacation" : ""}`,
            );
        else if (n < MIN_COVERAGE.N)
            violations.push(
                `Night short-staffed on ${DAYS[di]} (${n}/2)${nVac > 0 ? " — " + nVac + " on vacation" : ""}`,
            );
    });
    return { violations, warnings };
}

// Returns the Sunday on or before the 1st of the given month (KSA week starts
// Sunday). yearMonth: "YYYY-MM" string, or null/undefined for the current month.
export function computeMonthStart(yearMonth) {
    let year, month;
    if (yearMonth) {
        [year, month] = yearMonth.split("-").map(Number);
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }
    const first = new Date(year, month - 1, 1);
    first.setHours(0, 0, 0, 0);
    first.setDate(first.getDate() - first.getDay()); // back up to Sunday (0=Sun)
    return first;
}
