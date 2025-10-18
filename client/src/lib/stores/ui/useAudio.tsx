import {create} from "zustand";
import {Howl} from "howler";
import {AUDIO_CONFIG} from "../../audioConfig";
import {parrotSpeechService} from "@/services/ParrotSpeechService";
import Logger from "@/services/Logger.ts";

const STORAGE_KEY = "plunderverse_audio_settings";

function hasLocalStorage(): boolean {
    try {
        return typeof window !== "undefined" && typeof localStorage !== "undefined";
    } catch {
        return false;
    }
}

function loadAudioSettings() {
    if (!hasLocalStorage()) {
        return {
            masterMute: false,
            musicMute: false,
            sfxMute: false,
            masterVolume: 1,
            musicVolume: 1,
            sfxVolume: 1,
            parrotVolume: 1,
        };
    }
    try {
        const st = localStorage.getItem(STORAGE_KEY);
        if (st) {
            const settings = JSON.parse(st);
            return {
                masterMute: settings.masterMute ?? false,
                musicMute: settings.musicMute ?? false,
                sfxMute: settings.sfxMute ?? false,
                masterVolume: settings.masterVolume ?? 1,
                musicVolume: settings.musicVolume ?? 1,
                sfxVolume: settings.sfxVolume ?? 1,
                parrotVolume: settings.parrotVolume ?? 1,
            };
        }
    } catch (err) {
        Logger.error("[AudioStore] loadAudioSettings error:", err);
    }
    return {
        masterMute: false,
        musicMute: false,
        sfxMute: false,
        masterVolume: 1,
        musicVolume: 1,
        sfxVolume: 1,
        parrotVolume: 1,
    };
}

function saveAudioSettings(
    masterMute: boolean,
    musicMute: boolean,
    sfxMute: boolean,
    masterVolume: number,
    musicVolume: number,
    sfxVolume: number,
    parrotVolume: number
) {
    if (!hasLocalStorage()) return;
    try {
        const cur = localStorage.getItem(STORAGE_KEY)
            ? JSON.parse(localStorage.getItem(STORAGE_KEY)!)
            : {};
        const upd = {
            ...cur,
            masterMute,
            musicMute,
            sfxMute,
            masterVolume,
            musicVolume,
            sfxVolume,
            parrotVolume,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(upd));
    } catch (err) {
        Logger.error("[AudioStore] saveAudioSettings error:", err);
    }
}

// ----- Types & interfaces -----

type AudioCategory = "music" | "sfx" | "parrot" | "ambient";

interface SoundInstance {
    instance: Howl | HTMLAudioElement;
    howlId: number | null;
    baseVolume: number;
    category: AudioCategory;
    fadeInMs?: number;
    fadeOutMs?: number;
    key?: string;
}

// ----- AudioManager -----

class AudioManager {
    masterMute = false;
    masterVolume = 1;

    categoryMute: Record<AudioCategory, boolean> = {
        music: false,
        sfx: false,
        parrot: false,
        ambient: false,
    };

    categoryVolume: Record<AudioCategory, number> = {
        music: 1,
        sfx: 1,
        parrot: 1,
        ambient: 1,
    };

    activeSounds = new Set<SoundInstance>();
    throttleMap = new Map<string, number>();

    registerSound(si: SoundInstance) {
        this.activeSounds.add(si);
        this.applyVolumeToInstance(si);
    }

    unregisterSound(si: SoundInstance) {
        this.activeSounds.delete(si);
    }

    computeEffectiveVolume(category: AudioCategory, baseVolume: number): number {
        if (this.masterMute) return 0;
        if (this.categoryMute[category]) return 0;
        return baseVolume * this.masterVolume * this.categoryVolume[category];
    }

