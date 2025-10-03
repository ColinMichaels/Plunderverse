// Game Save API Service
// Handles all communication with the game save backend endpoints

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
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  saves?: SaveSlot[];
  availableSlots?: number[];
  gameState?: GameStateData;
  save?: SaveSlot;
}

class GameAPI {
  private baseURL = '/api';
  private maxRetries = 3;
  private retryDelay = 1000;
  
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  private async fetchWithRetry<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          credentials: 'include',
        });
        
        if (response.status === 401) {
          // Try to refresh token
          await this.refreshAccessToken();
          // Update headers with new token
          options.headers = {
            ...this.getAuthHeaders(),
            ...options.headers,
          };
          continue;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || data.error?.message || 'Request failed');
        }
        
        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx except 401)
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }
        
        // Wait before retrying
        if (i < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }
  
  private async refreshAccessToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      if (data.accessToken) {
        // Update stored token
        if (localStorage.getItem('accessToken')) {
          localStorage.setItem('accessToken', data.accessToken);
        } else {
          sessionStorage.setItem('accessToken', data.accessToken);
        }
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Redirect to login if refresh fails
      window.location.href = '/login';
      throw error;
    }
  }
  
  // Save game to a specific slot
  async saveGame(slot: number, gameState: GameStateData): Promise<SaveSlot> {
    const response = await this.fetchWithRetry<ApiResponse<SaveSlot>>(
      `${this.baseURL}/saves/${slot}`,
      {
        method: 'POST',
        body: JSON.stringify({ gameState }),
      }
    );
    
    if (!response.success || !response.save) {
      throw new Error(response.message || 'Failed to save game');
    }
    
    return response.save;
  }
  
  // Load game from a specific slot
  async loadGame(slot: number): Promise<GameStateData> {
    const response = await this.fetchWithRetry<ApiResponse<GameStateData>>(
      `${this.baseURL}/saves/${slot}`
    );
    
    if (!response.success || !response.gameState) {
      throw new Error(response.message || 'Failed to load game');
    }
    
    return response.gameState;
  }
  
  // Get the latest save across all slots
  async getLatestSave(): Promise<GameStateData | null> {
    const response = await this.fetchWithRetry<ApiResponse<GameStateData>>(
      `${this.baseURL}/saves/latest`
    );
    
    if (!response.success) {
      if (response.message === 'No saves found') {
        return null;
      }
      throw new Error(response.message || 'Failed to get latest save');
    }
    
    return response.gameState || null;
  }
  
  // List all saves for the current user
  async listSaves(): Promise<{
    saves: SaveSlot[];
    availableSlots: number[];
  }> {
    const response = await this.fetchWithRetry<ApiResponse<SaveSlot[]>>(
      `${this.baseURL}/saves`
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to list saves');
    }
    
    return {
      saves: response.saves || [],
      availableSlots: response.availableSlots || [],
    };
  }
  
  // Delete a save slot
  async deleteSave(slot: number): Promise<void> {
    const response = await this.fetchWithRetry<ApiResponse<void>>(
      `${this.baseURL}/saves/${slot}`,
      {
        method: 'DELETE',
      }
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete save');
    }
  }
  
  // Export save as JSON
  async exportSave(slot: number): Promise<string> {
    const response = await fetch(`${this.baseURL}/saves/export`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ slot }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to export save');
    }
    
    // Get the filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `plunderverse-save-slot${slot}.json`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }
    
    // Get the JSON content
    const saveData = await response.text();
    
    // Trigger download
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return saveData;
  }
  
  // Import save from JSON
  async importSave(slot: number, saveData: string): Promise<SaveSlot> {
    // Validate JSON
    try {
      JSON.parse(saveData);
    } catch (error) {
      throw new Error('Invalid save file format');
    }
    
    const response = await this.fetchWithRetry<ApiResponse<SaveSlot>>(
      `${this.baseURL}/saves/import`,
      {
        method: 'POST',
        body: JSON.stringify({ slot, saveData }),
      }
    );
    
    if (!response.success || !response.save) {
      throw new Error(response.message || 'Failed to import save');
    }
    
    return response.save;
  }
  
  // Import save from file
  async importSaveFromFile(slot: number, file: File): Promise<SaveSlot> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const saveData = e.target?.result as string;
          const result = await this.importSave(slot, saveData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  // Get available save slots
  async getAvailableSlots(): Promise<{
    availableSlots: number[];
    maxSlots: number;
    totalSlots: number;
  }> {
    const response = await this.fetchWithRetry<ApiResponse<void> & {
      availableSlots: number[];
      maxSlots: number;
      totalSlots: number;
    }>(
      `${this.baseURL}/saves/slots/available`
    );
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to get available slots');
    }
    
    return {
      availableSlots: response.availableSlots || [],
      maxSlots: response.maxSlots || 3,
      totalSlots: response.totalSlots || 10,
    };
  }
  
  // Quick save (to the first available slot or overwrite the most recent)
  async quickSave(gameState: GameStateData): Promise<SaveSlot> {
    const { saves, availableSlots } = await this.listSaves();
    
    let targetSlot: number;
    
    if (availableSlots.length > 0) {
      // Use first available slot
      targetSlot = availableSlots[0];
    } else if (saves.length > 0) {
      // Overwrite the most recent save
      const mostRecent = saves.reduce((latest, save) => {
        const saveTime = new Date(save.updatedAt).getTime();
        const latestTime = new Date(latest.updatedAt).getTime();
        return saveTime > latestTime ? save : latest;
      });
      targetSlot = mostRecent.slot;
    } else {
      // Use slot 1 as fallback
      targetSlot = 1;
    }
    
    return this.saveGame(targetSlot, gameState);
  }
  
  // Quick load (load the most recent save)
  async quickLoad(): Promise<GameStateData | null> {
    return this.getLatestSave();
  }
}

// Export singleton instance
export const gameApi = new GameAPI();