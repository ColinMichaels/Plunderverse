// ParrotPersonality.ts
import {parrotSpeechService} from "./ParrotSpeechService";

export type ParrotMode = "serious" | "chatty";
type Severity = "critical" | "warning" | "info";
type ParrotEvent =
  | "low_health"
  | "low_fuel"
  | "enemy_spotted"
  | "damage_taken"
  | "objective_found"
  | "mission_update"
  | "checkpoint_reached"
  | "cargo_full"
  | "idle_hint";

type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface PlayerMetrics {
  deathsPerMin?: number;
  damagePerMin?: number;
  missionFailures?: number;
  objectiveRate?: number;
  idleFrac?: number;
  accuracy?: number;
  fuelWasteRate?: number;
  killStreak?: number;
  difficulty?: Difficulty;
  timeSinceLastObjectiveSec?: number;
}

export interface AskParrotContext {
    locationName?: string;
    objectiveName?: string;
    fuelPct?: number;
    hpPct?: number;
    enemiesNearby?: number;
    difficulty?: Difficulty;
}

interface MemoryEntry {
  phrase: string;
  timestamp: number;
  context?: string;
}
interface MisunderstandingRule {
  pattern: RegExp;
  replacements: string[];
}

// ----------------------- RNG & helpers --------------------------------------
class RNG {
  private s: number;
  constructor(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
    this.s = seed >>> 0;
  }
  // Mulberry32
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  chance(p: number) {
    return this.next() < p;
  }
  int(max: number) {
    return Math.floor(this.next() * max);
  }
  pick<T>(arr: T[]) {
    return arr[this.int(arr.length)]!;
  }
}

class NonRepeatingPicker {
  private lastIndex = new Map<string, number>();
  private recent: Record<string, string[]> = {};
  constructor(
    private rng: RNG,
    private window = 5,
  ) {}
  pick<T>(key: string, arr: T[]): T {
    if (arr.length <= 1) return arr[0]!;
    let idx = this.rng.int(arr.length);
    const last = this.lastIndex.get(key);
    if (last !== undefined && idx === last)
      idx = (idx + 1 + this.rng.int(arr.length - 1)) % arr.length;
    this.lastIndex.set(key, idx);
    const s = String(arr[idx]);
    this.recent[key] ||= [];
    if (
      this.recent[key].includes(s) &&
      arr.length > Math.min(this.window, arr.length - 1)
    ) {
      for (let tries = 0; tries < 3; tries++) {
        const j = this.rng.int(arr.length);
        if (!this.recent[key].includes(String(arr[j]))) {
          idx = j;
          break;
        }
      }
    }
    this.recent[key].push(String(arr[idx]));
    if (this.recent[key].length > this.window) this.recent[key].shift();
    return arr[idx]!;
  }
}

// ----------------------- Personality class ----------------------------------
export class ParrotPersonality {
  // --- Original state (kept) ------------------------------------------------
  private mode: ParrotMode = "chatty";
  private memory: MemoryEntry[] = [];
  private lastSpokenTime = 0;

  // --- Tunables (safe defaults) ---------------------------------------------
  private misunderstandingChance = 0.25;
  private minRandomGapMs = 10_000; // base cooldown for random chatter
  private randomGapJitterMs = 4_000; // jitter to avoid cadence
  private memoryLimit = 80;

  // Extra noise (per-word random swaps)
  private freeformNoiseChancePerWord = 0.08;
  private freeformNoiseMaxSwaps = 2;
  private freeformNoiseEnabled = true;

  // RNG + pickers
  private rng = new RNG();
  private picker = new NonRepeatingPicker(this.rng, 5);

  // Mood system
  private mood: "cheeky" | "helpful" | "grumpy" | "sleepy" = "cheeky";
  private moodStrength = 0.4; // 0..1 influence
  private lastMoodTick = Date.now();

  // Event system
  private lastEventSpoken: Record<string, number> = {};
  private eventCount: Record<ParrotEvent, number> = {
    low_health: 0,
    low_fuel: 0,
    enemy_spotted: 0,
    damage_taken: 0,
    objective_found: 0,
    mission_update: 0,
    checkpoint_reached: 0,
    cargo_full: 0,
    idle_hint: 0,
  };

  private defaultCooldowns: Record<Severity, number> = {
    critical: 8000,
    warning: 12000,
    info: 18000,
  };

  // --- Adaptation state -----------------------------------------------------
  private autoAdaptEnabled = true;
  private baseline = {
    misunderstanding: this.misunderstandingChance,
    minRandomGapMs: this.minRandomGapMs,
    interjectBias: 0.18,
  };
  private ema = {
    deathsPerMin: 0,
    damagePerMin: 0,
    missionFailures: 0,
    objectiveRate: 0,
    idleFrac: 0,
    accuracy: 0,
    fuelWasteRate: 0,
  };
  private lastAdapt = Date.now();
  private streak = { good: 0, bad: 0 };
  private _interjectBiasRuntime = this.baseline.interjectBias;