    applyVolumeToInstance(si: SoundInstance) {
        const effective = this.computeEffectiveVolume(si.category, si.baseVolume);
        if (si.instance instanceof Howl) {
            if (si.howlId != null) {
                si.instance.volume(effective, si.howlId);
                si.instance.mute(effective === 0, si.howlId);
            } else {
                si.instance.volume(effective);
                si.instance.mute(effective === 0);
            }
        } else {
            // HTMLAudioElement case
            const el = si.instance as HTMLAudioElement;
            el.volume = effective;
            el.muted = effective === 0;
        }
    }

    recalcAllVolumes() {
        for (const si of this.activeSounds) {
            this.applyVolumeToInstance(si);
        }
    }

    setMasterMute(m: boolean) {
        this.masterMute = m;
        this.recalcAllVolumes();
    }

    setMasterVolume(v: number) {
        this.masterVolume = Math.max(0, Math.min(1, v));
        this.recalcAllVolumes();
    }

    setCategoryMute(category: AudioCategory, m: boolean) {
        this.categoryMute[category] = m;
        this.recalcAllVolumes();
    }

    setCategoryVolume(category: AudioCategory, v: number) {
        this.categoryVolume[category] = Math.max(0, Math.min(1, v));
        this.recalcAllVolumes();
    }

    /**
     * Play a Howl with optional fade in/out and crossfade support.
     * crossfadeFrom: fade out that instance while fading this new one in.
     */
    async playHowl(
        howl: Howl,
        category: AudioCategory,
        baseVolume: number,
        options?: {
            loop?: boolean;
            fadeInMs?: number;
            fadeOutMs?: number;
            key?: string;
            crossfadeFrom?: SoundInstance;
        }
    ): Promise<SoundInstance | null> {
        const {fadeInMs = 0, fadeOutMs = 0, key, crossfadeFrom} = options ?? {};
        const now = performance.now();

        if (key) {
            const last = this.throttleMap.get(key) ?? 0;
            const minInterval = 100;
            if (now - last < minInterval) {
                // Silently skip throttled sounds instead of throwing error
                return Promise.resolve(null);
            }
            this.throttleMap.set(key, now);
        }

        // Crossfade old instance if provided
        if (crossfadeFrom) {
            const fo = fadeOutMs > 0 ? fadeOutMs : 200;
            if (
                crossfadeFrom.instance instanceof Howl &&
                crossfadeFrom.howlId != null
            ) {
                const oldId = crossfadeFrom.howlId;
                const oldVol = crossfadeFrom.instance.volume(oldId);
                if (typeof oldVol === "number") {
                    crossfadeFrom.instance.fade(oldVol, 0, fo, oldId);
                }
                crossfadeFrom.instance.once("fade", () => {
                    if (crossfadeFrom.instance instanceof Howl) {
                        crossfadeFrom.instance.stop(oldId);
                    }
                    this.unregisterSound(crossfadeFrom);
                });
            } else if (crossfadeFrom.instance instanceof HTMLAudioElement) {
                const el = crossfadeFrom.instance as HTMLAudioElement;
                const orig = el.volume;
                const startTime = performance.now();
                const fadeStep = () => {
                    const t = (performance.now() - startTime) / fo;
                    if (t < 1) {
                        el.volume = orig * (1 - t);
                        requestAnimationFrame(fadeStep);
                    } else {
                        el.pause();
                        el.currentTime = 0;
                        this.unregisterSound(crossfadeFrom);
                    }
                };
                fadeStep();
            }
        }

        const si: SoundInstance = {
            instance: howl,
            howlId: null,
            baseVolume,
            category,
            fadeInMs,
            fadeOutMs,
            key,
        };
        this.registerSound(si);

        const effectiveVol = this.computeEffectiveVolume(category, baseVolume);
        // If fading in, start at 0; else set directly
        howl.volume(fadeInMs > 0 ? 0 : effectiveVol);

        const id = howl.play();
        si.howlId = id;

        // Fade in
        if (fadeInMs > 0) {
            try {
                howl.fade(0, effectiveVol, fadeInMs, id);
            } catch (err) {
                // fallback if fade not supported
                howl.volume(effectiveVol, id);
            }
        }

        // Fade out near end if requested
        if (fadeOutMs > 0) {
            // Wait for sound to load before getting duration
            howl.once("load", () => {
                const dur = howl.duration(id);
                if (dur && typeof dur === "number" && !isNaN(dur)) {
                    const totalMs = dur * 1000;
                    const fadeStart = Math.max(0, totalMs - fadeOutMs);
                    setTimeout(() => {
                        if (howl.playing(id)) {
                            const currentVol = howl.volume(id);
                            if (typeof currentVol === "number") {
                                howl.fade(currentVol, 0, fadeOutMs, id);
                            }
                            howl.once("fade", () => {
                                if (howl.volume(id) === 0) {
                                    howl.stop(id);
                                    this.unregisterSound(si);
                                }
                            });
                        }
                    }, fadeStart);
                } else {
                    // Fallback if duration not available
                    howl.once("end", () => {
                        this.unregisterSound(si);
                    });
                }
            });
        } else {
            // No fade-out: unregister when ends
            howl.once("end", () => {
                this.unregisterSound(si);
            });
        }

        return si;
    }

