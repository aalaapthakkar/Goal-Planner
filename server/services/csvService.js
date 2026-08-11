import Papa from 'papaparse';

function parseCsv(csvText) {
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  return data;
}

// --- sessions ---

export function sessionsToCsv(sessions, subjectNameById) {
  const rows = sessions.map((s) => ({
    id: s.id,
    subject_name: subjectNameById.get(s.subject_id) ?? '',
    session_date: s.session_date,
    minutes: s.minutes,
    focus_rating: s.focus_rating ?? '',
    notes: s.notes ?? ''
  }));
  return Papa.unparse(rows, {
    columns: ['id', 'subject_name', 'session_date', 'minutes', 'focus_rating', 'notes']
  });
}

export function parseSessionsCsv(csvText) {
  return parseCsv(csvText);
}

// --- subjects ---

export function subjectsToCsv(subjects) {
  const rows = subjects.map((s) => ({
    name: s.name,
    weight_pct: s.weight_pct,
    target_hours_override: s.target_hours_override ?? ''
  }));
  return Papa.unparse(rows, { columns: ['name', 'weight_pct', 'target_hours_override'] });
}

export function parseSubjectsCsv(csvText) {
  return parseCsv(csvText);
}

// --- goal (single row) ---

export function goalToCsv(goal) {
  const rows = [
    {
      name: goal.name,
      exam_date: goal.exam_date,
      start_date: goal.start_date,
      total_target_hours: goal.total_target_hours,
      max_daily_hours: goal.max_daily_hours
    }
  ];
  return Papa.unparse(rows, {
    columns: ['name', 'exam_date', 'start_date', 'total_target_hours', 'max_daily_hours']
  });
}

export function parseGoalCsv(csvText) {
  const rows = parseCsv(csvText);
  return rows[0] ?? null;
}

// --- availability (global weekly template, always 7 rows) ---

export function availabilityToCsv(rows) {
  const sorted = [...rows].sort((a, b) => a.weekday - b.weekday);
  return Papa.unparse(
    sorted.map((r) => ({ weekday: r.weekday, available_hours: r.available_hours })),
    { columns: ['weekday', 'available_hours'] }
  );
}

export function parseAvailabilityCsv(csvText) {
  return parseCsv(csvText).map((r) => ({
    weekday: Number(r.weekday),
    available_hours: Number(r.available_hours)
  }));
}

// --- blackout dates (global) ---

export function blackoutDatesToCsv(rows) {
  return Papa.unparse(
    rows.map((r) => ({ date: r.date, reason: r.reason ?? '' })),
    { columns: ['date', 'reason'] }
  );
}

export function parseBlackoutDatesCsv(csvText) {
  return parseCsv(csvText);
}
