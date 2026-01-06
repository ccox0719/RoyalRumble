import { deck } from "./deck.js";
import { DefenseCall, computeOutcome } from "./rules.js";

const STORAGE_KEY = "drive-control-state";

const freshDriveState = () => ({
  ballPos: 20,
  down: 1,
  yardsToFirst: 10,
  pressure: 0,
  momentum: 0,
  audibleUsed: false,
  turnoverCancelUsed: false,
  turnoverCancelToken: false,
  activePlayerId: null,
  turnoverRisk: 0,
  cashOutSelected: false,
});

const shuffledIds = () => {
  const ids = deck.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
};

const defaultClock = () => ({
  quarter: 1,
  quartersTotal: 4,
  quarterLengthSeconds: 360, // 6:00
  secondsRemaining: 360,
  running: true,
  paceMultiplier: 1,
  isOvertime: false,
  overtimeNumber: 0,
  overtimeLengthSeconds: 180,
});

const initialState = {
  players: [],
  teams: {
    A: { score: 0, playerIds: [], activeOffenseIndex: 0, nextDriveMomentumBonus: 0 },
    B: { score: 0, playerIds: [], activeOffenseIndex: 0, nextDriveMomentumBonus: 0 },
  },
  teamNames: { A: "Team A", B: "Team B" },
  possessionTeamId: "A",
  currentDefenseTeamId: "B",
  receivingTeamId: "A",
  soloAdvantage: true,
  clock: defaultClock(),
  currentDrive: freshDriveState(),
  deckState: { drawPileIds: shuffledIds(), discardPileIds: [] },
  currentHand: {
    cardIds: [],
    selectedCardId: null,
    defenseCall: DefenseCall.NONE,
    dice: [1, 1, 1, 1, 1],
    matchedPatterns: [],
  },
  history: [],
  gameOver: false,
};

let state = loadState() || { ...initialState };

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.clock) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const clone = (obj) => JSON.parse(JSON.stringify(obj));

export function resetState() {
  state = { ...initialState, clock: defaultClock(), deckState: { drawPileIds: shuffledIds(), discardPileIds: [] }, currentDrive: freshDriveState() };
  saveState();
}

export function getState() {
  return state;
}

function validateTeams(players) {
  const count = players.length;
  const teamA = players.filter((p) => p.teamId === "A").length;
  const teamB = players.filter((p) => p.teamId === "B").length;
  if (count < 2 || count > 4) return false;
  if (count === 2 && (teamA !== 1 || teamB !== 1)) return false;
  if (count === 3 && !((teamA === 2 && teamB === 1) || (teamA === 1 && teamB === 2))) return false;
  if (count === 4 && !(teamA === 2 && teamB === 2)) return false;
  return true;
}

export function setTeams({
  players,
  quarterLengthSeconds,
  quartersTotal,
  runningClock,
  receivingTeamId,
  paceMultiplier,
  soloAdvantage,
  teamNames,
}) {
  if (!validateTeams(players)) {
    throw new Error("Invalid team sizes for selected player count.");
  }
  const idsPlayers = players.map((p, idx) => ({ id: `P${idx + 1}`, name: p.name, teamId: p.teamId }));
  state.players = idsPlayers;
  state.teams.A = { score: 0, playerIds: idsPlayers.filter((p) => p.teamId === "A").map((p) => p.id), activeOffenseIndex: 0, nextDriveMomentumBonus: 0 };
  state.teams.B = { score: 0, playerIds: idsPlayers.filter((p) => p.teamId === "B").map((p) => p.id), activeOffenseIndex: 0, nextDriveMomentumBonus: 0 };
  state.teamNames = {
    A: teamNames?.A || "Team A",
    B: teamNames?.B || "Team B",
  };
  state.receivingTeamId = receivingTeamId;
  state.possessionTeamId = receivingTeamId;
  state.currentDefenseTeamId = receivingTeamId === "A" ? "B" : "A";
  state.soloAdvantage = soloAdvantage;
  state.clock = {
    quarter: 1,
    quartersTotal,
    quarterLengthSeconds,
    secondsRemaining: quarterLengthSeconds,
    running: runningClock,
    paceMultiplier,
    isOvertime: false,
    overtimeNumber: 0,
    overtimeLengthSeconds: 180,
  };
  state.currentDrive = freshDriveState();
  state.deckState = { drawPileIds: shuffledIds(), discardPileIds: [] };
  state.currentHand = { cardIds: [], selectedCardId: null, defenseCall: DefenseCall.NONE, dice: [1, 1, 1, 1, 1], matchedPatterns: [] };
  state.history = [];
  state.gameOver = false;
  startPossession();
  saveState();
}

