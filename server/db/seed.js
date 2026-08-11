// Default weekly availability: weekends 4h/day, weekdays 2h/day.
const DEFAULT_AVAILABILITY = {
  0: 4, // Sun
  1: 2, // Mon
  2: 2, // Tue
  3: 2, // Wed
  4: 2, // Thu
  5: 2, // Fri
  6: 4 // Sat
};

// 10 CFA Level 1 topic areas, weight_pct normalized to sum to exactly 100.
// Derived from official range midpoints (Ethics 15-20, QM 6-9, Econ 6-9, FSA 11-14,
// Corporate Issuers 6-9, Equity 11-14, Fixed Income 11-14, Derivatives 5-8,
// Alternative Investments 7-10, Portfolio Management 8-12), scaled to sum to 100.
// These are a defensible v1 default only -- the first-run banner tells the user to
// verify against the current CFA Institute curriculum, since weights shift between cycles.
export const CFA_LEVEL_1_SUBJECTS = [
  { name: 'Ethical and Professional Standards', weight_pct: 17.1 },
  { name: 'Quantitative Methods', weight_pct: 7.3 },
  { name: 'Economics', weight_pct: 7.3 },
  { name: 'Financial Statement Analysis', weight_pct: 12.2 },
  { name: 'Corporate Issuers', weight_pct: 7.3 },
  { name: 'Equity Investments', weight_pct: 12.2 },
  { name: 'Fixed Income', weight_pct: 12.2 },
  { name: 'Derivatives', weight_pct: 6.3 },
  { name: 'Alternative Investments', weight_pct: 8.3 },
  { name: 'Portfolio Management', weight_pct: 9.8 }
];

export function seedAvailabilityDefaults(db) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO availability (weekday, available_hours) VALUES (?, ?)'
  );
  const insertAll = db.transaction(() => {
    for (const [weekday, hours] of Object.entries(DEFAULT_AVAILABILITY)) {
      insert.run(Number(weekday), hours);
    }
  });
  insertAll();
}

export function seedCfaSubjects(db, goalId) {
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM subjects WHERE goal_id = ?')
    .get(goalId);
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO subjects (goal_id, name, weight_pct, sort_order) VALUES (?, ?, ?, ?)'
  );
  const insertAll = db.transaction(() => {
    CFA_LEVEL_1_SUBJECTS.forEach((subject, index) => {
      insert.run(goalId, subject.name, subject.weight_pct, index);
    });
  });
  insertAll();
}
