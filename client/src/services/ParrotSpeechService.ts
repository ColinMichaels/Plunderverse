export interface ParrotVoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  echoEnabled: boolean;
  reverbEnabled: boolean;
}

export class ParrotSpeechService {
  private synth: SpeechSynthesis;
  private audioContext: AudioContext | null = null;
  private settings: ParrotVoiceSettings = {
    rate: 1.1,
    pitch: 1.8,
    volume: 0.8,
    echoEnabled: true,
    reverbEnabled: true,
  };
  private currentUtterance: SpeechSynthesisUtterance | null = null;
    private audioUnlocked = false;
    private voicesReady = false;
    private queue: Array<{ text: string; onComplete?: () => void }> = [];
    private unlocking = false;
  private isMuted: boolean = false;
  private selectedVoiceName: string | null = null;
    private lastSpeakAt = 0;
    private speakCooldownMs = 250; // avoid cancel/speak thrash during rapid transitions

  constructor() {
    this.synth = window.speechSynthesis;
    this.initAudioContext();

      // Attempt to unlock audio/tts on first user gesture
      this.attachUnlockHandlers();

      // Pre-warm voices list; some browsers populate asynchronously
      this.ensureVoicesLoaded();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      console.log("[ParrotSpeech] Audio context initialized for voice effects");
    } catch (error) {
      console.warn(
        "[ParrotSpeech] Web Audio API not available, effects disabled:",
        error,
      );
    }
  }

    private attachUnlockHandlers() {
        if (this.unlocking) return;
        this.unlocking = true;

        const unlock = async () => {
            try {
                if (this.audioContext && this.audioContext.state !== 'closed') {
                    await this.audioContext.resume();
                }
            } catch {
            }
            // Trigger a no-op utterance to satisfy autoplay policies in some UAs
            try {
                const u = new SpeechSynthesisUtterance(" ");
                u.volume = 0; // silent
                this.synth.speak(u);
            } catch {
            }
            this.audioUnlocked = true;
            remove();
            console.log('[ParrotSpeech] Audio/voices unlocked by user gesture');
        };

        const remove = () => {
            ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
                window.removeEventListener(evt, unlock, {capture: true} as any);
            });
        };

        ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
            window.addEventListener(evt, unlock, {once: true, passive: true, capture: true} as any);
        });
    }

  private getPreferredVoice(): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices();

    // Use selected voice if set
    if (this.selectedVoiceName) {
      const selected = voices.find((v) => v.name === this.selectedVoiceName);
      if (selected) return selected;
    }

    const preferredVoices = [
      "Google UK English Male",
      "Google US English",
      "Microsoft David",
      "Alex",
      "Daniel",
    ];

    for (const preferred of preferredVoices) {
      const voice = voices.find((v) => v.name.includes(preferred));
      if (voice) return voice;
    }

    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    return englishVoice || voices[0] || null;
  }

  setVoice(voiceName: string | null) {
    this.selectedVoiceName = voiceName;
    console.log("[ParrotSpeech] Voice changed to:", voiceName || "default");
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
      try {
      return this.synth.getVoices();
      } catch {
          return [];
      }
  }

  speak(text: string, onComplete?: () => void) {
    if (this.isMuted || !text) return;

      // If voices not yet ready, wait then enqueue
      const maybeEnqueue = () => this.enqueue(text, onComplete);

      // iOS/Safari/Chrome often require user gesture; attach handlers and enqueue
      if (!this.audioUnlocked) {
          this.attachUnlockHandlers();
          return maybeEnqueue();
      }

      if (!this.voicesReady) {
          const p = this.ensureVoicesLoaded();
          if (p && typeof (p as any).then === 'function') {
              (p as Promise<void>).then(maybeEnqueue).catch(maybeEnqueue);
              return;
          }
      }

      // Normal path: enqueue and drain
      this.enqueue(text, onComplete);
  }

    private _speakInternal(text: string, onComplete?: () => void) {
        // Debounce to avoid rapid cancel/speak cycles during scene transitions.
        const now = performance.now();
        if (now - this.lastSpeakAt < this.speakCooldownMs) {
            const delay = this.speakCooldownMs - (now - this.lastSpeakAt);
            setTimeout(() => this._speakInternal(text, onComplete), Math.max(50, delay));
            return;
        }
        this.lastSpeakAt = now;

        // Resume AudioContext on user interaction devices (mobile/safari autoplay policies)
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.resume().catch(() => {});
        }

        // Cancel any current utterance cleanly
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getPreferredVoice();
        if (voice) utterance.voice = voice;

    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onComplete) onComplete();
        console.log('[ParrotSpeech] Finished speaking:', text);
    };

        utterance.onerror = (event: any) => {
            const err = (event?.error || event?.name || 'unknown').toString();
            if (err === 'interrupted' || err === 'canceled' || err === 'not-allowed') {
                console.debug('[ParrotSpeech] Non-fatal speech issue:', err, text);
                if (onComplete) onComplete();
            } else {
                console.error('[ParrotSpeech] Speech error:', err, event, this.currentUtterance, utterance);
            }
        };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
        console.log('[ParrotSpeech] Speaking:', text);
    }

    private enqueue(text: string, onComplete?: () => void) {
        this.queue.push({text, onComplete});
        this.drainQueue();
    }

    private drainQueue() {
        if (this.synth.speaking || this.currentUtterance) return;
        const next = this.queue.shift();
        if (!next) return;
        this._speakInternal(next.text, () => {
            next.onComplete?.();
            // slight delay to avoid thrash
            setTimeout(() => this.drainQueue(), 50);
        });
  }

  squawk() {
    const squawks = ["Squawk!", "Awk awk!", "Rawk!", "Screee!", "Chirp chirp!"];
    const randomSquawk = squawks[Math.floor(Math.random() * squawks.length)];
    this.speak(randomSquawk);
  }

  stop() {
      try {
          this.synth.cancel();
      } catch {
      }
      this.currentUtterance = null;
  }

    cancelAll() {
        this.queue.length = 0;
        this.stop();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
    console.log("[ParrotSpeech] Muted:", muted);
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  updateSettings(settings: Partial<ParrotVoiceSettings>) {
    this.settings = { ...this.settings, ...settings };
    console.log("[ParrotSpeech] Settings updated:", this.settings);
  }

  getSettings(): ParrotVoiceSettings {
    return { ...this.settings };
  }

    ensureVoicesLoaded(callback?: () => void): Promise<void> | void {
        const run = () => {
            try {
                this.synth.onvoiceschanged = null as any;
            } catch {
            }
            this.voicesReady = true;
            if (callback) callback();
        };

        try {
            const voices = this.synth.getVoices();
            if (voices.length > 0) {
        run();
                return callback ? undefined : Promise.resolve();
            }
        } catch {
        }

        if (callback) {
            this.synth.onvoiceschanged = run;
            return;
    }

        return new Promise<void>((resolve) => {
            this.synth.onvoiceschanged = () => {
                run();
                resolve();
            };
            // Fallback timer in case onvoiceschanged never fires
            setTimeout(() => {
                run();
                resolve();
            }, 1500);
        });
  }
}

export const parrotSpeechService = new ParrotSpeechService();
