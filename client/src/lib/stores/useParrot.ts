import { create } from 'zustand';
import { parrotSpeechService } from '@/services/ParrotSpeechService';
import { parrotPersonality, ParrotMode } from '@/services/ParrotPersonality';

interface ParrotSettings {
  mode: ParrotMode;
  isMuted: boolean;
  volume: number;
  rate: number;
  pitch: number;
  isVisible: boolean;
  showText: boolean; // Show text display instead of/alongside voice
  selectedVoice: string | null; // Selected voice name
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
  
  initialize: () => void;
  setMode: (mode: ParrotMode) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setVisible: (visible: boolean) => void;
  setShowText: (showText: boolean) => void;
  setVoice: (voiceName: string | null) => void;
  clearMessages: () => void;
  
  speak: (text: string) => void;
  comment: (message: string, type?: 'info' | 'warning' | 'critical' | 'random') => void;
  repeatCommand: (command: string) => void;
  squawk: () => void;
  praise: () => void;
  scold: () => void;
  randomComment: () => void;
  recallMemory: () => void;
}

export const useParrot = create<ParrotState>((set, get) => ({
  settings: {
    mode: 'chatty',
    isMuted: false,
    volume: 0.8,
    rate: 1.1,
    pitch: 1.2,
    isVisible: true,
    showText: false,
    selectedVoice: null,
  },
  isInitialized: false,
  messages: [],

  initialize: () => {
    parrotSpeechService.ensureVoicesLoaded(() => {
      console.log('[Parrot] Voice synthesis initialized');
      set({ isInitialized: true });
      
      parrotPersonality.comment('Squawk! Parrot systems online, Cap\'n!', 'info');
    });
  },

  setMode: (mode) => {
    set((state) => ({
      settings: { ...state.settings, mode },
    }));
    parrotPersonality.setMode(mode);
    
    if (mode === 'serious') {
      parrotPersonality.comment('Switching to serious mode, Cap\'n. All business now.', 'info');
    } else {
      parrotPersonality.comment('Har har! Back to chatty mode! Let\'s have some fun!', 'info');
    }
  },

  setMuted: (muted) => {
    set((state) => ({
      settings: { ...state.settings, isMuted: muted },
    }));
    parrotSpeechService.setMuted(muted);
  },

  setVolume: (volume) => {
    set((state) => ({
      settings: { ...state.settings, volume },
    }));
    parrotSpeechService.updateSettings({ volume });
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

  clearMessages: () => {
    set({ messages: [] });
  },

  speak: (text) => {
    const state = get();
    
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
    
    // Speak if not muted
    if (!state.settings.isMuted) {
      parrotSpeechService.speak(text);
    }
  },

  comment: (message, type = 'info') => {
    const state = get();
    
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
    
    // Speak if not muted
    if (!state.settings.isMuted) {
      parrotPersonality.comment(message, type);
    }
  },

  repeatCommand: (command) => {
    if (!get().settings.isMuted) {
      parrotPersonality.repeatAndConfirm(command);
    }
  },

  squawk: () => {
    if (!get().settings.isMuted) {
      parrotSpeechService.squawk();
    }
  },

  praise: () => {
    if (!get().settings.isMuted) {
      parrotPersonality.praise();
    }
  },

  scold: () => {
    if (!get().settings.isMuted) {
      parrotPersonality.scold();
    }
  },

  randomComment: () => {
    if (!get().settings.isMuted) {
      parrotPersonality.randomComment();
    }
  },

  recallMemory: () => {
    if (!get().settings.isMuted) {
      parrotPersonality.recallMemory();
    }
  },
}));
