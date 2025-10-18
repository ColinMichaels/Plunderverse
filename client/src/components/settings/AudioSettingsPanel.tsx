import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Zap, MessageSquare, Briefcase, Eye, EyeOff, Type } from 'lucide-react';
import { useAudio } from '@/lib/stores/ui/useAudio';
import { useParrot } from '@/lib/stores/useParrot';
import { parrotSpeechService } from '@/services/ParrotSpeechService';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AudioSettingsPanel() {
  const audio = useAudio();
  const parrot = useParrot();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available TTS voices
  useEffect(() => {
    let isMounted = true;
    
    parrotSpeechService.ensureVoicesLoaded(() => {
      if (isMounted) {
        setAvailableVoices(parrotSpeechService.getAvailableVoices());
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMasterMuteToggle = () => {
    audio.setMasterMute(!audio.masterMute);
  };

  const handleMusicMuteToggle = () => {
    audio.setMusicMute(!audio.musicMute);
  };

  const handleSfxMuteToggle = () => {
    audio.setSfxMute(!audio.sfxMute);
  };

  const handleParrotMuteToggle = () => {
    parrot.setMuted(!parrot.settings.isMuted);
  };

  const handleParrotVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    parrot.setVolume(volume);
  };

  const handleMasterVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    audio.setMasterVolume(volume);
  };

  const handleMusicVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    audio.setMusicVolume(volume);
  };

  const handleSfxVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    audio.setSfxVolume(volume);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-400/30">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-400">Audio Settings</h3>
          </div>
        </div>

        {/* Master Controls */}
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-cyan-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {audio.masterMute ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              )}
              <div>
                <Label className="text-white font-medium">Master Audio</Label>
                <p className="text-xs text-gray-400">Mute all game sounds</p>
              </div>
            </div>
            <Switch
              checked={!audio.masterMute}
              onCheckedChange={handleMasterMuteToggle}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          
          {!audio.masterMute && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-cyan-400 text-xs">Master Volume</Label>
                <span className="text-cyan-400 text-xs font-mono">
                  {Math.round(audio.masterVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[audio.masterVolume * 100]}
                onValueChange={handleMasterVolumeChange}
                max={100}
                step={5}
                className="[&_.bg-primary]:bg-cyan-400 [&_.border-primary]:border-cyan-400"
              />
              <p className="text-xs text-gray-400 italic">
                Controls overall volume - multiplies with category volumes
              </p>
            </div>
          )}
        </div>

        {/* Music Controls */}
        <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4 text-cyan-400" />
              <div>
                <Label className="text-white text-sm font-medium">Music</Label>
                <p className="text-xs text-gray-400">Background music & themes</p>
              </div>
            </div>
            <Switch
              checked={!audio.musicMute}
              onCheckedChange={handleMusicMuteToggle}
              disabled={audio.masterMute}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          
          {!audio.masterMute && !audio.musicMute && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-cyan-400 text-xs">Music Volume</Label>
                <span className="text-cyan-400 text-xs font-mono">
                  {Math.round(audio.musicVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[audio.musicVolume * 100]}
                onValueChange={handleMusicVolumeChange}
                max={100}
                step={5}
                className="[&_.bg-primary]:bg-cyan-400 [&_.border-primary]:border-cyan-400"
              />
            </div>
          )}
        </div>

        {/* Sound Effects Controls */}
        <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <Label className="text-white text-sm font-medium">Sound Effects</Label>
                <p className="text-xs text-gray-400">Lasers, explosions, UI sounds</p>
              </div>
            </div>
            <Switch
              checked={!audio.sfxMute}
              onCheckedChange={handleSfxMuteToggle}
              disabled={audio.masterMute}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          
          {!audio.masterMute && !audio.sfxMute && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-cyan-400 text-xs">SFX Volume</Label>
                <span className="text-cyan-400 text-xs font-mono">
                  {Math.round(audio.sfxVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[audio.sfxVolume * 100]}
                onValueChange={handleSfxVolumeChange}
                max={100}
                step={5}
                className="[&_.bg-primary]:bg-cyan-400 [&_.border-primary]:border-cyan-400"
              />
            </div>
          )}
        </div>

        {/* Parrot Speech Controls */}
        <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <div>
                <Label className="text-white text-sm font-medium">Parrot Speech</Label>
                <p className="text-xs text-gray-400">Voice announcements & comments</p>
              </div>
            </div>
            <Switch
              checked={!parrot.settings.isMuted}
              onCheckedChange={handleParrotMuteToggle}
              disabled={audio.masterMute}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          
          {!audio.masterMute && !parrot.settings.isMuted && (
            <>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-cyan-400 text-xs">Parrot Volume</Label>
                  <span className="text-cyan-400 text-xs font-mono">
                    {Math.round(parrot.settings.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[parrot.settings.volume * 100]}
                  onValueChange={handleParrotVolumeChange}
                  max={100}
                  step={5}
                  className="[&_.bg-primary]:bg-cyan-400 [&_.border-primary]:border-cyan-400"
                />
              </div>

              {/* Parrot Behavior Controls */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => parrot.setMode(parrot.settings.mode === 'chatty' ? 'serious' : 'chatty')}
                  className="bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-9 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
                  title={parrot.settings.mode === 'chatty' ? 'Switch to Serious Mode' : 'Switch to Chatty Mode'}
                >
                  {parrot.settings.mode === 'chatty' ? <MessageSquare className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                  <span className="text-xs">{parrot.settings.mode === 'chatty' ? 'Chatty' : 'Serious'}</span>
                </button>

                <button
                  onClick={() => parrot.setVisible(!parrot.settings.isVisible)}
                  className="bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-9 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2"
                  title={parrot.settings.isVisible ? 'Hide Parrot' : 'Show Parrot'}
                >
                  {parrot.settings.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span className="text-xs">{parrot.settings.isVisible ? 'Visible' : 'Hidden'}</span>
                </button>

                <button
                  onClick={() => parrot.setShowText(!parrot.settings.showText)}
                  className={`bg-gray-800/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white h-9 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 ${parrot.settings.showText ? 'bg-cyan-600/70' : ''}`}
                  title={parrot.settings.showText ? 'Hide Text Captions' : 'Show Text Captions'}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span className="text-xs">Captions</span>
                </button>
              </div>

              {/* Voice Selection */}
              <div className="space-y-2 pt-2">
                <Label className="text-cyan-400 text-xs">Voice</Label>
                <Select
                  value={parrot.settings.selectedVoice || 'default'}
                  onValueChange={(value) => parrot.setVoice(value === 'default' ? null : value)}
                >
                  <SelectTrigger className="bg-gray-800/90 border-cyan-400/50 text-cyan-400 h-9 text-xs">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-cyan-400/50">
                    <SelectItem value="default" className="text-cyan-400 text-xs">Default Voice</SelectItem>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name} className="text-cyan-400 text-xs">
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Info Text */}
        <div className="p-3 bg-cyan-400/10 rounded-lg border border-cyan-400/30">
          <p className="text-xs text-cyan-300">
            💡 Your audio preferences are saved automatically and will persist across sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
