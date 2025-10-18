import { create } from "zustand";

interface HintState {
  shownHints: Set<string>;
  disabledHints: Set<string>;
  currentHint: string | null;
  showHint: (hintId: string) => void;
  dismissHint: () => void;
  disableHint: (hintId: string) => void;
  hasSeenHint: (hintId: string) => boolean;
  isHintDisabled: (hintId: string) => boolean;
}

const STORAGE_KEY = "solar-system-hints";

const loadHintPreferences = (): { shown: string[]; disabled: string[] } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load hint preferences:", error);
  }
  return { shown: [], disabled: [] };
};

const saveHintPreferences = (shown: Set<string>, disabled: Set<string>) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        shown: Array.from(shown),
        disabled: Array.from(disabled),
      })
    );
  } catch (error) {
    console.error("Failed to save hint preferences:", error);
  }
};

export const useHints = create<HintState>((set, get) => {
  const { shown, disabled } = loadHintPreferences();
  
  return {
    shownHints: new Set(shown),
    disabledHints: new Set(disabled),
    currentHint: null,

    showHint: (hintId: string) => {
      const { shownHints, disabledHints, currentHint } = get();
      
      if (disabledHints.has(hintId)) {
        console.log(`Hint ${hintId} is disabled, not showing`);
        return;
      }

      // Prevent replacing a hint that's already showing
      if (currentHint) {
        console.log(`A hint is already showing (${currentHint}), skipping ${hintId}`);
        return;
      }

      const newShownHints = new Set(shownHints);
      newShownHints.add(hintId);
      
      set({ currentHint: hintId, shownHints: newShownHints });
      saveHintPreferences(newShownHints, disabledHints);
      
      console.log(`Showing hint: ${hintId}`);
    },

    dismissHint: () => {
      set({ currentHint: null });
    },

    disableHint: (hintId: string) => {
      const { disabledHints, shownHints } = get();
      
      const newDisabledHints = new Set(disabledHints);
      newDisabledHints.add(hintId);
      
      set({ disabledHints: newDisabledHints, currentHint: null });
      saveHintPreferences(shownHints, newDisabledHints);
      
      console.log(`Hint ${hintId} disabled permanently`);
    },

    hasSeenHint: (hintId: string) => {
      return get().shownHints.has(hintId);
    },

    isHintDisabled: (hintId: string) => {
      return get().disabledHints.has(hintId);
    },
  };
});