    /** Play HTMLAudioElement with optional fade & throttle (no crossfade) */
    playHtml(
        audioEl: HTMLAudioElement,
        category: AudioCategory,
        baseVolume: number,
        options?: { fadeInMs?: number; fadeOutMs?: number; key?: string }
    ): SoundInstance {
        const {fadeInMs = 0, fadeOutMs = 0, key} = options ?? {};
        const now = performance.now();

        if (key) {
            const last = this.throttleMap.get(key) ?? 0;
            const minInterval = 100;
            if (now - last < minInterval) {
                throw new Error("Throttled");
            }
            this.throttleMap.set(key, now);
        }

        const si: SoundInstance = {
            instance: audioEl,
            howlId: null,
            baseVolume,
            category,
            fadeInMs,
            fadeOutMs,
            key,
        };
        this.registerSound(si);

        const effectiveVol = this.computeEffectiveVolume(category, baseVolume);
        if (fadeInMs > 0) {
            audioEl.volume = 0;
            const start = performance.now();
            const step = () => {
                const t = (performance.now() - start) / fadeInMs;
                if (t < 1) {
                    audioEl.volume = effectiveVol * t;
                    requestAnimationFrame(step);
                } else {
                    audioEl.volume = effectiveVol;
                }
            };
            step();
        } else {
            audioEl.volume = effectiveVol;
        }

        audioEl.play().catch((err) => {
            Logger.error("AudioManager playHtml error:", err);
        });

        if (fadeOutMs > 0) {
            const totalMs = audioEl.duration * 1000;
            const fadeStart = Math.max(0, totalMs - fadeOutMs);
            setTimeout(() => {
                const orig = audioEl.volume;
                const start2 = performance.now();
                const fadeStep2 = () => {
                    const t = (performance.now() - start2) / fadeOutMs;
                    if (t < 1) {
                        audioEl.volume = orig * (1 - t);
                        requestAnimationFrame(fadeStep2);
                    } else {
                        audioEl.pause();
                        audioEl.currentTime = 0;
                        this.unregisterSound(si);
                    }
                };
                fadeStep2();
            }, fadeStart);
        } else {
            audioEl.addEventListener("ended", () => {
                this.unregisterSound(si);
            });
        }

        return si;
    }

    stopAll() {
        for (const si of Array.from(this.activeSounds)) {
            if (si.instance instanceof Howl && si.howlId != null) {
                si.instance.stop(si.howlId);
            } else if (si.instance instanceof HTMLAudioElement) {
                si.instance.pause();
                si.instance.currentTime = 0;
            }
            this.unregisterSound(si);
        }
    }

    findSoundByKey(key: string): SoundInstance | undefined {
        for (const si of this.activeSounds) {
            if (si.key === key) {
                return si;
            }
        }
        return undefined;
    }

