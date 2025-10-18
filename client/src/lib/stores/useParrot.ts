import {create} from 'zustand';
import {parrotSpeechService} from '@/services/ParrotSpeechService';
import {Parrot, ParrotMode} from '@/services/ParrotPersonality';
import {useAudio} from '@/lib/stores/ui/useAudio';

const STORAGE_KEY = 'plunderverse_audio_settings';

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function loadParrotSettings(): Partial<ParrotSettings> {
  if (!hasLocalStorage()) return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        isMuted: settings.parrotMute,
        volume: settings.parrotVolume,
      };
    }
  } catch (error) {
    console.error('[Parrot] Failed to load settings:', error);
  }
  return {};
}

function saveParrotSettings(isMuted: boolean, volume: number) {
  if (!hasLocalStorage()) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    const updated = { ...current, parrotMute: isMuted, parrotVolume: volume };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[Parrot] Failed to save settings:', error);
  }
}

interface ParrotSettings {
  mode: ParrotMode;
  isMuted: boolean;
  volume: number;
  rate: number;
  pitch: number;
  isVisible: boolean;
  showText: boolean; // Show text display instead of/alongside voice
  selectedVoice: string | null; // Selected voice name
  isSpeaking: boolean; // Track if parrot is currently speaking
}

export interface ParrotMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'critical' | 'random';
  timestamp: number;
}

interface ParrotState {
  settings: ParrotSettings;
  isInitialized: boolean;
  messages: ParrotMessage[]; // Message queue for text display
  currentMessage: string | null; // Current message being displayed

  initialize: () => void;
  setMode: (mode: ParrotMode) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setVisible: (visible: boolean) => void;
  setShowText: (showText: boolean) => void;
  setVoice: (voiceName: string | null) => void;
  setSpeaking: (speaking: boolean) => void;
    setCurrentMessage: (message: string | {
        text: string;
        tone?: 'info' | 'warning' | 'critical' | 'random'
    } | null) => void;
  clearMessages: () => void;

  speak: (text: string) => void;
    speakRaw: (text: string) => void;
  comment: (message: string, type?: 'info' | 'warning' | 'critical' | 'random') => void;
  repeatCommand: (command: string) => void;
  squawk: () => void;
  praise: () => void;
  scold: () => void;
  randomComment: () => void;
  recallMemory: () => void;
}

const savedSettings = loadParrotSettings();

// Helper function to update parrot speech service volume with master volume multiplication
function updateParrotSpeechVolume() {
  const { masterVolume, parrotVolume } = useAudio.getState();
  const actualVolume = parrotVolume * masterVolume;
  parrotSpeechService.updateSettings({ volume: actualVolume });
}

