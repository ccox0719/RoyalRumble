import { PlayType, Targets } from "./deck.js";

export const DefenseCall = {
  STACK: "STACK",
  TIGHT: "TIGHT",
  DEEP: "DEEP",
  NONE: "NONE",
};

export const RULES_VERSION = "dev-sim-1";

const targetOrderValue = (card, target) => {
  const outcome = card.outcomes[target];
  if (outcome === "TD") return 999;
  return outcome ?? 0;
};

export function detectPatterns(dice) {
  const counts = new Map();
  dice.forEach((d) => counts.set(d, (counts.get(d) || 0) + 1));
  const unique = [...counts.keys()].sort((a, b) => a - b);
  const values = [...counts.values()];
  const hasN = (n) => values.some((v) => v >= n);
  const matches = new Set();

  const isYahtzee = hasN(5);
  if (isYahtzee) matches.add(Targets.YAHTZEE);
  if (hasN(4)) matches.add(Targets.FOUR_KIND);
  if (values.includes(3) && values.includes(2)) matches.add(Targets.FULL_HOUSE);
  if (hasN(3)) matches.add(Targets.THREE_KIND);
  const pairs = values.filter((v) => v >= 2).length;
  if (pairs >= 2) matches.add(Targets.TWO_PAIR);

  const isLargeStraight = (unique.length === 5 && ((unique[0] === 1 && unique[4] === 5) || (unique[0] === 2 && unique[4] === 6)));
  if (isLargeStraight) matches.add(Targets.LARGE_STRAIGHT);

  const hasSmallStraight = (() => {
    const sequences = [
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6],
    ];
    return sequences.some((seq) => seq.every((v) => unique.includes(v)));
  })();
  if (hasSmallStraight) matches.add(Targets.SMALL_STRAIGHT);

  return [...matches];
}

function removeWorstTarget(card) {
  const sorted = [...card.targets].sort((a, b) => targetOrderValue(card, a) - targetOrderValue(card, b));
  return sorted.slice(1);
}

export function applyDefenseAdjustments(card, defenseCall) {
  const adjusted = { ...card, targets: [...card.targets], outcomes: { ...card.outcomes } };
  if (defenseCall === DefenseCall.TIGHT && card.type === PlayType.SHORT) {
    adjusted.targets = removeWorstTarget(card);
  }
  if (defenseCall === DefenseCall.DEEP && card.type === PlayType.DEEP && adjusted.outcomes[Targets.YAHTZEE] === "TD") {
    adjusted.outcomes[Targets.YAHTZEE] = 12;
  }
  return adjusted;
}

const countValue = (dice, value) => dice.filter((d) => d === value).length;

export function computeOutcome({ card, defenseCall, dice, driveState, chosenPattern: chosenInput = null }) {
  const adjustedCard = applyDefenseAdjustments(card, defenseCall);
  let patterns = [];
  let chosenPattern = null;
  let success = false;
  let playmaker = false;
  if (chosenInput) {
    chosenPattern = chosenInput;
    patterns = [chosenInput];
  } else if (chosenInput === null && Array.isArray(dice)) {
    patterns = detectPatterns(dice);
    const usablePatterns = patterns.filter((p) => adjustedCard.targets.includes(p));
    if (usablePatterns.length > 0) {
      chosenPattern = usablePatterns.sort((a, b) => targetOrderValue(adjustedCard, b) - targetOrderValue(adjustedCard, a))[0];
    }
  }

  let yards = 0;
  let touchdown = false;
  let gainedMomentum = 0;
  let turnover = false;
  let turnoverType = null;
  let pressureDelta = 1; // base +1 per down used
  const bigGainThreshold = 8;
  let highlight = false;
  let highlightYards = 0;

  if (chosenPattern) {
    const outcome = adjustedCard.outcomes[chosenPattern];
    if (outcome === "TD") {
      touchdown = true;
      success = true;
    } else {
      yards = outcome;
      success = true;
    }
    if (card.bonus && (card.bonus.trigger === "ANY_SUCCESS" || card.bonus.trigger === chosenPattern)) {
      gainedMomentum += card.bonus.amount;
    }
  } else {
    yards = card.failYards || 0;
  }

  const ones = countValue(dice, 1);
  const sixes = countValue(dice, 6);

  // Momentum bonus (diminishing, only on modest gains)
  if (success) {
    const m = driveState.momentum || 0;
    const bonus = m >= 1 ? 1 : 0; // momentum bonus capped at +1
    if (yards <= 10) yards += bonus;
    // Highlight play check: best listed target then 1d6 = 6
    const bestTarget = card.targets[card.targets.length - 1];
    if (chosenPattern === bestTarget) {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll === 6) {
        highlight = true;
        highlightYards = (card.type === PlayType.DEEP || card.type === PlayType.TRICK) ? 8 : 6;
        yards += highlightYards;
      }
    }
  }

  const bigGain = yards >= bigGainThreshold;
  if (bigGain) {
    gainedMomentum += 1;
    pressureDelta += 1;
  }
  if (defenseCall === DefenseCall.STACK && card.type === PlayType.RUN) {
    pressureDelta += 1;
  }

  // Turnover checks (momentum-gated rare triggers)
  if ((driveState.momentum || 0) >= 1) {
    if ((card.type === PlayType.SHORT || card.type === PlayType.DEEP) && !success && ones >= 2) {
      turnover = true;
      turnoverType = "INTERCEPTION";
    }
    if ((card.type === PlayType.RUN || card.type === PlayType.TRICK) && success && yards >= 8 && sixes >= 2) {
      turnover = true;
      turnoverType = "FUMBLE_LOST";
    }
  }

  // Defensive Playmaker: correct guess + failed play + not already turnover
  const defenseGuessed =
    (defenseCall === DefenseCall.STACK && card.type === PlayType.RUN) ||
    (defenseCall === DefenseCall.TIGHT && card.type === PlayType.SHORT) ||
    (defenseCall === DefenseCall.DEEP && card.type === PlayType.DEEP);
  if (!success && !turnover && defenseGuessed) {
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll === 6) {
      playmaker = true;
      turnover = true;
      turnoverType = (card.type === PlayType.RUN || card.type === PlayType.TRICK) ? "FUMBLE_LOST" : "INTERCEPTION";
    }
  }

  return {
    yards,
    touchdown,
    success,
    gainedMomentum,
    turnover,
    turnoverType,
    pressureDelta,
    chosenPattern,
    patterns,
    turnoverRiskDelta: 0,
    highlight,
    highlightYards,
    playmaker,
  };
}
