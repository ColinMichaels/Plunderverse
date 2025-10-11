// ParrotPersonality.ts
import { parrotSpeechService } from "./ParrotSpeechService";

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
    private window = 4,
  ) {}
  pick<T>(key: string, arr: T[]): T {
    if (arr.length <= 1) return arr[0]!;
    // avoid repeating immediate
    let idx = this.rng.int(arr.length);
    const last = this.lastIndex.get(key);
    if (last !== undefined && idx === last)
      idx = (idx + 1 + this.rng.int(arr.length - 1)) % arr.length;
    this.lastIndex.set(key, idx);
    // track recent string versions to reduce loops
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
    this.recent[key].push(s);
    if (this.recent[key].length > this.window) this.recent[key].shift();
    return arr[idx]!;
  }
}

// ----------------------- Personality class ----------------------------------
export class ParrotPersonality {
  // Original state (kept)
  private mode: ParrotMode = "chatty";
  private memory: MemoryEntry[] = [];
  private lastSpokenTime = 0;

  // Tunables
  private misunderstandingChance = 0.25;
  private minRandomGapMs = 10_000;
  private randomGapJitterMs = 4_000;
  private memoryLimit = 80;

  // Extra word-noise
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

  // Event book-keeping
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

  // Phrase banks
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

  // ------------------- Mood logic -------------------------------------------
  private tickMood() {
    const t = this.now();
    if (t - this.lastMoodTick < 10000) return; // drift every 10s
    this.lastMoodTick = t;
    // slight random walk
    const roll = this.rng.next();
    if (roll < 0.25) this.mood = "cheeky";
    else if (roll < 0.5) this.mood = "helpful";
    else if (roll < 0.75) this.mood = "grumpy";
    else this.mood = "sleepy";
  }

  private moodAdjustments() {
    // returns multipliers/additions for behavior knobs
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
    // optional interjection
    const adj = this.moodAdjustments();
    if (this.mode === "chatty" && this.maybe(adj.interject)) {
      s = `${this.pick(this.randomBuckets.exclaim, "exclaim")} ${s}`;
    }
    // stutter (rare)
    if (this.maybe(0.06)) {
      s = s.replace(
        /\b([A-Za-z])([A-Za-z]{2,})/,
        (_, a: string, rest: string) => `${a}-${a}-${a}${rest}`,
      );
    }
    // vowel stretch (rare)
    if (this.maybe(0.08)) {
      s = s.replace(/[aeiou]{1,2}/i, (m) => m + (this.maybe(0.5) ? m : m[0]));
    }
    // emoji seasoning (very rare)
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
    // expands [a|b|c] choices
    return s.replace(/\[([^\]]+)\]/g, (_m, group) => {
      const parts = String(group)
        .split("|")
        .map((p) => p.trim())
        .filter(Boolean);
      return this.pick(parts, "variant");
    });
  }

  private format(s: string, data: Record<string, any> = {}): string {
    const base = s.replace(/\{(\w+)\}/g, (_, k) =>
      (data[k] ?? `{${k}}`).toString(),
    );
    return this.expandVariants(base);
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

    // Throttle random chatter with mood influence
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

  randomComment() {
    if (this.mode === "serious") return;
    this.tickMood();

    const improv = `Note to self: ${this.pick(this.techJargon, "techJargon")} + ${this.pick(this.pirateSlang, "pirateSlang")} = performance gains.`;
    const mash = `Deployin' ${this.pick(Object.keys(this.randomBuckets), "noise.bucket")} mode with ${this.pick(this.fixedOneLiners, "oneLiners")}`;

    const comments: string[] = [
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
    this.comment(this.pick(comments, "comments"), "random");
  }

  recallMemory() {
    if (this.memory.length === 0) return;
    this.tickMood();

    const m =
      this.memory[
        this.picker.pick(
          "memoryIndex",
          this.memory.map((_, i) => i),
        )
      ];
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

  // ------------------- Events (unchanged surface, better brains) ------------
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
    const escalate = this.eventCount[event] >= 3; // say it spicier after 3x

    let line = this.format(
      this.pick(this.eventPhrases[event], `event:${event}`),
      payload,
    );
    if (escalate && severity !== "info") {
      line +=
        this.mood === "grumpy"
          ? " This be gettin' old!"
          : " Recommend immediate action!";
      this.eventCount[event] = 0; // reset after escalation
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
