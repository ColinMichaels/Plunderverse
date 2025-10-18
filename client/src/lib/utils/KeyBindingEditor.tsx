import {useEffect, useState} from 'react';
import {ActionBinding, createDefaultBindings, InputRouter} from '@/lib/InputRouter';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';

interface KeybindingEditorProps {
    onSave?: (bindings: ActionBinding[]) => void;
}

export function KeybindingEditor({onSave}: KeybindingEditorProps) {
    const [bindings, setBindings] = useState<ActionBinding[]>(createDefaultBindings());
    const [editingAction, setEditingAction] = useState<string | null>(null);
    const [listeningForKey, setListeningForKey] = useState(false);

    useEffect(() => {
        if (!listeningForKey || !editingAction) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Update the binding
            setBindings(prev => prev.map(binding => {
                if (binding.action === editingAction) {
                    return {
                        ...binding,
                        keys: [e.code], // Replace with new key
                    };
                }
                return binding;
            }));

            setListeningForKey(false);
            setEditingAction(null);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [listeningForKey, editingAction]);

    const handleEdit = (action: string) => {
        setEditingAction(action);
        setListeningForKey(true);
    };

    const handleSave = () => {
        const router = InputRouter.instance();
        bindings.forEach(binding => {
            router.registerAction(binding.action, binding.keys);
        });
        onSave?.(bindings);
    };

    const handleReset = () => {
        const defaults = createDefaultBindings();
        setBindings(defaults);
        const router = InputRouter.instance();
        defaults.forEach(binding => {
            router.registerAction(binding.action, binding.keys);
        });
    };

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Key Bindings</h2>

            {listeningForKey && (
                <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500 rounded">
                    Press any key to bind to "{editingAction}"...
                </div>
            )}

            <div className="space-y-2 mb-4">
                {bindings.map(binding => (
                    <div key={binding.action}
                         className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded">
                        <div className="flex-1">
                            <div className="font-medium capitalize">{binding.action.replace(/([A-Z])/g, ' $1')}</div>
                            {binding.description && (
                                <div className="text-sm text-gray-400">{binding.description}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-gray-700 rounded font-mono text-sm">
                                {binding.keys.join(' + ') || 'Unbound'}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(binding.action)}
                                disabled={listeningForKey}
                            >
                                {editingAction === binding.action && listeningForKey ? 'Listening...' : 'Edit'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
            </div>
        </Card>
    );
}
