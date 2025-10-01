// ============================================================================
// PLUNDERVERSE CONTENT REGISTRY
// Dynamic content loading and management system with Vite integration
// ============================================================================

import {
  PlunderverseContent,
  Mission,
  Faction,
  StarNode,
  Rank,
  TradeGood,
  ShipModule,
  SpecialItem,
  EconomyTuning,
  ContentValidationResult,
  FactionId,
  DifficultyLevel
} from './types';

// ============================================================================
// CONTENT MODULE IMPORTS USING VITE
// Using import.meta.glob for proper bundling and HMR support
// ============================================================================

// Import all content JSON files with eager loading for production builds
// Use relative path for import.meta.glob for proper Vite bundling
const contentModules = import.meta.glob<any>('../../content/plunderverse/*.json', { 
  eager: true 
});

// ============================================================================
// REQUIREMENT EXPRESSION PARSER
// Parses requirement strings like "credits:2000" or "item:forged_manifest"
// ============================================================================

export interface ParsedRequirement {
  type: 'credits' | 'item' | 'reputation' | 'heat' | 'cargo' | 'combat' | 'mission' | 'knowledge';
  value: string | number;
  operator?: 'min' | 'max' | 'equals';
}

class RequirementParser {
  /**
   * Parse a requirement string into a structured object
   * Examples: 
   * - "credits:2000" -> { type: 'credits', value: 2000 }
   * - "item:forged_manifest" -> { type: 'item', value: 'forged_manifest' }
   * - "reputation:outlaws:20" -> { type: 'reputation', value: 'outlaws:20' }
   */
  static parse(requirement: string): ParsedRequirement | null {
    if (!requirement || typeof requirement !== 'string') {
      return null;
    }

    const parts = requirement.split(':');
    if (parts.length < 2) {
      console.warn(`Invalid requirement format: ${requirement}`);
      return null;
    }

    const type = parts[0].toLowerCase();
    const value = parts.slice(1).join(':'); // Handle cases like "reputation:outlaws:20"

    switch (type) {
      case 'credits':
      case 'cargo':
      case 'combat':
      case 'heat': {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          console.warn(`Invalid numeric value for ${type}: ${value}`);
          return null;
        }
        return { type: type as any, value: numValue };
      }
      
      case 'item':
      case 'mission':
      case 'knowledge':  // Added knowledge type
        return { type: type as any, value };
      
      case 'reputation': {
        // Handle "reputation:faction:amount"
        const repParts = value.split(':');
        if (repParts.length !== 2) {
          console.warn(`Invalid reputation format: ${requirement}`);
          return null;
        }
        return { type: 'reputation', value };
      }
      
      default:
        console.warn(`Unknown requirement type: ${type}`);
        return null;
    }
  }

  /**
   * Check if a requirement is met given the current state
   */
  static check(
    requirement: string,
    state: {
      credits?: number;
      items?: string[];
      reputation?: Record<string, number>;
      heat?: number;
      cargo?: number;
      combat?: number;
      completedMissions?: string[];
      knowledge?: string[];
    }
  ): boolean {
    const parsed = this.parse(requirement);
    if (!parsed) return false;

    switch (parsed.type) {
      case 'credits':
        return (state.credits || 0) >= (parsed.value as number);
      
      case 'item':
        return state.items?.includes(parsed.value as string) || false;
      
      case 'reputation': {
        const [faction, amount] = (parsed.value as string).split(':');
        const required = parseInt(amount, 10);
        return (state.reputation?.[faction] || 0) >= required;
      }
      
      case 'heat':
        return (state.heat || 0) <= (parsed.value as number); // Note: max heat
      
      case 'cargo':
        return (state.cargo || 0) >= (parsed.value as number);
      
      case 'combat':
        return (state.combat || 0) >= (parsed.value as number);
      
      case 'mission':
        return state.completedMissions?.includes(parsed.value as string) || false;
      
      case 'knowledge':
        return state.knowledge?.includes(parsed.value as string) || false;
      
      default:
        return false;
    }
  }
}

// ============================================================================
// SAFE FORMULA EVALUATOR
// Replaces eval() with a safe expression parser for formulas
// ============================================================================

