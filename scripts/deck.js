export const PlayType = {
  RUN: "RUN",
  SHORT: "SHORT",
  DEEP: "DEEP",
  TRICK: "TRICK",
};

export const Targets = {
  TWO_PAIR: "TWO_PAIR",
  THREE_KIND: "THREE_KIND",
  FOUR_KIND: "FOUR_KIND",
  FULL_HOUSE: "FULL_HOUSE",
  SMALL_STRAIGHT: "SMALL_STRAIGHT",
  LARGE_STRAIGHT: "LARGE_STRAIGHT",
  YAHTZEE: "YAHTZEE",
  CHANCE: "CHANCE",
};

// Deck list matches design spec exactly.
export const deck = [
  { id: 1, name: "Inside Zone", type: PlayType.RUN, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FULL_HOUSE], outcomes: { TWO_PAIR: 4, THREE_KIND: 5, FULL_HOUSE: 6 }, failYards: 1, bonus: { type: "MOMENTUM", trigger: Targets.FULL_HOUSE, amount: 1 } },
  { id: 2, name: "Power Sweep", type: PlayType.RUN, targets: [Targets.THREE_KIND, Targets.FOUR_KIND, Targets.FULL_HOUSE], outcomes: { THREE_KIND: 5, FOUR_KIND: 7, FULL_HOUSE: 8 }, failYards: 0 },
  { id: 3, name: "Draw Play", type: PlayType.RUN, targets: [Targets.SMALL_STRAIGHT, Targets.TWO_PAIR, Targets.FULL_HOUSE], outcomes: { SMALL_STRAIGHT: 4, TWO_PAIR: 5, FULL_HOUSE: 6 }, failYards: 1 },
  { id: 4, name: "Counter Run", type: PlayType.RUN, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FOUR_KIND], outcomes: { TWO_PAIR: 4, THREE_KIND: 6, FOUR_KIND: 7 }, failYards: 0 },
  { id: 5, name: "Goal Line Push", type: PlayType.RUN, targets: [Targets.THREE_KIND, Targets.FULL_HOUSE, Targets.YAHTZEE], outcomes: { THREE_KIND: 4, FULL_HOUSE: 6, YAHTZEE: "TD" }, failYards: 0 },
  { id: 6, name: "Off-Tackle", type: PlayType.RUN, targets: [Targets.TWO_PAIR, Targets.SMALL_STRAIGHT, Targets.THREE_KIND], outcomes: { TWO_PAIR: 3, SMALL_STRAIGHT: 5, THREE_KIND: 6 }, failYards: 1 },
  { id: 7, name: "Stretch Run", type: PlayType.RUN, targets: [Targets.SMALL_STRAIGHT, Targets.THREE_KIND, Targets.FOUR_KIND], outcomes: { SMALL_STRAIGHT: 4, THREE_KIND: 6, FOUR_KIND: 7 }, failYards: 0 },
  { id: 8, name: "Dive", type: PlayType.RUN, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FULL_HOUSE], outcomes: { TWO_PAIR: 3, THREE_KIND: 4, FULL_HOUSE: 5 }, failYards: 1, riskTag: "SAFE" },
  { id: 9, name: "Trap Run", type: PlayType.RUN, targets: [Targets.THREE_KIND, Targets.SMALL_STRAIGHT, Targets.FULL_HOUSE], outcomes: { THREE_KIND: 4, SMALL_STRAIGHT: 5, FULL_HOUSE: 6 }, failYards: 0 },
  { id: 10, name: "Lead Block", type: PlayType.RUN, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FOUR_KIND], outcomes: { TWO_PAIR: 3, THREE_KIND: 5, FOUR_KIND: 7 }, failYards: 0 },
  { id: 11, name: "Wildcat", type: PlayType.RUN, targets: [Targets.SMALL_STRAIGHT, Targets.FULL_HOUSE, Targets.YAHTZEE], outcomes: { SMALL_STRAIGHT: 5, FULL_HOUSE: 7, YAHTZEE: "TD" }, failYards: 1, riskTag: "RISK" },

  { id: 12, name: "Quick Slant", type: PlayType.SHORT, targets: [Targets.SMALL_STRAIGHT, Targets.TWO_PAIR, Targets.THREE_KIND], outcomes: { SMALL_STRAIGHT: 3, TWO_PAIR: 4, THREE_KIND: 5 }, failYards: 0 },
  { id: 13, name: "Hitch Route", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FULL_HOUSE], outcomes: { TWO_PAIR: 2, THREE_KIND: 3, FULL_HOUSE: 5 }, failYards: 1 },
  { id: 14, name: "Crossing Route", type: PlayType.SHORT, targets: [Targets.SMALL_STRAIGHT, Targets.THREE_KIND, Targets.FULL_HOUSE], outcomes: { SMALL_STRAIGHT: 3, THREE_KIND: 5, FULL_HOUSE: 6 }, failYards: 0 },
  { id: 15, name: "Bubble Screen", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.SMALL_STRAIGHT, Targets.THREE_KIND], outcomes: { TWO_PAIR: 2, SMALL_STRAIGHT: 3, THREE_KIND: 5 }, failYards: 1, bonus: { type: "MOMENTUM", trigger: "ANY_SUCCESS", amount: 1 } },
  { id: 16, name: "Quick Out", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FOUR_KIND], outcomes: { TWO_PAIR: 3, THREE_KIND: 5, FOUR_KIND: 6 }, failYards: 0 },
  { id: 17, name: "Option Pass", type: PlayType.SHORT, targets: [Targets.SMALL_STRAIGHT, Targets.FULL_HOUSE, Targets.FOUR_KIND], outcomes: { SMALL_STRAIGHT: 4, FULL_HOUSE: 6, FOUR_KIND: 7 }, failYards: 0, riskTag: "RISK" },
  { id: 18, name: "Stick Route", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.THREE_KIND, Targets.FULL_HOUSE], outcomes: { TWO_PAIR: 2, THREE_KIND: 4, FULL_HOUSE: 5 }, failYards: 1 },
  { id: 19, name: "RPO Pass", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.SMALL_STRAIGHT, Targets.FULL_HOUSE], outcomes: { TWO_PAIR: 3, SMALL_STRAIGHT: 4, FULL_HOUSE: 6 }, failYards: 1, bonus: { type: "MOMENTUM", trigger: Targets.FULL_HOUSE, amount: 1 } },
  { id: 20, name: "Mesh Concept", type: PlayType.SHORT, targets: [Targets.SMALL_STRAIGHT, Targets.THREE_KIND, Targets.FOUR_KIND], outcomes: { SMALL_STRAIGHT: 3, THREE_KIND: 5, FOUR_KIND: 7 }, failYards: 0 },
  { id: 21, name: "Screen & Go", type: PlayType.SHORT, targets: [Targets.TWO_PAIR, Targets.FOUR_KIND, Targets.YAHTZEE], outcomes: { TWO_PAIR: 3, FOUR_KIND: 6, YAHTZEE: "TD" }, failYards: 0, riskTag: "RISK" },

  { id: 22, name: "Deep Post", type: PlayType.DEEP, targets: [Targets.LARGE_STRAIGHT, Targets.FOUR_KIND, Targets.YAHTZEE], outcomes: { LARGE_STRAIGHT: 13, FOUR_KIND: 16, YAHTZEE: "TD" }, failYards: 0, riskTag: "INT" },
  { id: 23, name: "Go Route", type: PlayType.DEEP, targets: [Targets.LARGE_STRAIGHT, Targets.FULL_HOUSE, Targets.YAHTZEE], outcomes: { LARGE_STRAIGHT: 12, FULL_HOUSE: 14, YAHTZEE: "TD" }, failYards: 0, riskTag: "INT" },
  { id: 24, name: "Corner Route", type: PlayType.DEEP, targets: [Targets.LARGE_STRAIGHT, Targets.FOUR_KIND, Targets.FULL_HOUSE], outcomes: { LARGE_STRAIGHT: 13, FOUR_KIND: 15, FULL_HOUSE: 17 }, failYards: 0 },
  { id: 25, name: "Play Action Bomb", type: PlayType.DEEP, targets: [Targets.FULL_HOUSE, Targets.FOUR_KIND, Targets.YAHTZEE], outcomes: { FULL_HOUSE: 14, FOUR_KIND: 16, YAHTZEE: "TD" }, failYards: 0, riskTag: "HIGH" },
  { id: 26, name: "Double Move", type: PlayType.DEEP, targets: [Targets.LARGE_STRAIGHT, Targets.FULL_HOUSE, Targets.YAHTZEE], outcomes: { LARGE_STRAIGHT: 13, FULL_HOUSE: 15, YAHTZEE: "TD" }, failYards: 0, riskTag: "HIGH" },
  { id: 27, name: "Fade Route", type: PlayType.DEEP, targets: [Targets.LARGE_STRAIGHT, Targets.FOUR_KIND, Targets.YAHTZEE], outcomes: { LARGE_STRAIGHT: 12, FOUR_KIND: 15, YAHTZEE: "TD" }, failYards: 0 },

  { id: 28, name: "Reverse", type: PlayType.TRICK, targets: [Targets.SMALL_STRAIGHT, Targets.TWO_PAIR, Targets.FULL_HOUSE], outcomes: { SMALL_STRAIGHT: 5, TWO_PAIR: 6, FULL_HOUSE: 8 }, failYards: 0, bonus: { type: "MOMENTUM", trigger: "ANY_SUCCESS", amount: 1 } },
  { id: 29, name: "Flea Flicker", type: PlayType.TRICK, targets: [Targets.FULL_HOUSE, Targets.FOUR_KIND, Targets.YAHTZEE], outcomes: { FULL_HOUSE: 8, FOUR_KIND: 12, YAHTZEE: "TD" }, failYards: 0, riskTag: "HIGH" },
  { id: 30, name: "Statue of Liberty", type: PlayType.TRICK, targets: [Targets.SMALL_STRAIGHT, Targets.FULL_HOUSE, Targets.YAHTZEE], outcomes: { SMALL_STRAIGHT: 6, FULL_HOUSE: 9, YAHTZEE: "TD" }, failYards: 1, riskTag: "HIGH" },
];
