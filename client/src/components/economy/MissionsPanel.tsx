import {useEffect, useState} from "react";
import {useMissions, usePlayer, useRewards} from "@/lib/stores";
import {usePlunderverseMissions} from "@/lib/stores/economy/usePlunderverseMissions.ts";
import {useCreditsData} from "@/domain";
import {gameFacade} from "@/lib/plunderverse/gameFacade.ts";
import {FactionId, Mission, MissionChoice, MissionObjective,} from "@/lib/plunderverse/types.ts";

// --- Compact UI helpers (local to this file) ---
function SectionTitle({children}: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-semibold text-white mb-2 tracking-wide">
            {children}
        </h3>
    );
}

function StatItem({
                      label,
                      value,
                      className = "",
                  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
}) {
    return (
        <div className="text-center">
            <div className={`font-mono text-sm ${className}`}>{value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
        </div>
    );
}

function TabButton({
                       active,
                       onClick,
                       children,
                   }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-1.5 px-2 text-xs font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

export function MissionsPanel() {
    const {
        missions: legacyMissions,
        bounties,
        completedMissions,
        completedBounties,
        generateNewMissions,
    } = useMissions();
    const plunderverseMissions = usePlunderverseMissions();
    const player = usePlayer();
    const {credits} = useCreditsData();
    const {totalEarnings, landingCount, visitedPlanets} = useRewards();

    const [activeTab, setActiveTab] = useState<
        "plunderverse" | "legacy" | "reputation" | "stats"
    >("plunderverse");
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [showChoiceDialog, setShowChoiceDialog] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState<MissionChoice | null>(null);

    // Initialize game facade on mount
    useEffect(() => {
        // Only initialize gameFacade - it will handle initial mission generation
        gameFacade.initialize().then(() => {
            console.log("[MissionsPanel] GameFacade initialized, missions should be generated");
        });

        // Set up heat decay timer
        const heatDecayTimer = setInterval(() => {
            gameFacade.applyHeatDecay();
        }, 60000); // Every minute

        // Set up reputation decay timer (once per game day)
        const repDecayTimer = setInterval(() => {
            gameFacade.applyReputationDecay();
        }, 300000); // Every 5 minutes represents a game day

        return () => {
            clearInterval(heatDecayTimer);
            clearInterval(repDecayTimer);
        };
    }, []);

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy":
                return "text-green-400";
            case "medium":
                return "text-yellow-400";
            case "hard":
                return "text-red-400";
            case "legendary":
                return "text-purple-400";
            default:
                return "text-gray-400";
        }
    };

    const getDifficultyIcon = (difficulty: string) => {
        switch (difficulty) {
            case "easy":
                return "⭐";
            case "medium":
                return "⭐⭐";
            case "hard":
                return "⭐⭐⭐";
            case "legendary":
                return "👑";
            default:
                return "⭐";
        }
    };

    const getMissionTypeIcon = (type: string) => {
        switch (type) {
            case "exploration":
                return "🌍";
            case "delivery":
                return "📦";
            case "smuggling":
                return "🚫";
            case "bounty":
                return "💀";
            case "combat":
                return "⚔️";
            case "survival":
                return "🛡️";
            case "discovery":
                return "🔍";
            default:
                return "📋";
        }
    };

    const getFactionIcon = (faction: string) => {
        switch (faction) {
            case "corporations":
                return "🏢";
            case "independents":
                return "🌍";
            case "outlaws":
                return "☠️";
            default:
                return "❓";
        }
    };

    const getLegalityColor = (mission: Mission) => {
        if (mission.type === "smuggling" || mission.type === "bounty") {
            return "border-red-600/50"; // Illegal - red
        } else if (mission.type === "combat" || mission.type === "survival") {
            return "border-yellow-600/50"; // Grey market - yellow
        } else {
            return "border-green-600/50"; // Legal - green
        }
    };

    const checkMissionAvailability = (mission: Mission) => {
        // Check reputation requirements
        if (mission.requirements?.reputation) {
            for (const [faction, required] of Object.entries(mission.requirements.reputation)) {
                const playerRep = player.reputation[faction as FactionId];
                if (playerRep < required) {
                    const diff = required - playerRep;
                    return {
                        available: false,
                        reason: `Requires ${required} reputation with ${faction} (need ${diff} more)`,
                        close: diff <= 10,
                        faction: faction as FactionId,
                    };
                }
            }
        }

        // Check credit requirements
        if (mission.requirements?.credits && credits < mission.requirements.credits) {
            const diff = mission.requirements.credits - credits;
            return {
                available: false,
                reason: `Requires ${mission.requirements.credits} credits (need ${diff} more)`,
                close: diff <= 500,
                faction: null,
            };
        }

        return {available: true, reason: null, close: false, faction: null};
    };

    const getMissionAvailabilityColor = (mission: Mission) => {
        const availability = checkMissionAvailability(mission);
        if (availability.available) return "";
        if (availability.close) return "bg-yellow-900/20 border-yellow-600/50 opacity-90";
        return "bg-red-900/20 border-red-600/30 opacity-75";
    };

    const getReputationColor = (faction: FactionId) => {
        const rep = player.reputation[faction];
        if (rep >= 60) return "text-green-400";
        if (rep >= 20) return "text-green-300";
        if (rep > -20) return "text-gray-400";
        if (rep > -60) return "text-orange-400";
        return "text-red-400";
    };

    const handleAcceptMission = async (mission: Mission) => {
        const result = await gameFacade.acceptMission(mission.id);
        if (result.success) {
            console.log(result.message);
            setSelectedMission(null);
        } else {
            console.error(result.message);
        }
    };

    const handleMissionChoice = async (mission: Mission, choice: MissionChoice) => {
        const result = await gameFacade.resolveMission(mission.id, choice.id);
        if (result.success) {
            console.log(result.message);
            setShowChoiceDialog(false);
            setSelectedChoice(null);
        } else {
            console.error(result.message);
        }
    };

    const renderObjective = (objective: MissionObjective, missionId: string) => {
        const progress =
            plunderverseMissions.currentObjectiveProgress.get(missionId)?.get(objective.id) || 0;

        return (
            <div key={objective.id} className="flex items-center space-x-2 text-xs">
        <span className={objective.completed ? "text-green-400" : "text-gray-400"}>
          {objective.completed ? "✅" : "⭕"}
        </span>
                <span
                    className={`flex-1 ${
                        objective.completed ? "line-through text-gray-500" : "text-gray-300"
                    }`}
                >
          {objective.description}
        </span>
                {!objective.completed && progress > 0 && (
                    <span className="text-blue-400">{Math.round(progress)}%</span>
                )}
            </div>
        );
    };

    const renderMissionCard = (mission: Mission, isActive: boolean = false) => {
        // Story missions are identified by having branching choices
        const isStoryMission = mission.choices && mission.choices.length > 0;
        const legalityColor = isStoryMission
            ? "border-2 border-purple-500 shadow-lg shadow-purple-500/20 bg-gradient-to-br from-purple-900/30 to-pink-900/30"
            : getLegalityColor(mission);
        const availability = checkMissionAvailability(mission);
        const availabilityStyle = isStoryMission ? "" : getMissionAvailabilityColor(mission);

        return (
            <div
                key={mission.id}
                className={`${
                    isStoryMission
                        ? "bg-gradient-to-br from-purple-900/30 to-pink-900/30"
                        : "bg-gray-800"
                } p-2.5 rounded border ${legalityColor} ${availabilityStyle} cursor-pointer hover:bg-gray-700 transition-colors relative text-[13px]`}
                onClick={() => setSelectedMission(mission)}
            >
                {/* Story mission badge */}
                {isStoryMission && (
                    <div
                        className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-1.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        📖 STORY
                    </div>
                )}

                {/* Availability banner */}
                {!availability.available && !isStoryMission && (
                    <div
                        className={`absolute top-0 left-0 right-0 px-1.5 py-0.5 text-[11px] font-medium text-center ${
                            availability.close
                                ? "bg-yellow-600/80 text-yellow-100"
                                : "bg-red-600/80 text-red-100"
                        }`}
                    >
                        🔒 {availability.reason}
                    </div>
                )}

                <div
                    className={`flex items-start justify-between mb-2 ${
                        !availability.available && !isStoryMission ? "mt-6" : ""
                    }`}
                >
                    <div className="flex items-center space-x-2">
            <span className="text-lg">
              {isStoryMission ? "📖" : getMissionTypeIcon(mission.type)}
            </span>
                        <h3
                            className={`font-semibold ${
                                isStoryMission ? "text-purple-200" : "text-white"
                            } text-sm`}
                        >
                            {mission.title}
                        </h3>
                        {/* Show faction icon if mission has faction association */}
                        {mission.rewards?.base?.reputation && (
                            <span className="text-sm opacity-75">
                {Object.keys(mission.rewards.base.reputation)
                    .map((f) => getFactionIcon(f))
                    .join("")}
              </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1">
            <span className={getDifficultyColor(mission.difficulty)}>
              {getDifficultyIcon(mission.difficulty)}
            </span>
                        {mission.rewards?.base?.credits && (
                            <span className="text-yellow-400 font-mono text-sm">
                +{mission.rewards.base.credits}
              </span>
                        )}
                    </div>
                </div>

                <p className="text-gray-300 text-xs mb-1.5 italic">{mission.description}</p>

                {/* Show objectives for active missions */}
                {isActive && mission.objectives.length > 0 && (
                    <div className="space-y-1 mb-2">
                        {mission.objectives.map((obj) => renderObjective(obj, mission.id))}
                    </div>
                )}

                {/* Requirements */}
                {mission.requirements && Object.keys(mission.requirements).length > 0 && (
                    <div className="text-xs text-gray-400 mb-2">
                        Requirements:
                        {mission.requirements.reputation && (
                            <span className="ml-2">
                Rep:{" "}
                                {Object.entries(mission.requirements.reputation)
                                    .map(([f, v]) => `${f}: ${v}`)
                                    .join(", ")}
              </span>
                        )}
                        {mission.requirements.credits && (
                            <span className="ml-2">Credits: {mission.requirements.credits}</span>
                        )}
                    </div>
                )}

                {/* Faction impacts */}
                {mission.rewards?.base?.reputation && (
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-400">Impact:</span>
                        {Object.entries(mission.rewards.base.reputation).map(([faction, change]) => (
                            <span key={faction} className={change > 0 ? "text-green-400" : "text-red-400"}>
                {faction}: {change > 0 ? "+" : ""}
                                {change}
              </span>
                        ))}
                    </div>
                )}

                {/* Heat warning */}
                {(mission.type === "smuggling" || mission.type === "bounty") && (
                    <div className="text-xs text-orange-400 mt-2">
                        ⚠️ This activity will increase your heat level
                    </div>
                )}

                {/* Choices indicator */}
                {mission.choices && mission.choices.length > 0 && (
                    <div className="text-xs text-purple-400 mt-2">💭 Involves moral choices</div>
                )}

                {mission.timeLimit && (
                    <div className="text-xs text-orange-400 mt-2">
                        ⏱️ Time Limit: {mission.timeLimit} minutes
                    </div>
                )}
            </div>
        );
    };

    // Get story state
    const storyState = gameFacade.getStoryProgressionState();
    const getMoralityIcon = () => {
        if (storyState.moralityScore >= 50) return "😇";
        if (storyState.moralityScore >= 20) return "🙂";
        if (storyState.moralityScore >= -20) return "😐";
        if (storyState.moralityScore >= -50) return "😈";
        return "💀";
    };

    const getMoralityColor = () => {
        if (storyState.moralityScore >= 50) return "text-green-400";
        if (storyState.moralityScore <= -50) return "text-red-400";
        return "text-gray-400";
    };

    return (
        <>
            <div className="space-y-3">
                {/* Header with Player Status */}
                <div className="missions-panel-header bg-gray-800 p-3 border-b border-gray-600 rounded-t-lg">
                    <div className="flex flex-col items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-white tracking-wide">Mission Control</h2>
                        <div className="flex items-center gap-3 text-xs">
                            <div
                                className="flex items-center gap-2 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500">
                                <span className="text-purple-400">📖 Act {storyState.currentAct}</span>
                            </div>
                            <div className={`flex items-center gap-1 ${getMoralityColor()}`}>
                                <span>{getMoralityIcon()}</span>
                                <span className="font-medium">{storyState.moralityAlignment}</span>
                            </div>
                            <div>
                                <span className="text-purple-400 font-bold">{player.rankTitle}</span>
                                <span className="text-gray-400 ml-2">Rank {player.rank}</span>
                            </div>
                        </div>
                    </div>

                    {/* Player Stats Bar */}
                    <div className="grid grid-cols-4 gap-1.5">
                        <StatItem label="Credits" value={<span className="text-yellow-400">💰 {credits}</span>}/>
                        <StatItem
                            label="Notoriety"
                            value={
                                <span className={player.notoriety > 50 ? "text-purple-400" : "text-gray-400"}>
                  😈 {player.notoriety}
                </span>
                            }
                        />
                        <StatItem
                            label="Heat"
                            value={
                                <span
                                    className={
                                        player.heat > 50
                                            ? "text-red-400"
                                            : player.heat > 20
                                                ? "text-orange-400"
                                                : "text-green-400"
                                    }
                                >
                  🚨 {player.heat}
                </span>
                            }
                        />
                        <StatItem label="Earned" value={<span className="text-green-400">📈 {totalEarnings}</span>}/>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-600">
                    <TabButton
                        active={activeTab === "plunderverse"}
                        onClick={() => setActiveTab("plunderverse")}
                    >
                        Missions (
                        {plunderverseMissions.availableMissions.length +
                            plunderverseMissions.activeMissions.length}
                        )
                    </TabButton>
                    <TabButton active={activeTab === "legacy"} onClick={() => setActiveTab("legacy")}>
                        Legacy ({legacyMissions.length})
                    </TabButton>
                    <TabButton
                        active={activeTab === "reputation"}
                        onClick={() => setActiveTab("reputation")}
                    >
                        Reputation
                    </TabButton>
                    <TabButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
                        Stats
                    </TabButton>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto p-3 space-y-2.5">
                    {activeTab === "plunderverse" && (
                        <>
                            {/* Active Missions */}
                            {plunderverseMissions.activeMissions.length > 0 && (
                                <>
                                    <SectionTitle>Active Missions</SectionTitle>
                                    {plunderverseMissions.activeMissions.map((mission) =>
                                        renderMissionCard(mission, true),
                                    )}
                                    <hr className="border-gray-600 my-3"/>
                                </>
                            )}

                            {/* Available Missions */}
                            <SectionTitle>Available Missions</SectionTitle>
                            {plunderverseMissions.availableMissions.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="text-gray-400 mb-3">No missions available at this location</div>
                                    <button
                                        onClick={() => {
                                            const seed = `player:${Date.now()}:refresh`;
                                            plunderverseMissions.generateMissions("Earth", player.rank, seed);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm rounded transition-colors"
                                    >
                                        Check for New Missions
                                    </button>
                                </div>
                            ) : (
                                plunderverseMissions.availableMissions.map((mission) => renderMissionCard(mission))
                            )}
                        </>
                    )}

                    {activeTab === "legacy" && (
                        <>
                            <SectionTitle>Legacy Missions</SectionTitle>
                            {legacyMissions.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="text-gray-400 mb-3">No legacy missions</div>
                                    <button
                                        onClick={generateNewMissions}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm rounded transition-colors"
                                    >
                                        Generate Legacy Missions
                                    </button>
                                </div>
                            ) : (
                                legacyMissions.map((mission) => (
                                    <div
                                        key={mission.id}
                                        className="bg-gray-800 p-2.5 rounded border border-gray-600 text-[13px]"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg">{getMissionTypeIcon(mission.type)}</span>
                                                <h3 className="font-semibold text-white">{mission.title}</h3>
                                            </div>
                                            <div className="flex items-center space-x-1">
                        <span className={getDifficultyColor(mission.difficulty)}>
                          {getDifficultyIcon(mission.difficulty)}
                        </span>
                                                <span className="text-yellow-400 font-mono text-sm">
                          +{mission.reward}
                        </span>
                                            </div>
                                        </div>
                                        <p className="text-gray-300 text-xs mb-2">{mission.description}</p>
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {activeTab === "reputation" && (
                        <div className="space-y-4">
                            {/* Current Status Card */}
                            <div className="bg-gray-800 p-3 rounded border border-gray-600">
                                <SectionTitle>Current Status</SectionTitle>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center space-x-2">
                                        <span>📍 Location:</span>
                                        <span className="font-mono text-cyan-400">
                      {gameFacade.getCurrentFaction()}
                    </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span>🏴‍☠️ Black Market:</span>
                                        <span
                                            className={
                                                gameFacade.canAccessBlackMarket() ? "text-green-400" : "text-red-400"
                                            }
                                        >
                      {gameFacade.canAccessBlackMarket() ? "✓ Access" : "✗ Locked"}
                    </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 p-3 rounded border border-gray-600">
                                <SectionTitle>Faction Standings</SectionTitle>

                                {/* Corporations */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-base">🏢</span>
                                            <span className="font-medium text-white">Corporations</span>
                                        </div>
                                        <span className={getReputationColor("corporations")}>
                      {player.getReputationStatus("corporations")} ({player.reputation.corporations})
                    </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                                            style={{
                                                width: `${Math.abs(player.reputation.corporations)}%`,
                                                marginLeft:
                                                    player.reputation.corporations < 0
                                                        ? `${50 - Math.abs(player.reputation.corporations / 2)}%`
                                                        : "50%",
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Law-abiding mega-corporations. High security, good pay, strict rules.
                                    </p>
                                </div>

                                {/* Independents */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-base">🤝</span>
                                            <span className="font-medium text-white">Independents</span>
                                        </div>
                                        <span className={getReputationColor("independents")}>
                      {player.getReputationStatus("independents")} ({player.reputation.independents})
                    </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="bg-green-500 h-1.5 rounded-full transition-all"
                                            style={{
                                                width: `${Math.abs(player.reputation.independents)}%`,
                                                marginLeft:
                                                    player.reputation.independents < 0
                                                        ? `${50 - Math.abs(player.reputation.independents / 2)}%`
                                                        : "50%",
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Free settlers and traders. Flexible morals, community-minded.
                                    </p>
                                </div>

                                {/* Outlaws */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-base">☠️</span>
                                            <span className="font-medium text-white">Outlaws</span>
                                        </div>
                                        <span className={getReputationColor("outlaws")}>
                      {player.getReputationStatus("outlaws")} ({player.reputation.outlaws})
                    </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="bg-red-500 h-1.5 rounded-full transition-all"
                                            style={{
                                                width: `${Math.abs(player.reputation.outlaws)}%`,
                                                marginLeft:
                                                    player.reputation.outlaws < 0
                                                        ? `${50 - Math.abs(player.reputation.outlaws / 2)}%`
                                                        : "50%",
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Pirates, smugglers, and rebels. High risk, high reward.
                                    </p>
                                </div>
                            </div>

                            {/* Reputation Effects */}
                            <div className="bg-gray-800 p-3 rounded border border-gray-600">
                                <SectionTitle>Reputation Effects</SectionTitle>
                                <div className="space-y-1 text-[11px] text-gray-400">
                                    <div>• High corporate rep: Better prices at stations, access to restricted areas
                                    </div>
                                    <div>• High independent rep: More diverse missions, community support</div>
                                    <div>• High outlaw rep: Black market access, intimidation bonus</div>
                                    <div>• Low reputation: Higher prices, fewer opportunities, possible hostility</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "stats" && (
                        <div className="space-y-4">
                            <div className="bg-gray-800 p-2.5 rounded border border-gray-600">
                                <SectionTitle>Career Statistics</SectionTitle>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Current Rank:</span>
                                        <span className="text-purple-400">
                      {player.rankTitle} (Level {player.rank})
                    </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Notoriety:</span>
                                        <span className="text-purple-400">{player.notoriety}/100</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Heat Level:</span>
                                        <span className={player.heat > 50 ? "text-red-400" : "text-orange-400"}>
                      {player.heat}/100
                    </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Successful Landings:</span>
                                        <span className="text-green-400">{landingCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Planets Visited:</span>
                                        <span className="text-blue-400">{visitedPlanets.size}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Total Earnings:</span>
                                        <span className="text-yellow-400">{totalEarnings} Credits</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Missions Completed:</span>
                                        <span className="text-purple-400">
                      {plunderverseMissions.completedMissionIds.size + completedMissions.length}
                    </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">Bounties Completed:</span>
                                        <span className="text-red-400">{completedBounties.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Achievements */}
                            {completedMissions.length > 0 && (
                                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                                    <h3 className="font-semibold text-white mb-2">Recent Achievements</h3>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {completedMissions.slice(-5).map((mission) => (
                                            <div key={mission.id} className="flex items-center space-x-2 text-[11px]">
                                                <span>{getMissionTypeIcon(mission.type)}</span>
                                                <span className="text-gray-300 flex-1">{mission.title}</span>
                                                <span className="text-yellow-400">+{mission.reward}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Mission Detail Modal */}
            {selectedMission && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                    onClick={() => setSelectedMission(null)}
                >
                    <div
                        className="bg-gray-900 border border-gray-600 rounded-lg p-5 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2">{selectedMission.title}</h2>
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg">{getMissionTypeIcon(selectedMission.type)}</span>
                                    <span className={getDifficultyColor(selectedMission.difficulty)}>
                    {getDifficultyIcon(selectedMission.difficulty)} {selectedMission.difficulty}
                  </span>
                                    {selectedMission.rewards?.base?.credits && (
                                        <span className="text-yellow-400 font-mono">
                      💰 {selectedMission.rewards.base.credits} credits
                    </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMission(null)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-gray-300 mb-3 italic text-xs">{selectedMission.description}</p>

                        {/* Objectives */}
                        {selectedMission.objectives.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-white mb-2">Objectives:</h3>
                                <div className="space-y-2">
                                    {selectedMission.objectives.map((obj) => (
                                        <div key={obj.id} className="flex items-start space-x-2">
                                            <span className="text-gray-400 mt-1">•</span>
                                            <div>
                                                <p className="text-gray-300 text-xs">{obj.description}</p>
                                                {obj.dialogue && (
                                                    <p className="text-[11px] text-gray-500 italic mt-1">"{obj.dialogue.npc}"</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Choices */}
                        {selectedMission.choices && selectedMission.choices.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-purple-400 mb-2">
                                    💭 This mission involves moral choices
                                </h3>
                                <p className="text-[11px] text-gray-400">
                                    Your decisions will impact faction relationships and future opportunities
                                </p>
                            </div>
                        )}

                        {/* Requirements */}
                        {selectedMission.requirements && Object.keys(selectedMission.requirements).length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-bold text-white mb-2">Requirements:</h3>
                                <div className="text-xs text-gray-400">
                                    {selectedMission.requirements.credits && (
                                        <div>• Credits: {selectedMission.requirements.credits}</div>
                                    )}
                                    {selectedMission.requirements.reputation &&
                                        Object.entries(selectedMission.requirements.reputation).map(
                                            ([faction, req]) => <div key={faction}>• {faction} reputation: {req}</div>,
                                        )}
                                    {selectedMission.requirements.cargoSpace && (
                                        <div>• Cargo space: {selectedMission.requirements.cargoSpace}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rewards & Consequences */}
                        <div className="mb-4">
                            <h3 className="text-xs font-bold text-white mb-2">Consequences:</h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <h4 className="text-green-400 mb-1">Success:</h4>
                                    {selectedMission.rewards?.base?.reputation && (
                                        <div className="text-gray-400">
                                            {Object.entries(selectedMission.rewards.base.reputation).map(
                                                ([faction, change]) => (
                                                    <div
                                                        key={faction}
                                                        className={change > 0 ? "text-green-400" : "text-red-400"}
                                                    >
                                                        {faction}: {change > 0 ? "+" : ""}
                                                        {change}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                    {(selectedMission.type === "smuggling" || selectedMission.type === "bounty") && (
                                        <div className="text-orange-400">Heat: +10-20</div>
                                    )}
                                </div>
                                {selectedMission.failureConsequences && (
                                    <div>
                                        <h4 className="text-red-400 mb-1">Failure:</h4>
                                        <div className="text-gray-400">
                                            {selectedMission.failureConsequences.credits && (
                                                <div>Credits: -{selectedMission.failureConsequences.credits}</div>
                                            )}
                                            {selectedMission.failureConsequences.reputation &&
                                                Object.entries(selectedMission.failureConsequences.reputation).map(
                                                    ([faction, change]) => (
                                                        <div key={faction} className="text-red-400">
                                                            {faction}: {change}
                                                        </div>
                                                    ),
                                                )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setSelectedMission(null)}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            >
                                Cancel
                            </button>
                            {!selectedMission.active && (
                                <button
                                    onClick={() => handleAcceptMission(selectedMission)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                >
                                    Accept Mission
                                </button>
                            )}
                            {selectedMission.active && selectedMission.choices.length > 0 && (
                                <button
                                    onClick={() => setShowChoiceDialog(true)}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                                >
                                    Make Choice
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Choice Dialog */}
            {showChoiceDialog && selectedMission && selectedMission.choices.length > 0 && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-purple-600 rounded-lg p-5 max-w-2xl w-full mx-4">
                        <h2 className="text-lg font-bold text-white mb-4">Critical Decision</h2>
                        <p className="text-gray-300 mb-3 italic text-xs">
                            Choose carefully - your decision will have lasting consequences...
                        </p>

                        <div className="space-y-3">
                            {selectedMission.choices.map((choice) => (
                                <button
                                    key={choice.id}
                                    onClick={() => {
                                        setSelectedChoice(choice);
                                        handleMissionChoice(selectedMission, choice);
                                    }}
                                    className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded transition-all"
                                >
                                    <p className="text-white mb-2">{choice.text}</p>
                                    {choice.outcomes && choice.outcomes.length > 0 && (
                                        <div className="text-[11px] text-gray-400">
                                            Potential outcomes:
                                            {choice.outcomes.map((outcome, i) => (
                                                <span key={i} className="ml-2">
                          {outcome.description}
                        </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowChoiceDialog(false)}
                            className="mt-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                        >
                            Not Yet...
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