class SafeFormulaEvaluator {
  /**
   * Safely evaluate a simple mathematical formula
   * Supports: +, -, *, /, (), numbers, and variables
   * Example: "reputation * 0.01 + 1" with { reputation: 50 } = 1.5
   */
  static evaluate(formula: string, variables: Record<string, number> = {}): number {
    if (!formula || typeof formula !== 'string') {
      return 1; // Default multiplier
    }

    // Replace variables with their values
    let expression = formula;
    for (const [key, value] of Object.entries(variables)) {
      // Use a regex to replace whole words only
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, value.toString());
    }

    // Remove any non-numeric, non-operator characters for safety
    expression = expression.replace(/[^0-9+\-*/().\s]/g, '');

    try {
      // Use a safe math parser instead of eval
      return this.parseMathExpression(expression);
    } catch (error) {
      console.warn(`Failed to evaluate formula "${formula}":`, error);
      return 1; // Default multiplier on error
    }
  }

  /**
   * Parse and evaluate a mathematical expression safely
   * This is a simple recursive descent parser
   */
  private static parseMathExpression(expr: string): number {
    const tokens = this.tokenize(expr);
    const result = this.parseExpression(tokens);
    
    if (tokens.length > 0) {
      throw new Error(`Unexpected tokens remaining: ${tokens.join(' ')}`);
    }
    
    return result;
  }

  private static tokenize(expr: string): string[] {
    // Split expression into tokens (numbers, operators, parentheses)
    const tokenRegex = /([+\-*/()]|\d+(?:\.\d+)?)/g;
    const tokens = expr.match(tokenRegex) || [];
    return tokens;
  }

  private static parseExpression(tokens: string[]): number {
    let left = this.parseTerm(tokens);
    
    while (tokens.length > 0 && (tokens[0] === '+' || tokens[0] === '-')) {
      const op = tokens.shift()!;
      const right = this.parseTerm(tokens);
      
      if (op === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    }
    
    return left;
  }

  private static parseTerm(tokens: string[]): number {
    let left = this.parseFactor(tokens);
    
    while (tokens.length > 0 && (tokens[0] === '*' || tokens[0] === '/')) {
      const op = tokens.shift()!;
      const right = this.parseFactor(tokens);
      
      if (op === '*') {
        left = left * right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left = left / right;
      }
    }
    
    return left;
  }

  private static parseFactor(tokens: string[]): number {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }
    
    const token = tokens[0];
    
    // Handle parentheses
    if (token === '(') {
      tokens.shift(); // Remove '('
      const result = this.parseExpression(tokens);
      
      if (tokens.length === 0 || tokens[0] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      
      tokens.shift(); // Remove ')'
      return result;
    }
    
    // Handle numbers
    const num = parseFloat(token);
    if (!isNaN(num)) {
      tokens.shift();
      return num;
    }
    
    // Handle unary minus
    if (token === '-') {
      tokens.shift();
      return -this.parseFactor(tokens);
    }
    
    throw new Error(`Unexpected token: ${token}`);
  }
}

// ============================================================================
// CONTENT REGISTRY CLASS
// ============================================================================

class ContentRegistry {
  private content: PlunderverseContent | null = null;
  private loadedTimestamp: number = 0;
  private validators: Map<string, (data: any) => ContentValidationResult> = new Map();
  private contentChangeCallbacks: Set<(content: PlunderverseContent) => void> = new Set();
  private isLoading: boolean = false;
  private lastError: string | null = null;
  private hmrCleanup: (() => void) | null = null;

  constructor() {
    this.initializeValidators();
    
    // Enable HMR in development mode
    if (import.meta.env.DEV) {
      this.enableHMR();
    }
  }

  // ============================================================================
  // CONTENT LOADING WITH VITE
  // ============================================================================