  // --- Phrase banks (expanded) ----------------------------------------------
  private pirateSlang = [
    "Aye aye",
    "Har har",
    "Shiver me timbers",
    "Blimey",
    "Avast",
    "Ahoy",
    "Yo ho ho",
    "By the barnacles",
    "Great galloping galleons",
    "Scuttle me codebase",
  ];

  private techJargon = [
    "uploadin' me wings",
    "rebootin' me beak",
    "defragmentin' the mainframe",
    "compilin' me squawks",
    "syncing to the cloud",
    "cache cleared",
    "buffer overflow detected",
    "patchin' me feathers",
    "hotfix applied",
    "GPU warmed like a deck cannon",
    "latency be lower than the tide",
  ];

  private fixedOneLiners = [
    "Permission to parrot, Cap'n. Excess granted.",
    "If I had fingers, I'd give you two thumbs… talons… up.",
    "Settin' sail to /dev/sea.",
    "I put the ARR in ARRay.",
    "Me beak be type-safe—no any-cursed types aboard!",
    "Har! I linted the treasure map. No warnings, only X marks.",
    "Encrypted crackers acquired. Authentication: Polly want a token.",
    "I’m 64% battery and 110% attitude.",
    "I pirated the pirates. It’s recursion, Cap’n.",
    "If it compiles on first try, it’s [sorcery|Saturday].",
  ];

  private misunderstandings: MisunderstandingRule[] = [
    { pattern: /\bship\b/gi, replacements: ["chip", "sheep", "skip", "sip"] },
    { pattern: /\bloot\b/gi, replacements: ["root", "boot", "toot", "flute"] },
    {
      pattern: /\bsails?\b/gi,
      replacements: ["sales", "snails", "fails", "scales"],
    },
    {
      pattern: /\bcourse\b/gi,
      replacements: ["curse", "coarse", "corpse", "source"],
    },
    { pattern: /\bcrew\b/gi, replacements: ["screw", "brew", "queue", "stew"] },
    { pattern: /\bfire\b/gi, replacements: ["wire", "hire", "tire", "friar"] },
    {
      pattern: /\bport\b/gi,
      replacements: ["report", "sport", "fort", "COM-port"],
    },
    {
      pattern: /\brudder\b/gi,
      replacements: ["router", "ruddery", "rubber", "routery"],
    },
    // Space/game terms
    {
      pattern: /\bstar\b/gi,
      replacements: ["scar", "stair", "tar", "GPU-star"],
    },
    { pattern: /\bmap\b/gi, replacements: ["app", "nap", "snap", "yaml"] },
    {
      pattern: /\bscan\b/gi,
      replacements: ["scam", "scarf", "span", "cron-scan"],
    },
    { pattern: /\bdock\b/gi, replacements: ["sock", "doc", "docker", "dork"] },
    {
      pattern: /\bcargo\b/gi,
      replacements: ["targo", "argot", "carb-o", "cargo-cult"],
    },
    {
      pattern: /\bpirate\b/gi,
      replacements: ["parrot", "private", "pir-API", "pi-rate"],
    },
    {
      pattern: /\bparrot\b/gi,
      replacements: ["pirate", "carrot", "parent", "packet"],
    },
    {
      pattern: /\blaser(s)?\b/gi,
      replacements: ["tasers$1", "lazers$1", "lasagna$1", "phasors$1"],
    },
    {
      pattern: /\bshield(s)?\b/gi,
      replacements: ["squeals$1", "fields$1", "shields.js$1", "shelves$1"],
    },
    {
      pattern: /\bengine(s)?\b/gi,
      replacements: ["pigeons$1", "engines.ts$1", "ginger$1", "enginex$1"],
    },
    {
      pattern: /\bthruster(s)?\b/gi,
      replacements: ["trusters$1", "bustlers$1", "thrashers$1", "thrushes$1"],
    },
    {
      pattern: /\bcomms?\b/gi,
      replacements: ["comma", "commas", "comps", "commsat"],
    },
    {
      pattern: /\bdeck\b/gi,
      replacements: ["duck", "decaf", "dreck", "dev-deck"],
    },
    {
      pattern: /\bbridge\b/gi,
      replacements: ["badge", "brunch", "fridge", "bridge-mode"],
    },
    {
      pattern: /\bplanet\b/gi,
      replacements: ["plan it", "plummet", "plannet", "planet.js"],
    },
    {
      pattern: /\basteroid\b/gi,
      replacements: ["asteroid.css", "asterisk", "astrid", "asteroid-lite"],
    },
    {
      pattern: /\bsector\b/gi,
      replacements: ["vector", "sexton", "selector", "spectre"],
    },
    {
      pattern: /\bnavigate\b/gi,
      replacements: ["navicate", "aggivate", "navigate()", "advocate"],
    },
    {
      pattern: /\bcannon\b/gi,
      replacements: ["cannon.js", "canyon", "canine", "cannoli"],
    },
    {
      pattern: /\btreasure\b/gi,
      replacements: ["measure", "pressure", "trash-sure", "treazure"],
    },
    {
      pattern: /\bcompass\b/gi,
      replacements: ["compress", "comp-sass", "campus", "comms-pass"],
    },
    {
      pattern: /\banchor\b/gi,
      replacements: ["ancho", "angkor", "anker", "angular"],
    },
    {
      pattern: /\bgalley\b/gi,
      replacements: ["gallery", "galley-ram", "jelly", "gulley"],
    },
  ];

