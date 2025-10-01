import { useCallback } from 'react';
import { useObjectiveTriggers } from './useObjectiveTriggers';
import { FactionId } from '../../plunderverse/types';

/**
 * Hook that provides functions to report combat-based objective progress
 * Used by combat systems to report enemy defeats
 */
export const useCombatTrigger = () => {
  const triggers = useObjectiveTriggers();
  
  // Report enemy defeated
  const reportEnemyDefeated = useCallback((enemyType?: string, enemyFaction?: FactionId, count: number = 1) => {
    triggers.reportCombatProgress(enemyType, enemyFaction, count);
    
    console.log(`[CombatTrigger] Enemy defeated: ${enemyType || enemyFaction || 'unknown'} x${count}`);
  }, [triggers]);
  
  // Report specific enemy types
  const reportPirateDefeated = useCallback((count: number = 1) => {
    triggers.reportCombatProgress('pirate', 'outlaws', count);
  }, [triggers]);
  
  const reportCorporateDefeated = useCallback((count: number = 1) => {
    triggers.reportCombatProgress('corporate', 'corporations', count);
  }, [triggers]);
  
  const reportDroneDefeated = useCallback((count: number = 1) => {
    triggers.reportCombatProgress('drone', undefined, count);
  }, [triggers]);
  
  const reportBossDefeated = useCallback((bossName: string) => {
    triggers.reportCombatProgress(bossName, undefined, 1);
    // Also report as custom trigger for special boss objectives
    triggers.reportCustomProgress(`boss_${bossName}_defeated`, 1);
  }, [triggers]);
  
  // Report combat statistics
  const reportCombatVictory = useCallback((enemiesDefeated: number, enemyType?: string) => {
    triggers.reportCombatProgress(enemyType, undefined, enemiesDefeated);
    // Also report as custom trigger for combat victories
    triggers.reportCustomProgress('combat_victories', enemiesDefeated);
  }, [triggers]);
  
  const reportCombatEscape = useCallback(() => {
    // Report escape as a custom trigger
    triggers.reportCustomProgress('combat_escapes', 1);
  }, [triggers]);
  
  return {
    reportEnemyDefeated,
    reportPirateDefeated,
    reportCorporateDefeated,
    reportDroneDefeated,
    reportBossDefeated,
    reportCombatVictory,
    reportCombatEscape,
    // Also expose the raw combat progress function
    reportCombat: triggers.reportCombatProgress
  };
};

export default useCombatTrigger;