import { deck } from "./deck.js";
import { DefenseCall, detectPatterns, applyDefenseAdjustments } from "./rules.js";
import { renderCard, formatDownDistance, formatField, formatClock, formatQuarter, applyTheme } from "./ui.js";
import { formatMatchLabel } from "./utils/labels.js";
import { getPlayFlavor } from "./flavor.js";
import {
  getState,
  setTeams,
  startDown,
  selectCard,
  setDefenseCall,
  setDice,
  resolvePlay,
  undo,
  armTurnoverCancel,
  resetState,
  isGameOver,
  currentOffensePlayerName,
  pauseClock,
  resumeClock,
  forceEndQuarter,
  attemptFieldGoal,
  selectCashOut,
} from "./state.js";
import { runSimulation, runSimulationAsync } from "./devsim.js";
import { recommendTweaks } from "./balance.js";

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById("installBtn");
  if (installBtn) installBtn.style.display = "inline-flex";
});

const installBtn = document.getElementById("installBtn");
if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}

const setupScreen = document.getElementById("setupScreen");
const matchScreen = document.getElementById("matchScreen");
const playerListEl = document.getElementById("playerList");
const startMatchBtn = document.getElementById("startMatchBtn");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const soloAdvOn = document.getElementById("soloAdvOn");
const soloAdvOff = document.getElementById("soloAdvOff");
const quarterLengthInput = document.getElementById("quarterLengthInput");
const quartersTotalInput = document.getElementById("quartersTotalInput");
const clockRunningOn = document.getElementById("clockRunningOn");
const clockRunningOff = document.getElementById("clockRunningOff");
const receivesSelect = document.getElementById("receivesSelect");
const paceButtons = document.getElementById("paceButtons");
const teamANameInput = document.getElementById("teamAName");
const teamBNameInput = document.getElementById("teamBName");
const teamASelect = document.getElementById("teamASelect");
const teamBSelect = document.getElementById("teamBSelect");
const retroOnBtn = document.getElementById("retroOn");
const retroOffBtn = document.getElementById("retroOff");
const hcOnBtn = document.getElementById("hcOn");
const hcOffBtn = document.getElementById("hcOff");
const settingsTestBtn = document.getElementById("settingsTest");
const TEAM_NAMES = [
  // NFL teams
  "Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets",
  "Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers",
  "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans",
  "Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers",
  "Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders",
  "Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings",
  "Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers",
  "Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks",
  // NCAA power programs
  "Alabama Crimson Tide", "Georgia Bulldogs", "LSU Tigers", "Florida Gators", "Tennessee Volunteers",
  "Texas Longhorns", "Oklahoma Sooners", "Michigan Wolverines", "Ohio State Buckeyes",
  "Penn State Nittany Lions", "Wisconsin Badgers", "Iowa Hawkeyes", "Nebraska Cornhuskers",
  "USC Trojans", "Oregon Ducks", "Clemson Tigers", "Florida State Seminoles",
  "Miami Hurricanes", "North Carolina Tar Heels", "Iowa State Cyclones", "Kansas State Wildcats",
  "Oklahoma State Cowboys", "TCU Horned Frogs", "Baylor Bears", "Texas Tech Red Raiders",
  "West Virginia Mountaineers", "Kansas Jayhawks", "Washington Huskies", "UCLA Bruins",
  "Stanford Cardinal", "Arizona State Sun Devils"
];
const PLAYER_NAMES = [
  "Coach", "Hammer", "Rookie", "Ace", "Flash", "Tank", "Spike", "Dash", "Jet", "Crusher",
  "Maverick", "Blaze", "Storm", "Brick", "Bolt", "Shadow", "Viper", "Striker", "Turbo", "Rocket"
];

function populateTeamSelect(selectEl) {
  if (!selectEl) return;
  TEAM_NAMES.forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    selectEl.appendChild(opt);
  });
}
populateTeamSelect(teamASelect);
populateTeamSelect(teamBSelect);
if (teamASelect && teamANameInput) {
  teamASelect.addEventListener("change", () => {
    if (teamASelect.value) teamANameInput.value = teamASelect.value;
  });
}
if (teamBSelect && teamBNameInput) {
  teamBSelect.addEventListener("change", () => {
    if (teamBSelect.value) teamBNameInput.value = teamBSelect.value;
  });
}

