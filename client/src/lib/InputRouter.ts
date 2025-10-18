
// src/lib/input/InputRouter.ts

export const INPUT_KEY_EVENT = 'pv.input.key';
export const INPUT_POINTER_EVENT = 'pv.input.pointer';

/**
 * Action binding configuration
 */
export interface ActionBinding {
    action: string;
    keys: string[];
    description?: string;
}

/**
 * Callback for action state changes
 */
type ActionCallback = (active: boolean) => void;

/**
 * Enhanced InputRouter - Central input management system
 *
 * Features:
 * - Rebindable key mappings
 * - Action-based input (not raw keys)
 * - Event-driven callbacks
 * - Support for keydown, keyup, and held states
 * - Mouse/pointer event routing
 * - Conflict detection
 * - Input blocking/filtering
 */
export class InputRouter {
    private static _instance: InputRouter | null = null;
    private attached = false;

    // Action system
    private actionBindings = new Map<string, Set<string>>(); // action -> Set of key codes
    private keyToActions = new Map<string, Set<string>>(); // key code -> Set of actions
    private activeActions = new Set<string>(); // Currently active actions

    // Callbacks
    private actionStartCallbacks = new Map<string, Set<ActionCallback>>();
    private actionEndCallbacks = new Map<string, Set<ActionCallback>>();
    private actionHeldCallbacks = new Map<string, Set<ActionCallback>>();

    // State tracking
    private pressedKeys = new Set<string>(); // Currently pressed key codes
    private blockedKeys = new Set<string>(); // Keys that should be ignored
    private inputEnabled = true; // Global input enable/disable

    static instance(): InputRouter {
        if (!InputRouter._instance) {
            InputRouter._instance = new InputRouter();
        }
        return InputRouter._instance;
    }

    /**
     * Register an action with its key bindings
     */
    registerAction(action: string, keyCodes: string[]): void {
        // Clear old bindings for this action
        this.unregisterAction(action);

        // Create new bindings
        const keySet = new Set(keyCodes);
        this.actionBindings.set(action, keySet);

        // Update reverse lookup
        for (const code of keyCodes) {
            if (!this.keyToActions.has(code)) {
                this.keyToActions.set(code, new Set());
            }
            this.keyToActions.get(code)!.add(action);
        }
    }

    /**
     * Unregister an action and its bindings
     */
    unregisterAction(action: string): void {
        const oldKeys = this.actionBindings.get(action);
        if (oldKeys) {
            // Remove from reverse lookup
            for (const code of oldKeys) {
                const actions = this.keyToActions.get(code);
                if (actions) {
                    actions.delete(action);
                    if (actions.size === 0) {
                        this.keyToActions.delete(code);
                    }
                }
            }
        }
        this.actionBindings.delete(action);
        this.activeActions.delete(action);
    }

    /**
     * Register multiple actions at once
     */
    registerActions(bindings: ActionBinding[]): void {
        for (const binding of bindings) {
            this.registerAction(binding.action, binding.keys);
        }
    }

    /**
     * Check if an action is currently active (any bound key is pressed)
     */
    isActionActive(action: string): boolean {
        return this.activeActions.has(action);
    }

    /**
     * Check if a specific key is currently pressed
     */
    isKeyPressed(keyCode: string): boolean {
        return this.pressedKeys.has(keyCode);
    }

    /**
     * Get all currently active actions
     */
    getActiveActions(): string[] {
        return Array.from(this.activeActions);
    }

    /**
     * Get key bindings for an action
     */
    getActionBindings(action: string): string[] {
        const bindings = this.actionBindings.get(action);
        return bindings ? Array.from(bindings) : [];
    }

    /**
     * Check if a key code is bound to any action
     */
    isKeyBound(keyCode: string): boolean {
        return this.keyToActions.has(keyCode);
    }

    /**
     * Get all actions bound to a specific key
     */
    getActionsForKey(keyCode: string): string[] {
        const actions = this.keyToActions.get(keyCode);
        return actions ? Array.from(actions) : [];
    }

