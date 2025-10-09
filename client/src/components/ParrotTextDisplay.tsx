import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useParrot, ParrotMessage } from '@/lib/stores/useParrot';

export function ParrotTextDisplay() {
  const { messages, settings, clearMessages } = useParrot();
  const [visibleMessages, setVisibleMessages] = useState<ParrotMessage[]>([]);

  useEffect(() => {
    if (!settings.showText) {
      setVisibleMessages([]);
      return;
    }

    if (messages.length > 0) {
      setVisibleMessages(messages);

      const timeout = setTimeout(() => {
        setVisibleMessages([]);
        clearMessages();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [messages, settings.showText, clearMessages]);

  if (!settings.showText || visibleMessages.length === 0) {
    return null;
  }

  const getMessageColor = (type: ParrotMessage['type']) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-400/50 bg-yellow-900/20 text-yellow-400';
      case 'critical':
        return 'border-red-400/50 bg-red-900/20 text-red-400';
      case 'random':
        return 'border-green-400/50 bg-green-900/20 text-green-400';
      default:
        return 'border-cyan-400/50 bg-cyan-900/20 text-cyan-400';
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div className="space-y-2">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`backdrop-blur-sm border rounded-lg p-3 flex items-start gap-2 animate-in slide-in-from-bottom-2 ${getMessageColor(message.type)}`}
          >
            <div className="flex-1 text-sm font-medium">
              {message.text}
            </div>
            <button
              onClick={() => {
                setVisibleMessages([]);
                clearMessages();
              }}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              title="Clear messages"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