const offenseCallBtn = document.getElementById("offenseCallBtn");
const defenseCallBtn = document.getElementById("defenseCallBtn");
const callStatus = document.getElementById("callStatus");
const diceInputs = document.getElementById("diceInputs");
const patternMatches = document.getElementById("patternMatches");
const resolveBtn = document.getElementById("resolveBtn");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const gameOverModal = document.getElementById("gameOver");
const finalScoresEl = document.getElementById("finalScores");
const restartBtn = document.getElementById("restartBtn");
const cardModal = document.getElementById("cardModal");
const cardModalTitle = document.getElementById("cardModalTitle");
const cardModalBody = document.getElementById("cardModalBody");
const cardSelectBtn = document.getElementById("cardSelectBtn");
const cardCloseBtn = document.getElementById("cardCloseBtn");
const offenseModal = document.getElementById("offenseModal");
const offenseCardList = document.getElementById("offenseCardList");
const offenseCloseBtn = document.getElementById("offenseCloseBtn");
const audibleBtn = document.getElementById("audibleBtn");
const defenseModal = document.getElementById("defenseModal");
const defenseModalOptions = document.getElementById("defenseModalOptions");
const defenseCloseBtn = document.getElementById("defenseCloseBtn");

const hudOffense = document.getElementById("hudOffense");
const hudDefense = document.getElementById("hudDefense");
const hudDown = document.getElementById("hudDown");
const hudField = document.getElementById("hudField");
const hudPressure = document.getElementById("hudPressure");
const hudMomentum = document.getElementById("hudMomentum");
const hudRisk = document.getElementById("hudRisk");
const hudScores = document.getElementById("hudScores");
const hudClock = document.getElementById("hudClock");
const sbScoreA = document.getElementById("sbScoreA");
const sbScoreB = document.getElementById("sbScoreB");
const sbClock = document.getElementById("sbClock");
const sbDown = document.getElementById("sbDown");
const sbBall = document.getElementById("sbBall");
const sbLabelA = document.getElementById("sbLabelA");
const sbLabelB = document.getElementById("sbLabelB");
const sbPossA = document.getElementById("sbPossA");
const sbPossB = document.getElementById("sbPossB");
const ballMarker = document.getElementById("ballMarker");
const driveBar = document.getElementById("driveBar");

const pauseClockBtn = document.getElementById("pauseClockBtn");
const resumeClockBtn = document.getElementById("resumeClockBtn");
const endQuarterBtn = document.getElementById("endQuarterBtn");
const resetMatchBtn = document.getElementById("resetMatchBtn");
const optionsBtn = document.getElementById("optionsBtn");
const optionsModal = document.getElementById("optionsModal");
const optionsCloseBtn = document.getElementById("optionsCloseBtn");
const devScreen = document.getElementById("devScreen");
const simGamesInput = document.getElementById("simGames");
const simSeedInput = document.getElementById("simSeed");
const simQuarterLenInput = document.getElementById("simQuarterLen");
const simQuartersInput = document.getElementById("simQuarters");
const simPaceInput = document.getElementById("simPace");
const runSimBtn = document.getElementById("runSimBtn");
const stopSimBtn = document.getElementById("stopSimBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const quickRunBtn = document.getElementById("quickRunBtn");
const cashOutBtn = document.getElementById("cashOutBtn");
const fgBtn = document.getElementById("fgBtn");
const simHeadline = document.getElementById("simHeadline");
const simTable = document.getElementById("simTable");
const simJson = document.getElementById("simJson");
const balanceRecsEl = document.getElementById("balanceRecs");
const inlineBanner = document.getElementById("inlineBanner");

let tempPlayers = [];
let previewCardId = null;
let soloAdvantage = true;
let clockRunning = true;
let paceMultiplier = 1;
let devMode = false;
let stopSimHandle = null;
let lastReport = null;
let themeState = { retro: true, highContrast: false };
const lastHud = { clock: "", down: "", ball: "", scoreA: "", scoreB: "", poss: "" };
let bannerTimer = null;

const THEME_KEY = "drive-control-theme";
function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) themeState = JSON.parse(raw);
  } catch (e) {}
  applyTheme(themeState);
  updateThemeButtons();
}
function saveTheme() {
  localStorage.setItem(THEME_KEY, JSON.stringify(themeState));
}
function updateThemeButtons() {
  retroOnBtn.classList.toggle("primary", themeState.retro);
  retroOffBtn.classList.toggle("primary", !themeState.retro);
  hcOnBtn.classList.toggle("primary", themeState.highContrast);
  hcOffBtn.classList.toggle("primary", !themeState.highContrast);
}

function showScreen(screen) {
  setupScreen.classList.remove("active");
  matchScreen.classList.remove("active");
  devScreen.classList.remove("active");
  screen.classList.add("active");
}

function defaultTeamForIndex(idx, count) {
  if (count === 2) return idx === 0 ? "A" : "B";
  if (count === 3) return idx < 2 ? "A" : "B";
  if (count === 4) return idx < 2 ? "A" : "B";
  return "A";
}

