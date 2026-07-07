const form = document.getElementById("tune-form");
const results = document.getElementById("results");
const resultsTitle = document.getElementById("results-title");
const resultsGrid = document.getElementById("results-grid");
const partsList = document.getElementById("parts-list");
const weightInput = document.getElementById("weight");
const weightUnitToggle = document.getElementById("weight-unit-toggle");
const usecaseSelect = document.getElementById("usecase");
const tireCompoundField = document.getElementById("tirecompound-field");
const unitSystemToggle = document.getElementById("unit-system-toggle");

// --- Theme toggle (Night = FH6 HUD default, Daylight = light variant) ---

const themeToggle = document.getElementById("theme-toggle");

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("fh6-theme", theme); } catch {}
  for (const b of themeToggle.querySelectorAll(".unit-btn")) {
    b.classList.toggle("active", b.dataset.themeOpt === theme);
  }
}

themeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (btn) setTheme(btn.dataset.themeOpt);
});

// Sync the toggle buttons with the theme applied by the pre-paint script.
setTheme(document.documentElement.dataset.theme || "night");

const LBS_PER_KG = 2.20462;
const BAR_PER_PSI = 0.0689476;
// Forza's metric spring display is NOT the physical kgf/mm conversion
// (0.0179): the game shows lb/in ÷ 5.6, i.e. 10x the physical value.
// Verified against in-game slider ranges (e.g. RX-7 slider floor 48.2).
const KGFMM_PER_LBIN = 0.17858;
const CM_PER_IN = 2.54;
const KGF_PER_LB = 0.453592;
let weightUnit = "lbs";
let unitSystem = "imperial";
let inputDevice = "pad";
let lastTune = null;

// --- Input device toggle (Controller vs Wheel — changes the tune itself) ---

const inputDeviceToggle = document.getElementById("input-device-toggle");

function setInputDevice(device) {
  inputDevice = device === "wheel" ? "wheel" : "pad";
  for (const b of inputDeviceToggle.querySelectorAll(".unit-btn")) {
    b.classList.toggle("active", b.dataset.device === inputDevice);
  }
  renderGear();
}

// --- Recommended gear (affiliate links go live once a program is approved) ---

const gearTitle = document.getElementById("gear-title");
const gearList = document.getElementById("gear-list");

function renderGear() {
  const deviceLabel = inputDevice === "wheel" ? "Wheel" : "Controller";
  gearTitle.textContent = `Recommended Gear (${deviceLabel})`;
  gearList.innerHTML = "";
  for (const item of GEAR_RECOMMENDATIONS[inputDevice]) {
    const el = document.createElement("a");
    el.className = "part-item gear-item";
    el.href = affiliateUrl(item.query);
    el.target = "_blank";
    el.rel = "noopener sponsored";
    el.innerHTML = `
      <span class="part-category">Gear</span>
      <span class="part-name">${item.name}</span>
      <span class="part-why">${item.blurb}</span>
    `;
    gearList.appendChild(el);
  }
}

inputDeviceToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (!btn || btn.dataset.device === inputDevice) return;
  setInputDevice(btn.dataset.device);
  // Unlike display units, the device changes the computed tune — regenerate.
  if (lastTune && form.checkValidity()) generateAndRender();
});

usecaseSelect.addEventListener("change", () => {
  tireCompoundField.classList.toggle("hidden", usecaseSelect.value !== "drag");
});

unitSystemToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (!btn || btn.dataset.unit === unitSystem) return;

  unitSystem = btn.dataset.unit;
  for (const b of unitSystemToggle.querySelectorAll(".unit-btn")) {
    b.classList.toggle("active", b.dataset.unit === unitSystem);
  }
  if (lastTune) renderResults(lastTune);
  saveState();
});

// Formats a raw imperial value (how tuning.js computes internally) in the
// selected in-game unit system, matching the units FH6 shows per region.
function formatUnitValue(num, unit) {
  if (unitSystem === "metric") {
    switch (unit) {
      case "pressure": return `${Math.round(num * BAR_PER_PSI * 100) / 100} BAR`;
      case "springrate": return `${Math.round(num * KGFMM_PER_LBIN * 10) / 10} KGF/MM`;
      case "length": return `${Math.round(num * CM_PER_IN * 10) / 10} CM`;
      case "force": return `${Math.round(num * KGF_PER_LB)} KGF`;
    }
  }
  switch (unit) {
    case "pressure": return `${num} PSI`;
    case "springrate": return `${num} LB/IN`;
    case "length": return `${num} IN`;
    case "force": return `${num} LB`;
  }
}

