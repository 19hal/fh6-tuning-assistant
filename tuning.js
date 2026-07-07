// Physics-informed tuning heuristics for Forza Horizon.
// Not exact meta numbers -- reasonable, explainable starting points based on
// weight, power, drivetrain and use case, tuned by common community wisdom.

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function round1(v) { return Math.round(v * 10) / 10; }

function weightFactor(weight) {
  // -1 (very light) .. 0 (mid ~3400lbs) .. +1 (very heavy)
  return clamp((weight - 3400) / 1200, -1, 1);
}

function powerFactor(hp) {
  // 0 (~200hp) .. 1 (~1000hp+)
  return clamp((hp - 200) / 800, 0, 1);
}

const PI_CLASS_ORDER = ["D", "C", "B", "A", "S1", "S2", "R"];

function piClassFactor(piClass) {
  // 0 (D-class, minimal aero/grip parts available) .. 1 (X-class, full aero/race parts)
  const idx = PI_CLASS_ORDER.indexOf(piClass);
  return idx < 0 ? 0.5 : idx / (PI_CLASS_ORDER.length - 1);
}

// Symptom → ordered adjustments, based on standard Forza tuning-chart wisdom.
// Each fix names the in-game setting (or part) and which way to move it.
// `uses` filters symptoms to the tune's use case.
const TROUBLESHOOTER = [
  // --- Drift-specific ---
  {
    id: "drift-initiation",
    label: "Hard to initiate the drift (car won't break loose)",
    uses: ["drift"],
    fixes: [
      { setting: "Part — Tire Compound", change: "Fit Drift Tires if this chassis offers them; otherwise drop to Street compound — too much rear grip fights initiation" },
      { setting: "Rear Tire Pressure", change: "Raise 2-4 PSI (0.15-0.3 BAR) so the rear breaks away more easily" },
      { setting: "Front Anti-Roll Bar", change: "Stiffen for snappier weight transfer on entry" },
      { setting: "Caster", change: "Increase toward 7° for more steering angle and front bite" },
      { setting: "Differential Decel Lock", change: "Raise so lift-off and clutch-kick rotate the car harder" },
    ],
  },
  {
    id: "drift-hold",
    label: "Can't hold the angle — drift dies mid-corner",
    uses: ["drift"],
    fixes: [
      { setting: "Differential Accel Lock", change: "Push toward 90-100% — both rear wheels must keep spinning" },
      { setting: "Final Drive", change: "If you hit the limiter or have to shift mid-drift, lengthen it (lower number) so 3rd gear covers the whole corner; only shorten (higher number) if revs drop out of the powerband" },
      { setting: "Rear Tire Pressure", change: "Lower slightly if the rear regains grip too abruptly" },
      { setting: "Part — Engine", change: "More torque (Displacement, supercharger) if you run out of wheelspeed in long sweepers" },
    ],
  },
  {
    id: "drift-snap",
    label: "Snaps around / spins instead of sliding",
    uses: ["drift"],
    fixes: [
      { setting: "Caster", change: "Increase — faster self-centering makes counter-steer catch the slide" },
      { setting: "Rear Anti-Roll Bar", change: "Soften so the breakaway is progressive, not sudden" },
      { setting: "Rear Springs", change: "Soften to keep the slide progressive" },
      { setting: "Front Toe", change: "A touch more toe-out quickens counter-steer response" },
    ],
  },
  {
    id: "drift-transitions",
    label: "Sloppy transitions (switchbacks / manji)",
    uses: ["drift"],
    fixes: [
      { setting: "Front Rebound Damping", change: "Stiffen so the front settles quickly between direction changes" },
      { setting: "Anti-Roll Bars", change: "Stiffen both slightly for faster weight transfer" },
      { setting: "Ride Height", change: "Lower a touch — less body roll to catch up with" },
    ],
  },
  // --- Drag-specific ---
  {
    id: "drag-bog",
    label: "Bogs off the line (RPM drops on launch)",
    uses: ["drag"],
    fixes: [
      { setting: "1st Gear", change: "Shorten (higher ratio) for a harder hit off the line" },
      { setting: "Launch Technique", change: "Hold a higher RPM on the line before the lights" },
      { setting: "Part — Flywheel", change: "Race flywheel spins up faster from low RPM" },
      { setting: "Final Drive", change: "Shorten if every gear feels tall" },
    ],
  },
  {
    id: "drag-spin",
    label: "Excessive wheelspin through 1st-2nd",
    uses: ["drag"],
    fixes: [
      { setting: "1st Gear", change: "Lengthen (lower ratio) to soften the torque hit" },
      { setting: "Rear Tire Pressure", change: "Drop further — find the pressure where it hooks" },
      { setting: "Part — Tires & Rims", change: "Slick compound and max rear Tire Width if not already fitted" },
      { setting: "Rear Springs", change: "Soften so launch weight transfer plants the rear" },
    ],
  },
  {
    id: "drag-topend",
    label: "Hits redline before the finish line",
    uses: ["drag"],
    fixes: [
      { setting: "Final Drive", change: "Lengthen (lower number) so top gear peaks right at the line" },
      { setting: "Individual Gears", change: "Stretch the top one or two gears" },
    ],
  },
  // --- Rally / off-road specific ---
  {
    id: "rally-jumps",
    label: "Unsettled over jumps and landings",
    uses: ["rally", "crosscountry"],
    fixes: [
      { setting: "Springs & Ride Height", change: "Soften springs and raise ride height for more travel" },
      { setting: "Bump Damping", change: "Soften to absorb landings" },
      { setting: "Rebound Damping", change: "Soften slightly so the suspension recovers between hits" },
      { setting: "Part — Chassis Reinforcement", change: "Roll cage adds stiffness the soft suspension can work against" },
    ],
  },
  {
    id: "rally-washout",
    label: "Washes wide on loose surfaces",
    uses: ["rally", "crosscountry"],
    fixes: [
      { setting: "Part — Tire Compound", change: "Offroad/Rally tires are mandatory off-tarmac — nothing else fixes this" },
      { setting: "Front Tire Pressure", change: "Lower for a bigger front contact patch on loose ground" },
      { setting: "Front Anti-Roll Bar", change: "Soften for more front compliance and grip" },
      { setting: "Technique", change: "Brake earlier and use lift-off rotation to point the car before the apex" },
    ],
  },
  // --- General handling (tagged per use case) ---
  {
    id: "understeer-entry",
    label: "Understeer on corner entry (won't turn in)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Front Anti-Roll Bar", change: "Soften (lower value) for more front grip on turn-in" },
      { setting: "Caster", change: "Increase toward 6-7° for sharper steering response" },
      { setting: "Front Toe", change: "Add a touch of toe-out (negative) for quicker initial response" },
      { setting: "Brake Balance", change: "Shift slightly rearward (lower % front) to help rotation on trail-braking" },
      { setting: "Front Camber", change: "Add a little more negative camber for mid-turn front grip" },
    ],
  },
  {
    id: "understeer-mid",
    label: "Understeer mid-corner (pushes wide)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Front Springs", change: "Soften slightly — too-stiff fronts lose contact patch under load" },
      { setting: "Front Anti-Roll Bar", change: "Soften, or stiffen the rear bar instead" },
      { setting: "Front Tire Pressure", change: "Drop ~0.5-1 PSI (0.05 BAR) for a bigger front contact patch" },
      { setting: "Front Downforce", change: "Increase relative to rear (if aero is fitted)" },
    ],
  },
  {
    id: "understeer-exit",
    label: "Understeer on exit (pushes when back on power — common on AWD)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Center Balance (AWD)", change: "Shift torque rearward (higher % rear)" },
      { setting: "Differential Accel Lock", change: "Reduce front accel lock (AWD) or overall lock" },
      { setting: "Rear Anti-Roll Bar", change: "Stiffen slightly to rotate the car under power" },
    ],
  },
  {
    id: "oversteer-entry",
    label: "Oversteer on entry (rear steps out on braking/lift-off)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Differential Decel Lock", change: "Reduce — high decel lock drags the rear loose on lift-off" },
      { setting: "Brake Balance", change: "Shift forward (higher % front) for stability" },
      { setting: "Rear Toe", change: "Add slight toe-in (positive) for rear stability" },
      { setting: "Rear Rebound Damping", change: "Soften slightly so the rear stays planted on weight transfer" },
    ],
  },
  {
    id: "oversteer-mid",
    label: "Oversteer mid-corner (rear slides at steady throttle)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Rear Anti-Roll Bar", change: "Soften (lower value) for more rear grip" },
      { setting: "Rear Tire Pressure", change: "Drop ~0.5-1 PSI (0.05 BAR) for a bigger rear contact patch" },
      { setting: "Rear Springs", change: "Soften slightly" },
      { setting: "Rear Downforce", change: "Increase (if aero is fitted)" },
    ],
  },
  {
    id: "oversteer-exit",
    label: "Oversteer on exit (spins up rear tires on throttle)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Differential Accel Lock", change: "Reduce — less lock lets the inside wheel slip instead of both breaking loose" },
      { setting: "Rear Springs", change: "Soften for better rear traction under squat" },
      { setting: "Final Drive", change: "Lengthen (lower number) to soften the torque hit per gear" },
      { setting: "Rear Tire Pressure", change: "Drop slightly for more rear grip" },
    ],
  },
  {
    id: "wheel-hop",
    label: "Wheel hop / axle tramp on launch",
    uses: ["drag", "circuit", "touge", "street"],
    fixes: [
      { setting: "Rear Rebound Damping", change: "Soften — hop is usually rebound fighting the tire" },
      { setting: "Rear Springs", change: "Soften so the rear stays loaded" },
      { setting: "Differential Accel Lock", change: "Back off a few percent if hop persists" },
      { setting: "Tire Compound", change: "Slicks hop less than semislicks at full lock" },
    ],
  },
  {
    id: "bouncy",
    label: "Bouncy / skittish over bumps and curbs",
    uses: ["circuit", "touge", "street", "rally", "crosscountry", "drift"],
    fixes: [
      { setting: "Bump Damping", change: "Soften front and rear" },
      { setting: "Springs", change: "Soften — the suspension should absorb, not deflect" },
      { setting: "Ride Height", change: "Raise slightly for more travel" },
      { setting: "Anti-Roll Bars", change: "Soften if it skips sideways across mid-corner bumps" },
    ],
  },
  {
    id: "floaty",
    label: "Floaty / wallowy (leans and wanders, slow to settle)",
    uses: ["circuit", "touge", "street", "drift"],
    fixes: [
      { setting: "Rebound Damping", change: "Stiffen — the car should settle within one motion" },
      { setting: "Springs", change: "Stiffen front and rear" },
      { setting: "Anti-Roll Bars", change: "Stiffen to reduce body roll" },
      { setting: "Ride Height", change: "Lower for a lower center of gravity" },
    ],
  },
  {
    id: "braking-unstable",
    label: "Unstable under hard braking (wanders or locks)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry", "drag"],
    fixes: [
      { setting: "Brake Balance", change: "Shift forward (higher % front)" },
      { setting: "Brake Pressure", change: "Reduce below 100% if wheels lock early" },
      { setting: "Rear Toe", change: "Add slight toe-in for straight-line stability" },
      { setting: "Front Bump Damping", change: "Stiffen slightly to control dive" },
    ],
  },
  {
    id: "highspeed-unstable",
    label: "Nervous / unstable at high speed",
    uses: ["circuit", "touge", "street", "drag"],
    fixes: [
      { setting: "Rear Downforce", change: "Increase — rear-biased aero stabilizes at speed" },
      { setting: "Rear Toe", change: "Add slight toe-in" },
      { setting: "Caster", change: "Increase for stronger self-centering" },
      { setting: "Ride Height", change: "Avoid rear lower than front — rake makes the car pointier" },
    ],
  },
  {
    id: "poor-launch",
    label: "Poor launch traction (bogs or spins from a standstill)",
    uses: ["circuit", "touge", "street", "rally", "crosscountry"],
    fixes: [
      { setting: "Rear Tire Pressure", change: "Lower for a bigger launch contact patch" },
      { setting: "Rear Springs", change: "Soften so weight transfers onto the rear tires" },
      { setting: "1st Gear", change: "Lengthen (lower ratio) if it spins; shorten if it bogs" },
      { setting: "Differential Accel Lock", change: "Raise for even power delivery — back off if it hops" },
    ],
  },
];