function drawCards(count) {
  const { drawPileIds, discardPileIds } = state.deckState;
  const result = [];
  while (result.length < count) {
    if (drawPileIds.length === 0) {
      const pool = discardPileIds.splice(0, discardPileIds.length);
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      drawPileIds.push(...pool);
    }
    result.push(drawPileIds.pop());
  }
  return result;
}

export function startDown() {
  state.currentHand.cardIds = drawCards(3);
  state.currentHand.selectedCardId = null;
  state.currentHand.defenseCall = DefenseCall.NONE;
  state.currentHand.dice = [1, 1, 1, 1, 1];
  state.currentHand.matchedPatterns = [];
  state.currentHand.chosenPattern = null;
  state.currentDrive.cashOutSelected = false;
  saveState();
}

function discardHand() {
  if (state.currentHand.cardIds?.length) {
    state.deckState.discardPileIds.push(...state.currentHand.cardIds);
  }
  state.currentHand.cardIds = [];
}

function pickActivePlayer(teamId) {
  const team = state.teams[teamId];
  if (!team.playerIds.length) return null;
  const idx = team.activeOffenseIndex % team.playerIds.length;
  const playerId = team.playerIds[idx];
  team.activeOffenseIndex = (team.activeOffenseIndex + 1) % team.playerIds.length;
  return playerId;
}

export function startPossession() {
  state.currentDrive = freshDriveState();
  const offenseTeam = state.teams[state.possessionTeamId];
  state.currentDrive.activePlayerId = pickActivePlayer(state.possessionTeamId) || offenseTeam.playerIds[0] || null;

  // Momentum bonuses
  const totalPlayers = state.players.length;
  const offenseSize = offenseTeam.playerIds.length;
  if (state.soloAdvantage && totalPlayers === 3 && offenseSize === 1) {
    state.currentDrive.momentum = Math.min(3, state.currentDrive.momentum + 1);
  }
  if (offenseTeam.nextDriveMomentumBonus > 0) {
    state.currentDrive.momentum = Math.min(3, state.currentDrive.momentum + 1);
    offenseTeam.nextDriveMomentumBonus -= 1;
  }
  startDown();
}

export function selectCard(cardId) {
  state.currentHand.selectedCardId = cardId;
  saveState();
}

export function selectCashOut() {
  if (state.currentDrive.momentum < 1) return false;
  state.currentDrive.cashOutSelected = true;
  saveState();
  return true;
}

export function setDefenseCall(call) {
  state.currentHand.defenseCall = call;
  saveState();
}

export function setDice(index, value) {
  state.currentHand.dice[index] = value;
  saveState();
}

export function setChosenPattern(pattern) {
  state.currentHand.chosenPattern = pattern;
  saveState();
}

export function armTurnoverCancel() {
  if (state.currentDrive.turnoverCancelUsed) return false;
  if (state.currentDrive.momentum <= 0) return false;
  state.currentDrive.momentum -= 1;
  state.currentDrive.turnoverCancelToken = true;
  state.currentDrive.turnoverCancelUsed = true;
  saveState();
  return true;
}

export function pushHistory() {
  state.history = [clone({
    players: state.players,
    teams: state.teams,
    possessionTeamId: state.possessionTeamId,
    currentDefenseTeamId: state.currentDefenseTeamId,
    receivingTeamId: state.receivingTeamId,
    soloAdvantage: state.soloAdvantage,
    clock: state.clock,
    currentDrive: state.currentDrive,
    deckState: state.deckState,
    currentHand: state.currentHand,
    gameOver: state.gameOver,
  })];
  saveState();
}