// --- Handling troubleshooter ---

const symptomSelect = document.getElementById("symptom");
const symptomFixes = document.getElementById("symptom-fixes");
let troubleshooterUsecase = null;

// Fill the symptom list with only the entries relevant to this build's use
// case (a drift build gets drift symptoms, a drag build gets launch/gearing
// symptoms, and so on).
function renderTroubleshooter(usecase) {
  if (usecase === troubleshooterUsecase) return; // keep current selection
  troubleshooterUsecase = usecase;
  symptomSelect.innerHTML = '<option value="">— What is the car doing? —</option>';
  symptomFixes.innerHTML = "";
  for (const symptom of TROUBLESHOOTER) {
    if (!symptom.uses.includes(usecase)) continue;
    const option = document.createElement("option");
    option.value = symptom.id;
    option.textContent = symptom.label;
    symptomSelect.appendChild(option);
  }
}

symptomSelect.addEventListener("change", () => {
  symptomFixes.innerHTML = "";
  const symptom = TROUBLESHOOTER.find(s => s.id === symptomSelect.value);
  if (!symptom) return;
  symptom.fixes.forEach((fix, i) => {
    const item = document.createElement("div");
    item.className = "part-item";
    item.innerHTML = `
      <span class="part-category">${i + 1}. ${fix.setting}</span>
      <span class="part-why">${fix.change}</span>
    `;
    symptomFixes.appendChild(item);
  });
});

// --- Car combobox: one input that both filters (type) and browses (click) ---

// Community nicknames made searchable — keys are matched as label substrings.
const NICKNAMES = [
  ["Sprinter Trueno", "ae86 hachiroku hachi-roku corolla"],
  ["GR Supra", "a90 mk5 mkv"],
  ["Supra RZ", "a80 mk4 mkiv 2jz"],
  ["Supra MkIV", "a80 mk4 mkiv 2jz"],
  ["Skyline GT-R", "godzilla gtr r32 r33 r34"],
  ["GT-R", "gtr r35 godzilla"],
  ["Silvia", "s13 s14 s15 sil80"],
  ["240SX", "s13 s14"],
  ["RX-7", "fd fc rotary 13b rex"],
  ["RX-8", "rotary renesis"],
  ["MX-5", "miata na nb nc nd eunos roadster"],
  ["Fairlady Z", "240z 260z 280z s30 zed"],
  ["350Z", "z33 zed"],
  ["370Z", "z34 zed"],
  ["Impreza", "wrx sti scooby subie"],
  ["Lancer Evolution", "evo"],
  ["Civic Type R", "ctr ek9 fk2 fk8 fl5"],
  ["Corvette", "vette c1 c2 c3 c5 c6 c7 c8"],
  ["Mustang", "stang pony foxbody"],
  ["Countach", "lambo"],
  ["Aventador", "lambo"],
  ["Huracán", "lambo huracan"],
  ["911", "porker nine eleven"],
  ["M3", "bimmer beemer"],
  ["M5", "bimmer beemer"],
];

const carSearchInput = document.getElementById("carsearch");
const carCombobox = document.getElementById("car-combobox");
const carDropdown = document.getElementById("car-dropdown");
const carLookup = new Map();

// Build the grouped option list once.
{
  const byMake = new Map();
  for (const car of CARS) {
    if (!byMake.has(car.make)) byMake.set(car.make, []);
    byMake.get(car.make).push(car);
  }
  for (const make of [...byMake.keys()].sort()) {
    const header = document.createElement("div");
    header.className = "dropdown-group";
    header.textContent = make;
    carDropdown.appendChild(header);

    const cars = byMake.get(make).sort((a, b) => a.model.localeCompare(b.model) || a.year - b.year);
    for (const car of cars) {
      const label = `${car.year} ${car.make} ${car.model}`;
      carLookup.set(label, car);
      const opt = document.createElement("div");
      opt.className = "dropdown-option";
      opt.textContent = `${car.year} ${car.model}`;
      opt.dataset.label = label;
      const aliases = NICKNAMES.filter(([key]) => label.includes(key)).map(([, a]) => a);
      opt.dataset.search = (label + " " + aliases.join(" ")).toLowerCase();
      opt.setAttribute("role", "option");
      carDropdown.appendChild(opt);
    }
  }
  const empty = document.createElement("div");
  empty.className = "dropdown-empty hidden";
  empty.textContent = "No matching cars — fill in the stats below manually.";
  carDropdown.appendChild(empty);
}