function addPlayerRow(name = "", teamId = "A") {
  if (tempPlayers.length >= 4) return;
  const row = document.createElement("div");
  row.className = "player-row";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `Player ${tempPlayers.length + 1}`;
  input.value = name;
   const randBtn = document.createElement("button");
  randBtn.type = "button";
  randBtn.className = "ghost-btn tiny-btn";
  randBtn.textContent = "🎲";
  randBtn.addEventListener("click", () => {
    input.value = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
  });
  const select = document.createElement("select");
  ["A", "B"].forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = `Team ${t}`;
    if (t === teamId) opt.selected = true;
    select.appendChild(opt);
  });
  row.appendChild(input);
  row.appendChild(randBtn);
  row.appendChild(select);
  playerListEl.appendChild(row);
  tempPlayers.push({ input, select });
}

function refreshTeamDefaults() {
  const count = tempPlayers.length;
  tempPlayers.forEach((p, idx) => {
    p.select.value = defaultTeamForIndex(idx, count);
  });
}

addPlayerBtn.addEventListener("click", () => {
  addPlayerRow("", defaultTeamForIndex(tempPlayers.length, tempPlayers.length + 1));
});

soloAdvOn.addEventListener("click", () => {
  soloAdvantage = true;
  soloAdvOn.classList.add("primary");
  soloAdvOff.classList.remove("primary");
});
soloAdvOff.addEventListener("click", () => {
  soloAdvantage = false;
  soloAdvOff.classList.add("primary");
  soloAdvOn.classList.remove("primary");
});

clockRunningOn.addEventListener("click", () => {
  clockRunning = true;
  clockRunningOn.classList.add("primary");
  clockRunningOff.classList.remove("primary");
});
clockRunningOff.addEventListener("click", () => {
  clockRunning = false;
  clockRunningOff.classList.add("primary");
  clockRunningOn.classList.remove("primary");
});

paceButtons.addEventListener("click", (e) => {
  const p = e.target.dataset.pace;
  if (!p) return;
  paceMultiplier = parseFloat(p);
  [...paceButtons.children].forEach((btn) => {
    btn.classList.toggle("primary", btn.dataset.pace === p);
    btn.classList.toggle("secondary", btn.dataset.pace !== p);
  });
});

function readTempPlayers() {
  return tempPlayers.map((p) => ({ name: p.input.value.trim(), teamId: p.select.value })).filter((p) => p.name);
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

startMatchBtn.addEventListener("click", () => {
  const players = readTempPlayers();
  if (!validateTeams(players)) {
    alert("Teams must be 1v1 (2p), 2v1 (3p), or 2v2 (4p).");
    return;
  }
  const quarterLengthSeconds = (parseInt(quarterLengthInput.value, 10) || 6) * 60;
  const quartersTotal = parseInt(quartersTotalInput.value, 10) || 4;
  try {
    setTeams({
      players,
      quarterLengthSeconds,
      quartersTotal,
      runningClock: clockRunning,
      receivingTeamId: receivesSelect.value || "A",
      paceMultiplier,
      soloAdvantage,
      teamNames: { A: teamANameInput.value || "Team A", B: teamBNameInput.value || "Team B" },
    });
  } catch (e) {
    alert(e.message);
    return;
  }
  render();
  showScreen(matchScreen);
});

  if (offenseCallBtn && offenseModal) {
    offenseCallBtn.addEventListener("click", () => {
      const state = getState();
      if (state.currentHand.selectedCardId) return; // lock once called
      renderOffenseModal();
      offenseModal.classList.remove("hidden");
    });
  }
if (defenseCallBtn && defenseModal) {
  defenseCallBtn.addEventListener("click", () => {
    renderDefenseModal();
    defenseModal.classList.remove("hidden");
  });
}

if (audibleBtn) {
  audibleBtn.addEventListener("click", () => {
    const state = getState();
    if (state.currentDrive.audibleUsed) return;
    state.deckState.discardPileIds.push(...state.currentHand.cardIds);
    state.currentDrive.audibleUsed = true;
    startDown();
    offenseModal.classList.add("hidden");
    render();
  });
}

if (resolveBtn) {
  resolveBtn.addEventListener("click", () => {
    const result = resolvePlay();
    if (result?.error) {
      alert(result.error);
      return;
    }
    render();
    handlePlayResult(result);
  });
}

if (modalCloseBtn) modalCloseBtn.addEventListener("click", () => hideModal());

if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    resetState();
    tempPlayers = [];
    playerListEl.innerHTML = "";
    addPlayerRow("Player 1", "A");
    addPlayerRow("Player 2", "B");
    refreshTeamDefaults();
    showScreen(setupScreen);
    hideGameOver();
  });
}

