// Generic Transaction Management System
// Handles all game economy transactions with a unified, extensible pattern

export interface Transaction {
  type: 'debit' | 'credit';
  category: string;  // 'item', 'service', 'repair', 'travel', 'mission', etc.
  subtype?: string;  // Optional subcategory
  amount: number;
  
  // Generic metadata - can store anything
  metadata: {
    itemId?: string;
    quantity?: number;
    source?: string;
    destination?: string;
    reason?: string;
    durability?: number;
    systems?: string[];
    [key: string]: any;
  };
  
  // Additional resource costs (not just credits)
  resourceCosts?: {
    fuel?: number;
    oxygen?: number;
    materials?: { [type: string]: number };
  };
  
  timestamp: number;
  userId: string;
  deviceId?: string;
  transactionId?: string;
}

export interface TransactionResult {
  success: boolean;
  error?: string;
  newBalances?: ResourceBalances;
  transactionId?: string;
  sideEffects?: any[];
}

export interface ResourceBalances {
  credits: number;
  fuel: number;
  oxygen: number;
  materials: { [type: string]: number };
  inventory?: any[];
  location?: string;
  shipHull?: number;
  shipShield?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validation rules for extensibility
abstract class ValidationRule {
  abstract validate(transaction: Transaction, balances: ResourceBalances): Promise<ValidationResult>;
}

class MinimumAmountRule extends ValidationRule {
  constructor(private minimum: number) {
    super();
  }
  
  async validate(transaction: Transaction): Promise<ValidationResult> {
    if (transaction.amount < this.minimum) {
      return { valid: false, error: `Amount must be at least ${this.minimum}` };
    }
    return { valid: true };
  }
}

class MaximumAmountRule extends ValidationRule {
  constructor(private maximum: number) {
    super();
  }
  
  async validate(transaction: Transaction): Promise<ValidationResult> {
    if (transaction.amount > this.maximum) {
      return { valid: false, error: `Amount cannot exceed ${this.maximum}` };
    }
    return { valid: true };
  }
}

class SufficientBalanceRule extends ValidationRule {
  async validate(transaction: Transaction, balances: ResourceBalances): Promise<ValidationResult> {
    if (transaction.type === 'debit' && transaction.amount > balances.credits) {
      return { valid: false, error: `Insufficient credits: need ${transaction.amount}, have ${balances.credits}` };
    }
    return { valid: true };
  }
}

class FuelRequirementRule extends ValidationRule {
  async validate(transaction: Transaction, balances: ResourceBalances): Promise<ValidationResult> {
    if (transaction.resourceCosts?.fuel && transaction.resourceCosts.fuel > balances.fuel) {
      return { valid: false, error: `Insufficient fuel: need ${transaction.resourceCosts.fuel}, have ${balances.fuel}` };
    }
    return { valid: true };
  }
}

export class TransactionManager {
  private balances: Map<string, ResourceBalances> = new Map();
  private transactionLog: Transaction[] = [];
  
  constructor() {
    console.log('[TransactionManager] Initialized');
  }
  
