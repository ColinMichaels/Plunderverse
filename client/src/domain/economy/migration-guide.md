
# Economy Domain Store Migration Guide

## Overview
The economy system has been upgraded to use domain-based stores for better organization and maintainability.

## Migration Steps

### 1. Credits Store Migration
**Before (Legacy):**
```typescript
import { useCredits } from '../lib/stores/useCredits';

const { credits, spendCredits, earnCredits } = useCredits();
```

**After (New):**
```typescript
import { useCreditsStore } from '../domain/economy/credits.store';

const { credits, spendCredits, earnCredits } = useCreditsStore();
```

### 2. Inventory Store Migration
**Before (Legacy):**
```typescript
import { useInventory } from '../lib/stores/useInventory';

const { items, addResource, removeResource } = useInventory();
```

**After (New):**
```typescript
import { useInventoryStore } from '../domain/economy/inventory.store';

const { items, addResource, removeResource } = useInventoryStore();
```

### 3. Using Economy Service
**New Feature:**
```typescript
import { economyService } from '../domain/economy/economy.service';

// Unified transaction operations
const result = economyService.sellResource('iron', 10);
const repairResult = economyService.repairEquipment('drill-mk1');
```

### 4. Using Selectors
**New Feature:**
```typescript
import { useEconomySelectors, useCreditsData } from '../domain/economy/selectors';

const { totalInventoryValue, canAfford } = useEconomySelectors();
const credits = useCreditsData();
```

## Benefits
- **Single Source of Truth**: Domain stores are the authoritative data source
- **Better Transaction Safety**: Atomic operations with rollback support
- **Enhanced Debugging**: Detailed logging and consistency checks
- **Event System**: Economy events for reactive programming
- **Type Safety**: Improved TypeScript support

## Backward Compatibility
Legacy stores still work but are deprecated. They delegate to domain stores internally.