export function undo() {
  if (!state.history.length) return false;
  const snapshot = state.history.pop();
  state = { ...state, ...snapshot, history: [] };
  saveState();
  return true;
}

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

function handleFirstDown() {
  state.currentDrive.down = 1;
  state.currentDrive.yardsToFirst = 10;
  state.currentDrive.pressure = 0;
}

function changePossession() {
  const prevOffense = state.possessionTeamId;
  state.possessionTeamId = state.currentDefenseTeamId;
  state.currentDefenseTeamId = prevOffense;
}

function markDefenseBonus(reason) {
  if (reason === "TD") return;
  const defenseTeam = state.teams[state.currentDefenseTeamId];
  defenseTeam.nextDriveMomentumBonus = Math.min(1, (defenseTeam.nextDriveMomentumBonus || 0) + 1);
}

function advanceClock(playType, success) {
  if (!state.clock.running) return;
  const base = (() => {
    switch (playType) {
      case "RUN": return 30;
      case "SHORT": return success ? 25 : 10;
      case "DEEP": return success ? 27 : 10;
      case "TRICK": return success ? 32 : 14;
      default: return 30;
    }
  })();
  const cost = Math.ceil(base * (state.clock.paceMultiplier || 1));
  state.clock.secondsRemaining -= cost;
  if (state.clock.secondsRemaining <= 0) {
    state.clock.secondsRemaining = 0;
    handleQuarterEnd();
  }
}

function handleQuarterEnd() {
  if (state.gameOver) return;
  const inRegulation = !state.clock.isOvertime;
  const moreRegQuarters = state.clock.quarter < state.clock.quartersTotal;
  if (inRegulation && moreRegQuarters) {
    state.clock.quarter += 1;
    state.clock.secondsRemaining = state.clock.quarterLengthSeconds;
    return;
  }
  // End of regulation final quarter
  if (inRegulation) {
    if (state.teams.A.score === state.teams.B.score) {
      startOvertime();
    } else {
      state.gameOver = true;
    }
    return;
  }
  // Overtime end: if tie -> another OT, else game over
  if (state.teams.A.score === state.teams.B.score) {
    // single sudden-death OT only
    state.gameOver = true;
  } else {
    state.gameOver = true;
  }
}

function startOvertime() {
  state.clock.isOvertime = true;
  state.clock.overtimeNumber += 1;
  state.clock.secondsRemaining = state.clock.overtimeLengthSeconds;
  state.clock.quarter = state.clock.quartersTotal + state.clock.overtimeNumber;
}

