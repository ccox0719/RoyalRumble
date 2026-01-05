export function formatMatchLabel(key) {
  const map = {
    YAHTZEE: "Yahtzee",
    FOUR_KIND: "Four of a Kind",
    THREE_KIND: "Three of a Kind",
    FULL_HOUSE: "Full House",
    TWO_PAIR: "Two Pair",
    SMALL_STRAIGHT: "Small Straight",
    LARGE_STRAIGHT: "Large Straight",
    PAIR: "Pair",
  };
  if (map[key]) return map[key];
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