const USE_CASE_LABELS = {
  circuit: "Circuit / Road Racing",
  drag: "Drag Racing",
  drift: "Drift",
  rally: "Rally / Dirt",
  crosscountry: "Cross Country / Off-road",
  street: "Street / Cruise",
  touge: "Touge / Mountain Pass",
};

function generateTune({ make, model, weight, hp, drivetrain, usecase, piClass, tireCompound, frontPct, inputDevice }) {
  const wf = weightFactor(weight);
  const pf = powerFactor(hp);
  const pif = piClassFactor(piClass);
  const fp = (typeof frontPct === "number" && frontPct >= 20 && frontPct <= 80) ? frontPct : 50;
  const device = inputDevice === "wheel" ? "wheel" : "pad";

  const sections = [];

  sections.push(tirePressure(usecase, wf, tireCompound, pf, drivetrain, piClass));
  sections.push(gearing(usecase, drivetrain, pf));
  sections.push(alignment(usecase, drivetrain, device, wf));
  sections.push(antiRollBars(usecase, wf, drivetrain, pif, fp, device));
  const springs = springsAndRideHeight(usecase, weight, wf, pif, fp, device);
  sections.push(springs);
  sections.push(damping(usecase, springs.rates));
  sections.push(brakes(usecase, wf, fp, device, drivetrain));
  sections.push(differential(usecase, drivetrain, pf, tireCompound, device));

  const aero = aeroSection(usecase, wf, pif, drivetrain);
  if (aero) sections.push(aero);

  const parts = recommendedParts(usecase, drivetrain, piClass, tireCompound);

  return { sections, parts };
}