if (pauseClockBtn) pauseClockBtn.addEventListener("click", () => { pauseClock(); renderHUD(); });
if (resumeClockBtn) resumeClockBtn.addEventListener("click", () => { resumeClock(); renderHUD(); });
if (endQuarterBtn) endQuarterBtn.addEventListener("click", () => { forceEndQuarter(); renderHUD(); });
if (resetMatchBtn) {
  resetMatchBtn.addEventListener("click", () => {
    resetState();
    tempPlayers = [];
    playerListEl.innerHTML = "";
    addPlayerRow("Player 1", "A");
    addPlayerRow("Player 2", "B");
    refreshTeamDefaults();
    showScreen(setupScreen);
    if (optionsModal) optionsModal.classList.add("hidden");
  });
}
if (cashOutBtn) {
  cashOutBtn.addEventListener("click", () => {
    const ok = selectCashOut();
    if (!ok) {
      alert("Need Momentum 1+ to cash in.");
    }
    renderHUD();
  });
}

if (fgBtn) {
  fgBtn.addEventListener("click", () => {
    const state = getState();
    if (state.currentDrive.down !== 4 || state.currentDrive.ballPos < 65) {
      alert("Field goal only on 4th down inside opp 35.");
      return;
    }
    const distance = 100 - state.currentDrive.ballPos;
    let needed = 6;
    if (distance <= 20) needed = 2;
    else if (distance <= 30) needed = 3;
    else if (distance <= 40) needed = 4;
    else if (distance <= 50) needed = 5;
    const roll = parseInt(prompt(`Kick roll (1-6). Needs ${needed}+ ${state.currentDrive.momentum >= 2 ? "(Momentum +1)" : ""}`), 10);
    const res = attemptFieldGoal(roll);
    if (res?.error) {
      alert(res.error);
      return;
    }
    render();
    handlePlayResult(res);
  });
}

runSimBtn.addEventListener("click", () => {
  const games = parseInt(simGamesInput.value, 10) || 100;
  const seed = parseInt(simSeedInput.value, 10) || 42;
  const quarterLengthSeconds = parseInt(simQuarterLenInput.value, 10) || 360;
  const quartersTotal = parseInt(simQuartersInput.value, 10) || 4;
  const pace = parseFloat(simPaceInput.value) || 1;
  simHeadline.textContent = "Running simulation...";
  simTable.textContent = "";
  simJson.textContent = "";
  balanceRecsEl.textContent = "";
  stopSimHandle = runSimulation({
    games,
    seed,
    quarterLengthSeconds,
    quartersTotal,
    paceMultiplier: pace,
    includeGames: false,
    onComplete: (report) => {
      lastReport = report;
      renderReport(report);
    },
  });
});

stopSimBtn.addEventListener("click", () => {
  if (stopSimHandle) stopSimHandle();
});

copyJsonBtn.addEventListener("click", async () => {
  if (!lastReport) return;
  const txt = JSON.stringify(lastReport, null, 2);
  await navigator.clipboard.writeText(txt);
  simHeadline.textContent = "JSON copied to clipboard.";
});

downloadJsonBtn.addEventListener("click", () => {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "drive-control-devsim.json";
  a.click();
  URL.revokeObjectURL(url);
});

quickRunBtn.addEventListener("click", () => {
  simGamesInput.value = 500;
  simSeedInput.value = 42;
  simQuarterLenInput.value = 360;
  simQuartersInput.value = 4;
  simPaceInput.value = "1";
  runSimBtn.click();
});