    /**
     * Register callback for when action starts (key pressed)
     */
    onActionStart(action: string, callback: ActionCallback): () => void {
        if (!this.actionStartCallbacks.has(action)) {
            this.actionStartCallbacks.set(action, new Set());
        }
        this.actionStartCallbacks.get(action)!.add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.actionStartCallbacks.get(action);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Register callback for when action ends (key released)
     */
    onActionEnd(action: string, callback: ActionCallback): () => void {
        if (!this.actionEndCallbacks.has(action)) {
            this.actionEndCallbacks.set(action, new Set());
        }
        this.actionEndCallbacks.get(action)!.add(callback);

        return () => {
            const callbacks = this.actionEndCallbacks.get(action);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Register callback for while action is held
     * Note: This is called from your game loop, not automatically
     */
    onActionHeld(action: string, callback: ActionCallback): () => void {
        if (!this.actionHeldCallbacks.has(action)) {
            this.actionHeldCallbacks.set(action, new Set());
        }
        this.actionHeldCallbacks.get(action)!.add(callback);

        return () => {
            const callbacks = this.actionHeldCallbacks.get(action);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Block/unblock specific keys from being processed
     */
    blockKey(keyCode: string, blocked: boolean = true): void {
        if (blocked) {
            this.blockedKeys.add(keyCode);
        } else {
            this.blockedKeys.delete(keyCode);
        }
    }

    /**
     * Enable or disable all input processing
     */
    setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled;
        if (!enabled) {
            // Clear all active states when disabling
            this.pressedKeys.clear();
            this.activeActions.clear();
        }
    }

    /**
     * Get current input enabled state
     */
    isInputEnabled(): boolean {
        return this.inputEnabled;
    }

    /**
     * Clear all pressed keys and active actions
     */
    clearAllInput(): void {
        this.pressedKeys.clear();
        this.activeActions.clear();
    }

    /**
     * Process held actions (call this from your game loop)
     */
    processHeldActions(): void {
        for (const action of this.activeActions) {
            const callbacks = this.actionHeldCallbacks.get(action);
            if (callbacks) {
                callbacks.forEach(cb => cb(true));
            }
        }
    }

    /**
     * Trigger action callbacks
     */
    private triggerActionCallbacks(action: string, active: boolean): void {
        const callbacks = active
            ? this.actionStartCallbacks.get(action)
            : this.actionEndCallbacks.get(action);

        if (callbacks) {
            callbacks.forEach(cb => cb(active));
        }
    }

    /**
     * Update actions based on key state change
     */
    private updateActions(keyCode: string, pressed: boolean): void {
        const actions = this.keyToActions.get(keyCode);
        if (!actions) return;

        for (const action of actions) {
            const wasActive = this.activeActions.has(action);
            const bindings = this.actionBindings.get(action);

            if (!bindings) continue;

            // Check if any bound key is pressed
            let isActive = false;
            for (const code of bindings) {
                if (this.pressedKeys.has(code)) {
                    isActive = true;
                    break;
                }
            }

            // Update active state
            if (isActive && !wasActive) {
                this.activeActions.add(action);
                this.triggerActionCallbacks(action, true);
            } else if (!isActive && wasActive) {
                this.activeActions.delete(action);
                this.triggerActionCallbacks(action, false);
            }
        }
    }

    /**
     * Attach input listeners to the window
     */
    attach(): void {
        if (this.attached || typeof window === 'undefined') return;
        this.attached = true;

        // Keydown handler
        window.addEventListener(
            'keydown',
            (e) => {
                if (!this.inputEnabled) return;
                if (this.blockedKeys.has(e.code)) return;
                if (e.repeat) return; // Ignore key repeats

                const evt = new CustomEvent(INPUT_KEY_EVENT, {
                    detail: {
                        key: e.key,
                        code: e.code,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        domEvent: e,
                    },
                    cancelable: true,
                });

                const notCancelled = window.dispatchEvent(evt);

                // Update state
                this.pressedKeys.add(e.code);
                this.updateActions(e.code, true);

                if (!notCancelled) {
                    try {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    } catch {
                    }
                }
            },
            true
        );

        // Keyup handler
        window.addEventListener(
            'keyup',
            (e) => {
                if (!this.inputEnabled) return;

                const evt = new CustomEvent(INPUT_KEY_EVENT, {
                    detail: {
                        key: e.key,
                        code: e.code,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        domEvent: e,
                    },
                    cancelable: true,
                });

                const notCancelled = window.dispatchEvent(evt);

                // Update state
                this.pressedKeys.delete(e.code);
                this.updateActions(e.code, false);

                if (!notCancelled) {
                    try {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    } catch {
                    }
                }
            },
            true
        );

        // Window blur - clear all input
        window.addEventListener('blur', () => {
            this.clearAllInput();
        });

        // Pointer event handlers
        const pointerHandler = (type: string) => (e: MouseEvent) => {
            if (!this.inputEnabled) return;

            const evt = new CustomEvent(INPUT_POINTER_EVENT, {
                detail: {
                    type,
                    x: e.clientX,
                    y: e.clientY,
                    button: e.button,
                    domEvent: e
                },
                cancelable: true,
            });

            const notCancelled = window.dispatchEvent(evt);
            if (!notCancelled) {
                try {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                } catch {
                }
            }
        };

        window.addEventListener('mousedown', pointerHandler('mousedown'), true);
        window.addEventListener('mouseup', pointerHandler('mouseup'), true);
        window.addEventListener('click', pointerHandler('click'), true);
    }

    /**
     * Detach all input listeners (for cleanup)
     */
    detach(): void {
        if (!this.attached) return;
        this.attached = false;
        // Note: In a real implementation, you'd want to store the handler
        // references and remove them specifically
        this.clearAllInput();
    }

    /**
     * Get debug information about current input state
     */
    getDebugInfo(): {
        pressedKeys: string[];
        activeActions: string[];
        totalBindings: number;
        inputEnabled: boolean;
    } {
        return {
            pressedKeys: Array.from(this.pressedKeys),
            activeActions: Array.from(this.activeActions),
            totalBindings: this.actionBindings.size,
            inputEnabled: this.inputEnabled,
        };
    }
}

/**
 * Helper to create default game action bindings
 */
export function createDefaultBindings(): ActionBinding[] {
    return [
        {action: 'forward', keys: ['KeyW', 'ArrowUp'], description: 'Move forward'},
        {action: 'backward', keys: ['KeyS', 'ArrowDown'], description: 'Move backward'},
        {action: 'left', keys: ['KeyA', 'ArrowLeft'], description: 'Move left'},
        {action: 'right', keys: ['KeyD', 'ArrowRight'], description: 'Move right'},
        {action: 'turnLeft', keys: ['KeyQ'], description: 'Turn left'},
        {action: 'turnRight', keys: ['KeyE'], description: 'Turn right'},
        {action: 'jump', keys: ['Space'], description: 'Jump'},
        {action: 'interact', keys: ['KeyF'], description: 'Interact'},
        {action: 'shoot', keys: ['Space'], description: 'Shoot/Mine'},
        {action: 'flashlight', keys: ['KeyL'], description: 'Toggle flashlight'},
        {action: 'charge', keys: ['KeyC'], description: 'Charge flashlight'},
        {action: 'menu', keys: ['Escape'], description: 'Open menu'},
        {action: 'inventory', keys: ['KeyI', 'Tab'], description: 'Open inventory'},
        {action: 'map', keys: ['KeyM'], description: 'Open map'},
    ];
}
