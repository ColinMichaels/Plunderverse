import { Skull, RotateCcw, FolderOpen } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { useCreditsStore } from "@/domain/economy/credits.store";
import { useShipStatus } from "@/lib/stores/ship/useShipStatus";
import { useGame } from "@/lib/stores/ui/useGame";
import { quickLoad } from "@/utils/saveGame";
import { useState, useEffect } from "react";
import { useMusicPlayer } from "@/lib/stores/ui/useMusicPlayer";

const REVIVAL_COST = 300;

export function DeathScreen() {
  const credits = useCreditsStore((state) => state.credits);
  const lastDamageSource = useShipStatus((state) => state.lastDamageSource);
  const revive = useGame((state) => state.revive);
  const [isLoading, setIsLoading] = useState(false);
  const musicPlayer = useMusicPlayer();
  
  const canAffordRevival = credits >= REVIVAL_COST;
  
  // Play ambient/death music when death screen appears
  useEffect(() => {
    console.log('[DeathScreen] Player died - playing ambient music');
    
    // Start ambient music timer for death screen
    if (!musicPlayer.isPlaying) {
      musicPlayer.startAmbientTimer();
    }
    
    return () => {
      // Cleanup on unmount
      console.log('[DeathScreen] Unmounting death screen');
    };
  }, []);

  const handleRevive = () => {
    if (canAffordRevival) {
      // Stop ambient music before reviving
      console.log('[DeathScreen] Stopping music and reviving player');
      musicPlayer.stopAmbientTimer();
      musicPlayer.pause();
      
      revive();
    }
  };

  const handleLoadSave = async () => {
    setIsLoading(true);
    
    // Stop ambient music before loading save
    console.log('[DeathScreen] Stopping music and loading save');
    musicPlayer.stopAmbientTimer();
    musicPlayer.pause();
    
    try {
      await quickLoad();
      // quickLoad already handles state restoration and game start
    } catch (error) {
      console.error("Failed to load save:", error);
      alert("Failed to load save game. No saves found or save is corrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-red-900/50 bg-gray-900/95">
        <CardHeader className="border-b border-red-900/30">
          <CardTitle className="flex items-center justify-center gap-3 text-red-500">
            <Skull className="w-8 h-8" />
            <span className="text-2xl">Ship Destroyed</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <p className="text-gray-300 text-lg mb-2">
              Your ship was destroyed
              {lastDamageSource && ` by ${lastDamageSource}`}
            </p>
            <p className="text-gray-500 text-sm">
              You must either revive your ship or load from a previous save
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Revival Cost:</span>
              <span className="text-cyan-400 font-bold">{REVIVAL_COST} Credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Credits:</span>
              <span className={credits >= REVIVAL_COST ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                {credits} Credits
              </span>
            </div>
          </div>

          {!canAffordRevival && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">
                ⚠️ Insufficient credits for revival. You must load from a save.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleRevive}
            disabled={!canAffordRevival}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Revive Ship ({REVIVAL_COST} Credits)
          </Button>
          
          <Button 
            onClick={handleLoadSave}
            disabled={isLoading}
            variant="outline"
            className="w-full border-gray-600 hover:bg-gray-800"
            size="lg"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            {isLoading ? "Loading..." : "Load Last Save"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
