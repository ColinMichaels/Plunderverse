import {useEffect, useRef, useState} from "react";
import {motion} from "framer-motion";
import * as THREE from "three";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "../ui/tabs";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "../ui/card";
import {Button} from "../ui/button";
import {Input} from "../ui/input";
import {Label} from "../ui/label";
import {Slider} from "../ui/slider";
import {Switch} from "../ui/switch";
import {ScrollArea} from "../ui/scroll-area";
import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "../ui/collapsible";
import {Badge} from "../ui/badge";
import {Progress} from "../ui/progress";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "../ui/select";
import {toast} from "sonner";

// Icons
import {
    Activity,
    AlertCircle,
    Camera,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    Cpu,
    Database,
    DollarSign,
    Download,
    Gauge,
    Globe,
    Heart,
    Info,
    Moon,
    Package,
    Pause,
    Play,
    RefreshCw,
    Rocket,
    Shield,
    Skull,
    Sun,
    Sunrise,
    Sunset,
    TestTube,
    Timer,
    Trash2,
    User,
    X,
    Zap,
} from "lucide-react";

// Store imports
import {usePlunderverseMissions} from "../../lib/stores/economy/usePlunderverseMissions";
import {usePlayer} from "../../lib/stores/player/usePlayer";
import {useCreditsStore} from "../../domain/economy/credits.store";
import {gameFacade} from "../../lib/plunderverse/gameFacade";
import {useObjectiveTriggers} from "../../lib/stores/economy/useObjectiveTriggers";
import {useLandedState} from "../../lib/stores/surface/useLandedState";
import {useSolarSystem} from "../../lib/stores/space/useSolarSystem";
import {planets} from "../../lib/planetData";
import {useCrewManagement} from "../../lib/stores/ship/useCrewManagement";
import {TIME_OF_DAY_PRESETS, useSurfaceLighting,} from "../../lib/stores/surface/useSurfaceLighting";
import {useDebugTools} from "../../lib/stores/debug/useDebugTools";
import {useShipStatus} from "../../lib/stores/ship/useShipStatus";
import {useGame} from "../../lib/stores/ui/useGame";

// Utils
import {MemoryProfiler} from "../../lib/utils/MemoryProfiler";
import {ResourceManager} from "../../lib/utils/ResourceManager";


interface TestResult {
    name: string;
    status: "running" | "passed" | "failed";
    message: string;
    timestamp: number;
}

interface MemoryData {
    timestamp: number;
    used: number;
    total: number;
    percentage: number;
}

// FPS Counter Hook
function useFPS(): number {
    const [fps, setFps] = useState(0);
    const frameRef = useRef({count: 0, lastTime: performance.now()});

    useEffect(() => {
        const updateFPS = () => {
            frameRef.current.count++;
            const currentTime = performance.now();
            const delta = currentTime - frameRef.current.lastTime;

            if (delta >= 1000) {
                setFps(Math.round((frameRef.current.count * 1000) / delta));
                frameRef.current.count = 0;
                frameRef.current.lastTime = currentTime;
            }

            requestAnimationFrame(updateFPS);
        };

        const animationId = requestAnimationFrame(updateFPS);
        return () => cancelAnimationFrame(animationId);
    }, []);

    return fps;
}