function renderHUD() {
  const state = getState();
  if (!state.currentDrive) return;
  const offenseTeamId = state.possessionTeamId;
  const defenseTeamId = state.currentDefenseTeamId;
  const activeOffenseName = currentOffensePlayerName();
  const offenseName = state.teamNames?.[offenseTeamId] || `Team ${offenseTeamId}`;
  const defenseName = state.teamNames?.[defenseTeamId] || `Team ${defenseTeamId}`;
  if (hudOffense) hudOffense.textContent = `Offense: ${offenseName}${activeOffenseName ? ` (${activeOffenseName})` : ""}`;
  if (hudDefense) hudDefense.textContent = `Defense: ${defenseName}`;
  if (hudDown) hudDown.textContent = formatDownDistance(state.currentDrive);
  if (hudField) hudField.textContent = formatField(state.currentDrive.ballPos);
  const downInline = document.getElementById("downInline");
  const fieldInline = document.getElementById("fieldInline");
  if (downInline) downInline.textContent = formatDownDistance(state.currentDrive);
  if (fieldInline) fieldInline.textContent = formatField(state.currentDrive.ballPos);
  if (hudPressure) hudPressure.textContent = ["Low", "Med", "High"][state.currentDrive.pressure] || "Low";
  if (hudMomentum) hudMomentum.textContent = `${state.currentDrive.momentum}`;
  if (hudRisk) hudRisk.textContent = `${state.currentDrive.turnoverRisk || 0}/2`;
  if (hudScores) hudScores.textContent = `${state.teamNames?.A || "Team A"}: ${state.teams.A.score} | ${state.teamNames?.B || "Team B"}: ${state.teams.B.score}`;
  if (hudClock) hudClock.textContent = `${formatQuarter(state.clock)} ${formatClock(state.clock.secondsRemaining)}`;
  if (cashOutBtn) cashOutBtn.disabled = state.currentDrive.momentum < 1;
  const fgEligible = state.currentDrive.down === 4 && state.currentDrive.ballPos >= 65;
  if (fgBtn) fgBtn.disabled = !fgEligible;
  if (sbScoreA && sbScoreB && sbClock && sbDown && sbBall) {
    if (sbLabelA) sbLabelA.textContent = state.teamNames?.A || "Team A";
    if (sbLabelB) sbLabelB.textContent = state.teamNames?.B || "Team B";
    const clockText = `${formatQuarter(state.clock)} | ${formatClock(state.clock.secondsRemaining)}`;
    const downText = formatDownDistance(state.currentDrive);
    const ballText = `🏈 ${formatField(state.currentDrive.ballPos)}`;
    if (sbScoreA.textContent !== String(state.teams.A.score)) { sbScoreA.textContent = state.teams.A.score; sbScoreA.classList.add("stateChange"); setTimeout(() => sbScoreA.classList.remove("stateChange"), 150); }
    if (sbScoreB.textContent !== String(state.teams.B.score)) { sbScoreB.textContent = state.teams.B.score; sbScoreB.classList.add("stateChange"); setTimeout(() => sbScoreB.classList.remove("stateChange"), 150); }
    if (sbClock.textContent !== clockText) { sbClock.textContent = clockText; sbClock.classList.add("stateChange"); setTimeout(() => sbClock.classList.remove("stateChange"), 150); }
    if (sbDown.textContent !== downText) { sbDown.textContent = downText; sbDown.classList.add("stateChange"); setTimeout(() => sbDown.classList.remove("stateChange"), 150); }
    if (sbBall.textContent !== ballText) { sbBall.textContent = ballText; sbBall.classList.add("stateChange"); setTimeout(() => sbBall.classList.remove("stateChange"), 150); }
    if (sbPossA && sbPossB) {
      sbPossA.classList.toggle("active", state.possessionTeamId === "A");
      sbPossB.classList.toggle("active", state.possessionTeamId === "B");
    }
  }
  if (ballMarker) {
    const pct = Math.min(100, Math.max(0, state.currentDrive.ballPos));
    ballMarker.style.left = `${pct}%`;
  }
  if (driveBar) {
    const pct = Math.min(100, Math.max(0, (state.currentDrive.momentum / 3) * 100));
    driveBar.style.width = `${pct}%`;
  }
  const momentumLabel = document.getElementById("momentumLabel");
  if (momentumLabel) momentumLabel.textContent = `Momentum: ${state.currentDrive.momentum}/3`;
}

function renderCallStatus() {
  const state = getState();
  if (!callStatus) return;
  const play = deck.find((c) => c.id === state.currentHand.selectedCardId);
  const def = state.currentHand.defenseCall;
  const defLabels = { STACK: "Stack the Box", TIGHT: "Tight Coverage", DEEP: "Deep Shell" };
  const playTxt = play ? `Play: ${play.name}` : "Play: —";
  const defTxt = def ? `Defense: ${defLabels[def] || def}` : "Defense: —";
  callStatus.textContent = `${playTxt} | ${defTxt}`;
}

const friendlyTargetLabel = {
  TWO_PAIR: "Solid Gain",
  THREE_KIND: "First Down",
  FOUR_KIND: "Big Play",
  FULL_HOUSE: "Breakaway",
  SMALL_STRAIGHT: "Open Field",
  LARGE_STRAIGHT: "Downfield Strike",
  YAHTZEE: "Perfect Play",
  CHANCE: "No Gain",
  MISS: "No Gain",
};