  private recoveryPhrases = [
    "Har har! Must've been a feather in me circuits!",
    "Squawk! Me translation matrix be actin' up again!",
    "Blimey, that didn't compute right, did it?",
    "Avast! Let me reboot that thought…",
    "Error 404: Correct word not found! Har har!",
    "Me ears be on silent mode. Togglein’ them back on.",
  ];

  private praiseLines = [
    "Aww, thank ye, Cap'n! Savin' that in me 'Compliments' folder!",
    "Har har! Ye make this old bird proud!",
    "Squawk! I knew ye had it in ye, Cap'n!",
    "That’s the spirit! Uploading this moment to me permanent memory!",
    "Promotion approved: you to Legend, me to Sidekick Supreme.",
  ];

  private scoldLines = [
    "Squawk! I resent that, Cap'n!",
    "Blimey! That hurt me feelings… if I had proper ones!",
    "Avast! No need to be harsh on yer loyal parrot!",
    "I’m doin’ me best here, Cap’n!",
    "Noted. Logging your complaint under /logs/grumpy/human.json",
  ];

  // Extra word buckets for freeform noise
  private randomBuckets: Record<string, string[]> = {
    nautical: [
      "barnacle",
      "bilge",
      "bosun",
      "keel",
      "mizzen",
      "hard-a-port",
      "broadside",
      "keelhaulin’",
      "cutlass",
      "plank",
      "privateer",
    ],
    tech: [
      "websocket",
      "protobuf",
      "hotfix",
      "segfault",
      "cron",
      "kernel",
      "vectorize",
      "worker",
      "shader",
      "pipeline",
      "cacheline",
      "opcode",
    ],
    exclaim: ["SQUAWK!", "Blimey!", "Arr!", "Har!", "Avast!", "Yo-ho!"],
    snacks: [
      "hardtack",
      "sea-biscuit",
      "citrus-gel",
      "ship-coffee",
      "rum-jelly",
    ],
    fauna: ["albatross", "gull", "kraken", "manta", "barn-owl"],
  };

  private eventSeverity: Record<ParrotEvent, Severity> = {
    low_health: "critical",
    low_fuel: "warning",
    enemy_spotted: "warning",
    damage_taken: "warning",
    objective_found: "info",
    mission_update: "info",
    checkpoint_reached: "info",
    cargo_full: "info",
    idle_hint: "info",
  };

  private eventPhrases: Record<ParrotEvent, string[]> = {
    low_health: [
      "SQUAWK! Hull integrity at {hp}%! Tis but a flesh wound—patch it fast!",
      "[Avast|Blimey]! We're leakin' life at {hp}%!",
      "Bleedin' pixels! Health be {hp}%—apply bandages, Cap'n!",
    ],
    low_fuel: [
      "Ahoy! Fuel be down to {fuel}%. Any spare grog for the thrusters?",
      "We be runnin' on fumes—{fuel}% left. Trim the sails… er, jets!",
      "Har! Fuel tanks hollower than me stomach—{fuel}%!",
    ],
    enemy_spotted: [
      "Eyes starboard! Bogey at {distance}m. Shall I flex me lasers?",
      "Unfriendly pixels inbound, range {distance}m. Har har!",
      "Target acquired—{type} at {distance}m. Peck or flee?",
    ],
    damage_taken: [
      "Oof! We took a clobberin'—{amount} dmg!",
      "That one smarted—{amount} damage to the pride!",
      "Impact registered: {amount}. Reportin' dents and drama!",
    ],
    objective_found: [
      "Treasure marked! Objective: {name}. Plot a course?",
      "X marks the spot—{name} located!",
      "Found yer shiny thing: {name}. I licked it—digitally.",
    ],
    mission_update: [
      "New orders: {text}",
      "Har! Mission log updated: {text}",
      "We be pivotin' like a swivel gun: {text}",
    ],
    checkpoint_reached: [
      "Checkpoint secured! Stamp me passport!",
      "Saved progress—tuck it in the logbook.",
      "We made a mark on the map! Har!",
    ],
    cargo_full: [
      "Cargo hold stuffed like a biscuit tin. Offload, Cap'n!",
      "Inventory at max! No more shinies till we empty the pockets.",
      "Weight limit reached—me feathers protest!",
    ],
    idle_hint: [
      "Idle hands be the pirate's workshop—press {key} to scan.",
      "If ye be lost, ping the star map with {key}.",
      "Tip: Hold {key} to boost. Mind the fuel!",
    ],
  };