    updateSoundVolume(key: string, newBaseVolume: number): boolean {
        const si = this.findSoundByKey(key);
        if (si) {
            si.baseVolume = newBaseVolume;
            this.applyVolumeToInstance(si);
            return true;
        }
        return false;
    }

    stopSoundByKey(key: string) {
        const si = this.findSoundByKey(key);
        if (si) {
            if (si.instance instanceof Howl && si.howlId != null) {
                si.instance.stop(si.howlId);
            } else if (si.instance instanceof HTMLAudioElement) {
                si.instance.pause();
                si.instance.currentTime = 0;
            }
            this.unregisterSound(si);
        }
    }
}

const audioManager = new AudioManager();

// ----- Zustand store -----

interface AudioState {
    masterMute: boolean;
    musicMute: boolean;
    sfxMute: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    parrotVolume: number;

    toggleMasterMute: () => void;
    toggleMusicMute: () => void;
    toggleSfxMute: () => void;
    setMasterMute: (m: boolean) => void;
    setMusicMute: (m: boolean) => void;
    setSfxMute: (m: boolean) => void;

    setMasterVolume: (v: number) => void;
    setMusicVolume: (v: number) => void;
    setSfxVolume: (v: number) => void;
    setParrotVolume: (v: number) => void;

    stopAllAudio: () => void;

    playExplosion: () => Promise<void>;
    playTakeoff: () => Promise<void>;
    playHit: () => Promise<void>;
    playSuccess: () => Promise<void>;
    playLaser: () => Promise<void>;
    playAmbientMusic: (fadeInMs?: number) => void;
    stopAmbientMusic: () => void;
    playThruster: (fadeInMs?: number) => void;
    stopThruster: () => void;
    playWind: (intensity: number) => void;
    stopWind: () => void;
    playRain: () => void;
    stopRain: () => void;
    playMotor: (intensity: number) => void;
    stopMotor: () => void;
    crossfadeMusic: (newHowl: Howl, fadeMs: number) => Promise<void>;
}

const saved = loadAudioSettings();