function renderResultButtons() {
  const state = getState();
  if (!diceInputs) return;
  diceInputs.innerHTML = "";
  patternMatches.innerHTML = "";
  const selected = state.currentHand.selectedCardId;
  const card = deck.find((c) => c.id === selected);
  if (!card) {
    diceInputs.textContent = "Select a play first.";
    return;
  }
  const adjusted = applyDefenseAdjustments(card, state.currentHand.defenseCall);
  const targets = [...adjusted.targets];
  targets.push("MISS");
  targets.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "die-btn result-btn";
    btn.textContent = friendlyTargetLabel[t] || formatMatchLabel(t);
    btn.addEventListener("click", () => {
      if (t === "MISS") {
        setChosenPattern(null);
      } else {
        setChosenPattern(t);
      }
      renderResultButtons();
    });
    diceInputs.appendChild(btn);
  });
  const chosen = state.currentHand.chosenPattern;
  patternMatches.textContent = chosen ? `Selected: ${friendlyTargetLabel[chosen] || formatMatchLabel(chosen)}` : "Selected: No Gain";
}

function renderOffenseModal() {
  const state = getState();
  if (!offenseCardList) return;
  offenseCardList.innerHTML = "";
  const slots = ["A", "B", "C"];
  state.currentHand.cardIds.forEach((id, idx) => {
    const card = deck.find((c) => c.id === id);
    const wrap = document.createElement("div");
    wrap.className = "modal-card";
    const header = document.createElement("div");
    header.className = "modal-card-head";
    header.textContent = `Play Slot ${slots[idx] || idx + 1}`;
    wrap.appendChild(header);
    const body = renderCard(card, state.currentHand.selectedCardId === id);
    wrap.appendChild(body);
    if (!state.currentHand.selectedCardId) {
      const btn = document.createElement("button");
      btn.className = "primary wide";
      btn.textContent = "Call Play";
      btn.addEventListener("click", () => {
        selectCard(id);
        offenseModal.classList.add("hidden");
        renderCallStatus();
        render();
      });
      wrap.appendChild(btn);
    } else if (state.currentHand.selectedCardId === id) {
      const called = document.createElement("div");
      called.className = "called-banner";
      called.textContent = "CALLED";
      wrap.appendChild(called);
    }
    if (state.currentHand.selectedCardId === id) {
      const called = document.createElement("div");
      called.className = "called-banner";
      called.textContent = "CALLED";
      wrap.appendChild(called);
    }
    offenseCardList.appendChild(wrap);
  });
  if (audibleBtn) audibleBtn.disabled = state.currentDrive.audibleUsed;
}

function renderDefenseModal() {
  const state = getState();
  if (!defenseModalOptions) return;
  defenseModalOptions.innerHTML = "";
  const calls = [
    { id: "STACK", label: "Stack the Box", sub: "Strong vs Run" },
    { id: "TIGHT", label: "Tight Coverage", sub: "Removes easy target" },
    { id: "DEEP", label: "Deep Shell", sub: "Limits deep gains" },
  ];
  calls.forEach((c) => {
    const btn = document.createElement("button");
    btn.dataset.call = c.id;
    btn.className = state.currentHand.defenseCall === c.id ? "primary" : "secondary";
    btn.innerHTML = `${c.label}<span class="def-sub">${c.sub}</span>`;
    btn.addEventListener("click", () => {
      setDefenseCall(c.id);
      renderCallStatus();
      render();
      defenseModal.classList.add("hidden");
    });
    defenseModalOptions.appendChild(btn);
  });
}

function showBanner(text) {
  if (!inlineBanner) return;
  inlineBanner.textContent = text;
  inlineBanner.classList.remove("hidden");
  inlineBanner.classList.add("visible");
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    inlineBanner.classList.add("hidden");
    inlineBanner.classList.remove("visible");
  }, 1200);
}

function shouldShowResultModal(result) {
  return (
    result.touchdown ||
    result.turnover ||
    result.fieldGoal ||
    result.firstDown ||
    result.quarterEnded ||
    result.bigPlay
  );
}

