const defaultTargets = {
  tdsPerGame: [1.5, 3.5],
  intsPerGame: [0.8, 2.5],
  fumblesPerGame: [1.0, 3.0],
  avgPointsPerGame: [14, 28],
  avgPlaysPerGame: [55, 85],
  successRate: [0.4, 0.6],
  avgYardsPerPlay: [3.5, 5.5],
};

const outside = (val, [min, max]) => (val < min || val > max);

export function recommendTweaks(report, targets = defaultTargets) {
  const issues = [];
  const recs = [];
  const agg = report.aggregate;

  if (outside(agg.intsPerGame, targets.intsPerGame)) {
    const delta = agg.intsPerGame - targets.intsPerGame[1];
    issues.push(`INTs too high by ${delta.toFixed(2)}/game`);
    recs.push("Interceptions only on failed passes.");
    recs.push("Interceptions only at Pressure High.");
    recs.push("Increase INT threshold to require ≥3 ones.");
    recs.push("Use defense strategy 'guessy' to reduce perfect counters.");
  }
  if (outside(agg.fumblesPerGame, targets.fumblesPerGame)) {
    const delta = agg.fumblesPerGame - targets.fumblesPerGame[1];
    issues.push(`Fumbles too high by ${delta.toFixed(2)}/game`);
    recs.push("Gate fumbles to gains of 6+ yards.");
    recs.push("Change fumble recovery from 50% to 33% (offense keeps more).");
    recs.push("Increase fumble threshold to require ≥3 sixes.");
  }
  if (outside(agg.avgPointsPerGame, targets.avgPointsPerGame) || outside(agg.tdsPerGame, targets.tdsPerGame)) {
    issues.push("Scoring outside target range.");
    recs.push("Increase mid-tier yard values by +1 on lowest-performing cards.");
    recs.push("Raise Deep Shell downgrade from +12 to +15 yards.");
    const lowCards = (report.cards || []).sort((a, b) => (a.yardsPerPlay || 0) - (b.yardsPerPlay || 0)).slice(0, 6).map((c) => c.name);
    recs.push(`Adjust target sets/success odds for: ${lowCards.join(", ")}`);
  }
  if (outside(agg.avgPlaysPerGame, targets.avgPlaysPerGame)) {
    const dir = agg.avgPlaysPerGame > targets.avgPlaysPerGame[1] ? "Reduce" : "Increase";
    recs.push(`${dir} per-play time costs by ~5 seconds.`);
  }
  if (outside(agg.successRate, targets.successRate)) {
    issues.push("Success rate outside target.");
    recs.push("Adjust card targets to shift success odds slightly (+/- easiest target).");
  }
  if (outside(agg.avgYardsPerPlay, targets.avgYardsPerPlay)) {
    issues.push("Yards/play outside target.");
    recs.push("Tweak mid-tier yard rewards (+/-1) on balanced plays.");
  }

  return { issues, recommendations: recs };
}

export function getDefaultTargets() {
  return defaultTargets;
}