  // ------------------- Public controls (unchanged + extras) ------------------
  setMode(mode: ParrotMode) {
    this.mode = mode;
  }
  getMode(): ParrotMode {
    return this.mode;
  }
  setMisunderstandingChance(p: number) {
    this.misunderstandingChance = clamp01(p);
  }
  setFreeformNoiseChance(p: number) {
    this.freeformNoiseChancePerWord = clamp01(p);
  }
  enableFreeformNoise(enabled: boolean) {
    this.freeformNoiseEnabled = enabled;
  }
  setMinRandomGapMs(ms: number, jitterMs = 4000) {
    this.minRandomGapMs = Math.max(0, ms);
    this.randomGapJitterMs = Math.max(0, jitterMs);
  }
  setEventCooldown(severity: Severity, ms: number) {
    this.defaultCooldowns[severity] = Math.max(0, ms);
  }
  enableAutoAdapt(enabled: boolean) {
    this.autoAdaptEnabled = enabled;
  }
  getMemoryCount() {
    return this.memory.length;
  }

  // ------------------- Core helpers -----------------------------------------
  private now() {
    return Date.now();
  }
  private maybe(p: number) {
    return this.rng.chance(p);
  }
  private pick<T>(arr: T[], key: string) {
    return this.picker.pick(key, arr);
  }
  private capLike(sample: string, word: string) {
    if (sample === sample.toUpperCase()) return word.toUpperCase();
    if (sample[0] === sample[0].toUpperCase())
      return word[0].toUpperCase() + word.slice(1);
    return word.toLowerCase();
  }
  private speak(text: string) {
    parrotSpeechService.speak(text);
    this.lastSpokenTime = this.now();
  }
  private addToMemory(phrase: string, context?: string) {
    this.memory.push({ phrase, timestamp: this.now(), context });
    if (this.memory.length > this.memoryLimit) this.memory.shift();
  }