// Base road pressure follows the compound the class ladder recommends
// (ForzaFire FH6 baselines: Street 31.0, Sport 31.5, Semi-Slick 32.0, Slicks 32.5).
function roadTireBasePsi(piClass) {
  switch (piClass) {
    case "D": return 31.0;
    case "C": return 31.25;
    case "B": return 31.5;
    case "A": return 31.75;
    case "S1": return 32.0;
    default: return 32.5; // S2 / R on Race Slicks
  }
}

function tirePressure(usecase, wf, tireCompound, pf = 0, drivetrain = "RWD", piClass = "A") {
  let f, r, note;
  const isRoad = usecase === "circuit" || usecase === "touge" || usecase === "street";
  switch (usecase) {
    case "drag":
      if (tireCompound === "slick") {
        f = 32; r = 25;
        note = "Rear pressure is the launch-grip priority on slicks; front stays at road pressure for stability and low rolling resistance.";
      } else {
        f = 32; r = 26.5;
        note = "Semi-slicks want slightly more rear pressure than slicks — their stiffer tread rolls under if you go too low.";
      }
      break;
    case "drift":
      f = 26; r = 21;
      note = "Drift compounds run low (20-26 range) — low rear pressure keeps the slide progressive and holdable rather than snappy. Raise the rear a couple of PSI if it won't break loose.";
      break;
    case "rally":
      f = 29; r = 29;
      note = "~2.0 BAR symmetric is the dirt baseline — the softer carcass keeps the tread biting on loose surfaces.";
      break;
    case "crosscountry":
      f = 27.5; r = 27.5;
      note = "~1.9 BAR symmetric for rough terrain — lower than rally so the tire wraps over rocks and ruts.";
      break;
    case "street":
      f = r = piClassFactor(piClass) < 0.3 ? 31.0 : 31.5;
      note = "Baseline for the Street/Sport compound this class runs — comfortable and grippy for mixed roads.";
      break;
    case "touge":
      f = r = Math.min(roadTireBasePsi(piClass), 32.0);
      note = "Baseline for the compound this class runs, capped at Semi-Slick pressure for the public-road setup.";
      break;
    case "circuit":
    default:
      f = r = roadTireBasePsi(piClass);
      note = "Baseline for the compound this class runs. Check tire temps after a few laps and adjust ±0.5 PSI at a time (want even inner/mid/outer temps).";
  }
  // Heavier cars need meaningfully more pressure to keep the carcass stable.
  f += wf * 2;
  r += wf * 2;
  // FWD fronts do everything — steering, power and braking — so they run
  // 1-2 PSI over the rear to stay shape-stable under load.
  if (drivetrain === "FWD" && isRoad) {
    f += 1.5;
    note += " FWD: front runs higher — it handles steering, power and braking at once.";
  }
  // High power through the driven rear tires wants a bit more contact patch.
  if (drivetrain !== "FWD" && isRoad) {
    const drop = pf * (drivetrain === "RWD" ? 1.5 : 1);
    r -= drop;
    if (drop >= 0.5) note += " Rear pressure dropped slightly — this much power through the rear tires wants a bigger contact patch for corner-exit traction.";
  }
  return {
    title: "Tire Pressure",
    rows: [
      { label: "Front", num: round1(f), unit: "pressure" },
      { label: "Rear", num: round1(r), unit: "pressure" },
    ],
    note,
  };
}

function gearing(usecase, drivetrain, pf) {
  // Final Drive is a ratio (in-game slider, ~2.00 = long/low-numeric to ~6.00+ = short/high-numeric).
  // A higher ratio favors acceleration; a lower ratio favors top speed.
  // Individual gears assume a 6-speed race transmission, spaced geometrically
  // (wide gaps down low, tight up top — the shape stock race boxes use).
  let note, ratioLow, ratioHigh, firstGear, topGear;
  switch (usecase) {
    case "drag":
      ratioLow = 4.6; ratioHigh = 6.2;
      firstGear = 2.9; topGear = 1.0;
      note = "Set the Final Drive so peak power lands right at the finish line. Gears are spaced tight to keep RPM in the power band through every shift.";
      break;
    case "circuit":
      ratioLow = 3.2; ratioHigh = 4.4;
      firstGear = 3.0; topGear = 0.9;
      note = "Set the Final Drive so redline is reached just before your longest straight's braking point; the gear spread gives even RPM drops on each shift.";
      break;
    case "drift":
      ratioLow = 3.4; ratioHigh = 4.6;
      firstGear = 3.3; topGear = 1.05;
      note = "Gear so one gear — usually 3rd — covers the whole drift with revs sitting high in the band without banging the limiter. Forced to shift mid-drift? Lengthen the Final Drive (lower number). Revs falling out of the band? Shorten it.";
      break;
    case "rally":
    case "crosscountry":
      ratioLow = 4.0; ratioHigh = 5.2;
      firstGear = 3.4; topGear = 1.0;
      note = "A higher Final Drive and short low gears give punchy torque and traction out of loose corners.";
      break;
    case "touge":
      ratioLow = 3.6; ratioHigh = 4.6;
      firstGear = 3.2; topGear = 1.0;
      note = "A higher Final Drive keeps you in the torque band exiting hairpins; top speed rarely matters on a mountain pass.";
      break;
    default:
      ratioLow = 2.6; ratioHigh = 3.4;
      firstGear = 3.5; topGear = 0.8;
      note = "A lower Final Drive and tall top gear give relaxed cruising RPM and better top speed for street driving.";
  }
  // Drift is the exception to power scaling: the rear wheels overspeed hugely
  // mid-slide, so MORE power wants a TALLER (lower) final drive — one gear
  // then covers the whole corner without hitting the limiter or shifting.
  const finalDrive = usecase === "drift"
    ? round1(ratioHigh - pf * (ratioHigh - ratioLow))
    : round1(ratioLow + pf * (ratioHigh - ratioLow));
  // More power pulls taller gearing — shorten 1st less, since wheelspin is the limit.
  const first = firstGear - pf * 0.5;

  // Drag boxes in FH6 run 8-10 gears to stay in the powerband; 9 is the
  // middle of that window. Everything else assumes a 6-speed race box.
  const gearCount = usecase === "drag" ? 9 : 6;
  const gearNames = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  const rows = [{ label: "Final Drive", val: finalDrive.toFixed(2) }];
  for (let i = 0; i < gearCount; i++) {
    const ratio = first * Math.pow(topGear / first, i / (gearCount - 1));
    rows.push({ label: gearNames[i], val: ratio.toFixed(2) });
  }

  note += ` Ratios assume a ${gearCount}-speed race transmission — if your box has a different gear count, keep the same spread shape (wide gaps low, tight gaps high).`;

  return {
    title: "Gearing",
    rows,
    note,
  };
}