function showResultModal(result) {
  const state = getState();
  if (!result) return;
  const play = result.playId ? deck.find((c) => c.id === result.playId) : null;
  const wasSuccess = result.touchdown || (!!result.outcome && result.outcome.success && !result.turnover && !result.fieldGoal);
  const flavor = play ? getPlayFlavor(play, wasSuccess) : "";
  let title = "Result";
  let body = result.message || "";
  let btn = "Next Play";
  if (result.playmaker) {
    title = "PLAYMAKER!";
    if (result.turnoverType === "INTERCEPTION") {
      body = "The defense reads it perfectly.\nINTERCEPTION!";
    } else {
      body = "The defense reads it perfectly.\nFUMBLE!";
    }
    btn = "New Possession";
  } else if (result.touchdown) {
    title = "TOUCHDOWN!";
    body = `${result.playName || "Play"}${result.outcome?.yards ? ` • ${result.outcome.yards} yards` : ""}`;
    btn = isGameOver() ? "Finish" : "Kickoff";
  } else if (result.turnover) {
    title = result.turnoverType === "INTERCEPTION" ? "INTERCEPTION!" : "TURNOVER!";
    const spot = result.turnoverSpot ?? state.currentDrive.ballPos;
    body = `Defense takes over at ${formatField(spot)}`;
    btn = "New Possession";
  } else if (result.fieldGoal) {
    title = result.fieldGoalMade ? "FIELD GOAL IS GOOD" : "NO GOOD";
    const spot = result.turnoverSpot ?? state.currentDrive.ballPos;
    body = result.fieldGoalMade ? "+3 points" : `Turnover at ${formatField(spot)}`;
    btn = result.fieldGoalMade ? "Kickoff" : "Next Possession";
  } else if (result.firstDown) {
    title = "FIRST DOWN!";
    body = `Ball at ${formatField(result.ballPos ?? state.currentDrive.ballPos)}`;
    btn = "Continue Drive";
  } else if (result.quarterEnded) {
    title = `END OF ${formatQuarter(state.clock)}`;
    body = "Start next quarter.";
    btn = "Continue";
  } else if (result.bigPlay) {
    if (result.highlight) {
      title = "HIGHLIGHT PLAY!";
      body = `${result.playName || "Play"}\n+${result.highlightYards || 0} yards bonus`;
    } else {
      title = "BIG PLAY!";
      body = `${result.outcome?.yards ? `+${result.outcome.yards} yards` : ""}`;
    }
    btn = "Next Play";
  }
  if (flavor) {
    body = body ? `${body}\n${flavor}` : flavor;
  }
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalCloseBtn.textContent = btn;
  modal.classList.remove("hidden");
}

function handlePlayResult(result) {
  if (isGameOver()) {
    showGameOver();
    return;
  }
  if (result?.gameOver) {
    showModal("Sudden death continues. Next drive.");
    return;
  }
  if (shouldShowResultModal(result)) {
    showResultModal(result);
  } else {
    const yards = result?.outcome?.yards ?? 0;
    let text = "NO GAIN";
    if (result?.outcome?.success) {
      text = yards > 0 ? `+${yards} YARDS` : "NO GAIN";
    } else {
      text = "INCOMPLETE";
    }
    showBanner(text);
  }
}

function render() {
  const state = getState();
  if (!state.players.length) {
    showScreen(setupScreen);
    return;
  }
  showScreen(matchScreen);
  renderHUD();
  renderCallStatus();
  renderResultButtons();
  if (offenseCallBtn) {
    offenseCallBtn.disabled = !!state.currentHand.selectedCardId;
    offenseCallBtn.title = state.currentHand.selectedCardId ? "Play is locked in for this down" : "";
  }
  if (resolveBtn) {
    resolveBtn.disabled = !state.currentHand.selectedCardId || !state.currentHand.defenseCall;
  }
  const fgEligible = state.currentDrive.down === 4 && state.currentDrive.ballPos >= 65;
  if (fgBtn) {
    fgBtn.disabled = !fgEligible;
    fgBtn.title = "Available on 4th down inside opponent 35";
    fgBtn.classList.toggle("disabled", !fgEligible);
  }
  if (cashOutBtn) {
    cashOutBtn.title = "Gain +4 yards now and reset momentum. Pressing on raises turnover risk.";
  }
  const phaseBanner = document.getElementById("phaseBanner");
  if (phaseBanner) {
    let text = "Offense selecting play";
    if (state.currentHand.selectedCardId && !state.currentHand.defenseCall) text = "Defense calling";
    else if (state.currentHand.selectedCardId && state.currentHand.defenseCall) text = "Resolving play";
    phaseBanner.textContent = `▶ ${text.toUpperCase()}`;
  }
}

