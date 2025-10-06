/**
 * Station layout types and interfaces for the mini-game
 */

export interface StationRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  type: 'docking' | 'corridor' | 'market' | 'cantina' | 'quarters' | 'cargo' | 'engineering';
  connected?: string[];
}

export interface StationLayout {
  rooms: Map<string, StationRoom>;
}

export interface MapData {
  currentRoom: string;
  exploredRooms: string[];
  playerPos: { x: number; y: number };
  rooms: Array<StationRoom & { id: string }>;
}