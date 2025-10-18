// client/src/hooks/useParrotEvents.ts

import {useEffect, useRef} from 'react';
import {Logger} from '../services/Logger';
// Adjust this import path as needed
import {useLandedState} from '@/lib/stores/';
import {useShipStatus} from '@/lib/stores/ship/useShipStatus'
import {parrotSpeechService} from '../services/ParrotSpeechService';

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
    // get the player instance to use their player name from the playerName function
    const captainName = "Captain";

    // === Helper utilities ===
    const getRandomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const phrasePools: Record<
        'fuelLow' | 'fuelEmpty' | 'hullCritical' | 'shieldsLow' | 'missionsReminder' |
        'missionsComplete' | 'heatHigh' | 'wantedHigh' | 'randomComment' | 'memoryRecall',
        string[]
    > = {
        fuelLow: [
            `Squawk! Fuel reserves be running' low, ${captainName}! Only {pct}% left!`,
            `${captainName} – we've got about {pct}% fuel remaining, time to refuel!`,
            `Alert! Fuel dipping to {pct}% — ship's going hungry, ${captainName}!`
        ],
        fuelEmpty: [
            `Blimey! We're outta fuel, ${captainName}! Dead in space we are!`,
            `Fuel’s gone. We’re driftin’ without juice, ${captainName}!`,
            `No fuel left. Brace for unattended drifting, ${captainName}!`
        ],
        hullCritical: [
            `Avast! Hull integrity critical, ${captainName}! Need repairs now!`,
            `Hull’s at ${hull}% — we’ll not last long like this, ${captainName}!`,
            `Critical hull alert! Patch her up or we’re done, ${captainName}!`
        ],
        shieldsLow: [
            `quawk! Shields be failing’, ${captainName}!`,
            `Shields down to ${shield}% — danger be closin’ fast, ${captainName}!`,
            `Warning! Shields weakened, ${captainName} — get ready!`
        ],
        missionsReminder: [
            `Reminder, ${captainName}: We still got that {title} mission to finish!`,
            `${captainName} — don’t forget the {title} mission’s still active!`,
            `The {title} mission awaits, ${captainName} — ready yer boots!`
        ],
        missionsComplete: [
            `Har har! {count} missions in the bag, ${captainName}! Nice work!`,
            `Well done, ${captainName} — {count} missions done and dusted!`,
            `Victory! {count} missions complete — we’re legends now, ${captainName}!`
        ],
        heatHigh: [
            `Avast! Heat levels be risin’, ${captainName}! Keep yer head down!`,
            `Warning! Ship heat at {pct}% — things be gettin’ toasty!`,
            `Heat warning, ${captainName} — if we don’t cool off, we'll fry!`
        ],
        wantedHigh: [
            `Squawk! Yer wanted across the system, ${captainName}! Patrols everywhere!`,
            `Alert! Wanted level high — hide yer sails, ${captainName}!`,
            `Danger, ${captainName}: We’re flagged — bounty hunters loom!`
        ],
        randomComment: [
            `${captainName}, remember that time we outran the kraken? Ahoy memories!`,
            `Want a joke, ${captainName}? Why did the pirate buy a ram? For bustin’ boardin’ parties!`,
            `${captainName}, I spy a treasure map in yer dreams — let’s sail!`,
            `What do you call a very rude bird? A mockingbird!`
        ],
        memoryRecall: [
            `${captainName}, remember our first haul? Feels like yesterday!`,
            `Flashback, ${captainName}: That storm off Neptune — we lived it!`,
            `Memory, ${captainName}: The gold we found near Davy’s Rift — adventure!`
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