const dropdownEmpty = carDropdown.querySelector(".dropdown-empty");
let activeOption = null;

// FH6 class boundaries, derived from the full car list's (class, PI) pairs.
const CLASS_RANGES = { D: [100, 400], C: [401, 500], B: [501, 600], A: [601, 700], S1: [701, 800], S2: [801, 900], R: [901, 998] };

const stockPiLine = document.getElementById("stock-pi");
let selectedStock = null; // { pi, cls } of the picked car, null if unknown/manual

// Forza's class badge colors.
const CLASS_COLORS = { D: "#22a8e0", C: "#ffd23f", B: "#ff8b26", A: "#e6342e", S1: "#a854f0", S2: "#2f7df6", R: "#16c264" };

function setSelectedStock(car) {
  selectedStock = car && car.pi ? { pi: car.pi, cls: car.cls } : null;
  if (selectedStock) {
    const color = CLASS_COLORS[selectedStock.cls] || "#9aa3b0";
    stockPiLine.innerHTML = `<span class="class-chip" style="background:${color}">${selectedStock.cls}</span>Stock: ${selectedStock.pi} PI`;
    stockPiLine.classList.remove("hidden");
  } else {
    stockPiLine.classList.add("hidden");
  }
}

function applyCar(car) {
  document.getElementById("make").value = car.make;
  document.getElementById("model").value = car.model;
  document.getElementById("hp").value = car.hp;
  document.getElementById("drivetrain").value = car.drivetrain;
  document.getElementById("frontpct").value = car.frontPct || "";
  weightInput.value = weightUnit === "kg" ? Math.round((car.weight / LBS_PER_KG) * 10) / 10 : car.weight;
  setSelectedStock(car);
}

// Manually editing make/model means it's no longer the picked car.
for (const id of ["make", "model"]) {
  document.getElementById(id).addEventListener("input", () => setSelectedStock(null));
}

// --- Live regenerate: once a tune exists, input edits refresh it automatically ---

let regenTimer = null;

function scheduleRegenerate() {
  if (!lastTune) return; // don't generate before the user's first explicit Generate
  clearTimeout(regenTimer);
  regenTimer = setTimeout(() => {
    if (form.checkValidity()) generateAndRender();
  }, 400);
}

for (const id of ["make", "model", "weight", "hp", "frontpct"]) {
  document.getElementById(id).addEventListener("input", scheduleRegenerate);
}
for (const id of ["drivetrain", "usecase", "piclass", "tirecompound"]) {
  document.getElementById(id).addEventListener("change", scheduleRegenerate);
}

function setActiveOption(opt) {
  if (activeOption) activeOption.classList.remove("active");
  activeOption = opt;
  if (activeOption) {
    activeOption.classList.add("active");
    activeOption.scrollIntoView({ block: "nearest" });
  }
}

function openDropdown() {
  carDropdown.classList.remove("hidden");
  carSearchInput.setAttribute("aria-expanded", "true");
}

function closeDropdown() {
  carDropdown.classList.add("hidden");
  carSearchInput.setAttribute("aria-expanded", "false");
  setActiveOption(null);
}

function filterDropdown() {
  const q = carSearchInput.value.trim().toLowerCase();
  let anyVisible = false;
  let currentHeader = null;
  let headerHasVisible = false;

  for (const el of carDropdown.children) {
    if (el.classList.contains("dropdown-group")) {
      if (currentHeader) currentHeader.classList.toggle("hidden", !headerHasVisible);
      currentHeader = el;
      headerHasVisible = false;
    } else if (el.classList.contains("dropdown-option")) {
      const match = !q || el.dataset.search.includes(q);
      el.classList.toggle("hidden", !match);
      if (match) { anyVisible = true; headerHasVisible = true; }
    }
  }
  if (currentHeader) currentHeader.classList.toggle("hidden", !headerHasVisible);
  dropdownEmpty.classList.toggle("hidden", anyVisible);
  setActiveOption(null);
}

function visibleOptions() {
  return [...carDropdown.querySelectorAll(".dropdown-option:not(.hidden)")];
}

function selectOption(opt) {
  const car = carLookup.get(opt.dataset.label);
  if (!car) return;
  carSearchInput.value = opt.dataset.label;
  applyCar(car);
  closeDropdown();
  scheduleRegenerate();
}

