import { TransactionEvent } from './types';
import { trackEvent, validateEventSequence, DEBUG_PREFIXES, getDebugConfig } from './debug';

type EventHandler = (event: TransactionEvent) => void;

interface EventValidationRule {
  eventType: string;
  requiredFields: string[];
  maxFrequency?: number; // max events per second
}

class EconomyEventSystem {
  private handlers: EventHandler[] = [];
  private eventHistory: TransactionEvent[] = [];
  private readonly maxHistorySize = 100;
  private eventCounts = new Map<string, number>();
  private lastEventTime = new Map<string, number>();
  
  // Event validation rules
  private readonly validationRules: EventValidationRule[] = [
    {
      eventType: 'credits_earned',
      requiredFields: ['amount'],
      maxFrequency: 10
    },
    {
      eventType: 'credits_spent',
      requiredFields: ['amount'],
      maxFrequency: 10
    },
    {
      eventType: 'resource_added',
      requiredFields: ['resource', 'quantity'],
      maxFrequency: 5
    },
    {
      eventType: 'resource_removed',
      requiredFields: ['resource', 'quantity'],
      maxFrequency: 5
    }
  ];

  subscribe(handler: EventHandler): () => void {
    const config = getDebugConfig();
    
    if (config.enabled && config.eventValidation) {
      console.log(`${DEBUG_PREFIXES.EVENT_DEBUG} New event handler subscribed. Total handlers: ${this.handlers.length + 1}`);
    }
    
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
      
      if (config.enabled && config.eventValidation) {
        console.log(`${DEBUG_PREFIXES.EVENT_DEBUG} Event handler unsubscribed. Remaining handlers: ${this.handlers.length}`);
      }
    };
  }

  emit(event: TransactionEvent): void {
    const config = getDebugConfig();
    
    // Validate event structure
    if (config.enabled && config.eventValidation) {
      this.validateEventStructure(event);
    }
    
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Track event frequency
    if (config.enabled && config.eventValidation) {
      this.trackEventFrequency(event);
    }
    
    // Track via debug system
    trackEvent(event);
    
    // Emit to handlers
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Error in event handler:`, error, { event });
      }
    });
    
    // Post-emission validation
    if (config.enabled && config.eventValidation) {
      this.validateEventSequence(event);
    }
  }
  
  private validateEventStructure(event: TransactionEvent): void {
    // Basic structure validation
    if (!event.type) {
      console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Event missing type:`, event);
      return;
    }
    
    if (!event.timestamp) {
      console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Event missing timestamp:`, event);
      return;
    }
    
    if (!event.payload) {
      console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Event missing payload:`, event);
      return;
    }
    
    // Find validation rule for this event type
    const rule = this.validationRules.find(r => r.eventType === event.type);
    if (rule) {
      this.validateEventAgainstRule(event, rule);
    }
  }
  
  private validateEventAgainstRule(event: TransactionEvent, rule: EventValidationRule): void {
    // Check required fields
    for (const field of rule.requiredFields) {
      if (!(field in event.payload)) {
        console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Event missing required field '${field}':`, event);
        return;
      }
    }
    
    // Validate specific field types and values
    switch (event.type) {
      case 'credits_earned':
      case 'credits_spent':
        if (typeof event.payload.amount !== 'number' || event.payload.amount <= 0) {
          console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Invalid amount in credits event:`, event);
          return;
        }
        break;
        
      case 'resource_added':
      case 'resource_removed':
        if (typeof event.payload.quantity !== 'number' || event.payload.quantity <= 0) {
          console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Invalid quantity in resource event:`, event);
          return;
        }
        if (!event.payload.resource || !event.payload.resource.type) {
          console.error(`${DEBUG_PREFIXES.EVENT_DEBUG} Invalid resource in resource event:`, event);
          return;
        }
        break;
    }
    
    console.log(`${DEBUG_PREFIXES.EVENT_DEBUG} Event validation passed: ${event.type}`);
  }
  
  private trackEventFrequency(event: TransactionEvent): void {
    const now = Date.now();
    const rule = this.validationRules.find(r => r.eventType === event.type);
    
    if (rule && rule.maxFrequency) {
      // Reset counter every second
      const lastTime = this.lastEventTime.get(event.type) || 0;
      if (now - lastTime > 1000) {
        this.eventCounts.set(event.type, 0);
        this.lastEventTime.set(event.type, now);
      }
      
      // Increment counter
      const currentCount = this.eventCounts.get(event.type) || 0;
      this.eventCounts.set(event.type, currentCount + 1);
      
      // Check frequency limit
      if (currentCount + 1 > rule.maxFrequency) {
        console.warn(`${DEBUG_PREFIXES.EVENT_DEBUG} Event frequency limit exceeded: ${event.type} (${currentCount + 1}/${rule.maxFrequency} per second)`);
      }
    }
  }
  
  private validateEventSequence(event: TransactionEvent): void {
    // Look for common transaction patterns
    const recentEvents = this.eventHistory.slice(-5).map(e => e.type);
    
    console.log(`${DEBUG_PREFIXES.EVENT_DEBUG} Event sequence updated:`, {
      latestEvent: event.type,
      recentSequence: recentEvents.slice(-3),
      totalEventsInHistory: this.eventHistory.length
    });
  }
  
  // Debug utilities
  getEventHistory(): TransactionEvent[] {
    return [...this.eventHistory];
  }
  
  getEventStats(): { type: string; count: number; lastSeen: number }[] {
    const stats = new Map<string, { count: number; lastSeen: number }>();
    
    this.eventHistory.forEach(event => {
      const current = stats.get(event.type) || { count: 0, lastSeen: 0 };
      stats.set(event.type, {
        count: current.count + 1,
        lastSeen: Math.max(current.lastSeen, event.timestamp)
      });
    });
    
    return Array.from(stats.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      lastSeen: data.lastSeen
    }));
  }
  
  validateRecentEventSequence(expectedSequence: string[], context: string): boolean {
    const recentTypes = this.eventHistory.slice(-expectedSequence.length).map(e => e.type);
    const matches = JSON.stringify(recentTypes) === JSON.stringify(expectedSequence);
    
    if (!matches) {
      console.warn(`${DEBUG_PREFIXES.EVENT_DEBUG} Event sequence validation failed in ${context}:`, {
        expected: expectedSequence,
        actual: recentTypes
      });
    }
    
    return matches;
  }
}

export const economyEvents = new EconomyEventSystem();