function alignment(usecase, drivetrain, device = "pad", wf = 0) {
  // FH6 windows (ForzaFire): road camber F -1.0..-2.0 / R -0.5..-1.0;
  // dirt F -0.8..-1.2 / R -0.5..-0.8; cross country -0.5 both;
  // drift F -3..-5 / R -1.0. Caster 5-7°, scaled with weight, never past 7.
  let camberF, camberR, toeF, toeR, caster, note;
  switch (usecase) {
    case "drag":
      camberF = -0.5; camberR = -0.3;
      toeF = 0.0; toeR = 0.0;
      caster = 4.0;
      note = "Minimal camber/toe to keep the tire flat and rolling resistance low for a straight-line launch.";
      break;
    case "drift":
      camberF = -3.5; camberR = -1.0;
      toeF = 0.0; toeR = -0.2;
      caster = 6.5;
      note = "Aggressive front camber + high caster adds steering angle and front grip on entry; rear stays near -1.0° so the contact patch is flat mid-slide.";
      break;
    case "rally":
      camberF = -1.0; camberR = -0.7;
      toeF = 0.1; toeR = 0.1;
      caster = 5.0;
      note = "Conservative camber keeps a fuller contact patch on loose terrain; slight toe-in adds stability over bumps.";
      break;
    case "crosscountry":
      camberF = -0.5; camberR = -0.5;
      toeF = 0.1; toeR = 0.1;
      caster = 5.0;
      note = "Near-flat camber for rough terrain — the suspension moves so much that static camber mostly costs contact patch out here.";
      break;
    case "street":
      camberF = -1.0; camberR = -0.7;
      toeF = 0.0; toeR = 0.0;
      caster = 5.5;
      note = "Mild negative camber for cornering grip without excessive inner-edge tire wear on the street.";
      break;
    case "touge":
      camberF = -1.8; camberR = -1.0;
      toeF = -0.1; toeR = 0.1;
      caster = 6.0;
      note = "Front camber and a touch of toe-out add turn-in bite through tight hairpins; slight rear toe-in keeps switchback transitions predictable.";
      break;
    case "circuit":
    default:
      camberF = -1.8; camberR = -1.0;
      toeF = -0.1; toeR = 0.1;
      caster = 6.0;
      note = "Front camber toward the aggressive end of the road window for turn-in bite; rear stays at -1.0° for traction. Slight front toe-out sharpens response, rear toe-in adds stability.";
  }
  // Heavier cars want more caster for high-speed stability; light agile cars less.
  if (usecase !== "drag") caster = clamp(round1(caster + wf * 0.75), 5, 7);
  // Input-device adjustments: a wheel's FFB and analog precision reward
  // sharper geometry; a pad's rate-limited stick wants progressive turn-in.
  if (usecase !== "drag") {
    if (device === "wheel") {
      caster = Math.min(7, caster + 0.5);
      if (usecase !== "drift") toeF = round1(toeF - 0.1);
      note += " Wheel: extra caster adds FFB weight and self-centering, and a touch more front toe-out sharpens the turn-in you can actually feel.";
    } else if (usecase !== "drift") {
      toeF = round1(Math.min(toeF + 0.1, 0.1));
      note += " Controller: tamer front toe keeps turn-in progressive with rate-limited stick steering.";
    }
  }
  return {
    title: "Alignment",
    rows: [
      { label: "Camber F / R", val: `${round1(camberF)}° / ${round1(camberR)}°` },
      { label: "Toe F / R", val: `${round1(toeF)}° / ${round1(toeR)}°` },
      { label: "Caster", val: `${round1(caster)}°` },
    ],
    note,
  };
}

function antiRollBars(usecase, wf, drivetrain, pif = 0.5, fp = 50, device = "pad") {
  // FH6 road baselines run the REAR bar stiffer than the front — it fights
  // the game's understeer bias. Starting windows (ForzaFire):
  // RWD F18-25/R25-35, AWD F22-30/R28-38, FWD F8-15/R25-40.
  let f, r, note;
  const roadBase = drivetrain === "AWD" ? [26, 33] : drivetrain === "FWD" ? [11, 32] : [21, 30];
  switch (usecase) {
    case "drag":
      f = 5; r = 5;
      note = "Soft ARBs aren't a priority in a straight line; kept loose to avoid upsetting launch weight transfer.";
      break;
    case "drift":
      f = 25; r = 18;
      note = "Stiffer front ARB promotes quicker weight transfer to initiate oversteer; softer rear keeps the back end more adjustable mid-slide.";
      break;
    case "rally":
    case "crosscountry":
      f = 12; r = 10;
      note = "Softer bars let each wheel move independently for traction and compliance over rough terrain.";
      break;
    case "touge":
      f = roadBase[0] * 0.85; r = roadBase[1] * 0.85;
      note = "Rear-stiffer road balance, softened overall to absorb mid-corner bumps on public roads.";
      break;
    case "circuit":
    default:
      f = roadBase[0]; r = roadBase[1];
      note = "Rear bar stiffer than front is the FH6 road baseline — it counters the game's understeer bias and helps rotation. Soften the front for more turn-in grip; soften the rear if the back steps out.";
  }
  const piAdj = (usecase === "circuit" || usecase === "touge") ? (pif - 0.5) * 0.15 : 0;
  // Pads want a slightly softer, more forgiving platform; wheels can run
  // stiffer since FFB telegraphs the grip limit.
  const deviceAdj = device === "wheel" ? 0.05 : -0.05;
  const scale = 1 + wf * 0.2 + piAdj + deviceAdj;
  // Mild weight-distribution bias: the heavier end rolls harder and wants a
  // proportionally stiffer bar.
  f = clamp(Math.round(f * scale * (1 + (fp - 50) * 0.01)), 1, 65);
  r = clamp(Math.round(r * scale * (1 - (fp - 50) * 0.01)), 1, 65);
  return {
    title: "Anti-Roll Bars",
    rows: [
      { label: "Front", val: f },
      { label: "Rear", val: r },
    ],
    note,
  };
}

