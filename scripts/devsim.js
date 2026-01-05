import { deck, PlayType, Targets } from "./deck.js";
import { DefenseCall, computeOutcome, RULES_VERSION } from "./rules.js";
import { recommendTweaks } from "./balance.js";

const BASE_TIME = {
  RUN: { success: 30, fail: 30 },
  SHORT: { success: 25, fail: 10 },
  DEEP: { success: 27, fail: 10 },
  TRICK: { success: 32, fail: 14 },
};

const randFactory = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

function rollDie(rng) {
  return Math.floor(rng() * 6) + 1;
}

function rollDiceSet(rng) {
  return [rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng)];
}

function simulateRollForCard(card, defenseCall, rng, driveState) {
  // Try 3 rolls (initial + 2 rerolls) and pick best outcome for that card
  let best = null;
  for (let i = 0; i < 3; i += 1) {
    const dice = rollDiceSet(rng);
    const outcome = computeOutcome({ card, defenseCall, dice, driveState });
    if (!best) {
      best = { outcome, dice };
    } else {
      const bestScore = best.outcome.touchdown ? 999 : best.outcome.yards;
      const newScore = outcome.touchdown ? 999 : outcome.yards;
      if (newScore > bestScore) best = { outcome, dice };
    }
  }
  return best;
}

function chooseOffenseCard(cards, defenseCall, strategy, rng) {
  if (strategy === "randomCard") {
    return cards[Math.floor(rng() * cards.length)];
  }
  if (strategy === "safeBias") {
    const safe = cards.filter((c) => c.type === PlayType.RUN || c.type === PlayType.SHORT);
    if (safe.length) return safe[Math.floor(rng() * safe.length)];
  }
  if (strategy === "deepBias") {
    const deep = cards.filter((c) => c.type === PlayType.DEEP);
    if (deep.length) return deep[Math.floor(rng() * deep.length)];
  }
  // greedyEV: pick best simulated outcome
  let best = null;
  cards.forEach((card) => {
    const sim = simulateRollForCard(card, defenseCall, rng, { momentum: 0, pressure: 0, turnoverRisk: 0 });
    const score = sim.outcome.touchdown ? 999 : sim.outcome.yards;
    if (!best || score > best.score) {
      best = { card, score };
    }
  });
  return best?.card || cards[0];
}

function defenseChoice(card, strategy, rng, prePlayGuess = null) {
  if (strategy === "randomCall") {
    const calls = [DefenseCall.STACK, DefenseCall.TIGHT, DefenseCall.DEEP];
    return calls[Math.floor(rng() * calls.length)];
  }
  if (strategy === "guessy") {
    return prePlayGuess || [DefenseCall.STACK, DefenseCall.TIGHT, DefenseCall.DEEP][Math.floor(rng() * 3)];
  }
  // typeCounter
  if (card.type === PlayType.RUN) return DefenseCall.STACK;
  if (card.type === PlayType.SHORT) return DefenseCall.TIGHT;
  if (card.type === PlayType.DEEP) return DefenseCall.DEEP;
  return DefenseCall.STACK;
}

function drawCards(drawPile, discardPile, rng) {
  const hand = [];
  for (let i = 0; i < 3; i += 1) {
    if (!drawPile.length) {
      // reshuffle discard
      drawPile.push(...discardPile);
      discardPile.length = 0;
      for (let j = drawPile.length - 1; j > 0; j -= 1) {
        const k = Math.floor(rng() * (j + 1));
        [drawPile[j], drawPile[k]] = [drawPile[k], drawPile[j]];
      }
    }
    hand.push(drawPile.pop());
  }
  return hand;
}

function advanceClock(state, playType, success, paceMultiplier) {
  const base = BASE_TIME[playType] || { success: 25, fail: 25 };
  const cost = Math.ceil((success ? base.success : base.fail) * paceMultiplier);
  state.clock.secondsRemaining -= cost;
  if (state.clock.secondsRemaining <= 0) {
    state.clock.secondsRemaining = 0;
    if (!state.clock.isOvertime && state.clock.quarter < state.clock.quartersTotal) {
      state.clock.quarter += 1;
      state.clock.secondsRemaining = state.clock.quarterLengthSeconds;
    } else if (!state.clock.isOvertime) {
      if (state.scoreA === state.scoreB) {
        state.clock.isOvertime = true;
        state.clock.overtimeNumber = 1;
        state.clock.secondsRemaining = state.clock.overtimeLengthSeconds;
      } else {
        state.gameOver = true;
      }
    } else {
      // single sudden-death OT
      state.gameOver = true;
    }
  }
}