carSearchInput.addEventListener("focus", () => { filterDropdown(); openDropdown(); });
carSearchInput.addEventListener("input", () => { filterDropdown(); openDropdown(); });

carSearchInput.addEventListener("keydown", (e) => {
  const isOpen = !carDropdown.classList.contains("hidden");
  if (e.key === "Escape") { closeDropdown(); return; }
  if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) { filterDropdown(); openDropdown(); }

  const options = visibleOptions();
  if (!options.length) return;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const idx = activeOption ? options.indexOf(activeOption) : -1;
    const next = e.key === "ArrowDown"
      ? options[Math.min(idx + 1, options.length - 1)]
      : options[Math.max(idx - 1, 0)];
    setActiveOption(next);
  } else if (e.key === "Enter" && isOpen) {
    e.preventDefault(); // don't submit the form while picking a car
    selectOption(activeOption || options[0]);
  }
});

carDropdown.addEventListener("mousedown", (e) => {
  const opt = e.target.closest(".dropdown-option");
  if (opt) { e.preventDefault(); selectOption(opt); }
});

document.addEventListener("click", (e) => {
  if (!carCombobox.contains(e.target)) closeDropdown();
});

weightUnitToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (!btn || btn.dataset.unit === weightUnit) return;

  const newUnit = btn.dataset.unit;
  const current = parseFloat(weightInput.value);
  if (!Number.isNaN(current)) {
    const converted = newUnit === "kg" ? current / LBS_PER_KG : current * LBS_PER_KG;
    weightInput.value = Math.round(converted * 10) / 10;
  }
  setWeightUnit(newUnit);
});

function setWeightUnit(unit) {
  weightUnit = unit;
  weightInput.placeholder = unit === "kg" ? "e.g. 1540" : "e.g. 3400";
  weightInput.min = unit === "kg" ? 250 : 500;
  weightInput.max = unit === "kg" ? 3650 : 8000;
  for (const b of weightUnitToggle.querySelectorAll(".unit-btn")) {
    b.classList.toggle("active", b.dataset.unit === unit);
  }
}

function renderResults({ make, model, usecase, sections, parts }) {
  const deviceLabel = lastTune.inputDevice === "wheel" ? "Wheel" : "Controller";
  resultsTitle.textContent = `${make} ${model} — ${USE_CASE_LABELS[usecase]} Tune (${deviceLabel})`;
  resultsGrid.innerHTML = "";

  for (const section of sections) {
    const card = document.createElement("div");
    card.className = "card";

    const h3 = document.createElement("h3");
    h3.textContent = section.title;
    card.appendChild(h3);

    for (const row of section.rows) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      const displayVal = row.unit ? formatUnitValue(row.num, row.unit) : row.val;
      rowEl.innerHTML = `<span>${row.label}</span><span class="val">${displayVal}</span>`;
      card.appendChild(rowEl);
    }

    if (section.note) {
      const noteEl = document.createElement("p");
      noteEl.className = "note";
      noteEl.textContent = section.note;
      card.appendChild(noteEl);
    }

    resultsGrid.appendChild(card);
  }

  document.getElementById("parts-title").textContent = `Build Plan — Target ${lastTune.piClass} Class`;
  document.getElementById("parts-subtitle").textContent = buildPlanSummary();
  renderTroubleshooter(lastTune.usecase);
  partsList.innerHTML = "";
  for (const step of parts) {
    const header = document.createElement("h3");
    header.className = "parts-step";
    header.textContent = step.step;
    partsList.appendChild(header);
    for (const part of step.items) {
      const item = document.createElement("div");
      item.className = "part-item";
      item.innerHTML = `
        <span class="part-category">${part.category}</span>
        <span class="part-name">${part.item}</span>
        <span class="part-why">${part.why}</span>
      `;
      partsList.appendChild(item);
    }
  }

  results.classList.remove("hidden");
}