  private getContentFromModules(): {
    missions?: any;
    factions?: any;
    nodes?: any;
    ranks?: any;
    items?: any;
    tuning?: any;
  } {
    const content: any = {};
    
    // Map module paths to content keys (using relative paths)
    const pathMapping: Record<string, string> = {
      '../../content/plunderverse/missions.json': 'missions',
      '../../content/plunderverse/factions.json': 'factions',
      '../../content/plunderverse/nodes.json': 'nodes',
      '../../content/plunderverse/ranks.json': 'ranks',
      '../../content/plunderverse/items.json': 'items',
      '../../content/plunderverse/tuning.json': 'tuning'
    };

    for (const [path, module] of Object.entries(contentModules)) {
      const key = pathMapping[path];
      if (key) {
        content[key] = (module as any).default || module;
      }
    }

    return content;
  }

  public async loadContent(forceReload: boolean = false): Promise<PlunderverseContent> {
    // Return cached content if available and not forcing reload
    if (this.content && !forceReload) {
      return this.content;
    }

    // Prevent concurrent loads
    if (this.isLoading) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(checkInterval);
            if (this.content) {
              resolve(this.content);
            } else if (this.lastError) {
              reject(new Error(this.lastError));
            }
          }
        }, 100);
      });
    }

    this.isLoading = true;
    this.lastError = null;

    try {
      console.log('Loading Plunderverse content using Vite modules...');

      // Get all content from imported modules
      const rawContent = this.getContentFromModules();

      // Extract data from modules
      const missionsData = rawContent.missions || { missions: [] };
      const factionsData = rawContent.factions || { factions: [] };
      const nodesData = rawContent.nodes || { starNodes: [] };
      const ranksData = rawContent.ranks || { ranks: [] };
      const itemsData = rawContent.items || { items: { trade_goods: [], ship_modules: [], special_items: [] } };
      const tuningData = rawContent.tuning || { economy: {} };

      // Validate all content
      const validationResults = {
        missions: this.validateMissions(missionsData.missions),
        factions: this.validateFactions(factionsData.factions),
        nodes: this.validateNodes(nodesData.starNodes),
        ranks: this.validateRanks(ranksData.ranks),
        items: this.validateItems({
          trade_goods: itemsData.items.trade_goods,
          ship_modules: itemsData.items.ship_modules,
          special_items: itemsData.items.special_items
        }),
        tuning: this.validateTuning(tuningData.economy)
      };

      // Check for validation errors
      const errors: string[] = [];
      Object.entries(validationResults).forEach(([key, result]) => {
        if (!result.valid) {
          errors.push(`${key}: ${result.errors.join(', ')}`);
        }
        if (result.warnings.length > 0) {
          console.warn(`${key} warnings:`, result.warnings);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Content validation failed: ${errors.join('; ')}`);
      }

      // Initialize mission states
      missionsData.missions = missionsData.missions.map((mission: Mission) => ({
        ...mission,
        active: false,
        completed: false,
        progress: 0,
        objectives: mission.objectives.map(obj => ({
          ...obj,
          completed: false
        }))
      }));

      // Create content object
      this.content = {
        missions: missionsData.missions,
        factions: factionsData.factions,
        starNodes: nodesData.starNodes,
        ranks: ranksData.ranks,
        tradeGoods: itemsData.items.trade_goods,
        shipModules: itemsData.items.ship_modules,
        specialItems: itemsData.items.special_items,
        economyTuning: tuningData.economy
      };

      this.loadedTimestamp = Date.now();

      // Notify listeners of content change
      this.notifyContentChange();

      console.log('Plunderverse content loaded successfully');
      console.log(`- ${this.content.missions.length} missions`);
      console.log(`- ${this.content.factions.length} factions`);
      console.log(`- ${this.content.starNodes.length} star nodes`);
      console.log(`- ${this.content.ranks.length} ranks`);
      console.log(`- ${this.content.tradeGoods.length} trade goods`);
      console.log(`- ${this.content.shipModules.length} ship modules`);

      return this.content;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load Plunderverse content:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================================================
  // HOT MODULE REPLACEMENT (HMR) WITH VITE
  // ============================================================================

  private enableHMR(): void {
    if (!import.meta.hot) {
      console.warn('HMR is not available');
      return;
    }

    console.log('Vite HMR enabled for Plunderverse content');

    // Accept HMR for JSON modules
    const acceptHMR = () => {
      import.meta.hot?.accept(
        [
          '../../content/plunderverse/missions.json',
          '../../content/plunderverse/factions.json',
          '../../content/plunderverse/nodes.json',
          '../../content/plunderverse/ranks.json',
          '../../content/plunderverse/items.json',
          '../../content/plunderverse/tuning.json'
        ],
        async () => {
          console.log('Plunderverse content changed, hot-reloading...');
          try {
            await this.loadContent(true);
            console.log('Content hot-reloaded successfully');
          } catch (error) {
            console.error('Hot-reload failed:', error);
          }
        }
      );
    };

    acceptHMR();

    // Store cleanup function
    this.hmrCleanup = () => {
      import.meta.hot?.dispose(() => {
        console.log('HMR cleanup for Plunderverse content');
      });
    };
  }

  public disableHMR(): void {
    if (this.hmrCleanup) {
      this.hmrCleanup();
      this.hmrCleanup = null;
      console.log('HMR disabled');
    }
  }

  // ============================================================================
  // CONTENT ACCESS
  // ============================================================================

  public getContent(): PlunderverseContent | null {
    return this.content;
  }

  public getMission(id: string): Mission | undefined {
    return this.content?.missions.find(m => m.id === id);
  }

  public getMissionsByType(type: string): Mission[] {
    return this.content?.missions.filter(m => m.type === type) || [];
  }

  public getMissionsByDifficulty(difficulty: DifficultyLevel): Mission[] {
    return this.content?.missions.filter(m => m.difficulty === difficulty) || [];
  }

  public getAvailableMissions(playerRank: number, playerReputation: Record<FactionId, number>): Mission[] {
    if (!this.content) return [];

    return this.content.missions.filter(mission => {
      // Check rank requirement
      if (mission.minRank > playerRank) return false;

      // Check reputation requirements
      if (mission.requirements.reputation) {
        for (const [faction, required] of Object.entries(mission.requirements.reputation)) {
          const playerRep = playerReputation[faction as FactionId] || 0;
          if (playerRep < required) return false;
        }
      }

      // Check if not already active or completed
      if (mission.active || mission.completed) return false;

      return true;
    });
  }

  public getFaction(id: FactionId): Faction | undefined {
    return this.content?.factions.find(f => f.id === id);
  }

  public getNode(id: string): StarNode | undefined {
    return this.content?.starNodes.find(n => n.id === id);
  }

  public getNodesInRange(position: { x: number; y: number; z: number }, range: number): StarNode[] {
    if (!this.content) return [];

    return this.content.starNodes.filter(node => {
      const distance = Math.sqrt(
        Math.pow(node.coordinates.x - position.x, 2) +
        Math.pow(node.coordinates.y - position.y, 2) +
        Math.pow(node.coordinates.z - position.z, 2)
      );
      return distance <= range;
    });
  }

  public getRank(level: number): Rank | undefined {
    return this.content?.ranks.find(r => r.level === level);
  }

  public getItem(id: string): TradeGood | ShipModule | SpecialItem | undefined {
    if (!this.content) return undefined;

    return this.content.tradeGoods.find(i => i.id === id) ||
           this.content.shipModules.find(i => i.id === id) ||
           this.content.specialItems.find(i => i.id === id);
  }

  public getTuning(): EconomyTuning | undefined {
    return this.content?.economyTuning;
  }

  // ============================================================================
  // REQUIREMENT CHECKING
  // ============================================================================

  public checkRequirement(
    requirement: string,
    playerState: {
      credits?: number;
      items?: string[];
      reputation?: Record<string, number>;
      heat?: number;
      cargo?: number;
      combat?: number;
      completedMissions?: string[];
    }
  ): boolean {
    return RequirementParser.check(requirement, playerState);
  }

  public parseRequirement(requirement: string): ParsedRequirement | null {
    return RequirementParser.parse(requirement);
  }

  // ============================================================================
  // CONTENT VALIDATION
  // ============================================================================

  private initializeValidators(): void {
    // Add validators for each content type
    this.validators.set('missions', this.validateMissions.bind(this));
    this.validators.set('factions', this.validateFactions.bind(this));
    this.validators.set('nodes', this.validateNodes.bind(this));
    this.validators.set('ranks', this.validateRanks.bind(this));
    this.validators.set('items', this.validateItems.bind(this));
    this.validators.set('tuning', this.validateTuning.bind(this));
  }

  private validateMissions(missions: Mission[]): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    missions.forEach(mission => {
      // Check required fields
      if (!mission.id) errors.push(`Mission missing id`);
      if (!mission.title) errors.push(`Mission ${mission.id} missing title`);
      if (!mission.type) errors.push(`Mission ${mission.id} missing type`);
      if (!mission.difficulty) errors.push(`Mission ${mission.id} missing difficulty`);
      if (mission.minRank === undefined) errors.push(`Mission ${mission.id} missing minRank`);

      // Check objectives
      if (!mission.objectives || mission.objectives.length === 0) {
        warnings.push(`Mission ${mission.id} has no objectives`);
      } else {
        const objectiveIds = new Set<string>();
        mission.objectives.forEach(obj => {
          if (!obj.id) errors.push(`Objective in mission ${mission.id} missing id`);
          if (!obj.type) errors.push(`Objective ${obj.id} in mission ${mission.id} missing type`);
          if (objectiveIds.has(obj.id)) errors.push(`Duplicate objective id ${obj.id} in mission ${mission.id}`);
          objectiveIds.add(obj.id);
        });
      }

      // Check choices reference valid objectives
      mission.choices?.forEach(choice => {
        if (choice.appears && !mission.objectives.find(o => o.id === choice.appears)) {
          warnings.push(`Choice ${choice.id} in mission ${mission.id} references non-existent objective ${choice.appears}`);
        }

        // Validate requirements using parser
        choice.requires?.forEach(req => {
          const parsed = RequirementParser.parse(req);
          if (!parsed) {
            warnings.push(`Invalid requirement format in choice ${choice.id}: ${req}`);
          }
        });
      });

      // Validate rewards
      if (!mission.rewards) {
        warnings.push(`Mission ${mission.id} has no rewards defined`);
      }
    });

    // Check for duplicate mission IDs
    const missionIds = new Set<string>();
    missions.forEach(mission => {
      if (missionIds.has(mission.id)) {
        errors.push(`Duplicate mission id: ${mission.id}`);
      }
      missionIds.add(mission.id);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateFactions(factions: Faction[]): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validFactionIds = ['corporations', 'independents', 'outlaws'];

    factions.forEach(faction => {
      // Check required fields
      if (!faction.id) errors.push(`Faction missing id`);
      if (!faction.name) errors.push(`Faction ${faction.id} missing name`);
      if (!validFactionIds.includes(faction.id)) {
        errors.push(`Invalid faction id: ${faction.id}`);
      }

      // Check reputation levels
      if (!faction.reputationLevels || faction.reputationLevels.length === 0) {
        errors.push(`Faction ${faction.id} missing reputation levels`);
      } else {
        // Check that reputation levels cover the full range
        const minRep = Math.min(...faction.reputationLevels.map(r => r.min));
        const maxRep = Math.max(...faction.reputationLevels.map(r => r.max));
        if (minRep > -100 || maxRep < 100) {
          warnings.push(`Faction ${faction.id} reputation levels don't cover full range (-100 to 100)`);
        }
      }

      // Validate formulas in reaction modifiers
      if (faction.reactionModifiers?.trading?.priceMultiplier?.formula) {
        try {
          // Test the formula with a sample value
          const testResult = SafeFormulaEvaluator.evaluate(
            faction.reactionModifiers.trading.priceMultiplier.formula,
            { reputation: 50 }
          );
          if (isNaN(testResult)) {
            errors.push(`Invalid formula in faction ${faction.id} priceMultiplier`);
          }
        } catch (e) {
          errors.push(`Error in faction ${faction.id} priceMultiplier formula: ${e}`);
        }
      }

      // Check territories
      if (!faction.territories || faction.territories.length === 0) {
        warnings.push(`Faction ${faction.id} has no territories`);
      }
    });

    // Ensure all required factions exist
    validFactionIds.forEach(id => {
      if (!factions.find(f => f.id === id)) {
        errors.push(`Missing required faction: ${id}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateNodes(nodes: StarNode[]): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    nodes.forEach(node => {
      // Check required fields
      if (!node.id) errors.push(`Node missing id`);
      if (!node.name) errors.push(`Node ${node.id} missing name`);
      if (!node.type) errors.push(`Node ${node.id} missing type`);
      if (!node.coordinates) errors.push(`Node ${node.id} missing coordinates`);
      if (node.riskLevel === undefined) errors.push(`Node ${node.id} missing riskLevel`);

      // Check services
      if (!node.services) {
        errors.push(`Node ${node.id} missing services`);
      }

      // Check security
      if (!node.security) {
        errors.push(`Node ${node.id} missing security`);
      } else {
        if (node.security.scanChance < 0 || node.security.scanChance > 1) {
          errors.push(`Node ${node.id} has invalid scanChance: ${node.security.scanChance}`);
        }
      }

      // Check faction control
      if (node.faction && (node.factionControl < 0 || node.factionControl > 100)) {
        errors.push(`Node ${node.id} has invalid factionControl: ${node.factionControl}`);
      }
    });

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    nodes.forEach(node => {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      }
      nodeIds.add(node.id);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRanks(ranks: Rank[]): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check that ranks are sequential
    ranks.forEach((rank, index) => {
      if (rank.level !== index) {
        errors.push(`Rank ${rank.id} has non-sequential level ${rank.level} (expected ${index})`);
      }

      // Check required fields
      if (!rank.id) errors.push(`Rank missing id`);
      if (!rank.title) errors.push(`Rank ${rank.id} missing title`);
      if (!rank.requirements) errors.push(`Rank ${rank.id} missing requirements`);
      if (!rank.benefits) errors.push(`Rank ${rank.id} missing benefits`);
    });

    // Check that we have at least some ranks
    if (ranks.length === 0) {
      errors.push('No ranks defined');
    } else if (ranks.length < 5) {
      warnings.push(`Only ${ranks.length} ranks defined, consider adding more for progression`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateItems(items: { trade_goods: TradeGood[], ship_modules: ShipModule[], special_items: SpecialItem[] }): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate trade goods
    items.trade_goods.forEach(item => {
      if (!item.id) errors.push(`Trade good missing id`);
      if (!item.name) errors.push(`Trade good ${item.id} missing name`);
      if (item.basePrice === undefined) errors.push(`Trade good ${item.id} missing basePrice`);
      if (item.weight === undefined) errors.push(`Trade good ${item.id} missing weight`);
    });

    // Validate ship modules
    items.ship_modules.forEach(module => {
      if (!module.id) errors.push(`Ship module missing id`);
      if (!module.name) errors.push(`Ship module ${module.id} missing name`);
      if (!module.slot) errors.push(`Ship module ${module.id} missing slot`);
      if (module.basePrice === undefined) errors.push(`Ship module ${module.id} missing basePrice`);
    });

    // Validate special items
    items.special_items.forEach(item => {
      if (!item.id) errors.push(`Special item missing id`);
      if (!item.name) errors.push(`Special item ${item.id} missing name`);
      if (item.basePrice === undefined) errors.push(`Special item ${item.id} missing basePrice`);
    });

    // Check for duplicate IDs across all item types
    const allIds = new Set<string>();
    [...items.trade_goods, ...items.ship_modules, ...items.special_items].forEach(item => {
      if (allIds.has(item.id)) {
        errors.push(`Duplicate item id: ${item.id}`);
      }
      allIds.add(item.id);
    });

    // Warnings for content balance
    if (items.trade_goods.length < 10) {
      warnings.push(`Only ${items.trade_goods.length} trade goods defined, consider adding more for variety`);
    }
    if (items.ship_modules.length < 5) {
      warnings.push(`Only ${items.ship_modules.length} ship modules defined, consider adding more for customization`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateTuning(tuning: EconomyTuning): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required sections
    if (!tuning.starting_conditions) errors.push('Tuning missing starting_conditions');
    if (!tuning.fuel_costs) errors.push('Tuning missing fuel_costs');
    if (!tuning.repair_costs) errors.push('Tuning missing repair_costs');
    if (!tuning.trading) errors.push('Tuning missing trading');
    if (!tuning.combat) errors.push('Tuning missing combat');
    if (!tuning.missions) errors.push('Tuning missing missions');

    // Validate starting conditions
    if (tuning.starting_conditions) {
      if (tuning.starting_conditions.credits < 0) {
        errors.push('Starting credits cannot be negative');
      }
      if (tuning.starting_conditions.fuel <= 0) {
        errors.push('Starting fuel must be positive');
      }
    }

    // Validate heat system
    if (tuning.heat_system) {
      if (tuning.heat_system.max_heat <= 0) {
        errors.push('Max heat must be positive');
      }
    }

    // Check balance warnings
    if (tuning.missions?.base_rewards) {
      const easyReward = tuning.missions.base_rewards.easy || 0;
      const hardReward = tuning.missions.base_rewards.hard || 0;
      if (hardReward < easyReward * 2) {
        warnings.push('Hard mission rewards may be too low compared to easy missions');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // CONTENT CHANGE NOTIFICATIONS
  // ============================================================================

  public onContentChange(callback: (content: PlunderverseContent) => void): () => void {
    this.contentChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.contentChangeCallbacks.delete(callback);
    };
  }

  private notifyContentChange(): void {
    if (!this.content) return;
    
    this.contentChangeCallbacks.forEach(callback => {
      try {
        callback(this.content!);
      } catch (error) {
        console.error('Error in content change callback:', error);
      }
    });
  }

  // ============================================================================
  // CALCULATION HELPERS (Using Safe Formula Evaluator)
  // ============================================================================

  public calculatePriceModifier(
    nodeId: string,
    itemId: string,
    playerReputation: Record<FactionId, number>
  ): number {
    const node = this.getNode(nodeId);
    if (!node) return 1;

    let modifier = 1;

    // Apply node economy modifiers
    if (node.economy?.priceModifiers) {
      modifier *= node.economy.priceModifiers[itemId] || 1;
    }

    // Apply faction reputation modifiers (using safe evaluator)
    if (node.faction) {
      const faction = this.getFaction(node.faction);
      if (faction?.reactionModifiers?.trading?.priceMultiplier) {
        const rep = playerReputation[node.faction] || 0;
        const formula = faction.reactionModifiers.trading.priceMultiplier.formula;
        
        // Use safe formula evaluator instead of eval
        const multiplier = SafeFormulaEvaluator.evaluate(formula, { reputation: rep });
        
        modifier *= Math.max(
          faction.reactionModifiers.trading.priceMultiplier.min,
          Math.min(
            faction.reactionModifiers.trading.priceMultiplier.max,
            multiplier
          )
        );
      }
    }

    return modifier;
  }

  public calculateMissionRewards(
    mission: Mission,
    playerChoices: string[],
    playerRank: number
  ): { credits: number; reputation: Record<FactionId, number>; items: string[] } {
    const rewards = {
      credits: mission.rewards.base?.credits || 0,
      reputation: { ...mission.rewards.base?.reputation } as Record<FactionId, number>,
      items: [...(mission.rewards.base?.items || [])]
    };

    // Apply rank multiplier from tuning
    const tuning = this.getTuning();
    if (tuning?.missions?.rank_multipliers) {
      const rankMultiplier = tuning.missions.rank_multipliers[playerRank] || 1;
      rewards.credits = Math.floor(rewards.credits * rankMultiplier);
    }

    // Apply choice-based rewards
    playerChoices.forEach(choiceId => {
      const choice = mission.choices.find(c => c.id === choiceId);
      if (choice) {
        choice.outcomes.forEach(outcome => {
          if (outcome.credits) rewards.credits += outcome.credits;
          if (outcome.reputation) {
            Object.entries(outcome.reputation).forEach(([faction, amount]) => {
              rewards.reputation[faction as FactionId] = 
                (rewards.reputation[faction as FactionId] || 0) + amount;
            });
          }
          if (outcome.items) {
            rewards.items.push(...outcome.items);
          }
        });
      }
    });

    return rewards;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const contentRegistry = new ContentRegistry();

// Export both the instance and utility classes
export default contentRegistry;
export { ContentRegistry, RequirementParser, SafeFormulaEvaluator };