function springsAndRideHeight(usecase, weight, wf, pif = 0.5, fp = 50, device = "pad") {
  // lb/in per 1000lbs of car weight (front, rear), and ride height range in inches (front, rear).
  let rateF, rateR, heightF, heightR, note;
  switch (usecase) {
    case "drag":
      rateF = 90; rateR = 145;
      heightF = 5.2; heightR = 5.5;
      note = "Softer front lets weight load the rear tires on launch; keep it planted, not bouncy. Rear ride height slightly higher than front helps weight transfer.";
      break;
    case "drift":
      rateF = 190; rateR = 150;
      heightF = 4.7; heightR = 5.0;
      note = "Firm, front-biased springs keep body roll predictable through transitions; rear-biased ride height helps rotation.";
      break;
    case "rally":
    case "crosscountry":
      rateF = 90; rateR = 85;
      heightF = 7.5; heightR = 7.8;
      note = "Soft, tall suspension absorbs bumps/jumps and keeps tires tracking the terrain.";
      break;
    case "touge":
      rateF = 175; rateR = 165;
      heightF = 5.0; heightR = 5.2;
      note = "Public mountain roads are rougher than a circuit surface, so keep a touch more compliance than a pure track setup.";
      break;
    case "circuit":
    default:
      rateF = 210; rateR = 195;
      heightF = 4.2; heightR = 4.4;
      note = "Lower center of gravity and firm springs reduce roll and improve response; scale stiffness up with car weight.";
  }
  let piNote = "";
  if (usecase === "circuit" || usecase === "touge") {
    if (pif >= 0.65) { rateF *= 1.1; rateR *= 1.1; piNote = " Higher PI class cars typically have real aero available — you can run firmer springs since downforce helps compensate for the reduced mechanical compliance."; }
    else if (pif <= 0.35) { rateF *= 0.9; rateR *= 0.9; piNote = " Lower PI class cars usually lack meaningful aero, so lean on mechanical grip — don't go stiffer than needed, or you'll lose contact patch in bumpy sections."; }
  }
  // Each axle's springs carry that axle's share of the weight: scale the
  // 50/50 baseline rates by the car's actual front/rear distribution.
  // Pad setups run ~5% softer for predictability without FFB grip cues.
  const wMult = (weight / 1000) * (device === "pad" ? 0.95 : 1);
  const springF = Math.round(rateF * wMult * (fp / 50));
  const springR = Math.round(rateR * wMult * ((100 - fp) / 50));
  heightF = round1(heightF + wf * 0.2);
  heightR = round1(heightR + wf * 0.2);
  return {
    title: "Springs & Ride Height",
    rows: [
      { label: "Front Spring Rate", num: springF, unit: "springrate" },
      { label: "Rear Spring Rate", num: springR, unit: "springrate" },
      { label: "Front Ride Height", num: heightF, unit: "length" },
      { label: "Rear Ride Height", num: heightR, unit: "length" },
    ],
    note: note + ` F/R split follows the car's ${fp}% front weight distribution.` + (wf > 0.3 ? " Heavier car — spring rate scaled up accordingly." : wf < -0.3 ? " Lighter car — spring rate scaled down accordingly." : "") + piNote,
    rates: { front: springF, rear: springR },
  };
}

function damping(usecase, springRates) {
  // Rebound scales with spring rate; bump follows the FH6 rule of thumb:
  // Bump = 40-70% of Rebound, ~60% as the baseline (ForzaFire).
  let reboundMult, bumpRatio, reboundBonus = 0, note;
  switch (usecase) {
    case "drag":
      reboundMult = 1 / 70; bumpRatio = 0.55;
      note = "Minimal damping to let the suspension settle quickly and load the rear for grip.";
      break;
    case "drift":
      reboundMult = 1 / 48; bumpRatio = 0.65;
      note = "Faster front rebound helps quick weight transfer for initiation; rear stays controllable mid-drift.";
      break;
    case "rally":
    case "crosscountry":
      reboundMult = 1 / 60; bumpRatio = 0.5; reboundBonus = 1.0;
      note = "Softer bump absorbs impacts on loose terrain; rebound runs ~1.0 higher than the tarmac formula so the suspension recovers before the next hit.";
      break;
    case "touge":
      reboundMult = 1 / 52; bumpRatio = 0.6;
      note = "Quicker front rebound helps the car settle fast between back-to-back direction changes; bump at ~60% of rebound keeps it compliant over bumps.";
      break;
    case "circuit":
    default:
      reboundMult = 1 / 50; bumpRatio = 0.6;
      note = "Bump at ~60% of rebound is the FH6 baseline — rebound controls the body, softer bump lets the tire take curbs without deflecting.";
  }
  const reboundF = clamp(round1(springRates.front * reboundMult + reboundBonus), 1, 20);
  const reboundR = clamp(round1(springRates.rear * reboundMult + reboundBonus), 1, 20);
  const bumpF = clamp(round1(reboundF * bumpRatio), 1, 20);
  const bumpR = clamp(round1(reboundR * bumpRatio), 1, 20);
  return {
    title: "Damping",
    rows: [
      { label: "Front Rebound", val: reboundF },
      { label: "Rear Rebound", val: reboundR },
      { label: "Front Bump", val: bumpF },
      { label: "Rear Bump", val: bumpR },
    ],
    note,
  };
}

