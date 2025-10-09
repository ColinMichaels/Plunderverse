import { Volume2, VolumeX, MessageSquare, Briefcase, Eye, EyeOff } from 'lucide-react';
import { useParrot } from '@/lib/stores/useParrot';

export function ParrotControls() {
  const { settings, setMuted, setMode, setVisible } = useParrot();

  return (
    <div className="fixed top-20 right-4 flex flex-col gap-2 z-50">
      <button
        onClick={() => setMuted(!settings.isMuted)}
        className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
        title={settings.isMuted ? 'Unmute Parrot' : 'Mute Parrot'}
      >
        {settings.isMuted ? <VolumeX className="text-xl" /> : <Volume2 className="text-xl" />}
      </button>

      <button
        onClick={() => setMode(settings.mode === 'chatty' ? 'serious' : 'chatty')}
        className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
        title={settings.mode === 'chatty' ? 'Switch to Serious Mode' : 'Switch to Chatty Mode'}
      >
        {settings.mode === 'chatty' ? <MessageSquare className="text-xl" /> : <Briefcase className="text-xl" />}
      </button>

      <button
        onClick={() => setVisible(!settings.isVisible)}
        className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
        title={settings.isVisible ? 'Hide Parrot' : 'Show Parrot'}
      >
        {settings.isVisible ? <Eye className="text-xl" /> : <EyeOff className="text-xl" />}
      </button>
    </div>
  );
}
