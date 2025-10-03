import { Router, Request, Response, NextFunction } from 'express';
import { gameSaveService, GameStateData } from '../services/game-save.service';
import { authenticateJWT, requireAuth } from '../middleware/auth';
import { ValidationError, UnauthorizedError } from '../utils/auth.errors';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/saves - List all saves for current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const saves = await gameSaveService.listSaves(user.id);
    
    res.json({
      success: true,
      saves,
      availableSlots: await gameSaveService.getAvailableSlots(user.id)
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/saves/latest - Get most recent save across all slots
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const gameState = await gameSaveService.getLatestSave(user.id);
    
    if (!gameState) {
      return res.json({
        success: false,
        message: 'No saves found',
        gameState: null
      });
    }
    
    res.json({
      success: true,
      gameState
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/saves/:slot - Get specific save slot
router.get('/:slot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const slot = parseInt(req.params.slot, 10);
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (isNaN(slot)) {
      throw new ValidationError(['Invalid slot number']);
    }
    
    const gameState = await gameSaveService.loadGame(user.id, slot);
    
    res.json({
      success: true,
      gameState
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/saves/:slot - Save game to specific slot
router.post('/:slot', async (req: Request<{ slot: string }, {}, { gameState: GameStateData }>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const slot = parseInt(req.params.slot, 10);
    const { gameState } = req.body;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (isNaN(slot)) {
      throw new ValidationError(['Invalid slot number']);
    }
    
    if (!gameState) {
      console.error('Save error: No game state in request body');
      throw new ValidationError(['Game state data is required']);
    }
    
    // Log the structure for debugging
    console.log('Saving game state for slot', slot, {
      hasPlayTime: typeof gameState.playTime === 'number',
      playTime: gameState.playTime,
      hasCredits: typeof gameState.credits === 'number',
      credits: gameState.credits,
      hasLocation: !!gameState.location,
      location: gameState.location,
      hasShipStatus: !!gameState.shipStatus,
      shipStatus: gameState.shipStatus,
      hasStores: !!gameState.stores,
    });
    
    // Validate required fields
    if (typeof gameState.playTime !== 'number' || 
        typeof gameState.credits !== 'number' || 
        !gameState.location ||
        !gameState.shipStatus) {
      console.error('Save validation failed:', {
        playTime: typeof gameState.playTime,
        credits: typeof gameState.credits,
        location: gameState.location,
        shipStatus: gameState.shipStatus,
      });
      throw new ValidationError(['Invalid game state structure']);
    }
    
    const savedSlot = await gameSaveService.saveGame(user.id, slot, gameState);
    
    res.json({
      success: true,
      message: 'Game saved successfully',
      save: savedSlot
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/saves/:slot - Delete specific save slot
router.delete('/:slot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const slot = parseInt(req.params.slot, 10);
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (isNaN(slot)) {
      throw new ValidationError(['Invalid slot number']);
    }
    
    await gameSaveService.deleteSave(user.id, slot);
    
    res.json({
      success: true,
      message: `Save in slot ${slot} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/saves/export - Export save as downloadable JSON
router.post('/export', async (req: Request<{}, {}, { slot: number }>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { slot } = req.body;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (!slot || typeof slot !== 'number') {
      throw new ValidationError(['Slot number is required']);
    }
    
    const exportData = await gameSaveService.exportSave(user.id, slot);
    
    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
    const filename = `plunderverse-save-slot${slot}-${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(exportData);
  } catch (error) {
    next(error);
  }
});

// POST /api/saves/import - Import save from uploaded JSON
router.post('/import', async (req: Request<{}, {}, { slot: number; saveData: string }>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const { slot, saveData } = req.body;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    if (!slot || typeof slot !== 'number') {
      throw new ValidationError(['Slot number is required']);
    }
    
    if (!saveData || typeof saveData !== 'string') {
      throw new ValidationError(['Save data is required']);
    }
    
    // Check if save data is too large (10MB limit)
    if (saveData.length > 10 * 1024 * 1024) {
      throw new ValidationError(['Save file is too large (max 10MB)']);
    }
    
    const savedSlot = await gameSaveService.importSave(user.id, slot, saveData);
    
    res.json({
      success: true,
      message: 'Save imported successfully',
      save: savedSlot
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/saves/slots/available - Get available save slots
router.get('/slots/available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    
    if (!user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const availableSlots = await gameSaveService.getAvailableSlots(user.id);
    
    res.json({
      success: true,
      availableSlots,
      maxSlots: 3,
      totalSlots: 10
    });
  } catch (error) {
    next(error);
  }
});

export default router;