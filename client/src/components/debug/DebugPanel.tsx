import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Skull, Heart, Gauge } from "lucide-react";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useGame } from "../../lib/stores/ui/useGame";
import { usePlayer } from "../../lib/stores/player/usePlayer";
import { useCreditsStore } from "@/domain/economy/credits.store";

export function DebugPanel() {
  const { isVisible, toggleVisibility } = useDebugTools();
  const shipStatus = useShipStatus();
  const { phase } = useGame();
  const credits = useCreditsStore((state) => state.credits);
  const player = usePlayer();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        e.preventDefault();
        toggleVisibility();
        console.log('[DebugPanel] Toggled visibility:', !isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVisibility, isVisible]);

  if (!isVisible) return null;

  const handleKillPlayer = () => {
    console.log('[DebugPanel] Killing player...');
    useShipStatus.getState().takeDamage(1000, "Debug");
  };

  const handleRevivePlayer = () => {
    console.log('[DebugPanel] Reviving player...');
    useGame.getState().revive();
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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <Card className="bg-gray-900/95 border-cyan-500/30 shadow-2xl">
        <CardHeader className="border-b border-cyan-500/20 pb-3">
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Gauge className="w-5 h-5" />
            Debug Panel
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">Press ` (backtick) to toggle</p>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Player Actions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">Player Actions</h3>
            <div className="flex gap-2">
              <Button 
                onClick={handleKillPlayer}
                className="flex-1 bg-red-600 hover:bg-red-700"
                size="sm"
                disabled={phase === 'ended'}
              >
                <Skull className="w-4 h-4 mr-2" />
                Kill Player
              </Button>
              
              <Button 
                onClick={handleRevivePlayer}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
                disabled={phase !== 'ended'}
              >
                <Heart className="w-4 h-4 mr-2" />
                Revive
              </Button>
            </div>
          </div>

          {/* Player Stats */}
          <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">Player Stats</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Hull:</span>
                <span className={shipStatus.hull > 50 ? "text-green-400" : shipStatus.hull > 20 ? "text-yellow-400" : "text-red-400"}>
                  {shipStatus.hull.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shield:</span>
                <span className={shipStatus.shield > 50 ? "text-cyan-400" : shipStatus.shield > 20 ? "text-yellow-400" : "text-red-400"}>
                  {shipStatus.shield.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credits:</span>
                <span className="text-green-400">{credits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Game Phase:</span>
                <span className={phase === 'playing' ? "text-green-400" : phase === 'ended' ? "text-red-400" : "text-yellow-400"}>
                  {phase}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={shipStatus.isDestroyed ? "text-red-400" : shipStatus.isCritical ? "text-yellow-400" : "text-green-400"}>
                  {shipStatus.isDestroyed ? "Destroyed" : shipStatus.isCritical ? "Critical" : "OK"}
                </span>
              </div>
            </div>
          </div>

          {/* Kill Stats */}
          <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">Kill Statistics</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Kills:</span>
                <span className="text-cyan-400 font-bold">
                  {player.enemyKills?.totalKills || 0}
                </span>
              </div>
            </div>

            {/* Kill Breakdown by Type */}
            {Object.keys(killsByType).length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">By Type:</h4>
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
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Recent Kills:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentKills.map((kill, index) => (
                    <div key={`${kill.timestamp}-${index}`} className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {kill.enemyType} {kill.shipClass}
                      </span>
                      <span className="text-gray-600">
                        {new Date(kill.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentKills.length === 0 && (
              <p className="text-xs text-gray-600 mt-2">No enemies killed yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