function brakes(usecase, wf, fp = 50, device = "pad", drivetrain = "RWD") {
  // Balance: in-game slider from Rear (0%) to Front (100%), 50% = neutral.
  // FH6 windows (ForzaFire): RWD 50-55, AWD 52-56, FWD 55-62 front;
  // drift and dirt run 45-50 — slight REAR bias helps rotation there.
  let balance, pressure, note;
  const roadBalance = drivetrain === "FWD" ? 58 : drivetrain === "AWD" ? 54 : 52;
  switch (usecase) {
    case "drag":
      balance = 50; pressure = 60;
      note = "Brakes matter only for stopping post-run; keep balance neutral and pressure modest.";
      break;
    case "drift":
      balance = 47; pressure = 100;
      note = "Slightly rear-biased balance (45-50%) helps the brakes rotate the car into the slide; max pressure for repeatable initiation.";
      break;
    case "rally":
    case "crosscountry":
      balance = 48; pressure = 90;
      note = "Slightly rear-biased (45-50%) — on loose surfaces the rear brakes help point the car into corners, and softer pressure avoids lockup.";
      break;
    case "touge":
      balance = roadBalance + 1; pressure = 95;
      note = "Front-of-neutral balance supports late trail-braking into hairpins without kicking the rear loose unintentionally.";
      break;
    case "circuit":
    default:
      balance = roadBalance; pressure = 100;
      note = drivetrain === "FWD"
        ? "FWD runs the most front bias (55-62%) — the loaded front tires do nearly all the stopping."
        : "Balance in the FH6 window for this drivetrain; max pressure unless you're seeing early lockup, in which case back it off.";
  }
  // Front-heavy cars need more front bias (the front tires carry more of the
  // braking load); rear/mid-engine cars can run closer to neutral.
  balance = clamp(Math.round(balance + wf * 3 + (fp - 50) * 0.25), 0, 100);
  // Triggers are harder to modulate than pedals: trim pressure and add a
  // point of front bias on pad to resist lockup and keep braking forgiving.
  if (device === "pad" && usecase !== "drag") {
    pressure = Math.max(60, pressure - 10);
    balance = clamp(balance + 1, 0, 100);
    note += " Controller: pressure trimmed for trigger modulation — raise it back up if you never hit lockup.";
  } else if (device === "wheel" && usecase !== "drag") {
    note += " Wheel: full-pressure threshold braking works with analog pedal modulation.";
  }
  return {
    title: "Braking",
    rows: [
      { label: "Balance (% Front)", val: `${balance}%` },
      { label: "Pressure", val: `${pressure}%` },
    ],
    note: note + (wf > 0.3 ? " Heavier car — nudged balance further forward to manage weight transfer under braking." : ""),
  };
}

function differential(usecase, drivetrain, pf, tireCompound, device = "pad") {
  const rows = [];
  let note;

  if (drivetrain === "AWD") {
    // ForzaFire FH6 AWD tables: low front lock, near-locked rear accel,
    // strong rear torque bias. Below ~65% rear an AWD road build feels
    // sluggish and understeer-prone.
    let fa, fd, ra, rd, center;
    switch (usecase) {
      case "rally": fa = 35; fd = 8; ra = 62; rd = 22; center = 70; break;
      case "crosscountry": fa = 40; fd = 10; ra = 70; rd = 22; center = 60; break;
      case "drift": fa = 30; fd = 5; ra = 100; rd = 30; center = 80; break;
      case "drag": fa = 60; fd = 0; ra = tireCompound === "slick" ? 100 : 95; rd = 10; center = 60; break;
      default: fa = 28; fd = 0; ra = 100; rd = 45; center = 75; // road builds
    }
    // Lift-off rotation from rear decel lock is harder to catch on a stick.
    if (device === "pad" && usecase !== "drag" && usecase !== "drift") rd = Math.max(0, rd - 8);
    rows.push({ label: "Front Accel / Decel", val: `${fa}% / ${fd}%` });
    rows.push({ label: "Rear Accel / Decel", val: `${ra}% / ${rd}%` });
    rows.push({ label: "Center Balance (% Rear)", val: `${center}%` });
    note = usecase === "rally" || usecase === "crosscountry"
      ? "Moderate locking keeps all four wheels driving on loose ground without fighting the steering; mild rear bias for rotation."
      : "FH6 AWD wants low front lock and heavy rear bias — under ~65% rear the car goes sluggish and understeery. Long-wheelbase cars tolerate up to 85-90% rear.";
  } else {
    let accel, decel;
    switch (usecase) {
      case "drag":
        accel = tireCompound === "slick" ? 95 : 85; decel = 20;
        note = tireCompound === "slick"
          ? "Slicks hook up hard enough to run near-full accel locking without excessive wheel hop; push it close to 100%."
          : "High accel locking maximizes launch power transfer, but semi-slicks are more prone to wheel hop at full lock — back off a little if you see hop.";
        break;
      case "drift":
        accel = clamp(Math.round(85 + pf * 15), 1, 100); decel = 25;
        note = "80-100% accel — near-welded behavior keeps both rears spinning through the slide. Decel moderate to help lift-off rotation without snap.";
        break;
      case "rally":
      case "crosscountry":
        accel = 50; decel = 20;
        note = "Moderate locking finds traction on loose ground without dragging the car straight through corners.";
        break;
      default:
        // Road racing RWD/FWD: 40-65% accel, 15-30% decel is the FH6 window.
        accel = clamp(Math.round(45 + pf * 20), 40, 65);
        decel = 20 + (device === "pad" ? -5 : 3);
        note = "Accel locking in the 40-65% window puts power down without ploughing; decel locking around 15-30% stabilizes lift-off." +
          (usecase === "touge" ? " Kept mid-window so the diff doesn't fight rotation in tight hairpins." : "");
    }
    rows.push({ label: "Accel Locking", val: `${accel}%` });
    rows.push({ label: "Decel Locking", val: `${decel}%` });
  }

  return {
    title: "Differential",
    rows,
    note,
  };
}

function aeroSection(usecase, wf, pif = 0.5, drivetrain = "RWD") {
  if (usecase === "drag" || usecase === "street") return null;
  // Downforce slider min/max (and its units) vary per car and per wing
  // fitted, so we recommend a position along the Speed <-> Cornering slider
  // rather than an absolute force value.
  // FH6 aero is drivetrain-driven (ForzaFire): AWD wants max front / minimal
  // rear (the drivetrain already provides rear traction — a big wing is just
  // drag); RWD runs 60-80% front / 60-90% rear; FWD high front, low rear.
  let front, rear, note;
  switch (usecase) {
    case "drift":
      front = 35; rear = 20;
      note = "Slightly front-biased, low overall — front grip for steering authority while the rear stays light enough to break loose on demand.";
      break;
    case "rally":
    case "crosscountry":
      front = 15; rear = 20;
      note = "Minimal aero — off-road speeds rarely reach the range where downforce matters; mechanical grip does the work.";
      break;
    case "touge":
      front = drivetrain === "AWD" ? 50 : 35;
      rear = drivetrain === "AWD" ? 15 : 40;
      note = "Speeds on a mountain pass rarely get high enough for big aero; a modest, balanced setup adds confidence without drag.";
      break;
    case "circuit":
    default:
      if (drivetrain === "AWD") {
        front = 95; rear = 15;
        note = "Counterintuitive but correct for FH6 AWD: max front downforce fights the inherent understeer, while the drivetrain already gives rear traction — a big rear wing mostly adds drag.";
      } else if (drivetrain === "FWD") {
        front = 85; rear = 35;
        note = "FWD loads everything onto the front axle, so it gets the downforce; the rear plays a secondary role.";
      } else {
        front = 70; rear = 75;
        note = "Near-neutral balance for RWD, trimmed to taste — more rear for stability in fast corners, more front if it washes wide.";
      }
      note += " On high-speed tracks with long straights, wind both sliders down (or skip the wing) — drag costs more than the corners pay back.";
      if (pif <= 0.2) note = "D-class cars rarely have real aero upgrades available — treat any downforce as a bonus and focus on mechanical grip instead.";
  }
  return {
    title: "Aero",
    rows: [
      { label: "Front Downforce", val: front >= 95 ? "Maximum (Cornering end)" : `≈${front}% toward Cornering` },
      { label: "Rear Downforce", val: `≈${rear}% toward Cornering` },
      { label: "Aero Efficiency (in-game stat)", val: "Keep ≥0.70 — 0.85+ is excellent" },
    ],
    note: note + " Slider min/max depends on the wing fitted (stock aero usually isn't adjustable — see the build plan), so set the position, not a number. If the in-game Aero Efficiency stat reads below 0.70, you're buying more drag than grip — wind the sliders back or change the wing.",
  };
}

