import { Eye, EyeOff } from 'lucide-react';
import { useMobileLayout } from '../../stores/useMobileLayout';

export function CleanViewToggle() {
  const { isCleanViewMode, setCleanViewMode, config } = useMobileLayout();

  return (
    <button
      onClick={() => setCleanViewMode(!isCleanViewMode)}
      className="w-12 h-12 flex items-center justify-center bg-slate-800/80 border border-slate-600 rounded-lg hover:bg-slate-700/80 transition-colors active:scale-95"
      style={{ zIndex: config.zIndex.hud }}
      aria-label={isCleanViewMode ? 'Show UI elements' : 'Hide UI elements'}
      data-ui
    >
      {isCleanViewMode ? (
        <Eye className="w-5 h-5 text-cyan-400" />
      ) : (
        <EyeOff className="w-5 h-5 text-slate-400" />
      )}
    </button>
  );
}