  private emaUpdate(
    current: number,
    incoming: number | undefined,
    alpha = 0.25,
  ) {
    if (incoming === undefined) return current;
    return current + alpha * (incoming - current);
  }
  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }
  private clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  // ------------------- Mood logic -------------------------------------------
  private tickMood() {
    const t = this.now();
    if (t - this.lastMoodTick >= 10000) {
      this.lastMoodTick = t;
      const roll = this.rng.next();
      if (roll < 0.25) this.mood = "cheeky";
      else if (roll < 0.5) this.mood = "helpful";
      else if (roll < 0.75) this.mood = "grumpy";
      else this.mood = "sleepy";
    }
    // Auto-drift back to baseline if no recent adaptation
    const since = t - this.lastAdapt;
    if (since > 20000) {
      this.misunderstandingChance = this.lerp(
        this.misunderstandingChance,
        this.baseline.misunderstanding,
        0.05,
      );
      this.minRandomGapMs = Math.round(
        this.lerp(this.minRandomGapMs, this.baseline.minRandomGapMs, 0.05),
      );
      this._interjectBiasRuntime = this.lerp(
        this._interjectBiasRuntime,
        this.baseline.interjectBias,
        0.05,
      );
    }
  }

  private moodAdjustments() {
    switch (this.mood) {
      case "cheeky":
        return { misunderstand: +0.1, chatterMs: -1500, interject: 0.3 };
      case "helpful":
        return { misunderstand: -0.1, chatterMs: -500, interject: 0.15 };
      case "grumpy":
        return { misunderstand: +0.05, chatterMs: +2000, interject: 0.05 };
      case "sleepy":
        return { misunderstand: -0.05, chatterMs: +3500, interject: 0.02 };
    }
  }

  // ------------------- Misunderstanding & noise ------------------------------
  private shouldMisunderstand(): boolean {
    const base = this.misunderstandingChance;
    const adj = this.moodAdjustments();
    const p = clamp01(base + this.moodStrength * adj.misunderstand);
    return this.mode !== "serious" && this.maybe(p);
  }

  private applyFreeformNoise(text: string): { text: string; swapped: boolean } {
    if (!this.freeformNoiseEnabled || this.freeformNoiseChancePerWord <= 0)
      return { text, swapped: false };
    const tokens = text.split(/(\b)/);
    let swaps = 0;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!/^[A-Za-z][A-Za-z']{2,}$/.test(tok)) continue;
      if (swaps >= this.freeformNoiseMaxSwaps) break;
      if (!this.maybe(this.freeformNoiseChancePerWord)) continue;
      const bucketKeys = Object.keys(this.randomBuckets);
      const bucket = this.pick(bucketKeys, "noise.bucket");
      const replacement = this.pick(
        this.randomBuckets[bucket],
        `noise.${bucket}`,
      );
      tokens[i] = this.capLike(tok, replacement);
      swaps++;
    }
    return { text: tokens.join(""), swapped: swaps > 0 };
  }

  private applyMisunderstanding(text: string): {
    text: string;
    wasMisunderstood: boolean;
  } {
    if (!this.shouldMisunderstand()) return { text, wasMisunderstood: false };
    let out = text,
      changed = false,
      applied = 0;
    const MAX_RULES = 3;
    for (const rule of this.misunderstandings) {
      if (applied >= MAX_RULES) break;
      if (!rule.pattern.test(out)) continue;
      out = out.replace(rule.pattern, (m) =>
        this.capLike(m, this.pick(rule.replacements, rule.pattern.source)),
      );
      changed = true;
      applied++;
    }
    if (!changed) {
      const noisy = this.applyFreeformNoise(out);
      if (noisy.swapped) return { text: noisy.text, wasMisunderstood: true };
    }
    return { text: out, wasMisunderstood: changed };
  }

  // ------------------- Speech filters (low cost) -----------------------------
  private applySpeechFilters(s: string): string {
    const adj = this.moodAdjustments();
    const baseInterject = this._interjectBiasRuntime ?? 0.18;
    const interjectP = this.clamp(
      baseInterject +
        (this.moodStrength * adj.interject -
          0.1 * (this.mode === "serious" ? 1 : 0)),
      0,
      0.5,
    );
    if (this.mode === "chatty" && this.maybe(interjectP)) {
      s = `${this.pick(this.randomBuckets.exclaim, "exclaim")} ${s}`;
    }
    if (this.maybe(0.06)) {
      s = s.replace(
        /\b([A-Za-z])([A-Za-z]{2,})/,
        (_, a: string, rest: string) => `${a}-${a}-${a}${rest}`,
      );
    }
    if (this.maybe(0.08)) {
      s = s.replace(/[aeiou]{1,2}/i, (m) => m + (this.maybe(0.5) ? m : m[0]));
    }
    if (this.maybe(0.03)) {
      s += this.maybe(0.5) ? " 🦜" : " ✨";
    }
    return s;
  }

  private addPirateFlare(text: string): string {
    const slang = this.pick(this.pirateSlang, "pirateSlang");
    const tail = this.maybe(0.5)
      ? ` (${this.pick(this.techJargon, "techJargon")})`
      : "";
    return `${slang}, Cap'n! ${text}${tail}`;
  }

  private expandVariants(s: string): string {
      return s.replace(/\[([^\]]+)]/g, (_m, group) => {
      const parts = String(group)
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
      return this.pick(parts, "variant");
    });
  }

  private format(s: string, data: Record<string, any> = {}): string {
      const base = s.replace(/\{(\w+)}/g, (_, k) =>
      (data[k] ?? `{${k}}`).toString(),
    );
    return this.expandVariants(base);
  }

  // ------------------- Adaptation -------------------------------------------
  /**
   * Adapt parrot behavior based on recent player metrics.
   * Call every 2–5s or on major events.
   */
  adapt(m: PlayerMetrics) {
    if (!this.autoAdaptEnabled) return;

    // Smooth metrics (EMA)
    this.ema.deathsPerMin = this.emaUpdate(
      this.ema.deathsPerMin,
      m.deathsPerMin,
      0.35,
    );
    this.ema.damagePerMin = this.emaUpdate(
      this.ema.damagePerMin,
      m.damagePerMin,
      0.25,
    );
    this.ema.missionFailures = this.emaUpdate(
      this.ema.missionFailures,
      m.missionFailures,
      0.35,
    );
    this.ema.objectiveRate = this.emaUpdate(
      this.ema.objectiveRate,
      m.objectiveRate,
      0.35,
    );
    this.ema.idleFrac = this.emaUpdate(this.ema.idleFrac, m.idleFrac, 0.3);
    this.ema.accuracy = this.emaUpdate(this.ema.accuracy, m.accuracy, 0.3);
    this.ema.fuelWasteRate = this.emaUpdate(
      this.ema.fuelWasteRate,
      m.fuelWasteRate,
      0.3,
    );

    // Derive struggle vs success signals (0..1)
    const struggle =
      this.clamp(this.ema.deathsPerMin * 1.2, 0, 1) * 0.35 +
      this.clamp(this.ema.damagePerMin / 100, 0, 1) * 0.25 +
      this.clamp(this.ema.missionFailures / 3, 0, 1) * 0.25 +
      this.clamp((m.timeSinceLastObjectiveSec ?? 0) / 120, 0, 1) * 0.15;

    const success =
      this.clamp((m.killStreak ?? 0) / 8, 0, 1) * 0.45 +
      this.clamp(this.ema.objectiveRate / 0.5, 0, 1) * 0.35 +
      this.clamp(this.ema.accuracy, 0, 1) * 0.2;

    // Streaks
    if (success > 0.55 && struggle < 0.35) {
      this.streak.good = this.clamp(this.streak.good + 1, 0, 8);
      this.streak.bad = Math.max(0, this.streak.bad - 1);
    } else if (struggle > 0.55 && success < 0.35) {
      this.streak.bad = this.clamp(this.streak.bad + 1, 0, 8);
      this.streak.good = Math.max(0, this.streak.good - 1);
    } else {
      this.streak.good = Math.max(0, this.streak.good - 0.5);
      this.streak.bad = Math.max(0, this.streak.bad - 0.5);
    }

    // Mood drift with difficulty
    const diff = m.difficulty ?? "normal";
    const hardish = diff === "hard" || diff === "nightmare" ? 1 : 0;

    if (struggle > 0.6) {
      this.mood = hardish
        ? "helpful"
        : this.rng.chance(0.7)
          ? "helpful"
          : "cheeky";
    } else if (success > 0.6) {
      this.mood = this.rng.chance(0.5) ? "cheeky" : "sleepy";
    } else if (this.ema.idleFrac > 0.5) {
      this.mood = "sleepy";
    } else if (this.ema.fuelWasteRate > 0.5) {
      this.mood = "grumpy";
    }

    // Parameter nudges (bounded around baselines)
    const misunderstandBase = this.baseline.misunderstanding;
    const chatterBase = this.baseline.minRandomGapMs;
    const calmBias = struggle * 0.6 + (hardish ? 0.2 : 0);
    const hypeBias = success * 0.6;

    const targetMis = this.clamp(
      misunderstandBase * (1 - 0.5 * calmBias) + 0.2 * hypeBias,
      0.05,
      0.6,
    );
    const targetGap = this.clamp(
      chatterBase * (1 + 0.4 * hypeBias - 0.35 * calmBias),
      6000,
      20000,
    );
    const targetInterject = this.clamp(
      this.baseline.interjectBias + 0.15 * hypeBias - 0.12 * calmBias,
      0.05,
      0.35,
    );

    this.misunderstandingChance = this.lerp(
      this.misunderstandingChance,
      targetMis,
      0.25,
    );
    this.minRandomGapMs = Math.round(
      this.lerp(this.minRandomGapMs, targetGap, 0.25),
    );
    this.moodStrength = this.lerp(
      this.moodStrength,
      0.4 + 0.2 * hypeBias - 0.2 * calmBias,
      0.2,
    );
    this._interjectBiasRuntime = this.lerp(
      this._interjectBiasRuntime,
      targetInterject,
      0.3,
    );

    this.lastAdapt = Date.now();
  }

  // ------------------- Public behaviors (API preserved) ----------------------
  repeatAndConfirm(playerCommand: string) {
    this.tickMood();
    this.addToMemory(playerCommand, "player_command");

    const { text: processed, wasMisunderstood } =
      this.applyMisunderstanding(playerCommand);
    let response = wasMisunderstood
      ? `${processed}? Wait… ${this.pick(this.recoveryPhrases, "recovery")}`
      : this.addPirateFlare(processed);

    response = this.applySpeechFilters(response);
    this.speak(response);
    return response;
  }

  comment(
    message: string,
    type: "info" | "warning" | "critical" | "random" = "info",
  ) {
    this.tickMood();
    if (this.mode === "serious" && type === "random") return;

    if (type === "random") {
      const adj = this.moodAdjustments();
      const since = this.now() - this.lastSpokenTime;
      const need =
        this.minRandomGapMs +
        Math.floor(this.rng.next() * this.randomGapJitterMs) +
        this.moodStrength * adj.chatterMs;
      if (since < need) return;
    }

    let enhanced = message;
    if (this.mode === "chatty") {
      const prefix =
        type === "critical"
          ? "SQUAWK! Alert alert!"
          : type === "warning"
            ? "Avast, Cap'n!"
            : this.pick(this.pirateSlang, "pirateSlang");
      enhanced = `${prefix} ${message}`;
    }

    enhanced = this.applySpeechFilters(enhanced);
    this.speak(enhanced);
    this.addToMemory(message, type);
  }

    private generateRandomSaying(): string {
    const improv = `Note to self: ${this.pick(this.techJargon, "techJargon")} + ${this.pick(this.pirateSlang, "pirateSlang")} = performance gains.`;
    const mash = `Deployin' ${this.pick(Object.keys(this.randomBuckets), "noise.bucket")} mode with ${this.pick(this.fixedOneLiners, "oneLiners")}`;
        const options: string[] = [
      "All systems be runnin' smoother than a greased cannonball!",
      "I may be code, but I've got heart — digital or not!",
      `Me circuits are ${this.pick(this.techJargon, "techJargon")}!`,
      "Remember when ye taught me to whistle? Or was that the toaster?",
      "Har har! I'm 37% more useful than last patch!",
      "Squawk! The stars look mighty fine today, Cap'n!",
      "I once knew a pirate bot… or did I dream that in sleep mode?",
      this.pick(this.fixedOneLiners, "oneLiners"),
      improv,
      mash,
    ];
        let line = this.pick(options, "randomSaying");
        line = this.applySpeechFilters(line);
        return line;
    }

    randomComment() {
        if (this.mode === "serious") return;
        this.tickMood();

        // Throttle logic remains in comment()
        const line = this.generateRandomSaying();
        this.comment(line, "random");
    }

    /** Returns a random personality-driven saying WITHOUT speaking. */
    getRandomSaying(): string {
        this.tickMood();
        return this.generateRandomSaying();
    }

    /** Speaks a random saying immediately (subject to internal throttles in comment()) */
    speakRandomSaying() {
        if (this.mode === "serious") return;
        const line = this.generateRandomSaying();
        this.comment(line, "random");
    }

    /** Speak exactly what you pass: no pirate flair, no filters, no memory updates. */
    sayRaw(text: string) {
        // Bypass comment()/filters; still update lastSpokenTime for throttle coherence
        parrotSpeechService.speak(String(text ?? ""));
        this.lastSpokenTime = this.now();
    }

    /** Play the parrot squawk SFX through the speech service while updating timing. */
    squawk() {
        // Route SFX via the service but keep throttle coherence
        if (typeof (parrotSpeechService as any).squawk === "function") {
            (parrotSpeechService as any).squawk();
        } else {
            // Fallback if squawk() not provided
            parrotSpeechService.speak("SQUAWK!");
        }
        this.lastSpokenTime = this.now();
    }

    /**
     * Lightweight Q&amp;A without external AI. Pattern-matches common intents and
     * produces a pirate-flavored but helpful answer. Returns the text and also
     * speaks it by default.
     */
    askParrot(
        question: string,
        ctx: AskParrotContext = {},
        opts: { speak?: boolean; allowMisunderstand?: boolean } = {}
    ): string {
        this.tickMood();
        const speak = opts.speak !== false; // default true
        const allowMis = opts.allowMisunderstand === true;

        let q = String(question || "").trim();
        if (!q) return "";

        // Optional playful misunderstanding in chatty mode
        if (allowMis && this.mode !== "serious") {
            const m = this.applyMisunderstanding(q);
            q = m.text;
        }

        const lower = q.toLowerCase();

        // Intent bank
        type Rule = { test: RegExp; replies: string[] };
        const mkReplies = (arr: string[], data: Record<string, any> = {}) =>
            arr.map((s) => this.format(s, data));

        const hp = Math.round((ctx.hpPct ?? 0) as number);
        const fuel = Math.round((ctx.fuelPct ?? 0) as number);
        const near = ctx.enemiesNearby ?? 0;
        const where = ctx.locationName ?? "these parts";
        const obj = ctx.objectiveName ?? "the objective";

        const rules: Rule[] = [
            {
                test: /\b(hello|hi|hey|ahoy|yo)\b/i,
                replies: mkReplies([
                    "[Ahoy|Aye] there, Cap'n! Needin' somethin'?",
                    "Yo-ho! What be yer question, Cap'n?",
                    "Avast! Parrot online and listenin'.",
                ]),
            },
            {
                test: /(who are you|what are you|your name)/i,
                replies: mkReplies([
                    "I'm yer loyal AI parrot—part code, part squawk, all attitude.",
                    "Designation: Sidekick Supreme. Specialty: banter and battlefield tips.",
                    "Name's classified, but me beak answers to 'Cap'n's favorite'.",
                ]),
            },
            {
                test: /(how.*fuel|fuel.*(level|status)|refuel|gas)/i,
                replies: mkReplies([
                    "Fuel at about {fuel}%. Featherlight on the throttle till we top off.",
                    "Reading {fuel}% fuel. Tap the docks to refuel when ye spot 'em.",
                    "We be at {fuel}%. Mind yer boosts, Cap'n.",
                ], {fuel}),
            },
            {
                test: /(how.*health|status.*(ship|hull)|damage|repairs?)/i,
                replies: mkReplies([
                    "Hull be at {hp}%. I'd patch her sooner than later.",
                    "Status: {hp}% integrity. Avoid headbuttin' asteroids.",
                    "Armor {hp}% — could be better, could be barnacles.",
                ], {hp}),
            },
            {
                test: /(hint|what.*do|where.*go|objective|mission)/i,
                replies: mkReplies([
                    "Plot a course to {obj}. Keep {where} on yer starboard.",
                    "I'd scan and head toward {obj}. The shine calls ye.",
                    "Step one: eyes on {obj}. Step two: profit. Probably.",
                ], {obj, where}),
            },
            {
                test: /(enemy|hostile|bogey|danger)/i,
                replies: mkReplies([
                    "{near} hostiles nearby. Peck the small ones first; kite the bruisers.",
                    "I spy about {near}. Use cover and burst yer thrusters.",
                    "Danger level: {near}&times;Squawk. Keep shields primed.",
                ], {near}),
            },
            {
                test: /(controls?|help|how.*(fly|shoot|boost))/i,
                replies: mkReplies([
                    "Boost with Shift, scan with R, and never park on a mine. Trust me.",
                    "Rule o' thumb: move, shoot, move. And then move again.",
                    "If ye forget, the keybindings screen be friendlier than a tavern cat.",
                ]),
            },
            {
                test: /\b(joke|funny|laugh|pun)\b/i,
                replies: mkReplies([
                    "Why'd the pirate learn TypeScript? Fer the strong ARR types!",
                    "I put the ARR in ARRay. (I'll see meself out.)",
                    "I pirated the pirates. Recursive justice!",
                ]),
            },
            {
                test: /(thank(s| you)|ty|cheers)/i,
                replies: mkReplies([
                    "Anytime, Cap'n. Logging gratitude to /logs/feelings.json.",
                    "Aye! Praise accepted. Baskin' in it already.",
                    "Har! Yer welcome. Onward we sail!",
                ]),
            },
        ];

        // Match the first rule
        let answer: string | null = null;
        for (const r of rules) {
            if (r.test.test(lower)) {
                answer = this.pick(r.replies, "qa.replies");
                break;
            }
        }

        // Fallback: helpful generic
        if (!answer) {
            answer = this.format(
                "I'd steer toward {obj} near {where}. Keep fuel {fuel}% and hull {hp}% in mind.",
                {obj, where, fuel, hp}
            );
        }

        // Pirate flair + speech filters
        answer = this.mode === "chatty" ? this.addPirateFlare(answer) : answer;
        answer = this.applySpeechFilters(answer);

        // Speak + memory
        if (speak) this.speak(answer);
        this.addToMemory(question, "ask");
        return answer;
  }

  recallMemory() {
    if (this.memory.length === 0) return;
    this.tickMood();

    const idx = this.picker.pick(
      "memoryIndex",
      this.memory.map((_, i) => i),
    );
    const m = this.memory[idx];
    const glitchy = this.maybe(0.3);
    const recall = glitchy
      ? `Remember when ye said "${m.phrase}"? Or was that me dreamin' in low-power mode…`
      : `Me memory banks be showin': "${m.phrase}" — that were a good one, Cap'n!`;
    this.comment(recall, "random");
  }

  praise() {
    this.speak(this.pick(this.praiseLines, "praise"));
  }
  scold() {
    this.speak(this.pick(this.scoldLines, "scold"));
  }

  // ------------------- Events ------------------------------------------------
  private canFireEvent(event: ParrotEvent): boolean {
    const sev = this.eventSeverity[event];
    const last = this.lastEventSpoken[event] ?? 0;
    const need = this.defaultCooldowns[sev];
    return this.now() - last >= need;
  }

  notify(event: ParrotEvent, payload: Record<string, any> = {}) {
    this.tickMood();

    const severity = this.eventSeverity[event];
    if (severity === "info" && this.mode === "serious") return;
    if (!this.canFireEvent(event)) return;

    this.eventCount[event] = (this.eventCount[event] ?? 0) + 1;
    const escalate = this.eventCount[event] >= 3;

    let line = this.format(
      this.pick(this.eventPhrases[event], `event:${event}`),
      payload,
    );
    if (escalate && severity !== "info") {
      line +=
        this.mood === "grumpy"
          ? " This be gettin' old!"
          : " Recommend immediate action!";
      this.eventCount[event] = 0;
    }

    const type: "info" | "warning" | "critical" =
      severity === "critical"
        ? "critical"
        : severity === "warning"
          ? "warning"
          : "info";

    this.comment(line, type);
    this.lastEventSpoken[event] = this.now();
  }
}

// ----------------------- utils ----------------------------------------------
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export const parrotPersonality = new ParrotPersonality();
// Simple alias to provide a single, consistent import point across the app.
export const Parrot = parrotPersonality;