function SyncStatusPanel() {
    const [isAuth, setIsAuth] = useState<boolean | null>(null);
    const [lastSync, setLastSync] = useState<number | null>(null);
    const [events, setEvents] = useState<Array<{ ts: number; type: string; note?: string }>>([]);
    const [busy, setBusy] = useState(false);

    // Listen to SW broadcast channel
    useEffect(() => {
        let bc: BroadcastChannel | null = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                bc = new BroadcastChannel('sw-events');
                bc.onmessage = (e) => {
                    const msg = e.data || {};
                    setEvents((prev) => [{ts: Date.now(), type: msg.type || 'unknown'}, ...prev].slice(0, 12));
                    if (msg.type === 'sync-complete') setLastSync(Date.now());
                };
            }
        } catch {
        }
        return () => {
            try {
                bc?.close();
            } catch {
            }
        };
    }, []);

    // Probe CloudSyncManager dynamically
    async function probeAuth() {
        try {
            // @ts-ignore
            const mod = await import(/* @vite-ignore */ '../../services/CloudSyncManager');
            if (mod?.cloudSyncManager?.isAuthenticated) {
                setIsAuth(!!mod.cloudSyncManager.isAuthenticated());
            }
            if (mod?.useCloudSync?.getState) {
                const st = mod.useCloudSync.getState();
                if (st?.lastSyncedAt) setLastSync(st.lastSyncedAt);
            }
        } catch {
            setIsAuth(null);
        }
    }

    useEffect(() => {
        probeAuth();
    }, []);

    async function pingSync() {
        setBusy(true);
        try {
            // @ts-ignore
            const mod = await import(/* @vite-ignore */ '../../services/CloudSyncManager');
            if (mod?.cloudSyncManager?.ping) {
                await mod.cloudSyncManager.ping();
                setLastSync(Date.now());
            }
        } catch (e) {
            console.warn('[MISSION-DEBUG] CloudSync ping failed:', e);
        } finally {
            setBusy(false);
        }
    }

    function queueOfflineTest() {
        try {
            navigator.serviceWorker?.controller?.postMessage({
                type: 'queue-sync',
                data: {kind: 'debug_event', value: Math.random(), ts: Date.now()},
            });
            setEvents((prev) => [{ts: Date.now(), type: 'queued', note: 'debug_event'}, ...prev].slice(0, 12));
        } catch (e) {
            console.warn('[MISSION-DEBUG] queue-sync failed:', e);
        }
    }

    function forceSW() {
        try {
            navigator.serviceWorker?.controller?.postMessage({type: 'force-sync'});
        } catch (e) {
            console.warn('[MISSION-DEBUG] force-sync failed:', e);
        }
    }

    function clearCaches() {
        try {
            navigator.serviceWorker?.controller?.postMessage({type: 'clear-cache'});
            toast.success('Requested cache clear');
        } catch (e) {
            console.warn('[MISSION-DEBUG] clear-cache failed:', e);
        }
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-800/60 p-2 rounded">
                    <div className="text-gray-400 text-xs">Authenticated</div>
                    <div
                        className={`font-mono ${isAuth ? 'text-green-400' : isAuth === false ? 'text-red-400' : 'text-yellow-400'}`}>
                        {isAuth === null ? 'Unknown' : String(isAuth)}
                    </div>
                </div>
                <div className="bg-gray-800/60 p-2 rounded">
                    <div className="text-gray-400 text-xs">Last Sync</div>
                    <div className="font-mono text-cyan-400">
                        {lastSync ? new Date(lastSync).toLocaleTimeString() : '—'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button size="sm" onClick={pingSync} disabled={busy}
                        className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                    <RefreshCw className="w-3 h-3 mr-1"/> Ping Sync Now
                </Button>
                <Button size="sm" onClick={queueOfflineTest}
                        className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">
                    Queue Test Event
                </Button>
                <Button size="sm" onClick={forceSW} className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">
                    Force SW Sync
                </Button>
                <Button size="sm" onClick={clearCaches} className="bg-red-500/10 text-red-300 hover:bg-red-500/20">
                    Clear Caches
                </Button>
            </div>

            <div className="bg-black/40 p-2 rounded">
                <div className="text-xs text-gray-400 mb-1">Recent Sync Events</div>
                <div className="space-y-1 max-h-32 overflow-auto pr-1">
                    {events.length === 0 && <div className="text-xs text-gray-600">No events yet</div>}
                    {events.map((e, i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-400">{e.type}</span>
                            <span className="text-gray-600">{new Date(e.ts).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MissionDebugPanel() {
    const [activeTab, setActiveTab] = useState("mission");
    const [creditAmount, setCreditAmount] = useState("1000");
    const [reputationAmount, setReputationAmount] = useState("10");
    const [selectedFaction, setSelectedFaction] = useState("corporations");

    // Memory & Performance state
    const [memoryHistory, setMemoryHistory] = useState<MemoryData[]>([]);
    const [resourceStats, setResourceStats] = useState<any>(null);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunningTests, setIsRunningTests] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["memory", "fps"]),
    );

    // Time & Camera state
    const [selectedPlanet, setSelectedTravelPlanet] = useState<string>("");
    const [posX, setPosX] = useState("0");
    const [posY, setPosY] = useState("0");
    const [posZ, setPosZ] = useState("0");

    // Mission debug state
    const [triggerLocation, setTriggerLocation] = useState("Mars");
    const [collectionAmount, setCollectionAmount] = useState("5");
    const [combatCount, setCombatCount] = useState("1");
    const [interactionId, setInteractionId] = useState("trade_merchant");
    const [customValue, setCustomValue] = useState("50");

    // Lighting debug state
    const [currentSunAngle, setCurrentSunAngle] = useState(0);
    const [currentSunElevation, setCurrentSunElevation] = useState(0);
    const [estimatedTimeOfDay, setEstimatedTimeOfDay] = useState("Unknown");

    // Store hooks
    const missionsStore = usePlunderverseMissions();
    const player = usePlayer();
    const credits = useCreditsStore();
    const triggers = useObjectiveTriggers();
    const {isLanded, landedPlanet, setLanded, setNotLanded} = useLandedState();
    const {
        time,
        setCameraPosition,
        setSelectedPlanet,
        cameraPosition,
        setTime,
        getUniverseTime,
    } = useSolarSystem();
    const crew = useCrewManagement();
    const lighting = useSurfaceLighting();
    const {
        isVisible,
        timeScale,
        showCollisionBoxes,
        showWireframes,
        setTimeScale,
        toggleCollisionBoxes,
        toggleWireframes,
        toggleVisibility,
    } = useDebugTools();
    const shipStatus = useShipStatus();
    const {phase} = useGame();

    // Performance metrics
    const fps = useFPS();
    const memoryProfiler = MemoryProfiler.getInstance();
    const resourceManager = ResourceManager.getInstance();

    // Update position inputs when camera position changes
    useEffect(() => {
        setPosX(cameraPosition.x.toFixed(2));
        setPosY(cameraPosition.y.toFixed(2));
        setPosZ(cameraPosition.z.toFixed(2));
    }, [cameraPosition]);

    // Keyboard shortcut to toggle debug panel (`)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "`" || e.key === "~") {
                e.preventDefault();
                e.stopPropagation();
                toggleVisibility();
                console.log(
                    `[MISSION-DEBUG] Debug panel toggled to: ${!isVisible}`,
                );
            }
        };

        window.addEventListener("keydown", handleKeyPress, true);
        return () => window.removeEventListener("keydown", handleKeyPress, true);
    }, [toggleVisibility, isVisible]);

    // Update memory history
    useEffect(() => {
        const updateMemory = () => {
            const stats = memoryProfiler.getStats();
            if (stats.current > 0) {
                const newData: MemoryData = {
                    timestamp: Date.now(),
                    used: stats.current,
                    total: stats.limit,
                    percentage: stats.usage * 100,
                };

                setMemoryHistory((prev) => {
                    const updated = [...prev, newData];
                    return updated.slice(-30);
                });
            }
        };

        updateMemory();
        const interval = setInterval(updateMemory, 2000);
        return () => clearInterval(interval);
    }, []);

    // Update resource stats
    useEffect(() => {
        const updateResources = () => {
            const stats = resourceManager.getStats();
            setResourceStats(stats);
        };

        updateResources();
        const interval = setInterval(updateResources, 3000);
        return () => clearInterval(interval);
    }, []);

    // Update sun position calculations for lighting tab
    useEffect(() => {
        if (!lighting.manualOverride && landedPlanet) {
            const planet = planets.find((p) => p.name === landedPlanet);
            if (planet) {
                const updateSunPosition = () => {
                    const universeTime = getUniverseTime();
                    const sunAngle = (planet.rotationSpeed * universeTime) % (2 * Math.PI);
                    const sunElevation = Math.sin(sunAngle);

                    // Calculate time of day based on sun angle
                    let timeOfDay = "Night";
                    if (sunElevation >= 0.5) timeOfDay = "Noon";
                    else if (sunElevation >= 0.1) timeOfDay = "Morning";
                    else if (sunElevation >= -0.1) timeOfDay = "Dawn";
                    else if (sunElevation >= -0.3) timeOfDay = "Dusk";

                    setCurrentSunAngle(sunAngle);
                    setCurrentSunElevation(sunElevation);
                    setEstimatedTimeOfDay(timeOfDay);
                };

                updateSunPosition();
                const interval = setInterval(updateSunPosition, 100);
                return () => clearInterval(interval);
            }
        }
    }, [lighting.manualOverride, landedPlanet, getUniverseTime]);

    if (!import.meta.env.DEV) {
        return null;
    }

    if (!isVisible) {
        return null;
    }

    // Get time icon based on time of day
    const getTimeIcon = () => {
        switch (lighting.currentTimeOfDay) {
            case "Dawn":
                return <Sunrise className="h-4 h-4"/>;
            case "Noon":
            case "Morning":
                return <Sun className="h-4 w-4"/>;
            case "Dusk":
                return <Sunset className="h-4 w-4"/>;
            case "Night":
                return <Moon className="h-4 w-4"/>;
            default:
                return <Sun className="h-4 w-4"/>;
        }
    };

    // === Player Debug Functions ===
    const handleKillPlayer = () => {
        console.log('[PLAYER-DEBUG] Killing player...');
        shipStatus.takeDamage(1000, "Debug");
        toast.success("Player killed (debug)");
    };

    const handleRevivePlayer = () => {
        console.log('[PLAYER-DEBUG] Reviving player...');
        useGame.getState().revive();
        toast.success("Player revived");
    };

    const getRecentKills = () => {
        if (!player.enemyKills || !player.enemyKills.killLog) return [];
        return player.enemyKills.killLog.slice(-10).reverse();
    };

    const getKillsByType = () => {
        if (!player.enemyKills || !player.enemyKills.killLog) return {};

        const killsByType: Record<string, number> = {};
        player.enemyKills.killLog.forEach(kill => {
            const key = `${kill.enemyType} ${kill.shipClass}`;
            killsByType[key] = (killsByType[key] || 0) + 1;
        });

        return killsByType;
    };

    const recentKills = getRecentKills();
    const killsByType = getKillsByType();

    // === Mission Debug Functions ===
    const addCredits = () => {
        const amount = parseInt(creditAmount) || 1000;
        credits.earnCredits(amount);
        console.log(
            `[MISSION-DEBUG] Added ${amount} credits. New balance: ${credits.credits}`,
        );
    };

    const completeRandomMission = () => {
        if (missionsStore.activeMissions.length === 0) {
            console.warn("[MISSION-DEBUG] No active missions to complete");
            return;
        }

        const mission = missionsStore.activeMissions[0];
        console.log(`[MISSION-DEBUG] Force completing mission: ${mission.title}`);

        mission.objectives.forEach((obj) => {
            missionsStore.updateObjectiveProgress(mission.id, obj.id, 100);
        });

        gameFacade.resolveMission(mission.id).then((result) => {
            console.log("[MISSION-DEBUG] Mission completion result:", result);
        });
    };

    const generateTestMission = () => {
        console.log("[MISSION-DEBUG] Generating test mission");
        const testMission = {
            id: `debug_mission_${Date.now()}`,
            title: "DEBUG: Test Mission",
            description: "A debug mission for testing purposes",
            type: "delivery" as const,
            difficulty: "easy" as const,
            rank: 1,
            minRank: 1,
            faction: "corporations" as const,
            rewards: {
                base: {
                    credits: 5000,
                    reputation: {corporations: 10, independents: 0, outlaws: -5, pirates: 0},
                },
                variable: false,
            },
            requirements: {},
            objectives: [
                {
                    id: "obj_test_1",
                    type: "investigation" as const,
                    description: "Test objective 1",
                    completed: false,
                },
            ],
            choices: [],
            active: false,
            completed: false,
            failed: false,
        };

        missionsStore.addEmergencyMissions([testMission]);
        console.log("[MISSION-DEBUG] Test mission added to available missions");
    };

    const acceptFirstMission = () => {
        if (missionsStore.availableMissions.length === 0) {
            console.warn("[MISSION-DEBUG] No available missions to accept");
            return;
        }

        const mission = missionsStore.availableMissions[0];
        gameFacade.acceptMission(mission.id).then((result) => {
            console.log("[MISSION-DEBUG] Mission acceptance result:", result);
        });
    };

    const adjustReputation = () => {
        const amount = parseInt(reputationAmount) || 10;
        player.updateReputation(selectedFaction as any, amount);
        console.log(
            `[MISSION-DEBUG] Updated ${selectedFaction} reputation by ${amount}`,
        );
    };

    const resetPlayerStats = () => {
        console.log("[MISSION-DEBUG] Resetting player stats");
        player.initializePlayer();
        credits.setCredits(1000);
        missionsStore.activeMissions.forEach((m) => {
            missionsStore.abandonMission(m.id);
        });
        console.log("[MISSION-DEBUG] Player stats reset complete");
    };

    const forceRankUp = () => {
        const newRank = player.rank + 1;
        player.updateRank(newRank, `Debug Rank ${newRank}`);
        console.log(`[MISSION-DEBUG] Force rank up to ${newRank}`);
    };

    const logCurrentState = () => {
        console.log("[MISSION-DEBUG] === CURRENT STATE ===");
        console.log("[MISSION-DEBUG] Credits:", credits.credits);
        console.log("[MISSION-DEBUG] Player Rank:", player.rank, player.rankTitle);
        console.log("[MISSION-DEBUG] Notoriety:", player.notoriety);
        console.log("[MISSION-DEBUG] Heat:", player.heat);
        console.log("[MISSION-DEBUG] Reputation:", player.reputation);
        console.log(
            "[MISSION-DEBUG] Available Missions:",
            missionsStore.availableMissions.length,
        );
        console.log(
            "[MISSION-DEBUG] Active Missions:",
            missionsStore.activeMissions.length,
        );
        console.log(
            "[MISSION-DEBUG] Completed Missions:",
            missionsStore.completedMissionIds.size,
        );
        console.log("[MISSION-DEBUG] ====================");
    };

    // Trigger simulation functions
    const simulateLocationTrigger = () => {
        console.log(
            `[TRIGGER-DEBUG] Simulating location trigger for: ${triggerLocation}`,
        );
        triggers.reportLocationProgress(
            triggerLocation,
            undefined,
            triggerLocation,
        );
    };

    const simulateCollectionTrigger = () => {
        const amount = parseInt(collectionAmount) || 1;
        console.log(`[TRIGGER-DEBUG] Simulating collection of ${amount} resources`);
        triggers.reportCollectionProgress("debug_resource", "resource", amount);
    };

    const simulateCombatTrigger = () => {
        const count = parseInt(combatCount) || 1;
        console.log(`[TRIGGER-DEBUG] Simulating ${count} combat victories`);
        triggers.reportCombatProgress("enemy", undefined, count);
    };

    const simulateInteractionTrigger = () => {
        console.log(`[TRIGGER-DEBUG] Simulating interaction: ${interactionId}`);
        triggers.reportInteractionProgress(interactionId);
    };

    const simulateCustomTrigger = () => {
        const value = parseInt(customValue) || 1;
        console.log(
            `[TRIGGER-DEBUG] Simulating custom trigger with value: ${value}`,
        );
        triggers.reportCustomProgress("test_condition", value);
    };

    // === Memory & Performance Functions ===
    const toggleSection = (section: string) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(section)) {
                newSet.delete(section);
            } else {
                newSet.add(section);
            }
            return newSet;
        });
    };

    const formatMemory = (bytes: number): string => {
        return (bytes / 1024 / 1024).toFixed(2) + " MB";
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600) % 24;
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    };

    // === Time & Camera Functions ===
    const handlePauseToggle = () => {
        setTimeScale(timeScale === 0 ? 1 : 0);
    };

    const handleSpeedChange = (delta: number) => {
        setTimeScale(Math.max(0, Math.min(10, timeScale + delta)));
    };

    const handlePositionUpdate = () => {
        const x = parseFloat(posX) || 0;
        const y = parseFloat(posY) || 0;
        const z = parseFloat(posZ) || 0;
        setCameraPosition(new THREE.Vector3(x, y, z));
        toast.success(`Camera position set to (${x}, ${y}, ${z})`);
    };

    const quickTravelToPlanet = (planetName: string) => {
        const planet = planets.find((p) => p.name === planetName);
        if (planet) {
            const angle = time * planet.orbitalSpeed;
            const planetPos = new THREE.Vector3(
                Math.cos(angle) * planet.distance,
                0,
                Math.sin(angle) * planet.distance,
            );

            setSelectedPlanet(planetName);

            const viewDistance = planet.size * 8;
            const cameraPos = planetPos
                .clone()
                .add(new THREE.Vector3(viewDistance, 5, viewDistance));

            setCameraPosition(cameraPos);
            console.log(`[MISSION-DEBUG] Quick traveled to ${planetName}`);
        }
    };

    const handleTravelToPlanet = () => {
        if (selectedPlanet) {
            quickTravelToPlanet(selectedPlanet);
            setLanded(selectedPlanet);
            toast.success(`Traveled to ${selectedPlanet}`);
        }
    };


    const takeoffFromPlanet = () => {
        setNotLanded();
        console.log(`[MISSION-DEBUG] Took off from ${landedPlanet}`);
    };

    // === Test Suite Functions ===
    const runPanelTests = async () => {
        setIsRunningTests(true);
        const result: TestResult = {
            name: "Panel Tests",
            status: "passed",
            message: "Test suite removed during cleanup",
            timestamp: Date.now(),
        };
        setTestResults((prev) => [...prev, result]);
        toast.info("Panel tests have been removed during cleanup");
        setIsRunningTests(false);
    };

    const runMissionTests = async () => {
        setIsRunningTests(true);
        const result: TestResult = {
            name: "Mission Tests",
            status: "passed",
            message: "Test suite removed during cleanup",
            timestamp: Date.now(),
        };
        setTestResults((prev) => [...prev, result]);
        toast.info("Mission tests have been removed during cleanup");
        setIsRunningTests(false);
    };

    const runObjectiveTests = async () => {
        setIsRunningTests(true);
        const result: TestResult = {
            name: "Objective Tests",
            status: "passed",
            message: "Test suite removed during cleanup",
            timestamp: Date.now(),
        };
        setTestResults((prev) => [...prev, result]);
        toast.info("Objective tests have been removed during cleanup");
        setIsRunningTests(false);
    };

    // === Resource Management Functions ===
    const cleanupByTag = (tag: string) => {
        const count = resourceManager.disposeByTag(tag);
        toast.success(`Cleaned up ${count} resources with tag: ${tag}`);
    };

    const exportResourceData = () => {
        const stats = resourceManager.getStats();
        const tags = resourceManager.getAllTags();
        const data = {
            stats,
            tags: Array.from(tags),
            timestamp: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resource-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Resource data exported");
    };

    const forceGarbageCollection = () => {
        if ((window as any).gc) {
            (window as any).gc();
            toast.success("Garbage collection triggered");
        } else {
            toast.warning(
                "Garbage collection not available (requires --expose-gc flag)",
            );
        }
    };

    return (
        <motion.div
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.95}}
            className="fixed top-4 right-4 w-[600px] max-h-[90vh] z-50"
        >
            <Card className="bg-black/90 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                {/* Header */}
                <CardHeader className="pb-3 border-b border-cyan-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-cyan-400 flex items-center gap-2">
                                <Cpu className="w-5 h-5"/>
                                Consolidated Debug Panel
                            </CardTitle>
                            <CardDescription className="text-gray-400 text-xs mt-1">
                                Development Mode • FPS:{" "}
                                <span
                                    className={
                                        fps < 30
                                            ? "text-red-400"
                                            : fps < 50
                                                ? "text-yellow-400"
                                                : "text-green-400"
                                    }
                                >
                  {fps}
                </span>{" "}
                                • Press ` to toggle
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleVisibility}
                            className="text-cyan-400 hover:text-cyan-300"
                        >
                            <X className="w-4 h-4"/>
                        </Button>
                    </div>
                </CardHeader>

                {/* Tabs */}
                <CardContent className="p-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList
                            className="w-full justify-start bg-black/50 border-b text-white/60 border-cyan-500/20 rounded-none h-auto flex-wrap">
                            <TabsTrigger
                                value="mission"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <Shield className="w-3 h-3 mr-1"/>
                                Mission
                            </TabsTrigger>
                            <TabsTrigger
                                value="player"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <User className="w-3 h-3 mr-1"/>
                                Player
                            </TabsTrigger>
                            <TabsTrigger
                                value="memory"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <Activity className="w-3 h-3 mr-1"/>
                                Memory
                            </TabsTrigger>
                            <TabsTrigger
                                value="time"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <Timer className="w-3 h-3 mr-1"/>
                                Time
                            </TabsTrigger>
                            {landedPlanet && (
                                <TabsTrigger
                                    value="lighting"
                                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                                >
                                    <Sun className="w-3 h-3 mr-1"/>
                                    Lighting
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="tests"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <TestTube className="w-3 h-3 mr-1"/>
                                Tests
                            </TabsTrigger>
                            <TabsTrigger
                                value="resources"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <Package className="w-3 h-3 mr-1"/>
                                Resources
                            </TabsTrigger>
                            <TabsTrigger
                                value="sync"
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                            >
                                <RefreshCw className="w-3 h-3 mr-1"/>
                                Sync
                            </TabsTrigger>
                        </TabsList>

                        <ScrollArea className="h-[500px] p-4">
                            {/* Mission Debug Tab */}
                            <TabsContent value="mission" className="mt-0 space-y-4">
                                {/* Credits & Economy */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4"/>
                                        Credits & Economy
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-gray-400">Current Credits</Label>
                                            <span className="text-cyan-400 font-mono">
                        {credits.credits}
                      </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                value={creditAmount}
                                                onChange={(e) => setCreditAmount(e.target.value)}
                                                className="flex-1 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                placeholder="Amount"
                                            />
                                            <Button
                                                onClick={addCredits}
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Add Credits
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Player Stats */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">
                                        Player Stats
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs text-gray-400">Rank</Label>
                                                <p className="text-cyan-400 font-mono">
                                                    {player.rank} - {player.rankTitle}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-400">
                                                    Notoriety
                                                </Label>
                                                <p className="text-cyan-400 font-mono">
                                                    {player.notoriety}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-400">Heat</Label>
                                                <p className="text-cyan-400 font-mono">{player.heat}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-400">
                                                    Wanted Level
                                                </Label>
                                                <p className="text-cyan-400 font-mono">
                                                    {player.heat}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={forceRankUp}
                                                size="sm"
                                                className="flex-1 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Force Rank Up
                                            </Button>
                                            <Button
                                                onClick={resetPlayerStats}
                                                size="sm"
                                                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            >
                                                Reset Stats
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Reputation */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">
                                        Reputation
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            {Object.entries(player.reputation).map(
                                                ([faction, value]) => (
                                                    <div key={faction}>
                                                        <Label className="text-xs text-gray-400">
                                                            {faction}
                                                        </Label>
                                                        <p className="text-cyan-400 font-mono">{value}</p>
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Select
                                                value={selectedFaction}
                                                onValueChange={setSelectedFaction}
                                            >
                                                <SelectTrigger className="bg-black/50 border-cyan-500/20 text-cyan-400">
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="corporations">
                                                        Corporations
                                                    </SelectItem>
                                                    <SelectItem value="pirates">Pirates</SelectItem>
                                                    <SelectItem value="miners">Miners</SelectItem>
                                                    <SelectItem value="explorers">Explorers</SelectItem>
                                                    <SelectItem value="outlaws">Outlaws</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                value={reputationAmount}
                                                onChange={(e) => setReputationAmount(e.target.value)}
                                                className="w-20 bg-black/50 border-cyan-500/20 text-cyan-400"
                                            />
                                            <Button
                                                onClick={adjustReputation}
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Adjust
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mission Controls */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">
                                        Mission Controls
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={generateTestMission}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Generate Test Mission
                                            </Button>
                                            <Button
                                                onClick={acceptFirstMission}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Accept First Mission
                                            </Button>
                                            <Button
                                                onClick={completeRandomMission}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Complete Active Mission
                                            </Button>
                                            <Button
                                                onClick={logCurrentState}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Log State
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Objective Triggers */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">
                                        Objective Triggers
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                value={triggerLocation}
                                                onChange={(e) => setTriggerLocation(e.target.value)}
                                                className="flex-1 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                placeholder="Location"
                                            />
                                            <Button
                                                onClick={simulateLocationTrigger}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Trigger Location
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={collectionAmount}
                                                onChange={(e) => setCollectionAmount(e.target.value)}
                                                className="flex-1 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                placeholder="Collection Amount"
                                            />
                                            <Button
                                                onClick={simulateCollectionTrigger}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Trigger Collection
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={combatCount}
                                                onChange={(e) => setCombatCount(e.target.value)}
                                                className="flex-1 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                placeholder="Combat Count"
                                            />
                                            <Button
                                                onClick={simulateCombatTrigger}
                                                size="sm"
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                            >
                                                Trigger Combat
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Player Debug Tab */}
                            <TabsContent value="player" className="mt-0 space-y-4">
                                {/* Player Actions */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <User className="w-4 h-4"/>
                                        Player Actions
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={handleKillPlayer}
                                            className="bg-red-600 hover:bg-red-700"
                                            size="sm"
                                            disabled={phase === 'ended'}
                                        >
                                            <Skull className="w-4 h-4 mr-2"/>
                                            Kill Player
                                        </Button>
                                        <Button
                                            onClick={handleRevivePlayer}
                                            className="bg-green-600 hover:bg-green-700"
                                            size="sm"
                                            disabled={phase !== 'ended'}
                                        >
                                            <Heart className="w-4 h-4 mr-2"/>
                                            Revive Player
                                        </Button>
                                    </div>
                                </div>

                                {/* Player Stats */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">Ship Status</h3>
                                    <div className="bg-gray-900/50 p-3 rounded space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Hull:</span>
                                            <span
                                                className={shipStatus.hull > 50 ? "text-green-400" : shipStatus.hull > 20 ? "text-yellow-400" : "text-red-400"}>
                        {shipStatus.hull.toFixed(1)}%
                      </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Shield:</span>
                                            <span
                                                className={shipStatus.shield > 50 ? "text-cyan-400" : shipStatus.shield > 20 ? "text-yellow-400" : "text-red-400"}>
                        {shipStatus.shield.toFixed(1)}%
                      </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Credits:</span>
                                            <span className="text-green-400">{credits.credits}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Game Phase:</span>
                                            <span
                                                className={phase === 'playing' ? "text-green-400" : phase === 'ended' ? "text-red-400" : "text-yellow-400"}>
                        {phase}
                      </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Status:</span>
                                            <span
                                                className={shipStatus.isDestroyed ? "text-red-400" : shipStatus.isCritical ? "text-yellow-400" : "text-green-400"}>
                        {shipStatus.isDestroyed ? "Destroyed" : shipStatus.isCritical ? "Critical" : "OK"}
                      </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Kill Statistics */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">Combat Statistics</h3>
                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Total Kills:</span>
                                            <span className="text-cyan-400 font-bold">
                        {player.enemyKills?.totalKills || 0}
                      </span>
                                        </div>

                                        {/* Kill Breakdown by Type */}
                                        {Object.keys(killsByType).length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-gray-400">Kills by Type:</Label>
                                                <div className="space-y-1">
                                                    {Object.entries(killsByType).map(([type, count]) => (
                                                        <div key={type} className="flex justify-between text-xs">
                                                            <span className="text-gray-500">{type}:</span>
                                                            <span className="text-cyan-400">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Kills */}
                                        {recentKills.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-gray-400">Recent Kills:</Label>
                                                <ScrollArea className="h-32">
                                                    <div className="space-y-1">
                                                        {recentKills.map((kill, index) => (
                                                            <div key={`${kill.timestamp}-${index}`}
                                                                 className="flex justify-between text-xs">
                                <span className="text-gray-500">
                                  {kill.enemyType} {kill.shipClass}
                                </span>
                                                                <span className="text-gray-600">
                                  {new Date(kill.timestamp).toLocaleTimeString()}
                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        )}

                                        {recentKills.length === 0 && (
                                            <p className="text-xs text-gray-600 mt-2">No enemies killed yet</p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Memory & Performance Tab */}
                            <TabsContent value="memory" className="mt-0 space-y-4">
                                {/* FPS Monitor */}
                                <Collapsible open={expandedSections.has("fps")}>
                                    <CollapsibleTrigger
                                        onClick={() => toggleSection("fps")}
                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                                    >
                                        {expandedSections.has("fps") ? (
                                            <ChevronDown className="w-4 h-4"/>
                                        ) : (
                                            <ChevronRight className="w-4 h-4"/>
                                        )}
                                        <Gauge className="w-4 h-4"/>
                                        Performance Metrics
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-gray-900/50 p-2 rounded">
                                                <p className="text-xs text-gray-400">FPS</p>
                                                <p
                                                    className={`text-2xl font-bold ${fps < 30 ? "text-red-400" : fps < 50 ? "text-yellow-400" : "text-green-400"}`}
                                                >
                                                    {fps}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-2 rounded">
                                                <p className="text-xs text-gray-400">Frame Time</p>
                                                <p className="text-2xl font-bold text-cyan-400">
                                                    {fps > 0 ? (1000 / fps).toFixed(1) : "0"}ms
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Memory Usage */}
                                <Collapsible open={expandedSections.has("memory")}>
                                    <CollapsibleTrigger
                                        onClick={() => toggleSection("memory")}
                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                                    >
                                        {expandedSections.has("memory") ? (
                                            <ChevronDown className="w-4 h-4"/>
                                        ) : (
                                            <ChevronRight className="w-4 h-4"/>
                                        )}
                                        <Database className="w-4 h-4"/>
                                        Memory Usage
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-3 space-y-3">
                                        {memoryHistory.length > 0 && (
                                            <>
                                                <div className="bg-gray-900/50 p-3 rounded space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Memory Usage</span>
                                                        <span className="text-cyan-400">
                              {memoryHistory[
                              memoryHistory.length - 1
                                  ]?.percentage.toFixed(1)}
                                                            %
                            </span>
                                                    </div>
                                                    <Progress
                                                        value={
                                                            memoryHistory[memoryHistory.length - 1]
                                                                ?.percentage || 0
                                                        }
                                                        className="h-2"
                                                    />
                                                    <div className="flex justify-between text-xs text-gray-400">
                            <span>
                              {formatMemory(
                                  memoryHistory[memoryHistory.length - 1]?.used ||
                                  0,
                              )}
                            </span>
                                                        <span>
                              {formatMemory(
                                  memoryHistory[memoryHistory.length - 1]
                                      ?.total || 0,
                              )}
                            </span>
                                                    </div>
                                                </div>

                                                {/* Memory Trend Chart */}
                                                <div className="bg-gray-900/50 p-3 rounded">
                                                    <p className="text-xs text-gray-400 mb-2">
                                                        Memory Trend (Last 30 samples)
                                                    </p>
                                                    <div className="h-20 flex items-end gap-1">
                                                        {memoryHistory.map((data, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex-1 bg-cyan-500/50"
                                                                style={{
                                                                    height: `${(data.percentage / 100) * 80}px`,
                                                                    backgroundColor:
                                                                        data.percentage > 90
                                                                            ? "#ef4444"
                                                                            : data.percentage > 70
                                                                                ? "#f59e0b"
                                                                                : "#06b6d4",
                                                                }}
                                                                title={`${data.percentage.toFixed(1)}%`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => memoryProfiler.takeSnapshot("manual")}
                                                className="flex-1 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                <Camera className="w-3 h-3 mr-1"/>
                                                Snapshot
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => memoryProfiler.clearSnapshots()}
                                                className="flex-1 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1"/>
                                                Clear
                                            </Button>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Resource Counts */}
                                <Collapsible open={expandedSections.has("resources-count")}>
                                    <CollapsibleTrigger
                                        onClick={() => toggleSection("resources-count")}
                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                                    >
                                        {expandedSections.has("resources-count") ? (
                                            <ChevronDown className="w-4 h-4"/>
                                        ) : (
                                            <ChevronRight className="w-4 h-4"/>
                                        )}
                                        <Package className="w-4 h-4"/>
                                        Resource Counts
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-3">
                                        {resourceStats && (
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Geometries</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {resourceStats.geometries}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Materials</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {resourceStats.materials}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Textures</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {resourceStats.textures}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Meshes</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {resourceStats.meshes}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Audio</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {resourceStats.audio}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-2 rounded">
                                                    <p className="text-gray-400">Est. Memory</p>
                                                    <p className="text-cyan-400 font-bold">
                                                        {formatMemory(resourceStats.totalMemoryEstimate)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            </TabsContent>

                            {/* Time & Camera Tab */}
                            <TabsContent value="time" className="mt-0 space-y-4">
                                {/* Time Controls */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4"/>
                                        Time Controls
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-gray-400">Universe Time</Label>
                                            <span className="text-cyan-400 font-mono">
                        {formatTime(getUniverseTime())}
                      </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handlePauseToggle}
                                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                {timeScale === 0 ? (
                                                    <Play className="w-3 h-3"/>
                                                ) : (
                                                    <Pause className="w-3 h-3"/>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSpeedChange(-0.5)}
                                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                -0.5x
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSpeedChange(0.5)}
                                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                +0.5x
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSpeedChange(1)}
                                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                +1x
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-gray-400">Time Scale</Label>
                                                <span className="text-cyan-400 font-mono">
                          {timeScale.toFixed(1)}x
                        </span>
                                            </div>
                                            <Slider
                                                value={[timeScale]}
                                                onValueChange={([value]) => setTimeScale(value)}
                                                min={0}
                                                max={10}
                                                step={0.1}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Camera Controls */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <Camera className="w-4 h-4"/>
                                        Camera Position
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Label className="text-xs text-gray-400">X</Label>
                                                <Input
                                                    type="number"
                                                    value={posX}
                                                    onChange={(e) => setPosX(e.target.value)}
                                                    className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-400">Y</Label>
                                                <Input
                                                    type="number"
                                                    value={posY}
                                                    onChange={(e) => setPosY(e.target.value)}
                                                    className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-400">Z</Label>
                                                <Input
                                                    type="number"
                                                    value={posZ}
                                                    onChange={(e) => setPosZ(e.target.value)}
                                                    className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={handlePositionUpdate}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                        >
                                            Update Position
                                        </Button>
                                    </div>
                                </div>

                                {/* Quick Travel */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <Rocket className="w-4 h-4"/>
                                        Quick Travel
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 text-white/60 rounded space-y-3">
                                        <Select
                                            value={selectedPlanet}
                                            onValueChange={setSelectedTravelPlanet}

                                        >
                                            <SelectTrigger className="bg-black/50 border-cyan-500/20 text-cyan-400">
                                                <SelectValue placeholder="Select a planet..."/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {planets.map((planet) => (
                                                    <SelectItem key={planet.name} value={planet.name}>
                            <span className="text-white/60 bg-black/60 p-2 w-full hover:text-cyan-500">
                              {planet.name}
                            </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                size="sm"
                                                onClick={handleTravelToPlanet}
                                                disabled={!selectedPlanet}
                                                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                                            >
                                                <Globe className="w-3 h-3 mr-2"/>
                                                Travel & Land
                                            </Button>
                                            {isLanded && (
                                                <Button
                                                    size="sm"
                                                    onClick={takeoffFromPlanet}
                                                    className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                                >
                                                    <Rocket className="w-3 h-3 mr-2"/>
                                                    Take Off
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Debug Options */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400">
                                        Debug Options
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                                            <Label className="text-gray-400">
                                                Show Collision Boxes
                                            </Label>
                                            <Switch
                                                checked={showCollisionBoxes}
                                                onCheckedChange={toggleCollisionBoxes}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                                            <Label className="text-gray-400">Show Wireframes</Label>
                                            <Switch
                                                checked={showWireframes}
                                                onCheckedChange={toggleWireframes}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Lighting Controls Tab (only when landed) */}
                            {landedPlanet && (
                                <TabsContent value="lighting" className="mt-0 space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                                            <Label className="text-gray-400">Manual Override</Label>
                                            <Switch
                                                checked={lighting.manualOverride}
                                                onCheckedChange={lighting.setManualOverride}
                                            />
                                        </div>

                                        {lighting.manualOverride && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">
                                                        Sun Azimuth: {lighting.sunAzimuth}°
                                                    </Label>
                                                    <Slider
                                                        value={[lighting.sunAzimuth]}
                                                        onValueChange={([value]) =>
                                                            lighting.setSunAzimuth(value)
                                                        }
                                                        min={0}
                                                        max={360}
                                                        step={1}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">
                                                        Sun Elevation: {lighting.sunElevation}°
                                                    </Label>
                                                    <Slider
                                                        value={[lighting.sunElevation]}
                                                        onValueChange={([value]) =>
                                                            lighting.setSunElevation(value)
                                                        }
                                                        min={-90}
                                                        max={90}
                                                        step={1}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">
                                                        Sun Intensity: {lighting.sunIntensity.toFixed(1)}
                                                    </Label>
                                                    <Slider
                                                        value={[lighting.sunIntensity]}
                                                        onValueChange={([value]) =>
                                                            lighting.setSunIntensity(value)
                                                        }
                                                        min={0}
                                                        max={5}
                                                        step={0.1}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">
                                                        Ambient Intensity:{" "}
                                                        {lighting.ambientIntensity.toFixed(2)}
                                                    </Label>
                                                    <Slider
                                                        value={[lighting.ambientIntensity]}
                                                        onValueChange={([value]) =>
                                                            lighting.setAmbientIntensity(value)
                                                        }
                                                        min={0}
                                                        max={1}
                                                        step={0.01}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">Sun Color</Label>
                                                    <Input
                                                        type="color"
                                                        value={lighting.sunColor}
                                                        onChange={(e) =>
                                                            lighting.setSunColor(e.target.value)
                                                        }
                                                        className="h-10 w-full"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-gray-400">
                                                        Time of Day Presets
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {TIME_OF_DAY_PRESETS.map((preset) => (
                                                            <Button
                                                                key={preset.name}
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => lighting.applyPreset(preset)}
                                                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                                            >
                                                                {preset.name}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {!lighting.manualOverride && (
                                            <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                                <div className="flex items-center gap-2">
                                                    {getTimeIcon()}
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">
                                                            {estimatedTimeOfDay}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            Automatic Mode - {landedPlanet}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Sun Angle:</span>
                                                        <span className="text-white">
                              {((currentSunAngle * 180) / Math.PI).toFixed(1)}°
                            </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Sun Elevation:</span>
                                                        <span className="text-white">
                              {((Math.asin(currentSunElevation) * 180) / Math.PI).toFixed(1)}°
                            </span>
                                                    </div>

                                                    {planets.find((p) => p.name === landedPlanet) && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Day Length:</span>
                                                                <span className="text-white">
                                  {planets.find((p) => p.name === landedPlanet)?.dayLength}
                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Rotation Speed:</span>
                                                                <span className="text-white">
                                  {planets.find((p) => p.name === landedPlanet)?.rotationSpeed.toFixed(4)}
                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
                                                    <p>Sun rises in the east (positive X) and sets in the west (negative
                                                        X).</p>
                                                    {(() => {
                                                        const planet = planets.find((p) => p.name === landedPlanet);
                                                        if (!planet) return null;

                                                        return (
                                                            <>
                                                                {planet.rotationSpeed < 0 && (
                                                                    <p className="text-yellow-400 mt-1">
                                                                        ⚠️ This planet has retrograde rotation - sun
                                                                        moves backwards!
                                                                    </p>
                                                                )}
                                                                {Math.abs(planet.rotationSpeed) < 0.005 && (
                                                                    <p className="text-blue-400 mt-1">
                                                                        Very slow rotation - days are extremely long.
                                                                    </p>
                                                                )}
                                                                {Math.abs(planet.rotationSpeed) > 0.015 && (
                                                                    <p className="text-green-400 mt-1">
                                                                        Fast rotation - short day/night cycles.
                                                                    </p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            )}

                            {/* Test Suites Tab */}
                            <TabsContent value="tests" className="mt-0 space-y-4">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <TestTube className="w-4 h-4"/>
                                        Test Suites
                                    </h3>

                                    <div className="space-y-2">
                                        <Button
                                            size="sm"
                                            onClick={runPanelTests}
                                            disabled={isRunningTests}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                                        >
                                            Run Panel Tests
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={runMissionTests}
                                            disabled={isRunningTests}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                                        >
                                            Run Mission Tests
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={runObjectiveTests}
                                            disabled={isRunningTests}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                                        >
                                            Run Objective Tests
                                        </Button>
                                    </div>

                                    {testResults.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase">
                                                Test Results
                                            </h4>
                                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                                {testResults.map((result, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-2 bg-gray-900/50 p-2 rounded text-xs"
                                                    >
                                                        {result.status === "running" && (
                                                            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin"/>
                                                        )}
                                                        {result.status === "passed" && (
                                                            <CheckCircle className="w-3 h-3 text-green-400"/>
                                                        )}
                                                        {result.status === "failed" && (
                                                            <AlertCircle className="w-3 h-3 text-red-400"/>
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="text-gray-300">{result.name}</p>
                                                            <p className="text-gray-500">{result.message}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setTestResults([])}
                                                className="w-full text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                                            >
                                                Clear Results
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Resource Management Tab */}
                            <TabsContent value="resources" className="mt-0 space-y-4">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <Package className="w-4 h-4"/>
                                        Resource Management
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-2">
                                        <p className="text-xs text-gray-400 uppercase">
                                            Resource Tags
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {resourceManager.getAllTags &&
                                                Array.from(resourceManager.getAllTags())
                                                    .slice(0, 10)
                                                    .map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant="outline"
                                                            className="text-cyan-400 border-cyan-500/30 cursor-pointer hover:bg-cyan-500/10"
                                                            onClick={() => cleanupByTag(tag)}
                                                        >
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                        </div>
                                        {resourceManager.getAllTags &&
                                            resourceManager.getAllTags().size > 10 && (
                                                <p className="text-xs text-gray-500">
                                                    ...and {resourceManager.getAllTags().size - 10} more
                                                    tags
                                                </p>
                                            )}
                                    </div>

                                    <div className="space-y-2 text-white/60">
                                        <Button
                                            size="sm"
                                            onClick={exportResourceData}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                        >
                                            <Download className="w-3 h-3 mr-2"/>
                                            Export Resource Data
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (confirm("Are you sure you want to clear ALL resources? This action cannot be undone.")) {
                                                    resourceManager.disposeAll();
                                                    toast.success("All resources cleaned up");
                                                }
                                            }}
                                            variant="destructive"
                                            className="w-full"
                                        >
                                            <Trash2 className="w-3 h-3 mr-2"/>
                                            Clear All Resources
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={forceGarbageCollection}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                        >
                                            <Zap className="w-3 h-3 mr-2"/>
                                            Force Garbage Collection
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                resourceManager.logMemoryStatus();
                                                toast.success("Memory status logged to console");
                                            }}
                                            className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                        >
                                            <Info className="w-3 h-3 mr-2"/>
                                            Log Memory Status
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Cloud Sync Tab */}
                            <TabsContent value="sync" className="mt-0 space-y-4">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4"/>
                                        Cloud Sync
                                    </h3>

                                    <div className="bg-gray-900/50 p-3 rounded space-y-3">
                                        <SyncStatusPanel/>
                                    </div>
                                </div>
                            </TabsContent>


                        </ScrollArea>
                    </Tabs>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Export singleton instance for memory profiler
export const memoryProfiler = MemoryProfiler.getInstance();
