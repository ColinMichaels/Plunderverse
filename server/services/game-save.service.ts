import { db, gameSaves, GameSave, NewGameSave } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { UnauthorizedError, NotFoundError, ValidationError } from '../utils/auth.errors';
import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// Version for save format compatibility
const SAVE_FORMAT_VERSION = '1.0.0';
const MAX_SAVE_SLOTS = 10;
const DEFAULT_SAVE_SLOTS = 3;
const COMPRESSION_THRESHOLD = 1024; // 1KB

export interface GameStateData {
  version: string;
  timestamp: number;
  playTime: number;
  credits: number;
  location: string;
  shipStatus: {
    hull: number;
    shield: number;
    fuel?: number;
  };
  stores: {
    // Player stores
    player?: any;
    credits?: any;
    inventory?: any;
    
    // Ship stores
    shipStatus?: any;
    equipment?: any;
    upgrades?: any;
    crew?: any;
    
    // Economy stores
    plunderverseEconomy?: any;
    plunderverseMissions?: any;
    tradeHistory?: any;
    crypto?: any;
    
    // World state
    solarSystem?: any;
    destroyedNodes?: any;
    heat?: any;
    rewards?: any;
    
    // Settings
    settings?: any;
  };
  metadata: {
    saveName: string;
    playerLevel?: number;
    rank?: string;
    reputation?: Record<string, number>;
  };
}

export interface SaveSlot {
  slot: number;
  saveName: string;
  playTime: number;
  credits: number;
  location: string;
  shipStatus: any;
  createdAt: Date;
  updatedAt: Date;
}

class GameSaveService {
  private async compressState(state: GameStateData): Promise<string> {
    const jsonString = JSON.stringify(state);
    
    // Only compress if over threshold
    if (jsonString.length > COMPRESSION_THRESHOLD) {
      const compressed = await gzipAsync(jsonString);
      // Prefix compressed data with a marker
      return 'gzip:' + compressed.toString('base64');
    }
    
    return jsonString;
  }
  
  private async decompressState(data: string): Promise<GameStateData> {
    // Check if data is compressed
    if (data.startsWith('gzip:')) {
      const base64Data = data.substring(5);
      const compressed = Buffer.from(base64Data, 'base64');
      const decompressed = await gunzipAsync(compressed);
      return JSON.parse(decompressed.toString());
    }
    
    return JSON.parse(data);
  }
  
  private generateSaveName(location: string, playTime: number): string {
    const hours = Math.floor(playTime / 3600);
    const days = Math.floor(hours / 24);
    const timeStr = days > 0 ? `Day ${days}` : `Hour ${hours}`;
    
    // Clean up location name
    const cleanLocation = location.charAt(0).toUpperCase() + location.slice(1);
    
    return `${cleanLocation} - ${timeStr}`;
  }
  
