// ═══════════════════════════════════════════════════════
//  CONFIG — static constants and default data (no logic, no DOM)
// ═══════════════════════════════════════════════════════

// Week runs Sunday → Saturday (Kingdom of Saudi Arabia): the working week is
// Sun–Thu, with Fri/Sat the weekend. Index 0 = Sun … 6 = Sat throughout.
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Milliseconds in a day — shared time unit for all date arithmetic.
export const DAY_MS = 86400000;

// Number of weeks rendered/exported per month view.
export const WEEKS_PER_MONTH = 4;

// The set of shift codes. Drive loops from this rather than literal ["M","A","N"]
// so a new shift only needs entries here + the maps below (+ a CSS class).
export const SHIFTS = ["M", "A", "N"];

// Shift rotation order. Cohorts advance one step each week: M → A → N → repeat.
export const ROT = ["M", "A", "N"];

// Coverage count at or above this is considered fully staffed (UI colouring).
export const COVERAGE_GOOD = 2;

// Display labels keyed by shift code.
export const SHIFT_NAMES = { M: "Morning", A: "Afternoon", N: "Night" };
export const SHIFT_ABBR = { M: "AM", A: "PM", N: "Ngt" };

// Rotation badge styling / labels, indexed by (weekIndex % 3).
export const CYCLE_BADGES = ["badge-cycle1", "badge-cycle2", "badge-cycle3"];
export const CYCLE_LABELS = [
    "Rotation 1 of 3",
    "Rotation 2 of 3",
    "Rotation 3 of 3",
];

// CSS class maps keyed by shift code.
export const AVATAR_CLASS = { M: "av-m", A: "av-a", N: "av-n" };
export const PILL_CLASS = { M: "sp-m", A: "sp-a", N: "sp-n" };

// Default roster. Cloned into mutable state on startup.
export const DEFAULT_ENGINEERS = [
    { id: 0, name: "Engineer A", initials: "EA", baseCohort: "M", posInCohort: 0 },
    { id: 1, name: "Engineer B", initials: "EB", baseCohort: "M", posInCohort: 1 },
    { id: 2, name: "Engineer C", initials: "EC", baseCohort: "M", posInCohort: 2 },
    { id: 3, name: "Engineer D", initials: "ED", baseCohort: "N", posInCohort: 3 },
    { id: 4, name: "Engineer E", initials: "EE", baseCohort: "A", posInCohort: 0 },
    { id: 5, name: "Engineer F", initials: "EF", baseCohort: "A", posInCohort: 1 },
    { id: 6, name: "Engineer G", initials: "EG", baseCohort: "A", posInCohort: 2 },
    { id: 7, name: "Engineer H", initials: "EH", baseCohort: "N", posInCohort: 0 },
    { id: 8, name: "Engineer I", initials: "EI", baseCohort: "N", posInCohort: 1 },
    {
        id: 9,
        name: "Engineer J",
        initials: "EJ",
        baseCohort: "N",
        posInCohort: 2,
        // Prefers daylight shifts (Morning/Afternoon). Stays on day during a
        // Night-rotation week, but is pulled onto Night if dropping them would
        // take night coverage below MIN_COVERAGE.N (soft, coverage-aware).
        prefersDay: true,
    },
];

// Default names used by "Reset to Default".
export const DEFAULT_NAMES = DEFAULT_ENGINEERS.map((e) => e.name);

// Days-off pattern per cohort, indexed by posInCohort. 0=Sun … 6=Sat.
// Off-days are staggered so the data center stays covered every day; the lead
// engineer of each cohort takes the standard Fri/Sat (KSA) weekend.
export const OFF_PATTERNS = {
    M: [
        [5, 6],
        [3, 4],
        [1, 2],
    ], // A(Fri/Sat), B(Wed/Thu), C(Mon/Tue)
    A: [
        [5, 6],
        [3, 4],
        [1, 2],
    ], // E(Fri/Sat), F(Wed/Thu), G(Mon/Tue)
    N: [
        [5, 6],
        [3, 4],
        [1, 2],
        [0, 2],
    ], // H(Fri/Sat), I(Wed/Thu), J(Mon/Tue), D(Sun/Tue)
};

// Cohort groupings — which engineer IDs belong to each display group.
// Night cohort includes Engineer D (moved from Morning) to guarantee ≥2 Night coverage.
export const GROUPS = [
    { label: "Morning cohort", ids: [0, 1, 2] },
    { label: "Afternoon cohort", ids: [4, 5, 6] },
    { label: "Night cohort", ids: [7, 8, 9, 3] },
];

// Minimum staffing required per shift (used by validation).
export const MIN_COVERAGE = { M: 1, A: 1, N: 2 };

// Maximum number of simultaneous vacations the scheduler will accept.
export const MAX_VACATIONS = 2;
