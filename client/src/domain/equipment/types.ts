import { ResourceData } from '../../lib/planetData';

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'drill' | 'extractor' | 'scanner' | 'engine' | 'hull' | 'fuel' | 'maintenance';
  maxDurability: number;
  currentDurability: number;
  repairCost: number;
  stressResistance: number;
  performanceLevel: number;
  isConsumable?: boolean;
  replenishmentCost?: number;
  fuelType?: 'standard' | 'premium' | 'quantum';
  engineType?: 'standard' | 'efficient' | 'highPerformance';
  baseEfficiency?: number;
  speedMultiplier?: number;
}

export interface StressFactors {
  resourceHardness: number;
  operationIntensity: number;
  environmentalFactor: number;
}

export interface EquipmentState {
  equipment: EquipmentItem[];
}

export type ConditionStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'broken';
export type OperationType = 'autopilot' | 'mining' | 'repair';