export const useAudio = create<AudioState>((set, get) => ({
    masterMute: saved.masterMute,
    musicMute: saved.musicMute,
    sfxMute: saved.sfxMute,
    masterVolume: saved.masterVolume,
    musicVolume: saved.musicVolume,
    sfxVolume: saved.sfxVolume,
    parrotVolume: saved.parrotVolume,

    toggleMasterMute: () => {
        const nm = !get().masterMute;
        set({masterMute: nm});
        audioManager.setMasterMute(nm);
        saveAudioSettings(
            nm,
            get().musicMute,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    toggleMusicMute: () => {
        const nm = !get().musicMute;
        set({musicMute: nm});
        audioManager.setCategoryMute("music", nm);
        saveAudioSettings(
            get().masterMute,
            nm,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    toggleSfxMute: () => {
        const nm = !get().sfxMute;
        set({sfxMute: nm});
        audioManager.setCategoryMute("sfx", nm);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            nm,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    setMasterMute: (m) => {
        set({masterMute: m});
        audioManager.setMasterMute(m);
        saveAudioSettings(
            m,
            get().musicMute,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    setMusicMute: (m) => {
        set({musicMute: m});
        audioManager.setCategoryMute("music", m);
        saveAudioSettings(
            get().masterMute,
            m,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    setSfxMute: (m) => {
        set({sfxMute: m});
        audioManager.setCategoryMute("sfx", m);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            m,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    setMasterVolume: (v) => {
        const cl = Math.max(0, Math.min(1, v));
        set({masterVolume: cl});
        audioManager.setMasterVolume(cl);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            get().sfxMute,
            cl,
            get().musicVolume,
            get().sfxVolume,
            get().parrotVolume
        );
        const actualParrotVol = cl * get().parrotVolume;
        parrotSpeechService.updateSettings({volume: actualParrotVol});
    },

    setMusicVolume: (v) => {
        const cl = Math.max(0, Math.min(1, v));
        set({musicVolume: cl});
        audioManager.setCategoryVolume("music", cl);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            get().sfxMute,
            get().masterVolume,
            cl,
            get().sfxVolume,
            get().parrotVolume
        );
    },

    setSfxVolume: (v) => {
        const cl = Math.max(0, Math.min(1, v));
        set({sfxVolume: cl});
        audioManager.setCategoryVolume("sfx", cl);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            cl,
            get().parrotVolume
        );
    },

    setParrotVolume: (v) => {
        const cl = Math.max(0, Math.min(1, v));
        set({parrotVolume: cl});
        audioManager.setCategoryVolume("parrot", cl);
        saveAudioSettings(
            get().masterMute,
            get().musicMute,
            get().sfxMute,
            get().masterVolume,
            get().musicVolume,
            get().sfxVolume,
            cl
        );
        const actualParrotVol = cl * get().masterVolume;
        parrotSpeechService.updateSettings({volume: actualParrotVol});
    },

    stopAllAudio: () => {
        audioManager.stopAll();
    },

    playExplosion: async () => {
        if (get().masterMute || get().sfxMute) return;
        try {
            const cfg = AUDIO_CONFIG.soundEffects.explosion;
            const h = new Howl({
                src: [cfg.path],
                volume: cfg.volume ?? 1,
            });
            const baseVol = cfg.volume ?? 1;
            await audioManager.playHowl(h, "sfx", baseVol, {
                fadeInMs: 50,
                fadeOutMs: 100,
                key: "explosion",
            });
        } catch (err) {
            Logger.error("playExplosion error:", err);
        }
    },

    playTakeoff: async () => {
        if (get().masterMute || get().sfxMute) return;
        try {
            const cfg = AUDIO_CONFIG.soundEffects.takeoff;
            const h = new Howl({
                src: [cfg.path],
                volume: cfg.volume ?? 1,
            });
            const baseVol = cfg.volume ?? 1;
            await audioManager.playHowl(h, "sfx", baseVol, {
                fadeInMs: 50,
                fadeOutMs: 100,
                key: "takeoff",
            });
        } catch (err) {
            Logger.error("playTakeoff error:", err);
        }
    },

    playHit: async () => {
        if (get().masterMute || get().sfxMute) return;
        try {
            const cfg = AUDIO_CONFIG.soundEffects.hit;
            const h = new Howl({
                src: [cfg.path],
                volume: cfg.volume ?? 1,
            });
            const baseVol = cfg.volume ?? 1;
            await audioManager.playHowl(h, "sfx", baseVol, {
                fadeInMs: 20,
                fadeOutMs: 50,
                key: "hit",
            });
        } catch (err) {
            Logger.error("playHit error:", err);
        }
    },

    playSuccess: async () => {
        if (get().masterMute || get().sfxMute) return;
        const cfg = AUDIO_CONFIG.soundEffects.success;
        const h = new Howl({
            src: [cfg.path],
            volume: cfg.volume ?? 1,
        });
        const baseVol = cfg.volume ?? 1;
        await audioManager.playHowl(h, "sfx", baseVol, {
            fadeInMs: 30,
            fadeOutMs: 80,
            key: "success",
        });
    },

    playLaser: async () => {
        if (get().masterMute || get().sfxMute) return;
        try {
            const cfg = AUDIO_CONFIG.soundEffects.laser;
            const h = new Howl({
                src: [cfg.path],
                volume: cfg.volume ?? 1,
            });
            const baseVol = cfg.volume ?? 1;
            await audioManager.playHowl(h, "sfx", baseVol, {
                fadeInMs: 40,
                fadeOutMs: 120,
                key: "laser",
            });
        } catch (err) {
            Logger.error("playLaser error:", err);
        }
    },

    playAmbientMusic: (fadeInMs = 500) => {
        const ambient = (get() as any).ambientMusic as HTMLAudioElement | null;
        if (!ambient) return;
        audioManager.playHtml(ambient, "ambient", 1, {fadeInMs, key: "ambient-music"});
    },

    stopAmbientMusic: () => {
        audioManager.stopSoundByKey("ambient-music");
    },

    playThruster: (fadeInMs = 100) => {
        if (get().masterMute || get().sfxMute) return;
        const cfg = AUDIO_CONFIG.soundEffects.thruster;
        (async () => {
            try {
                const h = new Howl({
                    src: [cfg.path],
                    volume: cfg.volume ?? 1,
                    loop: true,
                });
                const baseVol = cfg.volume ?? 1;
                await audioManager.playHowl(h, "sfx", baseVol, {
                    fadeInMs,
                    key: "thruster",
                    loop: true,
                });
            } catch (err) {
                Logger.error("playThruster error:", err);
            }
        })();
    },

    stopThruster: () => {
        audioManager.stopSoundByKey("thruster");
    },

    playWind: (intensity: number) => {
        if (get().masterMute) return;
        
        const baseVol = Math.max(0, Math.min(1, intensity));
        
        // Try to update existing wind sound first
        if (audioManager.updateSoundVolume("wind", baseVol)) {
            return; // Volume updated successfully
        }
        
        // No existing wind sound, create new one
        (async () => {
            try {
                const windHowl = new Howl({
                    src: ["/sounds/wind.mp3"],
                    loop: true,
                    volume: 0.5,
                });
                await audioManager.playHowl(windHowl, "ambient", baseVol, {
                    fadeInMs: 500,
                    key: "wind",
                    loop: true,
                });
            } catch (err) {
                Logger.error("playWind error:", err);
            }
        })();
    },

    stopWind: () => {
        audioManager.stopSoundByKey("wind");
    },

    playRain: () => {
        if (get().masterMute) return;
        
        // Check if rain is already playing
        if (audioManager.findSoundByKey("rain")) {
            return; // Already playing
        }
        
        // No existing rain sound, create new one
        (async () => {
            try {
                const rainHowl = new Howl({
                    src: ["/sounds/rain.mp3"],
                    loop: true,
                    volume: 0.4,
                });
                await audioManager.playHowl(rainHowl, "ambient", 1, {
                    fadeInMs: 800,
                    key: "rain",
                    loop: true,
                });
            } catch (err) {
                Logger.error("playRain error:", err);
            }
        })();
    },

    stopRain: () => {
        audioManager.stopSoundByKey("rain");
    },
    playMotor: (intensity: number) => {
        if (get().masterMute) return;

        // Check if rain is already playing
        if (audioManager.findSoundByKey("motor")) {
            return; // Already playing
        }
        // No existing motor sound, create new one
        (async () => {
            try {
                const motorHowl = new Howl({
                    src: ["/sounds/motor.mp3"],
                    loop: true,
                    volume: 0.4,
                });
                await audioManager.playHowl(motorHowl, "ambient", 1, {
                    fadeInMs: 800,
                    key: "motor",
                    loop: true,
                });
            } catch (err) {
                Logger.error("playMotor error:", err);
            }
        })();
    },
    stopMotor: () => {
        audioManager.stopSoundByKey("motor");
    },

    crossfadeMusic: async (newHowl: Howl, fadeMs: number) => {
        let oldInstance: SoundInstance | undefined;
        for (const si of audioManager.activeSounds) {
            if (si.category === "music") {
                oldInstance = si;
                break;
            }
        }
        const baseVol = 1;
        await audioManager.playHowl(newHowl, "music", baseVol, {
            fadeInMs: fadeMs,
            fadeOutMs: fadeMs,
            crossfadeFrom: oldInstance,
            key: "music_crossfade",
            loop: true,
        });
    },
}));
