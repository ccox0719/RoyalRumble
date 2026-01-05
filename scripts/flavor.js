export const flavorById = {
  1: { success: ["A crease opens and you hit it hard.", "One cut and the chains move.", "Patient run, then burst through."], fail: ["Stonewalled at the line.", "No lane, nowhere to go.", "Stuffed before it develops."] },
  2: { success: ["You get the edge and turn upfield.", "Pulling blockers seal it off.", "A clean sweep with daylight."], fail: ["The edge collapses immediately.", "Pursuit strings it out.", "Blown up in the backfield."] },
  3: { success: ["The defense bites and you slip through.", "A smooth draw catches them leaning.", "Delayed handoff, then a lane appears."], fail: ["Read perfectly. Minimal gain.", "No push up front.", "The timing never lands."] },
  4: { success: ["A sharp cutback snaps the defense.", "Counter step… then daylight.", "You follow the pull and surge forward."], fail: ["The counter gets sniffed out.", "The backside closes fast.", "Nowhere to plant and go."] },
  5: { success: ["Bodies collide and you drive the pile.", "Pure willpower on the goal line.", "You punch it straight ahead."], fail: ["The line holds firm.", "Stood up at the point of attack.", "No push in the scrum."] },
  6: { success: ["You bounce off-tackle and keep churning.", "A solid edge run with momentum.", "You follow the block and fall forward."], fail: ["The edge is set. No room.", "Wrapped up quickly.", "Hit at contact, down fast."] },
  7: { success: ["You stretch it wide and cut upfield.", "Great leverage on the outside.", "A smooth outside run with space."], fail: ["Forced wide with no lane.", "Pursuit closes the angle.", "Strung out for little."] },
  8: { success: ["Quick hit up the middle.", "Low pad level, steady gain.", "You take what's there and move on."], fail: ["Met in the hole instantly.", "No daylight inside.", "Stopped at contact."] },
  9: { success: ["A trap springs you into open grass.", "Perfect timing on the trap block.", "The defense overpursues and pays."], fail: ["The trap never lands.", "Penetration ruins it.", "Hit before you can turn upfield."] },
  10: { success: ["Lead blocker clears the way.", "North-south and decisive.", "You follow the lead and power ahead."], fail: ["The lead gets blown up.", "No push through the gap.", "Hit at the line."] },
  11: { success: ["Wildcat chaos and you break free.", "The defense hesitates, you explode.", "A risky look that pays off."], fail: ["Everyone stays home. No surprise.", "The defense reads it clean.", "The edge is sealed."] },

  12: { success: ["Quick slant, right on time.", "A clean window and an easy catch.", "Catch-and-turn for solid yards."], fail: ["Broken up at the catch point.", "Timing's off, no window.", "Defender jumps the lane."] },
  13: { success: ["Hitch route, settle in the soft spot.", "Ball out fast, chain-mover.", "Easy pitch and catch."], fail: ["Coverage sits on it.", "The throw is late.", "No separation."] },
  14: { success: ["Crossing route tears open the middle.", "You hit the crosser in stride.", "YAC threat immediately."], fail: ["Tight underneath coverage.", "Pass batted down.", "The middle is clogged."] },
  15: { success: ["Bubble screen with blockers in space.", "You get the ball wide and run.", "A quick screen that works."], fail: ["Blown up before blocks set.", "Defender slips through.", "Screen read instantly."] },
  16: { success: ["Quick out to the sideline.", "A crisp break and a clean throw.", "Safe throw, solid gain."], fail: ["Corner drives on it.", "Pass sails wide.", "No time to set your feet."] },
  17: { success: ["Option pass freezes the defense.", "You sell run and pop the throw.", "A tricky look that opens space."], fail: ["Confused timing, play falls apart.", "Defense stays disciplined.", "Nowhere to go with it."] },
  18: { success: ["Stick route, easy completion.", "Find the soft spot and sit.", "A reliable short gain."], fail: ["Linebacker sits right under it.", "Window closes immediately.", "Thrown behind the receiver."] },
  19: { success: ["RPO read is perfect.", "You take what the defense gives.", "Quick decision, quick yards."], fail: ["Defense wins the leverage.", "Read is messy, play stalls.", "Pressure forces a bad throw."] },
  20: { success: ["Mesh concept springs someone open.", "Traffic picks the coverage.", "Easy catch in space."], fail: ["Coverage fights through the traffic.", "Routes collide, timing breaks.", "No clean target."] },
  21: { success: ["Screen sells, then you slip deep.", "A short look turns into a shot.", "Defense bites hard and pays."], fail: ["No bite from the defense.", "Protection breaks before it develops.", "Timing never connects."] },

  22: { success: ["Deep post splits the safeties.", "A missile down the seam.", "You hit the window and fly."], fail: ["Overthrown downfield.", "Safety stays on top.", "Pressure forces it short."] },
  23: { success: ["Go route and you win outside.", "A pure footrace down the sideline.", "Ball drops in perfectly."], fail: ["Step-for-step coverage.", "Ball lands incomplete.", "No time to launch it."] },
  24: { success: ["Corner route to the pylon.", "A perfect arc to the sideline.", "Receiver snaps it off clean."], fail: ["Corner clamps it down.", "No room to fit it in.", "Thrown away safely."] },
  25: { success: ["Play action draws everyone in.", "Defense bites and you bomb it.", "A huge shot off the fake."], fail: ["Fake doesn't fool anyone.", "Pressure kills the deep look.", "Coverage stays deep and patient."] },
  26: { success: ["Double move leaves the DB spinning.", "A nasty shake at the top of the route.", "You sell it… then go."], fail: ["DB never bites.", "Route takes too long.", "Pass rush gets home."] },
  27: { success: ["Fade to the corner. Gorgeous touch.", "High point at the boundary.", "A clean throw where only your guy can get it."], fail: ["Tight coverage at the boundary.", "Thrown out of bounds.", "No separation on the fade."] },

  28: { success: ["Reverse catches them flowing wrong.", "You flip the field on the edge.", "Misdirection opens space."], fail: ["Defense stays home.", "Backside pursuit wrecks it.", "No lane on the reverse."] },
  29: { success: ["Flea flicker: everyone bites.", "A classic trick play lands clean.", "You buy time and launch it."], fail: ["The defense doesn't flinch.", "Too risky, too slow.", "Timing breaks and it dies."] },
  30: { success: ["Statue of Liberty fools the defense.", "A slick fake opens the lane.", "Pure misdirection magic."], fail: ["Nobody falls for it.", "The fake is sniffed out.", "Hit before it develops."] },
};

export function getPlayFlavor(play, wasSuccess) {
  const entry = play ? flavorById[play.id] : null;
  if (!entry) return wasSuccess ? "The play works as drawn." : "The play goes nowhere.";
  const pool = wasSuccess ? entry.success : entry.fail;
  return pool[Math.floor(Math.random() * pool.length)];
}
