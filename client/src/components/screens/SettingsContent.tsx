import {useEffect, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {ActionBinding, createDefaultBindings, InputRouter} from '@/lib/InputRouter';
import {
    ThemedButton,
    ThemedDivider,
    ThemedKeyDisplay,
    ThemedPanel,
    ThemedPanelContent,
    ThemedPanelHeader,
    ThemedSectionHeading,
} from '@/components/ui/ThemedPanel';
import {AlertCircle, Keyboard, RotateCcw, Save} from 'lucide-react';

interface KeybindingEditorProps {
    onSave?: (bindings: ActionBinding[]) => void;
    onClose?: () => void;
}

export function KeybindingEditor({onSave, onClose}: KeybindingEditorProps) {
    const [bindings, setBindings] = useState<ActionBinding[]>(createDefaultBindings());
    const [editingAction, setEditingAction] = useState<string | null>(null);
    const [listeningForKey, setListeningForKey] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load current bindings from InputRouter
    useEffect(() => {
        const router = InputRouter.instance();
        const currentBindings = createDefaultBindings().map(binding => ({
            ...binding,
            keys: router.getActionBindings(binding.action) || binding.keys,
        }));
        setBindings(currentBindings);
    }, []);

    // Listen for key presses when editing
    useEffect(() => {
        if (!listeningForKey || !editingAction) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Cancel on Escape
            if (e.code === 'Escape') {
                setListeningForKey(false);
                setEditingAction(null);
                return;
            }

            // Update the binding
            setBindings(prev =>
                prev.map(binding => {
                    if (binding.action === editingAction) {
                        return {
                            ...binding,
                            keys: [e.code], // Replace with new key
                        };
                    }
                    return binding;
                })
            );

            setListeningForKey(false);
            setEditingAction(null);
            setHasChanges(true);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [listeningForKey, editingAction]);

    const handleEdit = (action: string) => {
        setEditingAction(action);
        setListeningForKey(true);
    };

    const handleRemoveKey = (action: string, keyToRemove: string) => {
        setBindings(prev =>
            prev.map(binding => {
                if (binding.action === action) {
                    const newKeys = binding.keys.filter(k => k !== keyToRemove);
                    return {
                        ...binding,
                        keys: newKeys.length > 0 ? newKeys : binding.keys, // Don't allow empty
                    };
                }
                return binding;
            })
        );
        setHasChanges(true);
    };

    const handleAddKey = (action: string) => {
        setEditingAction(action);
        setListeningForKey(true);
    };

    const handleSave = () => {
        const router = InputRouter.instance();
        bindings.forEach(binding => {
            router.registerAction(binding.action, binding.keys);
        });
        setHasChanges(false);
        onSave?.(bindings);
    };

    const handleReset = () => {
        const defaults = createDefaultBindings();
        setBindings(defaults);
        const router = InputRouter.instance();
        defaults.forEach(binding => {
            router.registerAction(binding.action, binding.keys);
        });
        setHasChanges(true);
    };

    // Group bindings by category
    const movementBindings = bindings.filter(b =>
        ['forward', 'backward', 'left', 'right', 'turnLeft', 'turnRight'].includes(b.action)
    );
    const actionBindings = bindings.filter(b =>
        ['shoot', 'interact', 'jump', 'flashlight', 'charge'].includes(b.action)
    );
    const uiBindings = bindings.filter(b =>
        ['menu', 'inventory', 'map'].includes(b.action)
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <ThemedPanel
                initial={{opacity: 0, scale: 0.9, y: -20}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.9, y: -20}}
                transition={{type: 'spring', damping: 25, stiffness: 400}}
                className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <ThemedPanelHeader subtitle="[ CUSTOMIZE CONTROL SCHEME ]">
                    // KEY BINDINGS
                </ThemedPanelHeader>

                {/* Listening Indicator */}
                <AnimatePresence>
                    {listeningForKey && (
                        <motion.div
                            initial={{opacity: 0, y: -10}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -10}}
                            className="relative px-8 py-4 bg-[var(--theme-text-accent)]/20 border-b border-[var(--theme-border-accent)]"
                        >
                            <div className="flex items-center gap-3 justify-center">
                                <Keyboard className="w-5 h-5 text-[var(--theme-text-accent)] animate-pulse"/>
                                <span className="font-mono text-sm text-[var(--theme-text-primary)] tracking-wider">
                  PRESS ANY KEY TO BIND TO "{editingAction?.toUpperCase()}"
                </span>
                            </div>
                            <p className="text-center text-xs text-[var(--theme-text-secondary)] mt-1 font-mono">
                                ESC TO CANCEL
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <ThemedPanelContent>
                        <motion.div
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 0.15}}
                            className="space-y-6"
                        >
                            {/* Movement Section */}
                            <div>
                                <ThemedSectionHeading>// MOVEMENT</ThemedSectionHeading>
                                <div className="space-y-2">
                                    {movementBindings.map(binding => (
                                        <KeybindingRow
                                            key={binding.action}
                                            binding={binding}
                                            isEditing={editingAction === binding.action && listeningForKey}
                                            onEdit={() => handleEdit(binding.action)}
                                            onRemoveKey={handleRemoveKey}
                                            onAddKey={() => handleAddKey(binding.action)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <ThemedDivider/>

                            {/* Actions Section */}
                            <div>
                                <ThemedSectionHeading>// ACTIONS</ThemedSectionHeading>
                                <div className="space-y-2">
                                    {actionBindings.map(binding => (
                                        <KeybindingRow
                                            key={binding.action}
                                            binding={binding}
                                            isEditing={editingAction === binding.action && listeningForKey}
                                            onEdit={() => handleEdit(binding.action)}
                                            onRemoveKey={handleRemoveKey}
                                            onAddKey={() => handleAddKey(binding.action)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <ThemedDivider/>

                            {/* UI Section */}
                            <div>
                                <ThemedSectionHeading>// INTERFACE</ThemedSectionHeading>
                                <div className="space-y-2">
                                    {uiBindings.map(binding => (
                                        <KeybindingRow
                                            key={binding.action}
                                            binding={binding}
                                            isEditing={editingAction === binding.action && listeningForKey}
                                            onEdit={() => handleEdit(binding.action)}
                                            onRemoveKey={handleRemoveKey}
                                            onAddKey={() => handleAddKey(binding.action)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Changes Warning */}
                            {hasChanges && (
                                <motion.div
                                    initial={{opacity: 0}}
                                    animate={{opacity: 1}}
                                    className="flex items-center gap-2 p-3 border border-[var(--theme-border-accent)] bg-[var(--theme-bg-secondary)]"
                                >
                                    <AlertCircle className="w-4 h-4 text-[var(--theme-text-accent)]"/>
                                    <span className="text-xs font-mono text-[var(--theme-text-secondary)]">
                    UNSAVED CHANGES DETECTED
                  </span>
                                </motion.div>
                            )}
                        </motion.div>
                    </ThemedPanelContent>
                </div>

                {/* Footer Actions */}
                <div
                    className="relative px-8 py-6 bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border-primary)]">
                    <div className="grid grid-cols-3 gap-3">
                        <ThemedButton
                            icon={<Save className="w-5 h-5"/>}
                            onClick={handleSave}
                            disabled={!hasChanges || listeningForKey}
                        >
                            SAVE
                        </ThemedButton>
                        <ThemedButton
                            icon={<RotateCcw className="w-5 h-5"/>}
                            onClick={handleReset}
                            variant="secondary"
                            disabled={listeningForKey}
                        >
                            RESET
                        </ThemedButton>
                        <ThemedButton
                            onClick={onClose}
                            variant="secondary"
                            disabled={listeningForKey}
                            shortcut="ESC"
                        >
                            CLOSE
                        </ThemedButton>
                    </div>
                </div>
            </ThemedPanel>
        </div>
    );
}

/**
 * Individual keybinding row component
 */
interface KeybindingRowProps {
    binding: ActionBinding;
    isEditing: boolean;
    onEdit: () => void;
    onRemoveKey: (action: string, key: string) => void;
    onAddKey: () => void;
}

function KeybindingRow({binding, isEditing, onEdit, onRemoveKey, onAddKey}: KeybindingRowProps) {
    return (
        <div
            className={`
        flex items-center justify-between p-3
        border border-[var(--theme-border-primary)]
        hover:border-[var(--theme-border-hover)]
        hover:bg-[var(--theme-bg-secondary)]
        transition-all duration-200
        ${isEditing ? 'bg-[var(--theme-text-accent)]/10 border-[var(--theme-border-accent)]' : ''}
      `}
        >
            <div className="flex-1">
                <div
                    className="font-mono font-medium text-[var(--theme-text-primary)] text-sm tracking-wider uppercase">
                    {binding.action.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                {binding.description && (
                    <div className="text-xs text-[var(--theme-text-secondary)] font-mono mt-0.5">
                        {binding.description}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-2">
                    {binding.keys.length > 0 ? (
                        binding.keys.map(key => (
                            <ThemedKeyDisplay
                                key={key}
                                keyCode={key}
                                onRemove={() => onRemoveKey(binding.action, key)}
                            />
                        ))
                    ) : (
                        <span className="text-xs text-[var(--theme-text-secondary)] font-mono">
              UNBOUND
            </span>
                    )}
                </div>

                <button
                    onClick={onEdit}
                    disabled={isEditing}
                    className={`
            px-3 py-1.5 font-mono text-xs
            border border-[var(--theme-border-primary)]
            hover:border-[var(--theme-border-hover)]
            hover:bg-[var(--theme-bg-secondary)]
            text-[var(--theme-text-primary)]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            tracking-wider
          `}
                >
                    {isEditing ? 'LISTENING...' : 'REBIND'}
                </button>
            </div>
        </div>
    );
}