export function resolvePlay() {
  if (state.gameOver) return { error: "Game over." };
  const selectedId = state.currentHand.selectedCardId;
  if (!selectedId) return { error: "Select a play card." };
  if (state.currentHand.defenseCall === DefenseCall.NONE) return { error: "Choose a defense call." };
  const card = deck.find((c) => c.id === selectedId);
  const prevQuarter = state.clock.quarter;
  pushHistory();

  // Cash out branch
  if (state.currentDrive.cashOutSelected && state.currentDrive.momentum >= 1) {
    const yards = 4;
    advanceClock(card.type, true);
    state.currentDrive.ballPos += yards;
    state.currentDrive.yardsToFirst -= yards;
    state.currentDrive.momentum = 0;
    state.currentDrive.turnoverRisk = 0;
    state.currentDrive.pressure = clamp(state.currentDrive.pressure + 1, 0, 2);
    if (state.currentDrive.yardsToFirst <= 0) {
      handleFirstDown();
      state.currentDrive.turnoverRisk = 0;
      state.currentDrive.momentum = 0;
    } else {
      state.currentDrive.down += 1;
    }
    if (state.currentDrive.down > 4) {
      markDefenseBonus("DOWNS");
      discardHand();
      changePossession();
      startPossession();
      saveState();
      return {
        message: "Turnover on downs.",
        outcome: { yards, success: true },
        turnover: true,
        turnoverType: "DOWNS",
        turnoverSpot: state.currentDrive.ballPos,
        quarterEnded: state.clock.quarter !== prevQuarter,
        gameOver: state.gameOver,
        playId: card.id,
        playName: card.name,
      };
    }
    state.deckState.discardPileIds.push(...state.currentHand.cardIds);
    startDown();
    saveState();
    return {
      message: "Cashed out for +4 yards.",
      outcome: { yards, success: true },
      ballPos: state.currentDrive.ballPos,
      quarterEnded: state.clock.quarter !== prevQuarter,
      gameOver: state.gameOver,
      playId: card.id,
      playName: card.name,
    };
  }

  const outcome = computeOutcome({
    card,
    defenseCall: state.currentHand.defenseCall,
    dice: state.currentHand.dice,
    chosenPattern: state.currentHand.chosenPattern,
    driveState: state.currentDrive,
  });
  // Risk handled directly in computeOutcome; track for HUD only
  if (outcome.turnover) {
    state.currentDrive.turnoverRisk = 2;
  }

  if (outcome.turnover && state.currentDrive.turnoverCancelToken) {
    outcome.turnover = false;
    outcome.turnoverType = "CANCELLED";
    state.currentDrive.turnoverCancelToken = false;
  }

  let message = "";
  const offenseTeam = state.teams[state.possessionTeamId];

  // Yardage / TD handling
  if (outcome.touchdown) {
    advanceClock(card.type, outcome.success);
    offenseTeam.score += 7;
    markDefenseBonus("TD");
    discardHand();
    if (state.gameOver) {
      saveState();
      return {
        message: "Touchdown!",
        outcome,
        touchdown: true,
        playName: card.name,
        ballPos: state.currentDrive.ballPos,
        quarterEnded: state.clock.quarter !== prevQuarter,
        gameOver: true,
        playId: card.id,
      };
    }
    if (state.clock.isOvertime && state.clock.overtimeNumber > 0) {
      state.gameOver = true; // sudden death
    } else {
      changePossession();
      startPossession();
    }
    saveState();
    return {
      message: "Touchdown!",
      outcome,
      touchdown: true,
      playName: card.name,
      ballPos: state.currentDrive.ballPos,
      quarterEnded: state.clock.quarter !== prevQuarter,
      gameOver: state.gameOver,
      playId: card.id,
    };
  }

  // Apply yards
  state.currentDrive.ballPos += outcome.yards;
  state.currentDrive.yardsToFirst -= outcome.yards;
  state.currentDrive.momentum = clamp(state.currentDrive.momentum + outcome.gainedMomentum, 0, 3);
  state.currentDrive.pressure = clamp(state.currentDrive.pressure + outcome.pressureDelta, 0, 2);
  state.currentDrive.turnoverRisk = Math.min(3, (state.currentDrive.turnoverRisk || 0) + (outcome.turnoverRiskDelta || 0));
  // Momentum streak handling
  if (outcome.turnover || !outcome.success) {
    state.currentDrive.momentum = 0;
    state.currentDrive.turnoverRisk = 0;
  } else {
    state.currentDrive.momentum = Math.min(3, state.currentDrive.momentum + 1);
  }

  // Turnovers
  if (outcome.turnover) {
    const spot = state.currentDrive.ballPos;
    advanceClock(card.type, outcome.success);
    if (state.gameOver) {
      saveState();
      return { message: "End of game.", outcome, gameOver: true };
    }
    markDefenseBonus(outcome.turnoverType);
    discardHand();
    if (!state.gameOver) {
      changePossession();
      startPossession();
    }
    state.currentDrive.turnoverRisk = 0;
    state.currentDrive.momentum = 0;
    saveState();
    return {
      message: outcome.turnoverType === "INTERCEPTION" ? "Interception!" : "Fumble lost!",
      outcome,
      turnover: true,
      turnoverType: outcome.turnoverType,
      turnoverSpot: spot,
      quarterEnded: state.clock.quarter !== prevQuarter,
      gameOver: state.gameOver,
      playId: card.id,
      playName: card.name,
      playmaker: outcome.playmaker,
    };
  }

  // First down reset
  let firstDown = false;
  if (state.currentDrive.yardsToFirst <= 0) {
    handleFirstDown();
    state.currentDrive.turnoverRisk = 0;
    firstDown = true;
  } else {
    state.currentDrive.down += 1;
  }

  // Turnover on downs
  if (state.currentDrive.down > 4) {
    advanceClock(card.type, outcome.success);
    if (state.gameOver) {
      saveState();
      return { message: "End of game.", outcome, gameOver: true };
    }
    markDefenseBonus("DOWNS");
    discardHand();
    if (!state.gameOver) {
      changePossession();
      startPossession();
    }
    saveState();
    return {
      message: "Turnover on downs.",
      outcome,
      turnover: true,
      turnoverType: "DOWNS",
      turnoverSpot: state.currentDrive.ballPos,
      quarterEnded: state.clock.quarter !== prevQuarter,
      gameOver: state.gameOver,
      playId: card.id,
      playName: card.name,
    };
  }

  // Continue drive
  advanceClock(card.type, outcome.success);
  if (state.clock.secondsRemaining === 0 && state.gameOver) {
    saveState();
    return { message: "End of game.", outcome, gameOver: true };
  }
  const bigPlay = outcome.highlight || Math.abs(outcome.yards) >= 15;

  // Prepare next down
  state.deckState.discardPileIds.push(...state.currentHand.cardIds);
  startDown();
  saveState();
  return {
    message: "Next down.",
    outcome,
    firstDown,
    bigPlay,
    ballPos: state.currentDrive.ballPos,
    down: state.currentDrive.down,
    yardsToFirst: state.currentDrive.yardsToFirst,
    quarterEnded: state.clock.quarter !== prevQuarter,
    gameOver: state.gameOver,
    playId: card.id,
    playName: card.name,
    highlight: outcome.highlight,
    highlightYards: outcome.highlightYards,
  };
}

