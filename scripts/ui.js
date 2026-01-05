import { PlayType } from "./deck.js";
import { formatMatchLabel } from "./utils/labels.js";

const typeCopy = {
  [PlayType.RUN]: "Ground gain with low air risk.",
  [PlayType.SHORT]: "Quick strike to move the chains.",
  [PlayType.DEEP]: "Boom-or-bust shot downfield.",
  [PlayType.TRICK]: "Spicy gadget with surprise factor.",
};

const timeCost = {
  [PlayType.RUN]: 30,
  [PlayType.SHORT]: 25,
  [PlayType.DEEP]: 27,
  [PlayType.TRICK]: 32,
};

export function ordinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function formatDownDistance(drive) {
  return `${ordinal(drive.down)} & ${drive.yardsToFirst}`;
}

export function formatField(ballPos) {
  if (ballPos >= 50) {
    return `Opp ${100 - ballPos}`;
  }
  return `Own ${ballPos}`;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function formatQuarter(clock) {
  if (clock.isOvertime) {
    return `OT${clock.overtimeNumber || 1}`;
  }
  return `Q${clock.quarter}`;
}

export function applyTheme({ retro, highContrast }) {
  const body = document.body;
  body.classList.toggle("retro", retro);
  body.classList.toggle("high-contrast", highContrast);
}

const typeColor = (type) => {
  switch (type) {
    case PlayType.RUN:
      return "#22c55e";
    case PlayType.SHORT:
      return "#38bdf8";
    case PlayType.DEEP:
      return "#f472b6";
    case PlayType.TRICK:
      return "#eab308";
    default:
      return "#ffffff";
  }
};

export function renderCard(card, selected) {
  const div = document.createElement("div");
  div.className = `play-card${selected ? " selected" : ""}`;
  const typePill = `<span class="badgeType" style="border-color:${typeColor(card.type)};color:${typeColor(card.type)}">${card.type}</span>`;
  const subline = typeCopy[card.type] || "Offense call.";
  const meta = `<div class="meta-row"><span class="hudCapsule">Time ${timeCost[card.type] || 25}s</span><span class="hudCapsule">Risk: Momentum streak</span></div>`;
  const targets = card.targets.map((t) => `<span class="chip">${formatMatchLabel(t)}</span>`).join("");
  const ladder = card.targets.map((t) => {
    const val = card.outcomes[t];
    const yardTxt = val === "TD" ? "TD" : `+${val}`;
    return `<div class="ladderRow"><span class="label">${formatMatchLabel(t)}</span><span class="val">${yardTxt}</span></div>`;
  }).join("");
  const fail = `<div class="ladderRow"><span class="label">Miss</span><span class="val">${card.failYards ? `+${card.failYards}` : "0"}</span></div>`;
  div.innerHTML = `
    <div class="cardTitle">${card.name}</div>
    <div class="subline">${typePill} ${subline}</div>
    ${meta}
    <div class="muted">Make one of these:</div>
    <div class="target-chips">${targets}</div>
    <div class="muted">If you hit:</div>
    <div class="ladder">${ladder}${fail}</div>
  `;
  return div;
}