function initClock(opts) {
  return {
    quarter: 1,
    quartersTotal: opts.quartersTotal,
    quarterLengthSeconds: opts.quarterLengthSeconds,
    secondsRemaining: opts.quarterLengthSeconds,
    isOvertime: false,
    overtimeNumber: 0,
    overtimeLengthSeconds: 180,
  };
}

function simulateGame(opts, rng) {
  const drawPile = deck.map((c) => c.id);
  for (let i = drawPile.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
  }
  const discardPile = [];

  const state = {
    scoreA: 0,
    scoreB: 0,
    possession: "A",
    defense: "B",
    ballPos: 20,
    down: 1,
    yardsToFirst: 10,
    pressure: 0,
    momentum: 0,
    turnoverRisk: 0,
    clock: initClock(opts),
    gameOver: false,
  };

  const stats = {
    plays: 0,
    tds: 0,
    ints: 0,
    fumbles: 0,
    turnovers: 0,
    successPlays: 0,
    yards: 0,
    byPlayType: {
      RUN: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      SHORT: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      DEEP: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      TRICK: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
    },
    cards: {},
  };
  deck.forEach((c) => { stats.cards[c.id] = { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0, card: c }; });

  while (!state.gameOver) {
    // draw hand
    const handIds = drawCards(drawPile, discardPile, rng);
    const hand = handIds.map((id) => deck.find((c) => c.id === id));

    // defense guess if needed
    const preGuess = opts.defenseStrategy === "guessy"
      ? [DefenseCall.STACK, DefenseCall.TIGHT, DefenseCall.DEEP][Math.floor(rng() * 3)]
      : null;

    const defenseCallForChoice = opts.defenseStrategy === "guessy" ? preGuess : null;
    const chosenCard = chooseOffenseCard(hand, defenseCallForChoice || DefenseCall.NONE, opts.offenseStrategy, rng);
    const defenseCall = defenseChoice(chosenCard, opts.defenseStrategy, rng, preGuess);

    const bestRoll = simulateRollForCard(chosenCard, defenseCall, rng, { momentum: state.momentum, pressure: state.pressure, turnoverRisk: state.turnoverRisk });
    const outcome = { ...bestRoll.outcome, pressureDelta: (bestRoll.outcome.pressureDelta || 1) };
    // momentum streak for sim (matches rules: +1 per success, reset on fail/turnover)
    if (outcome.turnover || !outcome.success) {
      state.momentum = 0;
      state.turnoverRisk = 0;
    } else {
      state.momentum = Math.min(3, state.momentum + 1);
    }
    const momentumBonus = state.momentum ? Math.min(3, state.momentum) : 0;
    outcome.yards += outcome.success ? momentumBonus : 0;
    state.turnoverRisk = Math.min(2, state.turnoverRisk + (outcome.turnoverRiskDelta || 0));

    stats.plays += 1;
    stats.yards += outcome.yards;
    const typeStats = stats.byPlayType[chosenCard.type];
    typeStats.plays += 1;
    typeStats.yards += outcome.yards;
    const cardStat = stats.cards[chosenCard.id];
    cardStat.plays += 1;

    if (outcome.success) {
      stats.successPlays += 1;
      typeStats.success += 1;
      cardStat.success += 1;
      cardStat.yards += outcome.yards;
    } else if (outcome.yards > 0) {
      // count yards even on failed-but-positive plays for averages
      cardStat.yards += outcome.yards;
    }

    if (outcome.turnover) {
      stats.turnovers += 1;
      if (outcome.turnoverType === "INTERCEPTION") {
        stats.ints += 1;
        typeStats.int += 1;
        cardStat.int += 1;
      } else if (outcome.turnoverType === "FUMBLE_LOST") {
        stats.fumbles += 1;
        typeStats.fum += 1;
        cardStat.fum += 1;
      }
    } else if (outcome.turnoverType === "FUMBLE_KEPT") {
      stats.fumbles += 1;
      typeStats.fum += 1;
      cardStat.fum += 1;
    }

    if (outcome.touchdown) {
      stats.tds += 1;
      typeStats.td += 1;
      cardStat.td += 1;
    }

    advanceClock(state, chosenCard.type, outcome.success || outcome.touchdown, opts.paceMultiplier);
    state.pressure = Math.min(2, state.pressure + 1); // pressure builds each play
    if (state.gameOver) break;

    // apply yardage and downs
    state.ballPos += outcome.yards;
    state.yardsToFirst -= outcome.yards;
    if (outcome.touchdown || state.ballPos >= 100) {
      // credit TD stats even if scored by yard accumulation
      stats.tds += 1;
      typeStats.td += 1;
      cardStat.td += 1;
      if (state.possession === "A") state.scoreA += 7;
      else state.scoreB += 7;
      discardPile.push(...handIds);
      state.possession = state.possession === "A" ? "B" : "A";
      state.defense = state.possession === "A" ? "B" : "A";
      state.ballPos = 20;
      state.down = 1;
      state.yardsToFirst = 10;
      state.pressure = 0;
      continue;
    }

    if (outcome.turnover) {
      discardPile.push(...handIds);
      state.possession = state.possession === "A" ? "B" : "A";
      state.defense = state.possession === "A" ? "B" : "A";
      state.ballPos = 20;
      state.down = 1;
      state.yardsToFirst = 10;
      state.pressure = 0;
      continue;
    }

    if (state.yardsToFirst <= 0) {
      state.down = 1;
      state.yardsToFirst = 10;
      state.pressure = 0;
    } else {
      state.down += 1;
    }

    if (state.down > 4) {
      discardPile.push(...handIds);
      state.possession = state.possession === "A" ? "B" : "A";
      state.defense = state.possession === "A" ? "B" : "A";
      state.ballPos = 20;
      state.down = 1;
      state.yardsToFirst = 10;
      state.pressure = 0;
    } else {
      discardPile.push(...handIds);
    }
  }

  return {
    finalScore: { A: state.scoreA, B: state.scoreB },
    plays: stats.plays,
    tds: stats.tds,
    ints: stats.ints,
    fumbles: stats.fumbles,
    turnovers: stats.turnovers,
    successPlays: stats.successPlays,
    yards: stats.yards,
    byPlayType: stats.byPlayType,
    cards: stats.cards,
  };
}

