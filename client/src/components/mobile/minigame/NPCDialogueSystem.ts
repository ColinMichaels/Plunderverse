import Phaser from 'phaser';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { FactionId } from '../../../lib/plunderverse/types';
import MiniGameSyncService from '../../../services/MiniGameSyncService';

export interface DialogueNode {
  id: string;
  text: string;
  speaker: string;
  personality?: NPCPersonality;
  choices?: DialogueChoice[];
  next?: string;
  action?: DialogueAction;
  conditions?: DialogueCondition[];
  outcomes?: DialogueOutcome[];
  emotion?: 'happy' | 'angry' | 'neutral' | 'worried' | 'excited' | 'suspicious' | 'nervous';
}

export interface DialogueChoice {
  id: string;
  text: string;
  next: string;
  conditions?: DialogueCondition[];
  outcomes?: DialogueOutcome[];
  visible?: boolean;
}

export interface DialogueCondition {
  type: 'reputation' | 'item' | 'credits' | 'mission' | 'knowledge' | 'heat';
  faction?: FactionId;
  value?: number | string;
  operator?: 'gte' | 'lte' | 'eq' | 'has';
}

export interface DialogueOutcome {
  type: 'reputation' | 'credits' | 'item' | 'mission' | 'knowledge' | 'heat';
  faction?: FactionId;
  value?: number | string;
  description?: string;
}

export interface DialogueAction {
  type: 'startMission' | 'completeMission' | 'openShop' | 'giveItem' | 'unlockLocation';
  missionId?: string;
  itemId?: string;
  locationId?: string;
}

export type NPCPersonality = 
  | 'friendly' 
  | 'gruff' 
  | 'mysterious' 
  | 'businesslike' 
  | 'nervous' 
  | 'aggressive' 
  | 'charming'
  | 'wise';

export interface NPCData {
  id: string;
  name: string;
  role: string;
  personality: NPCPersonality;
  faction?: FactionId;
  dialogueTree: Map<string, DialogueNode>;
  currentNode?: string;
  dialogueHistory: string[];
  missionsOffered: string[];
  relationshipLevel: number; // -100 to 100
}