  /**
   * Process any transaction generically
   */
  async processTransaction(userId: string, transaction: Transaction): Promise<TransactionResult> {
    // Add transaction ID if not present
    transaction.userId = userId;
    transaction.transactionId = transaction.transactionId || this.generateTransactionId();
    transaction.timestamp = transaction.timestamp || Date.now();
    
    console.log(`[Transaction] Processing ${transaction.type} for ${userId}: ${transaction.category}/${transaction.subtype || 'default'} amount=${transaction.amount}`);
    
    const balances = this.getBalances(userId);
    
    // Validate transaction
    const validation = await this.validateTransaction(transaction, balances);
    if (!validation.valid) {
      console.log(`[Transaction] Validation failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }
    
    // Process based on type
    let result: TransactionResult;
    if (transaction.type === 'debit') {
      result = await this.processDebit(userId, transaction, balances);
    } else {
      result = await this.processCredit(userId, transaction, balances);
    }
    
    // Log transaction if successful
    if (result.success) {
      this.transactionLog.push(transaction);
      console.log(`[Transaction] Success: New credit balance = ${result.newBalances?.credits}`);
    }
    
    return result;
  }
  
  private async processDebit(
    userId: string,
    transaction: Transaction,
    balances: ResourceBalances
  ): Promise<TransactionResult> {
    // Special case: Allow 0-cost transactions (fixes fast travel issue)
    if (transaction.amount === 0 && (!transaction.resourceCosts || Object.keys(transaction.resourceCosts).length === 0)) {
      console.log(`[Transaction] Free transaction: ${transaction.metadata.reason || 'no reason'}`);
      return {
        success: true,
        newBalances: { ...balances },
        transactionId: transaction.transactionId
      };
    }
    
    // Check all resource requirements
    if (transaction.amount > balances.credits) {
      return { success: false, error: 'Insufficient credits' };
    }
    
    if (transaction.resourceCosts) {
      if (transaction.resourceCosts.fuel && transaction.resourceCosts.fuel > balances.fuel) {
        return { success: false, error: 'Insufficient fuel' };
      }
      
      if (transaction.resourceCosts.oxygen && transaction.resourceCosts.oxygen > balances.oxygen) {
        return { success: false, error: 'Insufficient oxygen' };
      }
      
      // Check materials
      if (transaction.resourceCosts.materials) {
        for (const [material, needed] of Object.entries(transaction.resourceCosts.materials)) {
          const available = balances.materials[material] || 0;
          if (needed > available) {
            return { success: false, error: `Insufficient ${material}: need ${needed}, have ${available}` };
          }
        }
      }
    }
    
    // Deduct resources atomically
    balances.credits -= transaction.amount;
    
    if (transaction.resourceCosts?.fuel) {
      balances.fuel -= transaction.resourceCosts.fuel;
    }
    
    if (transaction.resourceCosts?.oxygen) {
      balances.oxygen -= transaction.resourceCosts.oxygen;
    }
    
    if (transaction.resourceCosts?.materials) {
      for (const [material, amount] of Object.entries(transaction.resourceCosts.materials)) {
        balances.materials[material] = (balances.materials[material] || 0) - amount;
      }
    }
    
    // Apply side effects
    const sideEffects = await this.applySideEffects(userId, transaction, balances);
    
    // Save updated balances
    this.balances.set(userId, balances);
    
    return {
      success: true,
      newBalances: { ...balances },
      transactionId: transaction.transactionId,
      sideEffects
    };
  }
  
  private async processCredit(
    userId: string,
    transaction: Transaction,
    balances: ResourceBalances
  ): Promise<TransactionResult> {
    // Add resources
    balances.credits += transaction.amount;
    
    if (transaction.resourceCosts?.fuel) {
      balances.fuel += transaction.resourceCosts.fuel;
    }
    
    if (transaction.resourceCosts?.oxygen) {
      balances.oxygen += transaction.resourceCosts.oxygen;
    }
    
    if (transaction.resourceCosts?.materials) {
      for (const [material, amount] of Object.entries(transaction.resourceCosts.materials)) {
        balances.materials[material] = (balances.materials[material] || 0) + amount;
      }
    }
    
    // Apply side effects
    const sideEffects = await this.applySideEffects(userId, transaction, balances);
    
    // Save updated balances
    this.balances.set(userId, balances);
    
    return {
      success: true,
      newBalances: { ...balances },
      transactionId: transaction.transactionId,
      sideEffects
    };
  }
  
  private async applySideEffects(
    userId: string,
    transaction: Transaction,
    balances: ResourceBalances
  ): Promise<any[]> {
    const sideEffects: any[] = [];
    
    // Apply side effects based on category/subtype
    switch (transaction.category) {
      case 'travel':
      case 'fast_travel':
        if (transaction.metadata.destination) {
          balances.location = transaction.metadata.destination;
          sideEffects.push({ type: 'location_changed', destination: transaction.metadata.destination });
          console.log(`[Transaction] Side effect: Location changed to ${transaction.metadata.destination}`);
        }
        break;
        
      case 'repair':
      case 'service':
        if (transaction.subtype === 'hull' || transaction.metadata.systems?.includes('hull')) {
          balances.shipHull = 100;
          sideEffects.push({ type: 'hull_repaired' });
        }
        if (transaction.subtype === 'shield' || transaction.metadata.systems?.includes('shield')) {
          balances.shipShield = 100;
          sideEffects.push({ type: 'shield_repaired' });
        }
        break;
        
      case 'item':
        if (transaction.metadata.itemId && transaction.metadata.quantity) {
          // Add to inventory
          if (!balances.inventory) balances.inventory = [];
          
          const existingItem = balances.inventory.find((i: any) => i.type === transaction.metadata.itemId);
          if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 0) + (transaction.type === 'debit' ? transaction.metadata.quantity : -transaction.metadata.quantity);
          } else if (transaction.type === 'debit') {
            balances.inventory.push({
              type: transaction.metadata.itemId,
              quantity: transaction.metadata.quantity,
              acquiredAt: Date.now()
            });
          }
          
          sideEffects.push({ 
            type: transaction.type === 'debit' ? 'item_purchased' : 'item_sold',
            itemId: transaction.metadata.itemId,
            quantity: transaction.metadata.quantity
          });
        }
        break;
    }
    
    return sideEffects;
  }
  
  private async validateTransaction(
    transaction: Transaction,
    balances: ResourceBalances
  ): Promise<ValidationResult> {
    const rules = this.getValidationRules(transaction.category, transaction.subtype);
    
    for (const rule of rules) {
      const result = await rule.validate(transaction, balances);
      if (!result.valid) {
        return result;
      }
    }
    
    return { valid: true };
  }
  
  private getValidationRules(category: string, subtype?: string): ValidationRule[] {
    const rules: ValidationRule[] = [
      new MinimumAmountRule(0),  // Allow 0-cost transactions
      new MaximumAmountRule(1000000),  // Prevent overflow
    ];
    
    // Add category-specific rules
    if (category === 'travel' || category === 'fast_travel') {
      rules.push(new FuelRequirementRule());
    }
    
    // Only check balance for debits
    rules.push(new SufficientBalanceRule());
    
    return rules;
  }
  
  getBalances(userId: string): ResourceBalances {
    if (!this.balances.has(userId)) {
      // Initialize with default balances
      this.balances.set(userId, {
        credits: 1000,  // Starting credits
        fuel: 100,
        oxygen: 100,
        materials: {},
        inventory: [],
        location: 'Earth',
        shipHull: 100,
        shipShield: 100
      });
    }
    
    return this.balances.get(userId)!;
  }
  
  // Set balances from existing game state (for migration)
  setBalances(userId: string, balances: Partial<ResourceBalances>): void {
    const current = this.getBalances(userId);
    this.balances.set(userId, { ...current, ...balances });
    console.log(`[TransactionManager] Updated balances for ${userId}: credits=${balances.credits}`);
  }
  
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get transaction history for a user
  getTransactionHistory(userId: string, limit: number = 100): Transaction[] {
    return this.transactionLog
      .filter(t => t.userId === userId)
      .slice(-limit);
  }
}