import { useState } from 'react';
import { X, Trophy, Gamepad2, Target, Zap, Sparkles, Circle } from 'lucide-react';
import { ZeroGravityRacing } from './ZeroGravityRacing';
import { AsteroidShootingGallery } from './AsteroidShootingGallery';
import { Asteroids } from './Asteroids';
import { SpaceShooter } from './SpaceShooter';
import { Pong } from './Pong';
import { useCreditsData } from '@/domain';
import { usePlayer } from '@/lib/stores';
import { useMinigameSettings, getThemeColors } from './minigameUtils';
import { useMobileLayout } from '@/stores/useMobileLayout';

export type MinigameType = 'racing' | 'shooting' | 'asteroids' | 'spaceshooter' | 'pong' | null;

interface MinigameManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MinigameManager: React.FC<MinigameManagerProps> = ({ isOpen, onClose }) => {
  const [activeGame, setActiveGame] = useState<MinigameType>(null);
  const [highScores, setHighScores] = useState({
    racing: { bestTime: null as number | null, credits: 0 },
    shooting: { highScore: 0, credits: 0 },
    asteroids: { highScore: 0, credits: 0 },
    spaceshooter: { highScore: 0, credits: 0 },
    pong: { highScore: 0, credits: 0 }
  });
  const { earnCredits } = useCreditsData();
  const player = usePlayer();
  const { theme, themeColors, isMobile } = useMinigameSettings();
  const { config } = useMobileLayout();

  if (!isOpen) return null;

  const handleGameComplete = (gameType: MinigameType, score: number, reward: number) => {
    if (!gameType) return;

    // Award credits
    earnCredits(reward);

    // Update high scores
    setHighScores(prev => {
      if (gameType === 'racing') {
        const newBestTime = prev.racing.bestTime === null ? score : Math.min(prev.racing.bestTime, score);
        return {
          ...prev,
          racing: {
            bestTime: newBestTime,
            credits: prev.racing.credits + reward
          }
        };
      } else if (gameType === 'shooting') {
        return {
          ...prev,
          shooting: {
            highScore: Math.max(prev.shooting.highScore, score),
            credits: prev.shooting.credits + reward
          }
        };
      } else if (gameType === 'asteroids') {
        return {
          ...prev,
          asteroids: {
            highScore: Math.max(prev.asteroids.highScore, score),
            credits: prev.asteroids.credits + reward
          }
        };
      } else if (gameType === 'spaceshooter') {
        return {
          ...prev,
          spaceshooter: {
            highScore: Math.max(prev.spaceshooter.highScore, score),
            credits: prev.spaceshooter.credits + reward
          }
        };
      } else if (gameType === 'pong') {
        return {
          ...prev,
          pong: {
            highScore: Math.max(prev.pong.highScore, score),
            credits: prev.pong.credits + reward
          }
        };
      }
      return prev;
    });

    // Return to menu
    setActiveGame(null);
  };