function aggregateReports(games) {
  const agg = {
    totalPointsA: 0,
    totalPointsB: 0,
    totalPlays: 0,
    totalTDs: 0,
    totalINTs: 0,
    totalFumbles: 0,
    totalTurnovers: 0,
    totalSuccess: 0,
    totalYards: 0,
    byPlayType: {
      RUN: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      SHORT: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      DEEP: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
      TRICK: { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0 },
    },
    cards: {},
    pointsHistogram: { 0: 0, 7: 0, 14: 0, 21: 0, 28: 0 },
    playsHistogram: { 40: 0, 50: 0, 60: 0, 70: 0, 80: 0, 90: 0 },
  };
  deck.forEach((c) => { agg.cards[c.id] = { plays: 0, success: 0, yards: 0, td: 0, int: 0, fum: 0, card: c }; });

  games.forEach((g) => {
    agg.totalPointsA += g.finalScore.A;
    agg.totalPointsB += g.finalScore.B;
    agg.totalPlays += g.plays;
    agg.totalTDs += g.tds;
    agg.totalINTs += g.ints;
    agg.totalFumbles += g.fumbles;
    agg.totalTurnovers += g.turnovers;
    agg.totalSuccess += g.successPlays;
    agg.totalYards += g.yards;
    const keyPoints = Math.min(28, Math.ceil(g.finalScore.A / 7) * 7);
    if (agg.pointsHistogram[keyPoints] !== undefined) agg.pointsHistogram[keyPoints] += 1;
    const playBucket = Object.keys(agg.playsHistogram).map((n) => parseInt(n, 10)).find((b) => g.plays <= b) || 90;
    agg.playsHistogram[playBucket] += 1;

    Object.entries(g.byPlayType).forEach(([type, s]) => {
      const t = agg.byPlayType[type];
      t.plays += s.plays;
      t.success += s.success;
      t.yards += s.yards;
      t.td += s.td;
      t.int += s.int;
      t.fum += s.fum;
    });

    Object.values(g.cards).forEach((c) => {
      const target = agg.cards[c.card.id];
      target.plays += c.plays;
      target.success += c.success;
      target.yards += c.yards;
      target.td += c.td;
      target.int += c.int;
      target.fum += c.fum;
    });
  });

  return agg;
}

