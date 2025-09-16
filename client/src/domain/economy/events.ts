import { TransactionEvent } from './types';

type EventHandler = (event: TransactionEvent) => void;

class EconomyEventSystem {
  private handlers: EventHandler[] = [];

  subscribe(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  emit(event: TransactionEvent): void {
    this.handlers.forEach(handler => handler(event));
  }
}

export const economyEvents = new EconomyEventSystem();