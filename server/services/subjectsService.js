export function getEffectiveTargetHours(subject, goal) {
  if (subject.target_hours_override != null) return subject.target_hours_override;
  return (subject.weight_pct / 100) * goal.total_target_hours;
}

export function getWeightSummary(subjects) {
  const weightSum = subjects.reduce((sum, s) => sum + s.weight_pct, 0);
  const weightSumOk = Math.abs(weightSum - 100) <= 0.01;
  return { weightSum, weightSumOk };
}

export function withEffectiveTargetHours(subjects, goal) {
  return subjects.map((subject) => ({
    ...subject,
    effective_target_hours: getEffectiveTargetHours(subject, goal)
  }));
}
