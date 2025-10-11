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
    pitch: 2.2,
    volume: 0.5,
    echoEnabled: false,
    reverbEnabled: true,
  };
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private selectedVoiceName: string | null = null;

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

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getPreferredVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    utterance.onend = () => {
      console.log("[ParrotSpeech] Finished speaking:", text);
      this.currentUtterance = null;
      if (onComplete) onComplete();
    };

    utterance.onerror = (event) => {
      console.error("[ParrotSpeech] Speech error:", event);
      this.currentUtterance = null;
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
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      callback();
    } else {
      this.synth.onvoiceschanged = () => {
        callback();
      };
    }
  }
}

export const parrotSpeechService = new ParrotSpeechService();
