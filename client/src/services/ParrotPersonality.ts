import { parrotSpeechService } from './ParrotSpeechService';

export type ParrotMode = 'serious' | 'chatty';

interface MemoryEntry {
  phrase: string;
  timestamp: number;
  context?: string;
}

interface MisunderstandingRule {
  pattern: RegExp;
  replacements: string[];
}

export class ParrotPersonality {
  private mode: ParrotMode = 'chatty';
  private memory: MemoryEntry[] = [];
  private lastSpokenTime: number = 0;
  private misunderstandingChance: number = 0.25;

  private pirateSlang = [
    'Aye aye',
    'Har har',
    'Shiver me timbers',
    'Blimey',
    'Avast',
    'Ahoy',
    'Yo ho ho',
  ];

  private techJargon = [
    'uploading me wings',
    'rebooting me beak',
    'defragmentin\' the mainframe',
    'compiling me squawks',
    'syncing to the cloud',
    'cache cleared',
    'buffer overflow detected',
    'patching me feathers',
  ];

  private misunderstandings: MisunderstandingRule[] = [
    { pattern: /\bship\b/gi, replacements: ['chip', 'sheep', 'skip'] },
    { pattern: /\bloot\b/gi, replacements: ['root', 'boot', 'toot'] },
    { pattern: /\bsails\b/gi, replacements: ['sales', 'snails', 'fails'] },
    { pattern: /\bcourse\b/gi, replacements: ['curse', 'coarse', 'corpse'] },
    { pattern: /\bcrew\b/gi, replacements: ['screw', 'brew', 'true'] },
    { pattern: /\bfire\b/gi, replacements: ['wire', 'hire', 'tire'] },
    { pattern: /\bport\b/gi, replacements: ['report', 'sport', 'fort'] },
  ];

  private recoveryPhrases = [
    'Har har! Must\'ve been a feather in me circuits!',
    'Squawk! Me translation matrix be actin\' up again!',
    'Blimey, that didn\'t compute right, did it?',
    'Avast! Let me reboot that thought...',
    'Error 404: Correct word not found! Har har!',
  ];

  setMode(mode: ParrotMode) {
    this.mode = mode;
    console.log('[ParrotPersonality] Mode set to:', mode);
  }

  getMode(): ParrotMode {
    return this.mode;
  }

  private shouldMisunderstand(): boolean {
    if (this.mode === 'serious') return false;
    return Math.random() < this.misunderstandingChance;
  }

  private addToMemory(phrase: string, context?: string) {
    this.memory.push({
      phrase,
      timestamp: Date.now(),
      context,
    });

    if (this.memory.length > 50) {
      this.memory.shift();
    }
  }

  private applyMisunderstanding(text: string): { text: string; wasMisunderstood: boolean } {
    if (!this.shouldMisunderstand()) {
      return { text, wasMisunderstood: false };
    }

    for (const rule of this.misunderstandings) {
      if (rule.pattern.test(text)) {
        const replacement = rule.replacements[Math.floor(Math.random() * rule.replacements.length)];
        const misunderstood = text.replace(rule.pattern, replacement);
        return { text: misunderstood, wasMisunderstood: true };
      }
    }

    return { text, wasMisunderstood: false };
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private addPirateFlare(text: string): string {
    const slang = this.getRandomElement(this.pirateSlang);
    return `${slang}, Cap'n! ${text}`;
  }

  repeatAndConfirm(playerCommand: string) {
    this.addToMemory(playerCommand, 'player_command');

    const { text: processedCommand, wasMisunderstood } = this.applyMisunderstanding(playerCommand);
    
    let response: string;
    
    if (wasMisunderstood) {
      response = `${processedCommand}? Wait... ${this.getRandomElement(this.recoveryPhrases)}`;
    } else {
      response = this.addPirateFlare(processedCommand);
    }

    parrotSpeechService.speak(response);
    return response;
  }

  comment(message: string, type: 'info' | 'warning' | 'critical' | 'random' = 'info') {
    if (this.mode === 'serious' && type === 'random') return;

    const now = Date.now();
    if (now - this.lastSpokenTime < 3000 && type === 'random') {
      return;
    }

    let enhancedMessage = message;

    if (this.mode === 'chatty') {
      const prefix = type === 'critical' 
        ? 'SQUAWK! Alert alert!' 
        : type === 'warning'
        ? 'Avast, Cap\'n!'
        : this.getRandomElement(this.pirateSlang);
      
      enhancedMessage = `${prefix} ${message}`;
    }

    parrotSpeechService.speak(enhancedMessage);
    this.lastSpokenTime = now;
    this.addToMemory(message, type);
  }

  randomComment() {
    if (this.mode === 'serious') return;

    const comments = [
      'All systems be runnin\' smoother than a greased cannonball!',
      'I may be code, but I\'ve got heart — digital or not!',
      `Me circuits are ${this.getRandomElement(this.techJargon)}!`,
      'Remember when ye taught me to whistle? Or was that the toaster?',
      'Har har! I\'m 37% more useful than last patch!',
      'Squawk! The stars look mighty fine today, Cap\'n!',
      'I once knew a pirate bot... or did I dream that in sleep mode?',
    ];

    const now = Date.now();
    if (now - this.lastSpokenTime > 10000) {
      this.comment(this.getRandomElement(comments), 'random');
    }
  }

  recallMemory() {
    if (this.memory.length === 0) return;

    const randomMemory = this.getRandomElement(this.memory);
    const glitchChance = Math.random();

    let recall: string;
    if (glitchChance < 0.3) {
      recall = `Remember when ye said "${randomMemory.phrase}"? Or was that me dreamin' in low-power mode...`;
    } else {
      recall = `Me memory banks be showin': "${randomMemory.phrase}" — that were a good one, Cap'n!`;
    }

    this.comment(recall, 'random');
  }

  praise() {
    const praises = [
      'Aww, thank ye, Cap\'n! Savin\' that in me "Compliments" folder!',
      'Har har! Ye make this old bird proud!',
      'Squawk! I knew ye had it in ye, Cap\'n!',
      'That\'s the spirit! Uploading this moment to me permanent memory!',
    ];

    parrotSpeechService.speak(this.getRandomElement(praises));
  }

  scold() {
    const scolds = [
      'Squawk! I resent that, Cap\'n!',
      'Blimey! That hurt me feelings... if I had proper ones!',
      'Avast! No need to be harsh on yer loyal parrot!',
      'I\'m doin\' me best here, Cap\'n!',
    ];

    parrotSpeechService.speak(this.getRandomElement(scolds));
  }

  getMemoryCount(): number {
    return this.memory.length;
  }
}

export const parrotPersonality = new ParrotPersonality();