// Build plan: ordered steps to take a stock car to the target class for the
// chosen use case. Category names match the in-game Upgrade Shop tabs.
// We can't compute exact PI costs (they're simulated per car in-game), so the
// plan gives install order and priorities; the player watches the PI meter.
// Road-build tire compound per target class. Stock/Street stay competitive at
// low PI; Sport is the B-class sweet spot; Semi-Slick suits A/S1 where Race
// Slicks would over-PI the build; Slicks are standard at S2/R.
// capAtSemiSlick keeps touge builds road-realistic even at high classes.
function roadTireForClass(piClass, capAtSemiSlick) {
  switch (piClass) {
    case "D": return "Street tire compound (Stock is often competitive at D)";
    case "C": return "Street or Sport tire compound";
    case "B": return "Sport tire compound";
    case "A": return "Sport or Semi-Slick tire compound";
    case "S1": return capAtSemiSlick ? "Semi-Slick tire compound" : "Semi-Slick tire compound (Race Slicks if the PI fits)";
    default: return capAtSemiSlick ? "Semi-Slick tire compound" : "Race Slick tire compound"; // S2 / R
  }
}

// Tire width follows the class budget: stock width is optimal at low PI,
// one step up is the B/A sweet spot, max width is standard from S1 up.
function tireWidthForClass(pif, drivetrain) {
  const split = drivetrain === "RWD" ? " On RWD, bias the width to the rear."
    : drivetrain === "FWD" ? " On FWD, keep it equal or slightly wider up front."
    : " On AWD, keep front and rear equal.";
  if (pif < 0.3) return { item: "Stock Tire Width", why: "Cheapest, lightest, lowest drag — stock width is usually optimal at low classes." + split };
  if (pif < 0.65) return { item: "Tire Width one step up", why: "The B/A-class sweet spot — a real grip gain without the weight and PI of max width." + split };
  return { item: "Maximum Tire Width (Widebody kit if needed)", why: "Standard from S1 up — the grip is worth the PI at this level." + split };
}