  private validateSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SAVE_SLOTS) {
      throw new ValidationError([`Invalid save slot. Must be between 1 and ${MAX_SAVE_SLOTS}`]);
    }
  }
  
  async saveGame(userId: string, slot: number, gameState: GameStateData): Promise<SaveSlot> {
    this.validateSlot(slot);
    
    // Add version and timestamp if not present
    if (!gameState.version) {
      gameState.version = SAVE_FORMAT_VERSION;
    }
    if (!gameState.timestamp) {
      gameState.timestamp = Date.now();
    }
    
    // Generate save name if not provided
    if (!gameState.metadata?.saveName) {
      gameState.metadata = {
        ...gameState.metadata,
        saveName: this.generateSaveName(gameState.location, gameState.playTime)
      };
    }
    
    // Compress game state
    const compressedState = await this.compressState(gameState);
    
    // Prepare save data
    const saveData: NewGameSave = {
      userId,
      slotNumber: slot,
      saveName: gameState.metadata.saveName,
      gameState: compressedState as any, // Store as JSON
      playTime: gameState.playTime,
      credits: gameState.credits,
      location: gameState.location,
      shipStatus: gameState.shipStatus
    };
    
    try {
      // Check if save exists in this slot
      const existingSave = await db.select()
        .from(gameSaves)
        .where(and(
          eq(gameSaves.userId, userId),
          eq(gameSaves.slotNumber, slot)
        ))
        .limit(1);
      
      let result: GameSave;
      
      if (existingSave.length > 0) {
        // Update existing save
        const updated = await db.update(gameSaves)
          .set({
            ...saveData,
            updatedAt: new Date()
          })
          .where(and(
            eq(gameSaves.userId, userId),
            eq(gameSaves.slotNumber, slot)
          ))
          .returning();
        result = updated[0];
      } else {
        // Create new save
        const inserted = await db.insert(gameSaves)
          .values(saveData)
          .returning();
        result = inserted[0];
      }
      
      return {
        slot: result.slotNumber,
        saveName: result.saveName,
        playTime: result.playTime,
        credits: result.credits,
        location: result.location,
        shipStatus: result.shipStatus,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      console.error('Error saving game:', error);
      throw new Error('Failed to save game');
    }
  }
  
  async loadGame(userId: string, slot: number): Promise<GameStateData> {
    this.validateSlot(slot);
    
    const saves = await db.select()
      .from(gameSaves)
      .where(and(
        eq(gameSaves.userId, userId),
        eq(gameSaves.slotNumber, slot)
      ))
      .limit(1);
    
    if (saves.length === 0) {
      throw new NotFoundError(`No save found in slot ${slot}`);
    }
    
    const save = saves[0];
    
    try {
      // Decompress and parse game state
      const gameState = await this.decompressState(save.gameState as string);
      
      // Validate version compatibility
      if (gameState.version && !this.isVersionCompatible(gameState.version)) {
        console.warn(`Save version ${gameState.version} may not be fully compatible with current version ${SAVE_FORMAT_VERSION}`);
      }
      
      return gameState;
    } catch (error) {
      console.error('Error loading game state:', error);
      throw new Error('Failed to load game state. Save may be corrupted.');
    }
  }
  
  async listSaves(userId: string): Promise<SaveSlot[]> {
    const saves = await db.select()
      .from(gameSaves)
      .where(eq(gameSaves.userId, userId))
      .orderBy(desc(gameSaves.updatedAt));
    
    return saves.map(save => ({
      slot: save.slotNumber,
      saveName: save.saveName,
      playTime: save.playTime,
      credits: save.credits,
      location: save.location,
      shipStatus: save.shipStatus,
      createdAt: save.createdAt,
      updatedAt: save.updatedAt
    }));
  }
  
  async deleteSave(userId: string, slot: number): Promise<void> {
    this.validateSlot(slot);
    
    const result = await db.delete(gameSaves)
      .where(and(
        eq(gameSaves.userId, userId),
        eq(gameSaves.slotNumber, slot)
      ));
    
    // Note: Drizzle doesn't return affected rows count for delete
    // So we'll just assume success if no error is thrown
  }
  
  async getLatestSave(userId: string): Promise<GameStateData | null> {
    const saves = await db.select()
      .from(gameSaves)
      .where(eq(gameSaves.userId, userId))
      .orderBy(desc(gameSaves.updatedAt))
      .limit(1);
    
    if (saves.length === 0) {
      return null;
    }
    
    const save = saves[0];
    
    try {
      return await this.decompressState(save.gameState as string);
    } catch (error) {
      console.error('Error loading latest save:', error);
      return null;
    }
  }
  
  async exportSave(userId: string, slot: number): Promise<string> {
    const gameState = await this.loadGame(userId, slot);
    
    // Add export metadata
    const exportData = {
      ...gameState,
      exported: true,
      exportDate: new Date().toISOString(),
      exportVersion: SAVE_FORMAT_VERSION
    };
    
    // Return uncompressed JSON for export
    return JSON.stringify(exportData, null, 2);
  }
  
  async importSave(userId: string, slot: number, importData: string): Promise<SaveSlot> {
    this.validateSlot(slot);
    
    try {
      const gameState = JSON.parse(importData) as GameStateData;
      
      // Validate imported data
      if (!gameState.version || !gameState.stores) {
        throw new ValidationError(['Invalid save file format']);
      }
      
      // Check version compatibility
      if (!this.isVersionCompatible(gameState.version)) {
        throw new ValidationError([`Incompatible save version: ${gameState.version}`]);
      }
      
      // Save the imported state
      return await this.saveGame(userId, slot, gameState);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(['Invalid save file. Please ensure the file is a valid game save.']);
    }
  }
  
  private isVersionCompatible(version: string): boolean {
    // For now, only accept saves with the same major version
    const [major] = version.split('.');
    const [currentMajor] = SAVE_FORMAT_VERSION.split('.');
    return major === currentMajor;
  }
  
  async getAvailableSlots(userId: string): Promise<number[]> {
    const saves = await this.listSaves(userId);
    const usedSlots = new Set(saves.map(s => s.slot));
    const availableSlots: number[] = [];
    
    for (let i = 1; i <= DEFAULT_SAVE_SLOTS; i++) {
      if (!usedSlots.has(i)) {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  }
}

export const gameSaveService = new GameSaveService();