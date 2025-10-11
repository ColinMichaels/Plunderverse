// ParrotPersonality.ts
import { parrotSpeechService } from "./ParrotSpeechService";

export type ParrotMode = "serious" | "chatty";

interface MemoryEntry {
  phrase: string;
  timestamp: number;
  context?: string;
}

interface MisunderstandingRule {
  pattern: RegExp; // keep 'g' where appropriate
  replacements: string[];
}

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

export class ParrotPersonality {
  // --- Original state (kept) ------------------------------------------------
  private mode: ParrotMode = "chatty";
  private memory: MemoryEntry[] = [];
  private lastSpokenTime = 0;

  // --- Tunables (new, with safe defaults) -----------------------------------
  private misunderstandingChance = 0.25;
  private minRandomGapMs = 10_000; // base cooldown for random chatter
  private randomGapJitterMs = 4_000; // jitter avoids robotic cadence
  private memoryLimit = 80;

  // Internal no-repeat bookkeeping
  private lastPickIndex: Map<string, number> = new Map();

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

  private misunderstandings: MisunderstandingRule[] = [
    { pattern: /\bship\b/gi, replacements: ["chip", "sheep", "skip"] },
    { pattern: /\bloot\b/gi, replacements: ["root", "boot", "toot"] },
    { pattern: /\bsails\b/gi, replacements: ["sales", "snails", "fails"] },
    { pattern: /\bcourse\b/gi, replacements: ["curse", "coarse", "corpse"] },
    { pattern: /\bcrew\b/gi, replacements: ["screw", "brew", "queue"] },
    { pattern: /\bfire\b/gi, replacements: ["wire", "hire", "tire"] },
    { pattern: /\bport\b/gi, replacements: ["report", "sport", "fort"] },
    { pattern: /\brudder\b/gi, replacements: ["router", "ruddery", "rubber"] },
  ];