function recommendedParts(usecase, drivetrain, piClass, tireCompound) {
  const pif = piClassFactor(piClass);
  const steps = [];

  // Step 1 — parts that unlock the tuning sliders this tune sheet uses.
  // Springs/dampers and differentials come in discipline variants
  // (Sport / Race / Rally / Drift) — fit the one that matches the build.
  const variant = usecase === "drift" ? "Drift"
    : (usecase === "rally" || usecase === "crosscountry") ? "Rally"
    : "Race";
  const unlocks = [
    { category: "Platform & Handling", item: `${variant} Springs & Dampers`, why: "Unlocks the spring rate, ride height and damping settings in this sheet" + (variant !== "Race" ? ` — the ${variant} variant is built for exactly this discipline.` : ".") },
    { category: "Platform & Handling", item: "Race Anti-Roll Bars", why: "Unlocks front/rear ARB tuning." },
    { category: "Drivetrain", item: `${variant} Differential`, why: "Unlocks accel/decel lock tuning" + (drivetrain === "AWD" ? " and AWD center balance" : "") + (variant !== "Race" ? ` — the ${variant} diff's lock behavior suits this build.` : ".") },
    { category: "Drivetrain", item: "Race Transmission", why: "Unlocks final drive and the individual gear ratios in this sheet." },
    { category: "Platform & Handling", item: "Race Brakes", why: "Unlocks brake balance and pressure tuning." },
  ];
  if (usecase === "circuit" || usecase === "touge" || usecase === "rally" || usecase === "crosscountry") {
    unlocks.push({ category: "Aero & Appearance", item: "Adjustable Front Bumper (splitter) + Rear Wing", why: "Unlocks the front/rear downforce values in this sheet." });
  }
  if (pif < 0.3) {
    unlocks.push({ category: "Platform & Handling", item: "Budget alternative: Sport-tier suspension and differential", why: "In D/C class every PI point counts — Sport parts unlock most of the same tuning for noticeably less PI." });
  }
  steps.push({ step: "Step 1 — Unlock the tune (install these first)", items: unlocks });

  // Step 2 — grip and control parts for the use case.
  // Road-build tire compound follows the class ladder: cheap compounds stay
  // competitive at low PI, Race Slicks only earn their PI cost at S2/R.
  const grip = [];
  switch (usecase) {
    case "drag":
      grip.push({ category: "Tires & Rims", item: tireCompound === "slick" ? "Race Slick tire compound" : "Semi-Slick tire compound", why: "The single biggest launch-grip upgrade for a straight-line build." });
      grip.push({ category: "Tires & Rims", item: "Max rear Tire Width", why: "A wider rear contact patch directly improves hook-up off the line." });
      grip.push({ category: "Platform & Handling", item: "Weight Reduction (max)", why: "Every pound removed directly improves 60ft and quarter-mile time." });
      break;
    case "drift":
      grip.push({ category: "Tires & Rims", item: "Drift Tires if this chassis offers them, otherwise Street or Sport", why: "Drift compound breaks loose predictably and holds long slides; failing that, low-grip road compounds — Semi-Slick/Slick grip fights the slide." });
      grip.push({ category: "Tires & Rims", item: "Wider front Tire Width + front Track Width", why: "More front grip and steering authority on entry while the rear stays loose." });
      if (drivetrain !== "RWD") grip.push({ category: "Conversions & Body Kits", item: "Drivetrain Swap to RWD, if available", why: "RWD is far easier to control and initiate slides with than FWD/AWD." });
      break;
    case "rally":
    case "crosscountry":
      grip.push({ category: "Tires & Rims", item: usecase === "rally" ? "Rally tire compound" : "Off-Road tire compound", why: usecase === "rally" ? "Strong on dirt and acceptable on tarmac — the right pick for mixed rally stages. FH6 penalizes Race Slicks harder on dirt than FH5 did." : "Maximum loose-surface grip for mud, sand and rough terrain — the cross-country pick over Rally tires." });
      grip.push({ category: "Tires & Rims", item: "15-16\" Rim Size", why: "Smaller rims keep sidewall flex to absorb terrain and survive jump landings — big rims risk cracking off-road." });
      grip.push({ category: "Platform & Handling", item: "Chassis Reinforcement / Roll Cage", why: "Handling stiffness and durability for jumps and rough terrain." });
      if (drivetrain !== "AWD") grip.push({ category: "Conversions & Body Kits", item: "Drivetrain Swap to AWD, if available", why: "AWD puts power down far more consistently on loose surfaces — but skip it on light low-class cars, where the swap's PI cost eats the whole upgrade budget." });
      break;
    case "touge":
      grip.push({ category: "Tires & Rims", item: roadTireForClass(piClass, true), why: "Grip matched to the class budget — and full Race Slicks are overkill for a public-road feel anyway." });
      grip.push(Object.assign({ category: "Tires & Rims" }, tireWidthForClass(pif, drivetrain)));
      grip.push({ category: "Platform & Handling", item: "Weight Reduction (moderate)", why: "Improves agility for quick direction changes." });
      break;
    case "street":
      grip.push({ category: "Tires & Rims", item: pif < 0.3 ? "Street tire compound" : "Sport tire compound", why: "Good grip/tread-life balance for mixed street driving without over-spending PI." });
      break;
    case "circuit":
    default:
      grip.push({ category: "Tires & Rims", item: roadTireForClass(piClass, false), why: "The compound sweet spot for this class — grip is king on a circuit, but over-tiring eats PI that handling parts use better." });
      grip.push(Object.assign({ category: "Tires & Rims" }, tireWidthForClass(pif, drivetrain)));
      grip.push({ category: "Tires & Rims", item: "17-18\" Rim Size", why: "The road-racing sweet spot for grip, weight and sidewall stiffness — 19\"+ is heavier and mostly visual." });
      grip.push({ category: "Platform & Handling", item: "Weight Reduction", why: "Improves every metric — acceleration, braking, and cornering." });
      if (pif >= 0.65) grip.push({ category: "Platform & Handling", item: "Chassis Reinforcement", why: "At high target classes the stiffness is worth the small weight penalty for sharper turn-in." });
  }
  steps.push({ step: "Step 2 — Grip & control", items: grip });

  // Step 3 — power, in FH6 PI-efficiency order (ForzaFire), to fill remaining
  // headroom. Universal priority: Exhaust → Intake (+Manifold) → Ignition →
  // Fuel System → Flywheel → Cam/Pistons/Valves trio → Displacement last.
  const power = [];
  switch (usecase) {
    case "drag":
      power.push({ category: "Conversions & Body Kits", item: "Aspiration: Positive-Displacement Supercharger for launches, Twin Turbo for top-end pulls", why: "PD supercharger hits instantly off the line; twin turbo makes the biggest number up top — pick for how your strip runs are won." });
      power.push({ category: "Engine", item: "Race everything: Exhaust, Intake, Fuel System, Camshaft, Pistons, Valves, Displacement, Intercooler", why: "Drag races are won in the top half of the rev range — install Race Fuel System before Pistons or the power band goes flat." });
      break;
    case "drift":
      power.push({ category: "Conversions & Body Kits", item: "Aspiration: Positive-Displacement Supercharger if converting", why: "Instant, lag-free torque is much easier to modulate mid-slide than a turbo." });
      power.push({ category: "Engine", item: "Race Exhaust → Intake → Displacement, with SPORT Camshaft/Pistons (not Race)", why: "Mid-range response and predictable throttle behavior matter more than peak power — you steer a drift car with the throttle." });
      break;
    case "rally":
      power.push({ category: "Engine", item: "Race Exhaust → Intake → Fuel System → Ignition, with SPORT Camshaft/Pistons (not Race)", why: "Loose surfaces don't reward peak HP — the Race cam trades away the mid-range you actually use on dirt." });
      power.push({ category: "Conversions & Body Kits", item: "Aspiration: Single Turbo on small rally engines; PD Supercharger on bigger ones", why: "Predictable delivery beats peak power when traction is scarce." });
      break;
    case "crosscountry":
      power.push({ category: "Engine", item: "Race Displacement first, then Exhaust → Intake, with Stock or Sport Camshaft", why: "Torque climbs out of corners and over jumps — displacement is the priority here, unlike tarmac builds." });
      power.push({ category: "Conversions & Body Kits", item: "Aspiration: Positive-Displacement Supercharger (near-universal on V8 swaps)", why: "Instant torque everywhere, no lag on loose ground." });
      break;
    case "street":
      power.push({ category: "Engine", item: "Race Exhaust → Intake → Ignition → Flywheel", why: "The most PI-efficient bolt-ons — and on many cars the Flywheel actually LOWERS PI because the weight saving outweighs its cost." });
      break;
    case "touge":
    case "circuit":
    default:
      power.push({ category: "Engine", item: "Race Exhaust → Intake (+ Intake Manifold) → Ignition → Fuel System → Flywheel", why: "Exhaust is the single most PI-efficient engine part in FH6; pair Intake with the Manifold or it can't flow; Flywheel often reduces PI outright via weight savings." });
      if (pif < 0.4) {
        power.push({ category: "Engine", item: "Stop after Exhaust / Intake / Ignition at this class", why: "B-class and below hit the PI ceiling fast — the remaining budget does more in tires and weight reduction." });
      } else if (pif < 0.65) {
        power.push({ category: "Engine", item: "Continue through Flywheel and Camshaft as PI allows", why: "A-class builds typically fit the efficient list plus a cam; skip the high-RPM trio if the PI is tight." });
      } else {
        power.push({ category: "Engine", item: "High-RPM trio (Camshaft + Pistons + Valves), then Displacement last", why: "At S1+ install what fits: the cam/pistons/valves work as a set (fit Fuel System before Pistons), and Displacement is the biggest gain for the biggest cost — install it last, or skip it if you hit your power-to-weight target without it." });
      }
      power.push({ category: "Engine", item: "1-3 PI short of the class cap? Race Ignition", why: "The classic gap-filler — cheap PI, modest power across the whole rev range." });
  }
  steps.push({ step: "Step 3 — Fill remaining PI with power (stop at your target class)", items: power });

  return steps;
}
