import { ResourceData } from '../../lib/planetData';

export interface MiningState {
  isActive: boolean;
  currentPlanet: string | null;
  targetResource: ResourceData | null;
  clicksCompleted: number;
  clicksRequired: number;
  miningSpeed: number;
  miningEfficiency: number;
  drillPower: number;
  extractorLevel: number;
}

export interface MiningResult {
  resource: ResourceData;
  quantity: number;
  planet: string;
}

export interface MiningOperationResult {
  success: boolean;
  result?: MiningResult;
  message?: string;
}