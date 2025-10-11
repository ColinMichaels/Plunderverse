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
  private isMuted: boolean = false;
  private selectedVoiceName: string | null = null;
    private lastSpeakAt = 0;
    private speakCooldownMs = 250; // avoid cancel/speak thrash during rapid transitions

  constructor() {
    this.synth = window.speechSynthesis;
    this.initAudioContext();
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
      return this.synth.getVoices();
  }

  speak(text: string, onComplete?: () => void) {
    if (this.isMuted || !text) return;

      // If voices are not yet loaded (Safari/Chrome race), defer speaking until they are.
      if (this.synth.getVoices().length === 0) {
          return this.ensureVoicesLoaded(() => this.speak(text, onComplete));
      }

      // Debounce to avoid rapid cancel/speak cycles during scene transitions.
      const now = performance.now();
      if (now - this.lastSpeakAt < this.speakCooldownMs) {
          const delay = this.speakCooldownMs - (now - this.lastSpeakAt);
          setTimeout(() => this.speak(text, onComplete), Math.max(50, delay));
          return;
      }
      this.lastSpeakAt = now;

      // Resume AudioContext on user interaction devices (mobile/safari autplay policies)
      try {
          this.audioContext?.resume?.();
      } catch {
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
      console.log("[ParrotSpeech] Finished speaking:", text);
      this.currentUtterance = null;
      if (onComplete) onComplete();
    };

      utterance.onerror = (event: any) => {
          const err = (event?.error || event?.name || "unknown").toString();
          // During fast transitions, browsers often emit 'interrupted' or 'canceled'—not fatal.
          if (err === "interrupted" || err === "canceled" || err === "not-allowed") {
              console.debug("[ParrotSpeech] Non-fatal speech issue:", err, text);
              if (onComplete) onComplete();
          } else {
              console.error("[ParrotSpeech] Speech error:", err, event, this.currentUtterance, utterance);
          }
      };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);

    console.log("[ParrotSpeech] Speaking:", text);
  }

  squawk() {
    const squawks = ["Squawk!", "Awk awk!", "Rawk!", "Screee!", "Chirp chirp!"];
    const randomSquawk = squawks[Math.floor(Math.random() * squawks.length)];
    this.speak(randomSquawk);
  }

  stop() {
    if (this.currentUtterance) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
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

  ensureVoicesLoaded(callback: () => void) {
      const run = () => {
          try {
              this.synth.onvoiceschanged = null as any;
          } catch {
          }
          callback();
      };
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
        run();
    } else {
        this.synth.onvoiceschanged = run;
    }
  }
}

export const parrotSpeechService = new ParrotSpeechService();