export function buildReport({ games, seed, quarters, quarterLengthSec, paceMultiplier, offenseStrategy, defenseStrategy, includeGames = true }) {
  const agg = aggregateReports(games);
  const gameCount = games.length;
  const aggregate = {
    avgPointsPerGame: (agg.totalPointsA + agg.totalPointsB) / gameCount,
    avgPointsTeamA: agg.totalPointsA / gameCount,
    avgPointsTeamB: agg.totalPointsB / gameCount,
    avgPlaysPerGame: agg.totalPlays / gameCount,
    successRate: agg.totalPlays ? agg.totalSuccess / agg.totalPlays : 0,
    avgYardsPerPlay: agg.totalPlays ? agg.totalYards / agg.totalPlays : 0,
    tdsPerGame: agg.totalTDs / gameCount,
    intsPerGame: agg.totalINTs / gameCount,
    fumblesPerGame: agg.totalFumbles / gameCount,
    fumbleTurnoverRate: agg.totalPlays ? agg.totalFumbles / agg.totalPlays : 0,
    turnoversPerGame: agg.totalTurnovers / gameCount,
  };

  const byPlayType = {};
  Object.entries(agg.byPlayType).forEach(([k, v]) => {
    byPlayType[k] = {
      plays: v.plays,
      successRate: v.plays ? v.success / v.plays : 0,
      yardsPerPlay: v.plays ? v.yards / v.plays : 0,
      tdRate: v.plays ? v.td / v.plays : 0,
      intRate: v.plays ? v.int / v.plays : 0,
      fumbleRate: v.plays ? v.fum / v.plays : 0,
    };
  });

  const cards = Object.values(agg.cards).map((c) => ({
    id: c.card.id,
    name: c.card.name,
    type: c.card.type,
    plays: c.plays,
    successRate: c.plays ? c.success / c.plays : 0,
    avgYardsOnSuccess: c.success ? c.yards / c.success : 0,
    yardsPerPlay: c.plays ? c.yards / c.plays : 0,
    tdRate: c.plays ? c.td / c.plays : 0,
    intRate: c.plays ? c.int / c.plays : 0,
    fumbleRate: c.plays ? c.fum / c.plays : 0,
  }));

  const distribution = {
    pointsHistogram: agg.pointsHistogram,
    playsHistogram: agg.playsHistogram,
  };

  return {
    meta: {
      games: gameCount,
      seed,
      quarters,
      quarterLengthSec,
      paceMultiplier,
      offenseStrategy,
      defenseStrategy,
      rulesVersion: RULES_VERSION,
      timestamp: new Date().toISOString(),
    },
    aggregate,
    byPlayType,
    cards,
    distribution,
    games: includeGames ? games.map((g) => ({
      finalScore: g.finalScore,
      plays: g.plays,
      tds: g.tds,
      ints: g.ints,
      fumbles: g.fumbles,
      turnovers: g.turnovers,
    })) : undefined,
  };
}

const raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (fn) => setTimeout(fn, 0);

export function runSimulation(options, progressCb) {
  const games = [];
  let stopped = false;
  const offenseStrategy = options.offenseStrategy || "greedyEV";
  const defenseStrategy = options.defenseStrategy || "guessy";
  const rng = randFactory(options.seed || 42);
  const runner = () => {
    if (stopped) return;
    const chunk = Math.min(20, options.games - games.length);
    for (let i = 0; i < chunk; i += 1) {
      games.push(simulateGame({ ...options, offenseStrategy, defenseStrategy }, rng));
    }
    if (progressCb) progressCb(games.length / options.games);
    if (games.length < options.games && !stopped) {
      raf(runner);
    } else if (!stopped) {
      const report = buildReport({
        games,
        seed: options.seed,
        quarters: options.quartersTotal,
        quarterLengthSec: options.quarterLengthSeconds,
        paceMultiplier: options.paceMultiplier,
        offenseStrategy: options.offenseStrategy,
        defenseStrategy: options.defenseStrategy,
        includeGames: options.includeGames,
      });
      if (options.onComplete) options.onComplete(report);
    }
  };
  raf(runner);
  return () => { stopped = true; };
}

export function runSimulationAsync(options) {
  return new Promise((resolve) => {
    runSimulation({ ...options, onComplete: (report) => resolve(report) });
  });
}
