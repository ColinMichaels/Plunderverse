import { useState, useEffect } from 'react';
import { Volume2, VolumeX, MessageSquare, Briefcase, Eye, EyeOff, Type } from 'lucide-react';
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

export function ParrotSettingsPanel() {
  const { settings, setMuted, setMode, setVisible, setVolume, setShowText, setVoice } = useParrot();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    parrotSpeechService.ensureVoicesLoaded(() => {
      setAvailableVoices(parrotSpeechService.getAvailableVoices());
    });
  }, []);

  return (
    <div className="space-y-4 p-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMuted(!settings.isMuted)}
          className="bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
          title={settings.isMuted ? 'Unmute Parrot' : 'Mute Parrot'}
        >
          {settings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-xs">{settings.isMuted ? 'Muted' : 'Audio On'}</span>
        </button>

        <button
          onClick={() => setMode(settings.mode === 'chatty' ? 'serious' : 'chatty')}
          className="bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
          title={settings.mode === 'chatty' ? 'Switch to Serious Mode' : 'Switch to Chatty Mode'}
        >
          {settings.mode === 'chatty' ? <MessageSquare className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          <span className="text-xs">{settings.mode === 'chatty' ? 'Chatty' : 'Serious'}</span>
        </button>

        <button
          onClick={() => setVisible(!settings.isVisible)}
          className="bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
          title={settings.isVisible ? 'Hide Parrot' : 'Show Parrot'}
        >
          {settings.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="text-xs">{settings.isVisible ? 'Visible' : 'Hidden'}</span>
        </button>

        <button
          onClick={() => setShowText(!settings.showText)}
          className={`bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 ${settings.showText ? 'bg-cyan-600/70' : ''}`}
          title={settings.showText ? 'Hide Text Captions' : 'Show Text Captions'}
        >
          <Type className="w-4 h-4" />
          <span className="text-xs">Captions</span>
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
  );
}
