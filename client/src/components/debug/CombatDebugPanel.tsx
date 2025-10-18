import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import {
  Crosshair,
  Trash2,
  Target,
  Zap,
  Shield,
  Heart,
  X,
  AlertTriangle,
} from "lucide-react";

// Store imports
import { useEnemies } from "../../lib/stores/combat/useEnemies";
import { useShooting } from "../../lib/stores/combat/useShooting";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useHeatSystem } from "../../lib/stores/player/useHeatSystem";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";

export function CombatDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFaction, setSelectedFaction] = useState<'outlaws' | 'corporations' | 'military' | 'bountyHunter'>('outlaws');
  const [selectedShipType, setSelectedShipType] = useState<'fighter' | 'patrol' | 'bomber' | 'elite'>('fighter');
  const [spawnDistance, setSpawnDistance] = useState("30");

  // Store hooks
  const enemies = useEnemies();
  const shooting = useShooting();
  const { cameraPosition } = useSolarSystem();
  const heatSystem = useHeatSystem();
  const { isVisible: isDebugVisible } = useDebugTools();

  // Keyboard shortcut to toggle (Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setIsOpen(!isOpen);
        console.log(`[COMBAT-DEBUG] Panel toggled to: ${!isOpen}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  // Only show if main debug panel is visible
  if (!isDebugVisible) return null;

  const handleSpawnEnemy = () => {
    const distance = parseFloat(spawnDistance);
    const angle = Math.random() * Math.PI * 2;
    const spawnPos = new THREE.Vector3(
      cameraPosition.x + Math.cos(angle) * distance,
      cameraPosition.y,
      cameraPosition.z + Math.sin(angle) * distance
    );

    enemies.spawnEnemy(spawnPos, selectedFaction, selectedShipType);
    toast.success(`Spawned ${selectedFaction} ${selectedShipType}`, {
      description: `At distance: ${distance}m`,
    });
    console.log(`[COMBAT-DEBUG] Spawned ${selectedFaction} ${selectedShipType} at`, spawnPos);
  };

  const handleSpawnPatrol = () => {
    const distance = parseFloat(spawnDistance);
    const positions = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    
    positions.forEach((angle) => {
      const spawnPos = new THREE.Vector3(
        cameraPosition.x + Math.cos(angle) * distance,
        cameraPosition.y,
        cameraPosition.z + Math.sin(angle) * distance
      );
      enemies.spawnEnemy(spawnPos, selectedFaction, 'patrol');
    });

    toast.success('Spawned patrol group', {
      description: `4 ${selectedFaction} patrol ships`,
    });
    console.log(`[COMBAT-DEBUG] Spawned patrol group of ${selectedFaction}`);
  };

  const handleClearEnemies = () => {
    const count = enemies.enemies.length;
    enemies.clearEnemies();
    toast.info('Cleared all enemies', {
      description: `Removed ${count} enemies`,
    });
    console.log(`[COMBAT-DEBUG] Cleared ${count} enemies`);
  };

  const handleSpawnBasedOnHeat = () => {
    enemies.spawnBasedOnHeat(cameraPosition);
    toast.info('Heat-based spawn triggered', {
      description: `Heat level: ${heatSystem.currentHeat}`,
    });
    console.log(`[COMBAT-DEBUG] Heat-based spawn at heat level ${heatSystem.currentHeat}`);
  };

  const handleAddHeat = () => {
    heatSystem.applyHeat('piracy', 2);
    toast.warning('Added heat', {
      description: `New level: ${heatSystem.currentHeat}`,
    });
  };

  const handleClearHeat = () => {
    heatSystem.updateHeat(-heatSystem.currentHeat);
    toast.success('Heat cleared');
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-4 z-[9999] bg-red-600/90 hover:bg-red-500 text-white p-3 rounded-lg shadow-lg border border-red-400/50 backdrop-blur-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Combat Debug (Ctrl+Shift+C)"
      >
        <Crosshair className="w-5 h-5" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-16 right-4 z-[9998] w-96 max-h-[calc(100vh-80px)] bg-gray-900/95 backdrop-blur-md border border-red-400/50 rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-red-400/30 bg-red-900/20">
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold text-red-400">Combat Debug</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-4 space-y-6">
                {/* Enemy Spawning */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Enemy Spawning
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Faction</Label>
                    <Select value={selectedFaction} onValueChange={(v: any) => setSelectedFaction(v)}>
                      <SelectTrigger className="bg-gray-800 border-red-400/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outlaws">Outlaws (Red)</SelectItem>
                        <SelectItem value="corporations">Corporations (Blue)</SelectItem>
                        <SelectItem value="military">Military (Green)</SelectItem>
                        <SelectItem value="bountyHunter">Bounty Hunter (Orange)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Ship Type</Label>
                    <Select value={selectedShipType} onValueChange={(v: any) => setSelectedShipType(v)}>
                      <SelectTrigger className="bg-gray-800 border-red-400/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fighter">Fighter (Fast, Low HP)</SelectItem>
                        <SelectItem value="patrol">Patrol (Balanced)</SelectItem>
                        <SelectItem value="bomber">Bomber (Slow, High Damage)</SelectItem>
                        <SelectItem value="elite">Elite (High HP, High Damage)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Spawn Distance (m)</Label>
                    <Input
                      type="number"
                      value={spawnDistance}
                      onChange={(e) => setSpawnDistance(e.target.value)}
                      className="bg-gray-800 border-red-400/30 text-white"
                      min="10"
                      max="200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleSpawnEnemy}
                      className="bg-red-600 hover:bg-red-500 text-white"
                      size="sm"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Spawn One
                    </Button>
                    <Button
                      onClick={handleSpawnPatrol}
                      variant="outline"
                      className="border-red-400/50 hover:bg-red-900/30 text-red-400"
                      size="sm"
                    >
                      Spawn Patrol
                    </Button>
                  </div>

                  <Button
                    onClick={handleClearEnemies}
                    variant="outline"
                    className="w-full border-red-400/50 hover:bg-red-900/30 text-red-400"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Enemies
                  </Button>
                </div>

                {/* Heat System */}
                <div className="space-y-3 border-t border-red-400/20 pt-3">
                  <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Heat System
                  </h3>

                  <div className="bg-gray-800/50 rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Current Heat:</span>
                      <Badge variant="outline" className="border-orange-400/50 text-orange-400">
                        {heatSystem.currentHeat.toFixed(0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Wanted Level:</span>
                      <Badge variant="outline" className="border-orange-400/50 text-orange-400">
                        {heatSystem.wantedLevelInfo.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleAddHeat}
                      variant="outline"
                      className="border-orange-400/50 hover:bg-orange-900/30 text-orange-400"
                      size="sm"
                    >
                      +Heat
                    </Button>
                    <Button
                      onClick={handleClearHeat}
                      variant="outline"
                      className="border-green-400/50 hover:bg-green-900/30 text-green-400"
                      size="sm"
                    >
                      Clear Heat
                    </Button>
                  </div>

                  <Button
                    onClick={handleSpawnBasedOnHeat}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white"
                    size="sm"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Spawn by Heat Level
                  </Button>
                </div>

                {/* Active Enemies */}
                <div className="space-y-3 border-t border-red-400/20 pt-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Active Enemies ({enemies.enemies.length})
                  </h3>

                  {enemies.enemies.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No enemies spawned
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {enemies.enemies.map((enemy, i) => (
                          <div
                            key={enemy.id}
                            className="bg-gray-800/50 rounded p-2 space-y-1 text-xs"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-white">
                                {enemy.faction} {enemy.shipType}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-red-400/50 text-red-400 text-[10px]"
                              >
                                #{i + 1}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart className="w-3 h-3 text-red-400" />
                              <span className="text-gray-400">
                                {enemy.hull}/{enemy.maxHull}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className="w-3 h-3 text-blue-400" />
                              <span className="text-gray-400">
                                {enemy.shield}/{enemy.maxShield}
                              </span>
                            </div>
                            <div className="text-gray-500 text-[10px]">
                              {enemy.behavior} · {enemy.weapon.damage} dmg
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Projectiles */}
                <div className="space-y-3 border-t border-red-400/20 pt-3">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Active Projectiles ({shooting.projectiles.length})
                  </h3>

                  {shooting.projectiles.length === 0 ? (
                    <div className="text-xs text-gray-500 text-center py-2">
                      No projectiles active
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 rounded p-2 text-xs text-gray-400">
                      {shooting.projectiles.filter(p => p.ownerType === 'player').length} player ·{' '}
                      {shooting.projectiles.filter(p => p.ownerType === 'enemy').length} enemy
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="text-xs text-gray-500 space-y-1 border-t border-red-400/20 pt-3">
                  <div>💡 Ctrl+Shift+C to toggle panel</div>
                  <div>💡 Enemies auto-engage when nearby</div>
                  <div>💡 Higher heat = more spawns</div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