  // If a game is active, render it fullscreen
  if (activeGame === 'racing') {
    return (
      <ZeroGravityRacing
        onComplete={(time: number) => handleGameComplete('racing', time, Math.max(50, Math.floor(300 - time)))}
        onExit={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === 'shooting') {
    return (
      <AsteroidShootingGallery
        onComplete={(score: number) => handleGameComplete('shooting', score, Math.floor(score * 2))}
        onExit={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === 'asteroids') {
    return (
      <Asteroids
        onComplete={(score: number) => handleGameComplete('asteroids', score, Math.floor(score / 2))}
        onExit={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === 'spaceshooter') {
    return (
      <SpaceShooter
        onComplete={(score: number) => handleGameComplete('spaceshooter', score, Math.floor(score / 3))}
        onExit={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === 'pong') {
    return (
      <Pong
        onComplete={(score: number) => handleGameComplete('pong', score, score)}
        onExit={() => setActiveGame(null)}
      />
    );
  }

  // Main menu
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gray-900 border-2 border-cyan-400 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-400/30">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-cyan-400">Station Arcade</h2>
              <p className="text-sm text-gray-400">Entertainment & Credits Await</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cyan-400/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Game Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Zero-Gravity Racing */}
          <button
            onClick={() => setActiveGame('racing')}
            className="group bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-2 border-purple-400/50 hover:border-purple-400 rounded-lg p-6 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-right">
                {highScores.racing.bestTime !== null && (
                  <div className="text-xs text-gray-400">Best Time</div>
                )}
                {highScores.racing.bestTime !== null && (
                  <div className="text-lg font-bold text-purple-400">
                    {highScores.racing.bestTime.toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Zero-G Racing</h3>
            <p className="text-sm text-gray-300 mb-4">
              Navigate through checkpoint rings in zero gravity. Master momentum and thrusters to beat the clock!
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Difficulty: Medium</span>
              <span className="text-purple-400 font-bold">Up to 300₡</span>
            </div>
            {highScores.racing.credits > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-400/30 text-xs text-gray-400">
                Total earned: {highScores.racing.credits}₡
              </div>
            )}
          </button>

          {/* Asteroid Shooting Gallery */}
          <button
            onClick={() => setActiveGame('shooting')}
            className="group bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-400/50 hover:border-orange-400 rounded-lg p-6 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Target className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-right">
                {highScores.shooting.highScore > 0 && (
                  <div className="text-xs text-gray-400">High Score</div>
                )}
                {highScores.shooting.highScore > 0 && (
                  <div className="text-lg font-bold text-orange-400">
                    {highScores.shooting.highScore}
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Shooting Gallery</h3>
            <p className="text-sm text-gray-300 mb-4">
              Test your aim! Hit asteroids for points. Combos multiply your score. Don't miss!
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Difficulty: Easy</span>
              <span className="text-orange-400 font-bold">Score × 2₡</span>
            </div>
            {highScores.shooting.credits > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-400/30 text-xs text-gray-400">
                Total earned: {highScores.shooting.credits}₡
              </div>
            )}
          </button>

          {/* Asteroids */}
          <button
            onClick={() => setActiveGame('asteroids')}
            className="group bg-gradient-to-br from-gray-900/50 to-slate-800/50 border-2 border-gray-400/50 hover:border-gray-300 rounded-lg p-6 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gray-500/20 rounded-lg">
                <Sparkles className="w-8 h-8 text-gray-300" />
              </div>
              <div className="text-right">
                {highScores.asteroids.highScore > 0 && (
                  <div className="text-xs text-gray-400">High Score</div>
                )}
                {highScores.asteroids.highScore > 0 && (
                  <div className="text-lg font-bold text-gray-300">
                    {highScores.asteroids.highScore}
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Asteroids</h3>
            <p className="text-sm text-gray-300 mb-4">
              Classic arcade action! Destroy asteroids while avoiding collisions. Survive as long as you can!
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Difficulty: Hard</span>
              <span className="text-gray-300 font-bold">Score ÷ 2₡</span>
            </div>
            {highScores.asteroids.credits > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-400/30 text-xs text-gray-400">
                Total earned: {highScores.asteroids.credits}₡
              </div>
            )}
          </button>

          {/* Space Shooter */}
          <button
            onClick={() => setActiveGame('spaceshooter')}
            className="group bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-2 border-cyan-400/50 hover:border-cyan-400 rounded-lg p-6 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Zap className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-right">
                {highScores.spaceshooter.highScore > 0 && (
                  <div className="text-xs text-gray-400">High Score</div>
                )}
                {highScores.spaceshooter.highScore > 0 && (
                  <div className="text-lg font-bold text-cyan-400">
                    {highScores.spaceshooter.highScore}
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Space Shooter</h3>
            <p className="text-sm text-gray-300 mb-4">
              Survive waves of enemies! Auto-fire enabled. Dodge incoming threats and rack up points!
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Difficulty: Medium</span>
              <span className="text-cyan-400 font-bold">Score ÷ 3₡</span>
            </div>
            {highScores.spaceshooter.credits > 0 && (
              <div className="mt-3 pt-3 border-t border-cyan-400/30 text-xs text-gray-400">
                Total earned: {highScores.spaceshooter.credits}₡
              </div>
            )}
          </button>

          {/* Pong */}
          <button
            onClick={() => setActiveGame('pong')}
            className="group bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-2 border-green-400/50 hover:border-green-400 rounded-lg p-6 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Circle className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-right">
                {highScores.pong.highScore > 0 && (
                  <div className="text-xs text-gray-400">Best Win</div>
                )}
                {highScores.pong.highScore > 0 && (
                  <div className="text-lg font-bold text-green-400">
                    {highScores.pong.highScore}₡
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pong</h3>
            <p className="text-sm text-gray-300 mb-4">
              Classic paddle game! Face off against AI. First to 11 points wins. Can you beat the computer?
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Difficulty: Easy</span>
              <span className="text-green-400 font-bold">Win = 110₡</span>
            </div>
            {highScores.pong.credits > 0 && (
              <div className="mt-3 pt-3 border-t border-green-400/30 text-xs text-gray-400">
                Total earned: {highScores.pong.credits}₡
              </div>
            )}
          </button>
        </div>

        {/* Stats Footer */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-400/30">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">Your Stats</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">
                {highScores.racing.credits + highScores.shooting.credits + highScores.asteroids.credits + highScores.spaceshooter.credits + highScores.pong.credits}₡
              </div>
              <div className="text-xs text-gray-400">Total Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {Math.max(highScores.asteroids.highScore, highScores.shooting.highScore, highScores.spaceshooter.highScore) || '--'}
              </div>
              <div className="text-xs text-gray-400">Highest Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {(highScores.racing.bestTime !== null ? 1 : 0) + (highScores.shooting.highScore > 0 ? 1 : 0) + (highScores.asteroids.highScore > 0 ? 1 : 0) + (highScores.spaceshooter.highScore > 0 ? 1 : 0) + (highScores.pong.highScore > 0 ? 1 : 0)}
              </div>
              <div className="text-xs text-gray-400">Games Played</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-cyan-400/10 rounded-lg border border-cyan-400/30">
          <p className="text-xs text-cyan-300">
            💡 Mini-games award credits based on performance. Master them to earn extra income between jobs!
          </p>
        </div>
      </div>
    </div>
  );
};