function renderReport(report) {
  simHeadline.textContent = `Avg Points/Game: ${report.aggregate.avgPointsPerGame.toFixed(2)} | TDs/Game: ${report.aggregate.tdsPerGame.toFixed(2)} | INTs/Game: ${report.aggregate.intsPerGame.toFixed(2)} | Fumbles/Game: ${report.aggregate.fumblesPerGame.toFixed(2)} | Plays/Game: ${report.aggregate.avgPlaysPerGame.toFixed(2)} | Success: ${(report.aggregate.successRate * 100).toFixed(1)}%`;
  const rows = Object.entries(report.byPlayType).map(([type, s]) => `<tr><td>${type}</td><td>${s.plays}</td><td>${(s.successRate * 100).toFixed(1)}%</td><td>${s.yardsPerPlay.toFixed(2)}</td><td>${(s.tdRate * 100).toFixed(1)}%</td><td>${(s.intRate * 100).toFixed(1)}%</td><td>${(s.fumbleRate * 100).toFixed(1)}%</td></tr>`).join("");
  simTable.innerHTML = `<table><thead><tr><th>Type</th><th>Plays</th><th>Success</th><th>Yds/Play</th><th>TD%</th><th>INT%</th><th>FUM%</th></tr></thead><tbody>${rows}</tbody></table>`;
  simJson.textContent = JSON.stringify(report, null, 2);
  const recs = recommendTweaks(report);
  balanceRecsEl.innerHTML = `
    <h4>Issues</h4>
    <ul>${(recs.issues || []).map((i) => `<li>${i}</li>`).join("") || "<li>None</li>"}</ul>
    <h4>Recommendations</h4>
    <ul>${(recs.recommendations || []).map((r) => `<li>${r}</li>`).join("") || "<li>None</li>"}</ul>
  `;
}

function showModal(message) {
  modalTitle.textContent = "Play Result";
  modalBody.textContent = message;
  modal.classList.remove("hidden");
}

function hideModal() {
  modal.classList.add("hidden");
}

function openCardModal(card) {
  previewCardId = card.id;
  cardModalTitle.textContent = card.name;
  cardModalBody.innerHTML = "";
  const body = renderCard(card, false);
  cardModalBody.appendChild(body);
  cardModal.classList.remove("hidden");
}

cardSelectBtn.addEventListener("click", () => {
  if (previewCardId) {
    selectCard(previewCardId);
    renderPatterns();
    renderCallStatus();
  }
  cardModal.classList.add("hidden");
});

cardCloseBtn.addEventListener("click", () => {
  cardModal.classList.add("hidden");
});

if (offenseCloseBtn) {
  offenseCloseBtn.addEventListener("click", () => offenseModal.classList.add("hidden"));
}
if (defenseCloseBtn) {
  defenseCloseBtn.addEventListener("click", () => defenseModal.classList.add("hidden"));
}
if (optionsBtn && optionsModal) {
  optionsBtn.addEventListener("click", () => optionsModal.classList.remove("hidden"));
}
if (optionsCloseBtn && optionsModal) {
  optionsCloseBtn.addEventListener("click", () => optionsModal.classList.add("hidden"));
}

function showGameOver() {
  const state = getState();
  const winner =
    state.teams.A.score === state.teams.B.score
      ? "Tie"
      : state.teams.A.score > state.teams.B.score
      ? "Team A Wins"
      : "Team B Wins";
  finalScoresEl.innerHTML = `
    <div>${winner}</div>
    <div>Team A: ${state.teams.A.score}</div>
    <div>Team B: ${state.teams.B.score}</div>
  `;
  gameOverModal.classList.remove("hidden");
}

function hideGameOver() {
  gameOverModal.classList.add("hidden");
}

// Initial boot
if (getState().players.length) {
  render();
  showScreen(matchScreen);
} else {
  addPlayerRow("Player 1", "A");
  addPlayerRow("Player 2", "B");
  refreshTeamDefaults();
  showScreen(setupScreen);
}
soloAdvOn.classList.add("primary");
clockRunningOn.classList.add("primary");
loadTheme();
loadTheme();

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
const devLink = document.getElementById("devLink");
if (devLink) {
  devLink.addEventListener("click", () => {
    devMode = !devMode;
    devScreen.style.display = devMode ? "block" : "none";
    if (devMode) {
      simQuarterLenInput.value = (parseInt(quarterLengthInput.value, 10) || 6) * 60;
      simQuartersInput.value = quartersTotalInput.value || 4;
    }
  });
}

retroOnBtn.addEventListener("click", () => {
  themeState.retro = true;
  applyTheme(themeState);
  updateThemeButtons();
  saveTheme();
});
retroOffBtn.addEventListener("click", () => {
  themeState.retro = false;
  applyTheme(themeState);
  updateThemeButtons();
  saveTheme();
});
hcOnBtn.addEventListener("click", () => {
  themeState.highContrast = true;
  applyTheme(themeState);
  updateThemeButtons();
  saveTheme();
});
hcOffBtn.addEventListener("click", () => {
  themeState.highContrast = false;
  applyTheme(themeState);
  updateThemeButtons();
  saveTheme();
});

settingsTestBtn.addEventListener("click", () => {
  themeState = { retro: true, highContrast: true };
  applyTheme(themeState);
  updateThemeButtons();
  saveTheme();
});

if (optionsModal) optionsModal.classList.add("hidden");