export class NPCDialogueSystem {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPCData>;
  private activeDialogue: DialogueNode | null = null;
  private activeNPCId: string | null = null;  // Track which NPC is currently in dialogue
  private dialogueCallback?: (text: string, choices?: DialogueChoice[]) => void;
  private playerKnowledge: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.npcs = new Map();
    this.initializeNPCs();
    this.loadPlayerKnowledge();
  }

  private initializeNPCs(): void {
    // Merchant NPC
    this.addNPC({
      id: 'npc_merchant',
      name: 'Kayla "The Dealer" Chen',
      role: 'Merchant',
      personality: 'businesslike',
      faction: 'independents',
      dialogueTree: this.createMerchantDialogue(),
      currentNode: 'greeting',
      dialogueHistory: [],
      missionsOffered: [],
      relationshipLevel: 0
    });

    // Bartender NPC
    this.addNPC({
      id: 'npc_bartender',
      name: 'Old Sam',
      role: 'Bartender',
      personality: 'wise',
      faction: 'independents',
      dialogueTree: this.createBartenderDialogue(),
      currentNode: 'greeting',
      dialogueHistory: [],
      missionsOffered: [],
      relationshipLevel: 0
    });

    // Engineer NPC
    this.addNPC({
      id: 'npc_engineer',
      name: 'Rex "Sparks" Rodriguez',
      role: 'Engineer',
      personality: 'gruff',
      faction: 'corporations',
      dialogueTree: this.createEngineerDialogue(),
      currentNode: 'greeting',
      dialogueHistory: [],
      missionsOffered: [],
      relationshipLevel: 0
    });

    // Dock Worker NPC
    this.addNPC({
      id: 'npc_dockworker',
      name: 'Shifty Pete',
      role: 'Dock Worker',
      personality: 'nervous',
      faction: 'outlaws',
      dialogueTree: this.createDockWorkerDialogue(),
      currentNode: 'greeting',
      dialogueHistory: [],
      missionsOffered: [],
      relationshipLevel: 0
    });

    // Crew Member NPC
    this.addNPC({
      id: 'npc_crew',
      name: 'Lieutenant Sarah Cross',
      role: 'Crew Member',
      personality: 'friendly',
      dialogueTree: this.createCrewMemberDialogue(),
      currentNode: 'greeting',
      dialogueHistory: [],
      missionsOffered: [],
      relationshipLevel: 0
    });
  }

  private createMerchantDialogue(): Map<string, DialogueNode> {
    const dialogue = new Map<string, DialogueNode>();
    
    dialogue.set('greeting', {
      id: 'greeting',
      speaker: 'Kayla',
      text: 'Welcome to my shop, spacer. Looking for quality goods at fair prices? You\'ve come to the right place.',
      personality: 'businesslike',
      emotion: 'neutral',
      choices: [
        {
          id: 'trade',
          text: 'I\'d like to see your wares.',
          next: 'shop_open',
          visible: true
        },
        {
          id: 'missions',
          text: 'Any work available?',
          next: 'mission_check',
          visible: true
        },
        {
          id: 'info',
          text: 'Heard any interesting rumors?',
          next: 'rumors',
          conditions: [{ type: 'reputation', faction: 'independents', value: 10, operator: 'gte' }],
          visible: true
        },
        {
          id: 'leave',
          text: 'Just browsing, thanks.',
          next: 'farewell',
          visible: true
        }
      ]
    });

    dialogue.set('shop_open', {
      id: 'shop_open',
      speaker: 'Kayla',
      text: 'Smart choice. I\'ve got the best selection this side of the asteroid belt. Take a look.',
      action: { type: 'openShop' },
      next: 'greeting'
    });

    dialogue.set('mission_check', {
      id: 'mission_check',
      speaker: 'Kayla',
      text: 'Actually, I do have a shipment that needs delivering. Interested?',
      choices: [
        {
          id: 'accept_delivery',
          text: 'Tell me more about this delivery.',
          next: 'mission_details',
          visible: true
        },
        {
          id: 'decline',
          text: 'Not right now.',
          next: 'greeting',
          visible: true
        }
      ]
    });

    dialogue.set('mission_details', {
      id: 'mission_details',
      speaker: 'Kayla',
      text: 'I need someone to transport medical supplies to the outer colonies. It\'s urgent - they\'re dealing with a outbreak. Pay is 2500 credits, plus you\'ll be helping people who really need it.',
      choices: [
        {
          id: 'accept_mission',
          text: 'I\'ll take the job.',
          next: 'mission_accepted',
          outcomes: [
            { type: 'mission', value: 'merchant_delivery_001' },
            { type: 'reputation', faction: 'independents', value: 5 }
          ],
          visible: true
        },
        {
          id: 'negotiate',
          text: 'How about 3000 credits?',
          next: 'negotiation',
          conditions: [{ type: 'reputation', faction: 'independents', value: 20, operator: 'gte' }],
          visible: true
        },
        {
          id: 'decline_mission',
          text: 'I\'ll pass.',
          next: 'greeting',
          visible: true
        }
      ]
    });

    dialogue.set('mission_accepted', {
      id: 'mission_accepted',
      speaker: 'Kayla',
      text: 'Excellent! I\'ll load the supplies onto your ship. Don\'t let me down - those colonists are counting on you.',
      action: { type: 'startMission', missionId: 'merchant_delivery_001' },
      next: 'greeting'
    });

    dialogue.set('rumors', {
      id: 'rumors',
      speaker: 'Kayla',
      text: 'Word is the Corporations are planning something big in the Outer Rim. Lots of ships moving that way. Also heard there\'s a new smuggling route opening up through the asteroid field - dangerous, but profitable.',
      outcomes: [
        { type: 'knowledge', value: 'corp_outer_rim_activity' },
        { type: 'knowledge', value: 'asteroid_smuggling_route' }
      ],
      next: 'greeting'
    });

    dialogue.set('farewell', {
      id: 'farewell',
      speaker: 'Kayla',
      text: 'Come back when you\'re ready to do business.',
      personality: 'businesslike'
    });

    return dialogue;
  }

  private createBartenderDialogue(): Map<string, DialogueNode> {
    const dialogue = new Map<string, DialogueNode>();
    
    dialogue.set('greeting', {
      id: 'greeting',
      speaker: 'Old Sam',
      text: 'Welcome to the Rusty Anchor, friend. What\'ll it be? A drink, or are you looking for something... more substantial?',
      personality: 'wise',
      emotion: 'neutral',
      choices: [
        {
          id: 'drink',
          text: 'Just a drink, thanks.',
          next: 'serve_drink',
          outcomes: [{ type: 'credits', value: -10 }],
          conditions: [{ type: 'credits', value: 10, operator: 'gte' }],
          visible: true
        },
        {
          id: 'information',
          text: 'I need information.',
          next: 'info_broker',
          visible: true
        },
        {
          id: 'bounty',
          text: 'Any bounties available?',
          next: 'bounty_board',
          conditions: [{ type: 'reputation', faction: 'outlaws', value: -20, operator: 'gte' }],
          visible: true
        },
        {
          id: 'leave',
          text: 'Nothing for now.',
          next: 'farewell',
          visible: true
        }
      ]
    });

    dialogue.set('serve_drink', {
      id: 'serve_drink',
      speaker: 'Old Sam',
      text: '*slides you a glass* Here\'s to surviving another day in the void. You look like you\'ve got stories - care to share?',
      emotion: 'happy',
      outcomes: [{ type: 'reputation', faction: 'independents', value: 2 }],
      next: 'greeting'
    });

    dialogue.set('info_broker', {
      id: 'info_broker',
      speaker: 'Old Sam',
      text: 'Information costs credits, but for the right price, I can tell you things that\'ll change your fortune. What are you interested in?',
      choices: [
        {
          id: 'pirate_info',
          text: '[100 credits] Where are the pirates operating?',
          next: 'pirate_locations',
          conditions: [{ type: 'credits', value: 100, operator: 'gte' }],
          outcomes: [{ type: 'credits', value: -100 }],
          visible: true
        },
        {
          id: 'trade_routes',
          text: '[50 credits] Best trade routes right now?',
          next: 'trade_info',
          conditions: [{ type: 'credits', value: 50, operator: 'gte' }],
          outcomes: [{ type: 'credits', value: -50 }],
          visible: true
        },
        {
          id: 'free_tip',
          text: 'Any free advice?',
          next: 'free_advice',
          visible: true
        }
      ]
    });

    dialogue.set('bounty_board', {
      id: 'bounty_board',
      speaker: 'Old Sam',
      text: 'Check the board by the door. But be careful - some of those targets have friends. And friends have a way of finding out who took the job.',
      action: { type: 'startMission', missionId: 'bartender_bounty_001' },
      next: 'greeting'
    });

    dialogue.set('farewell', {
      id: 'farewell',
      speaker: 'Old Sam',
      text: 'Safe travels, spacer. The void is unforgiving.',
      personality: 'wise'
    });

    return dialogue;
  }

  private createEngineerDialogue(): Map<string, DialogueNode> {
    const dialogue = new Map<string, DialogueNode>();
    
    dialogue.set('greeting', {
      id: 'greeting',
      speaker: 'Rex',
      text: 'What? Can\'t you see I\'m busy? These systems don\'t maintain themselves.',
      personality: 'gruff',
      emotion: 'angry',
      choices: [
        {
          id: 'repairs',
          text: 'I need repairs.',
          next: 'repair_check',
          visible: true
        },
        {
          id: 'upgrade',
          text: 'Looking for upgrades.',
          next: 'upgrade_options',
          conditions: [{ type: 'reputation', faction: 'corporations', value: 0, operator: 'gte' }],
          visible: true
        },
        {
          id: 'sabotage',
          text: '[Whisper] Need something... modified?',
          next: 'illegal_mods',
          conditions: [{ type: 'reputation', faction: 'outlaws', value: 30, operator: 'gte' }],
          visible: true
        },
        {
          id: 'leave',
          text: 'Sorry to bother you.',
          next: 'farewell',
          visible: true
        }
      ]
    });

    dialogue.set('repair_check', {
      id: 'repair_check',
      speaker: 'Rex',
      text: 'Hmm, let me take a look... Yeah, your stabilizers are shot and the hull\'s taken a beating. I can fix it for 500 credits.',
      choices: [
        {
          id: 'accept_repair',
          text: 'Do it.',
          next: 'repairs_done',
          conditions: [{ type: 'credits', value: 500, operator: 'gte' }],
          outcomes: [{ type: 'credits', value: -500 }],
          visible: true
        },
        {
          id: 'too_expensive',
          text: 'Too rich for my blood.',
          next: 'greeting',
          visible: true
        }
      ]
    });

    dialogue.set('illegal_mods', {
      id: 'illegal_mods',
      speaker: 'Rex',
      text: '*lowers voice* I might know a guy who knows a guy. But this conversation never happened, understand?',
      emotion: 'suspicious',
      action: { type: 'startMission', missionId: 'engineer_sabotage_001' },
      outcomes: [
        { type: 'heat', value: 10 },
        { type: 'knowledge', value: 'illegal_modifications' }
      ],
      next: 'greeting'
    });

    dialogue.set('farewell', {
      id: 'farewell',
      speaker: 'Rex',
      text: 'Yeah, yeah. Come back when you actually need something.',
      personality: 'gruff'
    });

    return dialogue;
  }

  private createDockWorkerDialogue(): Map<string, DialogueNode> {
    const dialogue = new Map<string, DialogueNode>();
    
    dialogue.set('greeting', {
      id: 'greeting',
      speaker: 'Pete',
      text: '*glances around nervously* Oh, uh, hey there. You didn\'t see me, right? I mean... what can I help you with?',
      personality: 'nervous',
      emotion: 'worried',
      choices: [
        {
          id: 'smuggling',
          text: 'Looking to move some cargo... quietly.',
          next: 'smuggling_offer',
          conditions: [{ type: 'heat', value: 30, operator: 'lte' }],
          visible: true
        },
        {
          id: 'whats_wrong',
          text: 'You seem nervous. Everything okay?',
          next: 'confession',
          visible: true
        },
        {
          id: 'dock_info',
          text: 'Which ships are docking today?',
          next: 'shipping_manifest',
          visible: true
        },
        {
          id: 'leave',
          text: 'Never mind.',
          next: 'farewell',
          visible: true
        }
      ]
    });

    dialogue.set('smuggling_offer', {
      id: 'smuggling_offer',
      speaker: 'Pete',
      text: '*sweating* I might know some people who need things moved without... paperwork. But you didn\'t hear it from me!',
      emotion: 'nervous',
      action: { type: 'startMission', missionId: 'smuggler_run_001' },
      outcomes: [
        { type: 'reputation', faction: 'outlaws', value: 10 },
        { type: 'heat', value: 5 }
      ],
      next: 'greeting'
    });

    dialogue.set('confession', {
      id: 'confession',
      speaker: 'Pete',
      text: 'The Corporate Security has been sniffing around. They think someone\'s been skimming cargo. It wasn\'t me! Well... not much, anyway.',
      outcomes: [{ type: 'knowledge', value: 'pete_skimming_cargo' }],
      next: 'greeting'
    });

    dialogue.set('farewell', {
      id: 'farewell',
      speaker: 'Pete',
      text: 'Right, right. You were never here. I was never here. Nobody saw nothing.',
      personality: 'nervous'
    });

    return dialogue;
  }

  private createCrewMemberDialogue(): Map<string, DialogueNode> {
    const dialogue = new Map<string, DialogueNode>();
    
    dialogue.set('greeting', {
      id: 'greeting',
      speaker: 'Sarah',
      text: 'Captain! Good to see you. The crew\'s been asking about our next move. What are your orders?',
      personality: 'friendly',
      emotion: 'happy',
      choices: [
        {
          id: 'crew_status',
          text: 'How\'s the crew morale?',
          next: 'morale_report',
          visible: true
        },
        {
          id: 'loyalty_mission',
          text: 'You mentioned needing help with something personal?',
          next: 'personal_request',
          conditions: [{ type: 'reputation', faction: 'independents', value: 30, operator: 'gte' }],
          visible: true
        },
        {
          id: 'recruit',
          text: 'Know anyone looking for work?',
          next: 'recruitment',
          visible: true
        },
        {
          id: 'dismiss',
          text: 'As you were.',
          next: 'farewell',
          visible: true
        }
      ]
    });

    dialogue.set('morale_report', {
      id: 'morale_report',
      speaker: 'Sarah',
      text: 'Morale\'s holding steady, Captain. The recent victories have everyone in good spirits. Though some extra shore leave wouldn\'t hurt.',
      outcomes: [{ type: 'reputation', faction: 'independents', value: 3 }],
      next: 'greeting'
    });

    dialogue.set('personal_request', {
      id: 'personal_request',
      speaker: 'Sarah',
      text: 'My sister\'s ship went missing near the asteroid belt. I... I need to know what happened. Will you help me find her?',
      emotion: 'worried',
      action: { type: 'startMission', missionId: 'crew_loyalty_001' },
      next: 'greeting'
    });

    dialogue.set('farewell', {
      id: 'farewell',
      speaker: 'Sarah',
      text: 'Aye, Captain. I\'ll keep the crew ready.',
      personality: 'friendly'
    });

    return dialogue;
  }

  private addNPC(npcData: NPCData): void {
    this.npcs.set(npcData.id, npcData);
  }

  private loadPlayerKnowledge(): void {
    // Load from localStorage or game state
    const savedKnowledge = localStorage.getItem('player_knowledge');
    if (savedKnowledge) {
      this.playerKnowledge = new Set(JSON.parse(savedKnowledge));
    }
  }

  private savePlayerKnowledge(): void {
    localStorage.setItem('player_knowledge', JSON.stringify(Array.from(this.playerKnowledge)));
  }

  public startDialogue(npcId: string, callback: (text: string, choices?: DialogueChoice[]) => void): void {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      console.error(`NPC ${npcId} not found`);
      return;
    }

    this.activeNPCId = npcId;  // Track active NPC
    this.dialogueCallback = callback;
    const startNode = npc.currentNode || 'greeting';
    this.showDialogueNode(npc, startNode);
  }

  private showDialogueNode(npc: NPCData, nodeId: string): void {
    const node = npc.dialogueTree.get(nodeId);
    if (!node) {
      console.error(`Dialogue node ${nodeId} not found for NPC ${npc.id}`);
      return;
    }

    this.activeDialogue = node;
    
    // Apply personality to text
    const personalizedText = this.applyPersonality(node.text, npc.personality);
    
    // Filter choices based on conditions
    const availableChoices = this.filterChoices(node.choices || [], npc);
    
    // Update dialogue history
    npc.dialogueHistory.push(nodeId);
    
    // Execute any actions
    if (node.action) {
      this.executeAction(node.action, npc);
    }
    
    // Apply any outcomes
    if (node.outcomes && node.outcomes.length > 0) {
      node.outcomes.forEach(outcome => this.applyOutcome(outcome));
      
      // Sync node-level outcomes with main game
      const syncService = MiniGameSyncService.getInstance();
      syncService.syncDialogueOutcome(npc.id, node.outcomes);
      console.log(`[NPCDialogueSystem] Synced node outcomes for NPC: ${npc.id}, outcomes:`, node.outcomes);
    }
    
    // Show the dialogue
    if (this.dialogueCallback) {
      this.dialogueCallback(personalizedText, availableChoices);
    }
  }

  private applyPersonality(text: string, personality: NPCPersonality): string {
    // Add personality-specific modifications to dialogue
    switch (personality) {
      case 'gruff':
        return text.replace(/\./g, '...').replace(/!/, '.');
      case 'nervous':
        return text.replace(/\./g, '... *fidgets*');
      case 'friendly':
        return `${text} *smiles warmly*`;
      case 'mysterious':
        return `*speaks in hushed tones* ${text}`;
      case 'businesslike':
        return text; // Keep as is
      case 'aggressive':
        return text.toUpperCase();
      case 'charming':
        return `*winks* ${text}`;
      case 'wise':
        return `${text} *nods sagely*`;
      default:
        return text;
    }
  }

  private filterChoices(choices: DialogueChoice[], npc: NPCData): DialogueChoice[] {
    return choices.filter(choice => {
      if (!choice.conditions) return true;
      
      return choice.conditions.every(condition => 
        this.checkCondition(condition)
      );
    });
  }

  private checkCondition(condition: DialogueCondition): boolean {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    switch (condition.type) {
      case 'reputation':
        if (!condition.faction || condition.value === undefined) return false;
        const rep = player.reputation[condition.faction];
        const repValue = condition.value as number;
        switch (condition.operator) {
          case 'gte': return rep >= repValue;
          case 'lte': return rep <= repValue;
          case 'eq': return rep === repValue;
          default: return false;
        }
        
      case 'credits':
        if (condition.value === undefined) return false;
        const amount = credits.credits;
        const creditValue = condition.value as number;
        switch (condition.operator) {
          case 'gte': return amount >= creditValue;
          case 'lte': return amount <= creditValue;
          case 'eq': return amount === creditValue;
          default: return amount >= creditValue;
        }
        
      case 'knowledge':
        if (typeof condition.value !== 'string') return false;
        return this.playerKnowledge.has(condition.value);
        
      case 'heat':
        if (condition.value === undefined) return false;
        const heat = player.heat;
        const heatValue = condition.value as number;
        switch (condition.operator) {
          case 'gte': return heat >= heatValue;
          case 'lte': return heat <= heatValue;
          case 'eq': return heat === heatValue;
          default: return heat <= heatValue;
        }
        
      default:
        return true;
    }
  }

  private applyOutcome(outcome: DialogueOutcome): void {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    switch (outcome.type) {
      case 'reputation':
        if (outcome.faction && outcome.value) {
          player.updateReputation(outcome.faction, outcome.value as number);
        }
        break;
        
      case 'credits':
        if (outcome.value) {
          credits.earnCredits(outcome.value as number);
        }
        break;
        
      case 'knowledge':
        if (outcome.value) {
          this.playerKnowledge.add(outcome.value as string);
          this.savePlayerKnowledge();
        }
        break;
        
      case 'heat':
        if (outcome.value) {
          player.updateHeat(outcome.value as number);
        }
        break;
        
      case 'mission':
        // Handle in executeAction
        break;
    }
  }

  private executeAction(action: DialogueAction, npc: NPCData): void {
    switch (action.type) {
      case 'startMission':
        if (action.missionId) {
          this.scene.events.emit('startNPCMission', action.missionId, npc.id);
          npc.missionsOffered.push(action.missionId);
        }
        break;
        
      case 'completeMission':
        if (action.missionId) {
          this.scene.events.emit('completeNPCMission', action.missionId);
        }
        break;
        
      case 'openShop':
        this.scene.events.emit('openShop', npc.id);
        break;
        
      case 'giveItem':
        if (action.itemId) {
          this.scene.events.emit('giveItem', action.itemId);
        }
        break;
        
      case 'unlockLocation':
        if (action.locationId) {
          this.scene.events.emit('unlockLocation', action.locationId);
        }
        break;
    }
  }

  public selectChoice(choiceId: string): void {
    if (!this.activeDialogue || !this.activeDialogue.choices) return;
    if (!this.activeNPCId) {
      console.error('[NPCDialogueSystem] No active NPC - dialogue state corrupted');
      return;
    }
    
    const choice = this.activeDialogue.choices.find(c => c.id === choiceId);
    if (!choice) return;
    
    // Get the current NPC using the tracked ID
    const currentNPC = this.npcs.get(this.activeNPCId);
    if (!currentNPC) {
      console.error(`[NPCDialogueSystem] Active NPC ${this.activeNPCId} not found`);
      return;
    }
    
    // Apply choice outcomes
    if (choice.outcomes && choice.outcomes.length > 0) {
      choice.outcomes.forEach(outcome => this.applyOutcome(outcome));
      
      // Sync choice outcomes with main game
      const syncService = MiniGameSyncService.getInstance();
      syncService.syncDialogueOutcome(currentNPC.id, choice.outcomes);
      console.log(`[NPCDialogueSystem] Synced choice outcomes for NPC: ${currentNPC.id}, outcomes:`, choice.outcomes);
    }
    
    if (choice.next) {
      // Update NPC's current node
      currentNPC.currentNode = choice.next;
      // Show next dialogue node
      this.showDialogueNode(currentNPC, choice.next);
    }
  }

  public updateNPCRelationship(npcId: string, change: number): void {
    const npc = this.npcs.get(npcId);
    if (npc) {
      npc.relationshipLevel = Math.max(-100, Math.min(100, npc.relationshipLevel + change));
    }
  }

  public getNPCData(npcId: string): NPCData | undefined {
    return this.npcs.get(npcId);
  }

  public getAllNPCs(): NPCData[] {
    return Array.from(this.npcs.values());
  }
}