function buildPlanSummary() {
  const base = "Install in this order, watching the PI meter — stop adding power when you reach your target class. Exact PI costs vary per car.";
  if (!lastTune || !lastTune.stock) return base;
  const { pi, cls } = lastTune.stock;
  const range = CLASS_RANGES[lastTune.piClass];
  if (!range) return base;
  const [min, max] = range;
  if (pi > max) {
    return `⚠ This car is ${pi} PI (${cls}) stock — already above ${lastTune.piClass} class (${min}–${max}), so it can't be built down to this target. Pick a higher class or a different car. ` + base;
  }
  if (pi >= min) {
    return `This car is ${pi} PI (${cls}) stock — already in ${lastTune.piClass} class with only ~${max - pi} PI of headroom to the cap. Prioritize Step 1 and grip; skip most of the power step. ` + base;
  }
  return `This car is ${pi} PI (${cls}) stock — roughly ${max - pi} PI of headroom to the top of ${lastTune.piClass} class (${min}–${max}). ` + base;
}

function generateAndRender() {
  const make = document.getElementById("make").value.trim();
  const model = document.getElementById("model").value.trim();
  const weightRaw = parseFloat(weightInput.value);
  const weight = weightUnit === "kg" ? weightRaw * LBS_PER_KG : weightRaw;
  const hp = parseFloat(document.getElementById("hp").value);
  const drivetrain = document.getElementById("drivetrain").value;
  const usecase = usecaseSelect.value;
  const piClass = document.getElementById("piclass").value;
  const tireCompound = document.getElementById("tirecompound").value;
  const frontPct = parseFloat(document.getElementById("frontpct").value);

  const { sections, parts } = generateTune({ make, model, weight, hp, drivetrain, usecase, piClass, tireCompound, frontPct, inputDevice });

  lastTune = { make, model, usecase, piClass, inputDevice, stock: selectedStock, sections, parts };
  renderResults(lastTune);
  saveState();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  generateAndRender();
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});

// --- Copy tune as text ---

const copyBtn = document.getElementById("copy-tune");

function buildTuneText() {
  if (!lastTune) return "";
  const lines = [];
  lines.push(`${lastTune.make} ${lastTune.model} — ${USE_CASE_LABELS[lastTune.usecase]} Tune (${lastTune.inputDevice === "wheel" ? "Wheel" : "Controller"})`);
  if (lastTune.stock) lines.push(`Stock ${lastTune.stock.pi} PI (${lastTune.stock.cls}) → Target ${lastTune.piClass} class`);
  lines.push("");
  for (const section of lastTune.sections) {
    lines.push(section.title.toUpperCase());
    for (const row of section.rows) {
      const val = row.unit ? formatUnitValue(row.num, row.unit) : row.val;
      lines.push(`  ${row.label}: ${val}`);
    }
    lines.push("");
  }
  lines.push(`BUILD PLAN — TARGET ${lastTune.piClass} CLASS`);
  for (const step of lastTune.parts) {
    lines.push(step.step.toUpperCase());
    for (const part of step.items) {
      lines.push(`  [${part.category}] ${part.item}`);
    }
  }
  return lines.join("\n");
}