  private recoveryPhrases = [
    "Har har! Must've been a feather in me circuits!",
    "Squawk! Me translation matrix be actin' up again!",
    "Blimey, that didn't compute right, did it?",
    "Avast! Let me reboot that thought…",
    "Error 404: Correct word not found! Har har!",
    "Me ears be on silent mode. Togglein’ them back on.",
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
    "If it compiles on first try, it’s sorcery or Saturday.",
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

  // --- Event system ----------------------------------------------------------
  private lastEventSpoken: Record<string, number> = {};

  private defaultCooldowns: Record<Severity, number> = {
    critical: 8_000,
    warning: 12_000,
    info: 18_000,
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
      "Avast! We're leakin' life at {hp}%!",
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

  // --- Public controls (backwards-compatible + new) -------------------------
  setMode(mode: ParrotMode) {
    this.mode = mode;
  }
  getMode(): ParrotMode {
    return this.mode;
  }

  setMisunderstandingChance(p: number) {
    this.misunderstandingChance = Math.min(1, Math.max(0, p));
  }

  setMinRandomGapMs(ms: number, jitterMs = 4000) {
    this.minRandomGapMs = Math.max(0, ms);
    this.randomGapJitterMs = Math.max(0, jitterMs);
  }

  setEventCooldown(severity: Severity, ms: number) {
    this.defaultCooldowns[severity] = Math.max(0, ms);
  }

  getMemoryCount(): number {
    return this.memory.length;
  }

  // --- Core helpers ----------------------------------------------------------
  private now() {
    return Date.now();
  }
  private maybe(p: number): boolean {
    return Math.random() < p;
  }

  private pickIndex(len: number, key: string): number {
    if (len <= 1) return 0;
    let idx = Math.floor(Math.random() * len);
    const last = this.lastPickIndex.get(key);
    if (last !== undefined && idx === last) {
      idx = (idx + 1 + Math.floor(Math.random() * (len - 1))) % len;
    }
    this.lastPickIndex.set(key, idx);
    return idx;
  }

  private pick<T>(array: T[], key: string): T {
    return array[this.pickIndex(array.length, key)];
  }

  private speak(text: string) {
    parrotSpeechService.speak(text);
    this.lastSpokenTime = this.now();
  }

  private addToMemory(phrase: string, context?: string) {
    this.memory.push({ phrase, timestamp: this.now(), context });
    if (this.memory.length > this.memoryLimit) this.memory.shift();
  }

  private shouldMisunderstand(): boolean {
    return this.mode !== "serious" && this.maybe(this.misunderstandingChance);
  }

  private applyMisunderstanding(text: string): {
    text: string;
    wasMisunderstood: boolean;
  } {
    if (!this.shouldMisunderstand()) return { text, wasMisunderstood: false };
    for (const rule of this.misunderstandings) {
      if (!rule.pattern.test(text)) continue;
      const replaced = text.replace(rule.pattern, () =>
        this.pick(rule.replacements, rule.pattern.source),
      );
      return { text: replaced, wasMisunderstood: true };
    }
    return { text, wasMisunderstood: false };
  }

  private addPirateFlare(text: string): string {
    const slang = this.pick(this.pirateSlang, "pirateSlang");
    const tail = this.maybe(0.5)
      ? ` (${this.pick(this.techJargon, "techJargon")})`
      : "";
    return `${slang}, Cap'n! ${text}${tail}`;
  }

  private format(s: string, data: Record<string, any> = {}): string {
    return s.replace(/\{(\w+)\}/g, (_, k) => (data[k] ?? `{${k}}`).toString());
  }

  // --- Public behaviors (original signatures preserved) ---------------------
  repeatAndConfirm(playerCommand: string) {
    this.addToMemory(playerCommand, "player_command");

    const { text: processed, wasMisunderstood } =
      this.applyMisunderstanding(playerCommand);
    const response = wasMisunderstood
      ? `${processed}? Wait… ${this.pick(this.recoveryPhrases, "recovery")}`
      : this.addPirateFlare(processed);

    this.speak(response);
    return response;
  }

  comment(
    message: string,
    type: "info" | "warning" | "critical" | "random" = "info",
  ) {
    if (this.mode === "serious" && type === "random") return;

    // Throttle only for random chatter
    if (type === "random") {
      const since = this.now() - this.lastSpokenTime;
      const need =
        this.minRandomGapMs +
        Math.floor(Math.random() * this.randomGapJitterMs);
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

    this.speak(enhanced);
    this.addToMemory(message, type);
  }

  randomComment() {
    if (this.mode === "serious") return;
    const comments: string[] = [
      "All systems be runnin' smoother than a greased cannonball!",
      "I may be code, but I've got heart — digital or not!",
      `Me circuits are ${this.pick(this.techJargon, "techJargon")}!`,
      "Remember when ye taught me to whistle? Or was that the toaster?",
      "Har har! I'm 37% more useful than last patch!",
      "Squawk! The stars look mighty fine today, Cap'n!",
      "I once knew a pirate bot… or did I dream that in sleep mode?",
      this.pick(this.fixedOneLiners, "oneLiners"),
    ];
    this.comment(this.pick(comments, "comments"), "random");
  }

  recallMemory() {
    if (this.memory.length === 0) return;
    const m = this.memory[this.pickIndex(this.memory.length, "memory")];
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

  // --- Event bridge (new) ---------------------------------------------------
  private canFireEvent(event: ParrotEvent): boolean {
    const sev = this.eventSeverity[event];
    const last = this.lastEventSpoken[event] ?? 0;
    const need = this.defaultCooldowns[sev];
    return this.now() - last >= need;
  }

  notify(event: ParrotEvent, payload: Record<string, any> = {}) {
    // Even in 'serious', still allow critical/warning; silence info
    const severity = this.eventSeverity[event];
    if (severity === "info" && this.mode === "serious") return;
    if (!this.canFireEvent(event)) return;

    const line = this.format(
      this.pick(this.eventPhrases[event], `event:${event}`),
      payload,
    );
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

export const parrotPersonality = new ParrotPersonality();