export const useParrot = create<ParrotState>((set, get) => ({
  settings: {
    mode: 'chatty',
    isMuted: savedSettings.isMuted ?? false,
    volume: savedSettings.volume ?? 0.8,
    rate: 1.1,
    pitch: 1.2,
    isVisible: true,
    showText: false,
    selectedVoice: null,
    isSpeaking: false,
  },
  isInitialized: false,
  messages: [],
  currentMessage: null,

  initialize: () => {
    const state = get();
    parrotSpeechService.setMuted(state.settings.isMuted);
    updateParrotSpeechVolume();
    
    // Subscribe to master volume and parrot volume changes to keep parrot speech volume in sync
    // Note: We're already updating in setParrotVolume and setMasterVolume in useAudio,
    // but this subscription handles any other edge cases
    let lastMasterVolume = useAudio.getState().masterVolume;
    let lastParrotVolume = useAudio.getState().parrotVolume;
    
    useAudio.subscribe((state) => {
      if (state.masterVolume !== lastMasterVolume || state.parrotVolume !== lastParrotVolume) {
        lastMasterVolume = state.masterVolume;
        lastParrotVolume = state.parrotVolume;
        updateParrotSpeechVolume();
      }
    });
    
    parrotSpeechService.ensureVoicesLoaded(() => {
      console.log('[Parrot] Voice synthesis initialized');
      set({ isInitialized: true });

      const masterMuted = useAudio.getState().masterMute;
      if (!state.settings.isMuted && !masterMuted) {
        Parrot.comment('Squawk! Parrot systems online, Cap\'n!', 'info');
      }
    });
  },

  setMode: (mode) => {
    set((state) => ({
      settings: { ...state.settings, mode },
    }));
      Parrot.setMode(mode);

    const state = get();
    const masterMuted = useAudio.getState().masterMute;
    if (!state.settings.isMuted && !masterMuted) {
      if (mode === 'serious') {
          Parrot.comment('Switching to serious mode, Cap\'n. All business now.', 'info');
      } else {
          Parrot.comment('Har har! Back to chatty mode! Let\'s have some fun!', 'info');
      }
    }
  },

  setMuted: (muted) => {
    set((state) => ({
      settings: { ...state.settings, isMuted: muted },
    }));
    parrotSpeechService.setMuted(muted);
    const state = get();
    saveParrotSettings(muted, state.settings.volume);
  },

  setVolume: (volume) => {
    set((state) => ({
      settings: { ...state.settings, volume },
    }));
    updateParrotSpeechVolume();
    const state = get();
    saveParrotSettings(state.settings.isMuted, volume);
  },

  setVisible: (visible) => {
    set((state) => ({
      settings: { ...state.settings, isVisible: visible },
    }));
  },

  setShowText: (showText) => {
    set((state) => ({
      settings: { ...state.settings, showText },
    }));
  },

  setVoice: (voiceName) => {
    set((state) => ({
      settings: { ...state.settings, selectedVoice: voiceName },
    }));
    parrotSpeechService.setVoice(voiceName);
  },

  setSpeaking: (speaking) => {
    set((state) => ({
      settings: { ...state.settings, isSpeaking: speaking },
    }));
  },

    setCurrentMessage: (payload) => {
        const state = get();
        let text: string | null = null;
        let tone: 'info' | 'warning' | 'critical' | 'random' = 'info';

        if (payload === null) {
            text = null;
        } else if (typeof payload === 'string') {
            text = payload;
        } else if (payload && typeof payload === 'object') {
            text = payload.text ?? null;
            if (payload.tone) tone = payload.tone;
        }

        set({currentMessage: text});

        if (state.settings.showText && text) {
            const msg: ParrotMessage = {
                id: `msg-${Date.now()}-${Math.random()}`,
                text,
                type: tone,
                timestamp: Date.now(),
            };
            set((s) => ({messages: [...s.messages, msg].slice(-10)}));
        }
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  speak: (text) => {
    const state = get();

    // Set current message and speaking state
    set({ currentMessage: text });
    get().setSpeaking(true);

    // Add to message queue if text display is enabled
    if (state.settings.showText) {
      const message: ParrotMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        text,
        type: 'info',
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, message].slice(-10), // Keep last 10 messages
      }));
    }

    // Speak if not muted (check both parrot mute and master audio mute)
    const masterMuted = useAudio.getState().masterMute;
    if (!state.settings.isMuted && !masterMuted) {
        // Route through personality so voice, filters, memory & mood apply
        Parrot.comment(text, 'info');

        // Monitor speech completion (same approach as in comment())
        const checkSpeaking = setInterval(() => {
            if (!parrotSpeechService.isSpeaking()) {
                clearInterval(checkSpeaking);
                get().setSpeaking(false);
                setTimeout(() => {
                    get().setCurrentMessage(null);
                }, 1000);
            }
        }, 100);
    } else {
        // If muted, just clear speaking state after delay
        setTimeout(() => {
            get().setSpeaking(false);
            get().setCurrentMessage(null);
        }, 3000);
    }
  },

    speakRaw: (text) => {
        const state = get();

        // Set current message and speaking state
        set({currentMessage: text});
        get().setSpeaking(true);

        // Add to message queue if text display is enabled
        if (state.settings.showText) {
            const message: ParrotMessage = {
                id: `msg-${Date.now()}-${Math.random()}`,
                text,
                type: 'info',
                timestamp: Date.now(),
            };
            set((state) => ({
                messages: [...state.messages, message].slice(-10),
            }));
        }

        // Check both parrot mute and master audio mute
        const masterMuted = useAudio.getState().masterMute;
        if (!state.settings.isMuted && !masterMuted) {
            // Speak without personality filters
            Parrot.sayRaw(text);

            // Monitor speech completion
            const checkSpeaking = setInterval(() => {
                if (!parrotSpeechService.isSpeaking()) {
                    clearInterval(checkSpeaking);
                    get().setSpeaking(false);
                    setTimeout(() => {
                        get().setCurrentMessage(null);
                    }, 1000);
                }
            }, 100);
    } else {
      // If muted, just clear speaking state after delay
      setTimeout(() => {
        get().setSpeaking(false);
        get().setCurrentMessage(null);
      }, 3000);
    }
  },

  comment: (message, type = 'info') => {
    const state = get();

    // Set current message and speaking state
    set({ currentMessage: message });
    get().setSpeaking(true);

    // Add to message queue if text display is enabled
    if (state.settings.showText) {
      const msg: ParrotMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        text: message,
        type,
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, msg].slice(-10), // Keep last 10 messages
      }));
    }

      // Speak if not muted (check both parrot mute and master audio mute)
    const masterMuted = useAudio.getState().masterMute;
    if (!state.settings.isMuted && !masterMuted) {
        Parrot.comment(message, type);
      // Monitor speech completion
      const checkSpeaking = setInterval(() => {
        if (!parrotSpeechService.isSpeaking()) {
          clearInterval(checkSpeaking);
          get().setSpeaking(false);
          setTimeout(() => {
            get().setCurrentMessage(null);
          }, 1000);
        }
      }, 100);
    } else {
      // If muted, just clear speaking state after delay
      setTimeout(() => {
        get().setSpeaking(false);
        get().setCurrentMessage(null);
      }, 3000);
    }
  },

  repeatCommand: (command) => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.repeatAndConfirm(command);
    }
  },

  squawk: () => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.squawk();
    }
  },

  praise: () => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.praise();
    }
  },

  scold: () => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.scold();
    }
  },

  randomComment: () => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.randomComment();
    }
  },

  recallMemory: () => {
    const masterMuted = useAudio.getState().masterMute;
    if (!get().settings.isMuted && !masterMuted) {
        Parrot.recallMemory();
    }
  },
}));
