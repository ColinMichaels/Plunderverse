import { Volume2, VolumeX, Music, Zap, MessageSquare } from 'lucide-react';
import { useAudio } from '@/lib/stores/ui/useAudio';
import { useParrot } from '@/lib/stores/useParrot';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AudioSettingsPanel() {
  const audio = useAudio();
  const parrot = useParrot();

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

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-400/30">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-400">Audio Settings</h3>
          </div>
        </div>

        {/* Master Mute */}
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-cyan-400/30">
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
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-cyan-400 text-xs">Volume</Label>
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
