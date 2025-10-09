import { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare, Briefcase, Eye, EyeOff, Type, Settings } from 'lucide-react';
import { useParrot } from '@/lib/stores/useParrot';
import { parrotSpeechService } from '@/services/ParrotSpeechService';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ParrotControls() {
  const { settings, setMuted, setMode, setVisible, setVolume, setShowText, setVoice } = useParrot();
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    parrotSpeechService.ensureVoicesLoaded(() => {
      setAvailableVoices(parrotSpeechService.getAvailableVoices());
    });
  }, []);

  return (
    <div className="fixed top-20 right-4 flex flex-col gap-2 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
        title="Parrot Settings"
      >
        <Settings className="text-xl" />
      </button>

      {isExpanded && (
        <div className="bg-gray-900/95 backdrop-blur-sm border border-cyan-400/50 rounded-lg p-4 w-64">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMuted(!settings.isMuted)}
                className="flex-1 bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center"
                title={settings.isMuted ? 'Unmute Parrot' : 'Mute Parrot'}
              >
                {settings.isMuted ? <VolumeX className="text-xl" /> : <Volume2 className="text-xl" />}
              </button>

              <button
                onClick={() => setMode(settings.mode === 'chatty' ? 'serious' : 'chatty')}
                className="flex-1 bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center"
                title={settings.mode === 'chatty' ? 'Switch to Serious Mode' : 'Switch to Chatty Mode'}
              >
                {settings.mode === 'chatty' ? <MessageSquare className="text-xl" /> : <Briefcase className="text-xl" />}
              </button>

              <button
                onClick={() => setVisible(!settings.isVisible)}
                className="flex-1 bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center"
                title={settings.isVisible ? 'Hide Parrot' : 'Show Parrot'}
              >
                {settings.isVisible ? <Eye className="text-xl" /> : <EyeOff className="text-xl" />}
              </button>

              <button
                onClick={() => setShowText(!settings.showText)}
                className={`flex-1 bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center ${settings.showText ? 'bg-cyan-600/70' : ''}`}
                title={settings.showText ? 'Hide Text Captions' : 'Show Text Captions (displays text alongside voice)'}
              >
                <Type className="text-xl" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-cyan-400 text-sm font-medium">
                Volume: {Math.round(settings.volume * 100)}%
              </label>
              <Slider
                value={[settings.volume * 100]}
                onValueChange={(value) => setVolume(value[0] / 100)}
                max={100}
                step={5}
                className="[&_.bg-primary]:bg-cyan-400 [&_.border-primary]:border-cyan-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-cyan-400 text-sm font-medium">Voice</label>
              <Select
                value={settings.selectedVoice || 'default'}
                onValueChange={(value) => setVoice(value === 'default' ? null : value)}
              >
                <SelectTrigger className="bg-gray-800/90 border-cyan-400/50 text-cyan-400">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-cyan-400/50">
                  <SelectItem value="default" className="text-cyan-400">Default Voice</SelectItem>
                  {availableVoices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name} className="text-cyan-400">
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