copyBtn.addEventListener("click", async () => {
  const text = buildTuneText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts (e.g. file://)
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  copyBtn.textContent = "Copied!";
  copyBtn.classList.add("copied");
  setTimeout(() => {
    copyBtn.textContent = "Copy Tune";
    copyBtn.classList.remove("copied");
  }, 1500);
});

// --- Input state (shared by persistence, garage and share links) ---

const STORAGE_KEY = "fh6-tuning-assistant-v1";
const GARAGE_KEY = "fh6-garage-v1";

function collectInputState() {
  return {
    carsearch: carSearchInput.value,
    make: document.getElementById("make").value,
    model: document.getElementById("model").value,
    weight: weightInput.value,
    weightUnit,
    unitSystem,
    inputDevice,
    hp: document.getElementById("hp").value,
    frontPct: document.getElementById("frontpct").value,
    drivetrain: document.getElementById("drivetrain").value,
    usecase: usecaseSelect.value,
    piClass: document.getElementById("piclass").value,
    tireCompound: document.getElementById("tirecompound").value,
  };
}

function applyInputState(state) {
  carSearchInput.value = state.carsearch || "";
  if (carLookup.has(carSearchInput.value)) setSelectedStock(carLookup.get(carSearchInput.value));
  else setSelectedStock(null);
  document.getElementById("make").value = state.make || "";
  document.getElementById("model").value = state.model || "";
  document.getElementById("hp").value = state.hp || "";
  document.getElementById("frontpct").value = state.frontPct || "";
  document.getElementById("drivetrain").value = state.drivetrain || "RWD";
  usecaseSelect.value = state.usecase || "circuit";
  // "X" is the legacy top-class name from before we derived FH6's real classes.
  document.getElementById("piclass").value = state.piClass === "X" ? "R" : (state.piClass || "A");
  document.getElementById("tirecompound").value = state.tireCompound || "semislick";
  tireCompoundField.classList.toggle("hidden", usecaseSelect.value !== "drag");

  setWeightUnit(state.weightUnit === "kg" ? "kg" : "lbs");
  weightInput.value = state.weight || "";

  // "pressureUnit" is the legacy key from before the full unit-system toggle.
  unitSystem = (state.unitSystem === "metric" || state.pressureUnit === "bar") ? "metric" : "imperial";
  for (const b of unitSystemToggle.querySelectorAll(".unit-btn")) {
    b.classList.toggle("active", b.dataset.unit === unitSystem);
  }

  setInputDevice(state.inputDevice || "pad");
}

function saveState() {
  const state = collectInputState();
  state.hasTune = !!lastTune;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// --- Saved tunes garage ---

const garageSection = document.getElementById("garage");
const garageList = document.getElementById("garage-list");
const saveTuneBtn = document.getElementById("save-tune");

function readGarage() {
  try { return JSON.parse(localStorage.getItem(GARAGE_KEY)) || []; } catch { return []; }
}

function writeGarage(entries) {
  try { localStorage.setItem(GARAGE_KEY, JSON.stringify(entries)); } catch {}
}

function renderGarage() {
  const entries = readGarage();
  garageSection.classList.toggle("hidden", entries.length === 0);
  garageList.innerHTML = "";
  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "garage-item";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "garage-load";
    loadBtn.textContent = entry.name;
    loadBtn.title = new Date(entry.savedAt).toLocaleString();
    loadBtn.addEventListener("click", () => {
      applyInputState(entry.state);
      if (form.checkValidity()) {
        generateAndRender();
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "garage-delete";
    delBtn.textContent = "×";
    delBtn.setAttribute("aria-label", `Delete ${entry.name}`);
    delBtn.addEventListener("click", () => {
      writeGarage(readGarage().filter(e => e.id !== entry.id));
      renderGarage();
    });

    item.appendChild(loadBtn);
    item.appendChild(delBtn);
    garageList.appendChild(item);
  }
}

saveTuneBtn.addEventListener("click", () => {
  if (!lastTune) return;
  const entries = readGarage();
  const name = `${lastTune.make} ${lastTune.model} — ${USE_CASE_LABELS[lastTune.usecase]} (${lastTune.piClass})`;
  entries.unshift({ id: Date.now(), name, savedAt: Date.now(), state: collectInputState() });
  writeGarage(entries.slice(0, 50));
  renderGarage();
  saveTuneBtn.textContent = "Saved!";
  setTimeout(() => { saveTuneBtn.textContent = "Save Tune"; }, 1500);
});

// --- Shareable links ---

const shareBtn = document.getElementById("share-tune");
const URL_PARAM_MAP = [
  ["cs", "carsearch"], ["mk", "make"], ["md", "model"], ["w", "weight"],
  ["wu", "weightUnit"], ["us", "unitSystem"], ["dev", "inputDevice"], ["hp", "hp"], ["fp", "frontPct"],
  ["dt", "drivetrain"], ["uc", "usecase"], ["tc", "piClass"], ["comp", "tireCompound"],
];

function stateToUrl() {
  const state = collectInputState();
  const params = new URLSearchParams();
  for (const [short, key] of URL_PARAM_MAP) {
    if (state[key]) params.set(short, state[key]);
  }
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function stateFromUrl() {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return null;
  const state = {};
  for (const [short, key] of URL_PARAM_MAP) {
    if (params.has(short)) state[key] = params.get(short);
  }
  return state;
}

shareBtn.addEventListener("click", async () => {
  if (!lastTune) return;
  const url = stateToUrl();
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  shareBtn.textContent = "Link Copied!";
  shareBtn.classList.add("copied");
  setTimeout(() => {
    shareBtn.textContent = "Share Link";
    shareBtn.classList.remove("copied");
  }, 1500);
});

// --- Startup: URL params take precedence over the saved session ---

function loadState() {
  const urlState = stateFromUrl();
  if (urlState) {
    applyInputState(urlState);
    if (form.checkValidity()) generateAndRender();
    return;
  }
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
  if (!state) return;
  applyInputState(state);
  if (state.hasTune && form.checkValidity()) generateAndRender();
}

renderGarage();
renderGear();
loadState();

// --- PWA service worker (network-first, so updates always win) ---

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
