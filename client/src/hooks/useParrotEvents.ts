// client/src/hooks/useParrotEvents.ts

import {useEffect, useRef} from 'react';
import {Logger} from 'client/src/services/Logger';
// Adjust this import path as needed
import {useLandedState} from '@/lib/stores/';
import {useShipStatus} from '@/lib/stores/ship/useShipStatus'
import {parrotSpeechService} from 'client/src/services/ParrotSpeechService';

type Tone = 'info' | 'warning' | 'critical';

const GLOBAL_COOLDOWN_MS = 30_000; // 30 seconds for any key
const CATEGORY_COOLDOWN: Record<Tone, number> = {
    info: 60_000,
    warning: 30_000,
    critical: 15_000,
};

export function useParrotEvents() {
    const {isTakingOff} = useLandedState();
    const {hull, shield} = useShipStatus();
    const shipStatus = {hull, shield};
    const lastSaidRef = useRef<Record<string, number>>({});

    // === Helper utilities ===
    const getRandomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const phrasePools: Record<
        'fuelLow' | 'fuelEmpty' | 'hullCritical' | 'shieldsLow' | 'missionsReminder' |
        'missionsComplete' | 'heatHigh' | 'wantedHigh' | 'randomComment' | 'memoryRecall',
        string[]
    > = {
        fuelLow: [
            "Squawk! Fuel reserves be runnin' low, Cap'n! Only {pct}% left!",
            "Cap'n – we've got about {pct}% fuel remaining, time to refuel!",
            "Alert! Fuel dipping to {pct}% — ship's going hungry, Cap'n!"
        ],
        fuelEmpty: [
            "Blimey! We're outta fuel, Cap'n! Dead in space we are!",
            "Fuel’s gone. We’re driftin’ without juice, Cap'n!",
            "No fuel left. Brace for unattended drifting, Cap'n!"
        ],
        hullCritical: [
            "Avast! Hull integrity critical, Cap'n! Need repairs now!",
            "Hull’s at {pct}% — we’ll not last long like this, Cap’n!",
            "Critical hull alert! Patch her up or we’re done, Cap’n!"
        ],
        shieldsLow: [
            "Squawk! Shields be failin’, Cap’n!",
            "Shields down to {pct}% — danger be closin’ fast, Cap’n!",
            "Warning! Shields weakened, Cap’n — get ready!"
        ],
        missionsReminder: [
            "Reminder, Cap’n: We still got that {title} mission to finish!",
            "Cap’n — don’t forget the {title} mission’s still active!",
            "The {title} mission awaits, Cap’n — ready yer boots!"
        ],
        missionsComplete: [
            "Har har! {count} missions in the bag, Cap’n! Nice work!",
            "Well done, Cap’n — {count} missions done and dusted!",
            "Victory! {count} missions complete — we’re legends now, Cap’n!"
        ],
        heatHigh: [
            "Avast! Heat levels be risin’, Cap’n! Keep yer head down!",
            "Warning! Ship heat at {pct}% — things be gettin’ toasty!",
            "Heat warning, Cap’n — if we don’t cool off, we'll fry!"
        ],
        wantedHigh: [
            "Squawk! Yer wanted across the system, Cap’n! Patrols everywhere!",
            "Alert! Wanted level high — hide yer sails, Cap’n!",
            "Danger, Cap’n: We’re flagged — bounty hunters loom!"
        ],
        randomComment: [
            "Cap’n, remember that time we outran the kraken? Ahoy memories!",
            "Want a joke, Cap’n? Why did the pirate buy a ram? For bustin’ boardin’ parties!",
            "Cap’n, I spy a treasure map in yer dreams — let’s sail!"
        ],
        memoryRecall: [
            "Cap’n, remember our first haul? Feels like yesterday!",
            "Flashback, Cap’n: That storm off Neptune — we lived it!",
            "Memory, Cap’n: The gold we found near Davy’s Rift — adventure!"
        ]
    };

    const formatPhrase = (template: string, variables: Record<string, any>): string => {
        return template.replace(/{(\w+)}/g, (_match, key) => String(variables[key] ?? ''));
    };

    const speak = async (
        poolKey: keyof typeof phrasePools,
        variables: Record<string, any> = {},
        tone: Tone,
        keyOverride?: string
    ): Promise<void> => {
        const templates = phrasePools[poolKey];
        const template = getRandomFrom(templates);
        const text = formatPhrase(template, variables);
        Logger.log(`[ParrotEvents] speaking phrase key=${keyOverride ?? poolKey}, tone=${tone}, text="${text}"`);
        parrotSpeechService.speak(text);
        lastSaidRef.current[keyOverride ?? poolKey] = Date.now();
    };

    const canSpeak = (key: string, tone: Tone): boolean => {
        const now = Date.now();
        const lastGlobal = Math.min(
            ...(Object.values(lastSaidRef.current).length ? Object.values(lastSaidRef.current) : [0])
        );
        if (now - lastGlobal < GLOBAL_COOLDOWN_MS) {
            Logger.debug(`[ParrotEvents] cannot speak: global cooldown active (${now - lastGlobal}ms)`);
            return false;
        }
        const last = lastSaidRef.current[key] || 0;
        const cooldown = CATEGORY_COOLDOWN[tone];
        if (now - last < cooldown) {
            Logger.debug(`[ParrotEvents] cannot speak: key=${key} on tone=${tone}, cooldown active (${now - last}ms)`);
            return false;
        }
        return true;
    };

    // === Core effects ===

    useEffect(() => {
        Logger.debug(`[ParrotEvents] hull/shield effect triggered: hull=${shipStatus.hull}, shield=${shipStatus.shield}, isTakingOff=${isTakingOff}`);
        if (isTakingOff) {
            Logger.log(`[ParrotEvents] skipping speech: taking off`);
            return;
        }

        const hull = shipStatus.hull;
        const shield = shipStatus.shield;

        if (hull <= 0) {
            Logger.log(`[ParrotEvents] skipping speech: hull ≤ 0 (destroyed)`);
            return;
        }

        const key = 'hull-shield-status';
        let poolKey: keyof typeof phrasePools | undefined;
        let variables: Record<string, any> = {};
        let tone: Tone;

        if (hull < 30) {
            poolKey = 'hullCritical';
            variables = {pct: hull};
            tone = 'critical';
            Logger.log(`[ParrotEvents] hull warning condition met (hull ${hull}%)`);
        } else if (shield < 20 && shield > 5) {
            poolKey = 'shieldsLow';
            variables = {pct: shield};
            tone = 'warning';
            Logger.log(`[ParrotEvents] shield warning condition met (shield ${shield}%)`);
        } else {
            Logger.debug(`[ParrotEvents] safe state — resetting lastSaidRef for key=${key}`);
            delete lastSaidRef.current[key];
            return;
        }

        Logger.debug(`[ParrotEvents] attempting speak: pool=${poolKey}, variables=${JSON.stringify(variables)}, tone=${tone}, key=${key}`);
        if (canSpeak(key, tone)) {
            speak(poolKey!, variables, tone, key);
        } else {
            Logger.log(`[ParrotEvents] canSpeak prevented speech for key=${key}, tone=${tone}`);
        }
    }, [shipStatus.hull, shipStatus.shield, isTakingOff]);

    // Random comment interval
    const setupInterval = (callback: () => void, ms: number, label: string) => {
        if (isTakingOff) {
            Logger.log(`[ParrotEvents] Skipping ${label} interval setup during takeoff`);
            return () => {
            };
        }
        const interval = setInterval(() => {
            if (!isTakingOff) {
                Logger.debug(`[ParrotEvents] interval triggered: ${label}`);
                callback();
            } else {
                Logger.log(`[ParrotEvents] Suppressed ${label} during takeoff`);
            }
        }, ms);
        Logger.log(`[ParrotEvents] ${label} interval started (every ${ms}ms)`);
        return () => {
            Logger.log(`[ParrotEvents] ${label} interval cleared`);
            clearInterval(interval);
        };
    };

    useEffect(() => {
        return setupInterval(() => {
            speak('randomComment', {}, 'info', 'random-comment');
        }, 45_000, 'random comment');
    }, [isTakingOff]);

    useEffect(() => {
        return setupInterval(() => {
            if (Math.random() < 0.2) {
                speak('memoryRecall', {}, 'info', 'memory-recall');
            }
        }, 90_000, 'memory recall');
    }, [isTakingOff]);
}