export function isGameOver() {
  return state.gameOver;
}

export function currentOffensePlayerName() {
  const pid = state.currentDrive.activePlayerId;
  const player = state.players.find((p) => p.id === pid);
  return player ? player.name : "";
}

export function pauseClock() {
  state.clock.running = false;
  saveState();
}

export function resumeClock() {
  state.clock.running = true;
  saveState();
}

export function forceEndQuarter() {
  state.clock.secondsRemaining = 0;
  handleQuarterEnd();
  saveState();
}

export function attemptFieldGoal(kickRoll) {
  // FG allowed only on 4th down inside opponent 35 (ballPos >= 65)
  if (state.currentDrive.down !== 4) return { error: "Field goal only on 4th down." };
  if (state.currentDrive.ballPos < 65) return { error: "Not in field goal range." };
  const prevQuarter = state.clock.quarter;
  const spot = state.currentDrive.ballPos;
  const distance = 100 - state.currentDrive.ballPos;
  let needed = 6;
  if (distance <= 20) needed = 2;
  else if (distance <= 30) needed = 3;
  else if (distance <= 40) needed = 4;
  else if (distance <= 50) needed = 5;

  let roll = kickRoll;
  if (Number.isNaN(roll) || roll < 1 || roll > 6) {
    return { error: "Kick roll must be 1-6." };
  }

  // Momentum bonus if 2+
  if (state.currentDrive.momentum >= 2) {
    roll = Math.min(6, roll + 1);
  }

  const success = roll >= needed;
  const clockCost = success ? 20 : 15;
  state.clock.secondsRemaining = Math.max(0, state.clock.secondsRemaining - clockCost);

  let message = "";
  if (success) {
    state.teams[state.possessionTeamId].score += 3;
    message = "Field goal is GOOD! +3 points.";
  } else {
    message = "Field goal is NO GOOD. Turnover on spot.";
  }

  // possession change
  changePossession();
  startPossession();
  state.currentDrive.momentum = 0;
  state.currentDrive.turnoverRisk = 0;
  saveState();
  return {
    message,
    success: true,
    fieldGoal: true,
    fieldGoalMade: success,
    turnoverSpot: spot,
    quarterEnded: state.clock.quarter !== prevQuarter,
  };
}
