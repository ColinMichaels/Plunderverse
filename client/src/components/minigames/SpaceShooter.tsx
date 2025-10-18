import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { X, Trophy, RotateCcw } from 'lucide-react';
import { useMinigameSettings, getPhaserThemeColors } from './minigameUtils';

interface SpaceShooterProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

export const SpaceShooter: React.FC<SpaceShooterProps> = ({ onComplete, onExit }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const { theme, isMobile, isTouch, getSfxVolume } = useMinigameSettings();

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return;

    const colors = getPhaserThemeColors(theme);

    class ShooterScene extends Phaser.Scene {
      private player!: Phaser.GameObjects.Rectangle;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private bullets!: Phaser.Physics.Arcade.Group;
      private enemies!: Phaser.Physics.Arcade.Group;
      private score = 0;
      private wave = 1;
      private scoreText!: Phaser.GameObjects.Text;
      private waveText!: Phaser.GameObjects.Text;
      private lastFired = 0;
      private spaceKey!: Phaser.Input.Keyboard.Key;
      private targetX = 400;
      private targetY = 550;
      private touchControlsText?: Phaser.GameObjects.Text;

      constructor() {
        super({ key: 'ShooterScene' });
      }

      create() {
        // Starfield background (using theme colors)
        const graphics = this.add.graphics();
        for (let i = 0; i < 200; i++) {
          const x = Phaser.Math.Between(0, 800);
          const y = Phaser.Math.Between(0, 600);
          const size = Phaser.Math.Between(1, 2);
          graphics.fillStyle(colors.text, Phaser.Math.FloatBetween(0.3, 1));
          graphics.fillCircle(x, y, size);
        }

        // Player ship (using theme primary color)
        this.player = this.add.rectangle(400, 550, 20, 30, colors.primary);
        this.physics.add.existing(this.player);
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);

        // Input - keyboard
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Input - touch/mouse
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          this.targetX = pointer.x;
          this.targetY = pointer.y;
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.targetX = pointer.x;
          this.targetY = pointer.y;
        });

        // Touch controls hint
        if (isTouch) {
          this.touchControlsText = this.add.text(400, 580, 'Touch to move', {
            fontSize: '14px',
            color: '#888888'
          }).setOrigin(0.5);
        }

        // Bullets
        this.bullets = this.physics.add.group({
          defaultKey: 'bullet',
          maxSize: 30
        });

        // Enemies
        this.enemies = this.physics.add.group();
        this.spawnWave();

        // Collisions
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy as any, undefined, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerHitEnemy as any, undefined, this);

        // UI (using theme colors)
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
          fontSize: '24px',
          color: `#${colors.primary.toString(16).padStart(6, '0')}`
        });
        this.waveText = this.add.text(16, 50, 'Wave: 1', {
          fontSize: '24px',
          color: `#${colors.accent.toString(16).padStart(6, '0')}`
        });
      }

      update(time: number) {
        // Player movement
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        
        // Keyboard controls
        if (this.cursors.left?.isDown) {
          playerBody.setVelocityX(-300);
        } else if (this.cursors.right?.isDown) {
          playerBody.setVelocityX(300);
        } else {
          // Touch/mouse controls - smooth movement to target
          const diffX = this.targetX - this.player.x;
          if (Math.abs(diffX) > 5) {
            playerBody.setVelocityX(diffX * 8);
          } else {
            playerBody.setVelocityX(0);
          }
        }

        if (this.cursors.up?.isDown) {
          playerBody.setVelocityY(-300);
        } else if (this.cursors.down?.isDown) {
          playerBody.setVelocityY(300);
        } else {
          // Touch/mouse controls - smooth movement to target
          const diffY = this.targetY - this.player.y;
          if (Math.abs(diffY) > 5) {
            playerBody.setVelocityY(diffY * 8);
          } else {
            playerBody.setVelocityY(0);
          }
        }

        // Auto-fire
        if (time > this.lastFired + 150) {
          this.fireBullet();
          this.lastFired = time;
        }

        // Clean up bullets that are off-screen (bullet recycling)
        this.bullets.children.entries.forEach((bullet) => {
          if (bullet.active && (bullet.y < -10 || bullet.y > 610)) {
            bullet.setActive(false);
            bullet.setVisible(false);
          }
        });

        // Check for wave completion
        if (this.enemies.countActive() === 0) {
          this.wave += 1;
          setWave(this.wave);
          this.waveText.setText(`Wave: ${this.wave}`);
          this.spawnWave();
        }
      }

      private fireBullet() {
        const bullet = this.bullets.get(this.player.x, this.player.y - 20);
        if (!bullet) return;

        bullet.setActive(true);
        bullet.setVisible(true);

        // Create bullet graphics if not already created (using theme secondary color)
        if (!this.textures.exists('bullet')) {
          const graphics = this.add.graphics();
          graphics.fillStyle(colors.secondary, 1);
          graphics.fillRect(0, 0, 4, 10);
          graphics.generateTexture('bullet', 4, 10);
          graphics.destroy();
        }

        bullet.setTexture('bullet');
        
        const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
        bulletBody.setVelocity(0, -400);
      }

      private spawnWave() {
        const enemiesPerWave = 5 + this.wave * 2;
        const rows = Math.min(3, Math.ceil(this.wave / 2));
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < Math.ceil(enemiesPerWave / rows); col++) {
            // Enemy using theme danger color
            const enemy = this.add.rectangle(
              100 + col * 80,
              50 + row * 60,
              30,
              20,
              colors.danger
            );
            this.physics.add.existing(enemy);
            this.enemies.add(enemy);
            
            const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
            const speed = 50 + this.wave * 10;
            enemyBody.setVelocity(Phaser.Math.Between(-speed, speed), speed);
            enemyBody.setBounce(1, 1);
            enemyBody.setCollideWorldBounds(true);

            (enemy as any).enemyType = 'basic';
          }
        }
      }

      private bulletHitEnemy(bullet: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) {
        bullet.setActive(false);
        bullet.setVisible(false);

        this.score += 10 * this.wave;
        setScore(this.score);
        this.scoreText.setText(`Score: ${this.score}`);

        // Explosion effect (using theme secondary color)
        const explosion = this.add.circle(enemy.x, enemy.y, 20, colors.secondary, 0.8);
        this.tweens.add({
          targets: explosion,
          scale: 2,
          alpha: 0,
          duration: 200,
          onComplete: () => explosion.destroy()
        });

        enemy.destroy();
      }

      private playerHitEnemy(player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject) {
        this.gameOver();
      }

      private gameOver() {
        setFinalScore(this.score);
        setGameState('finished');
        this.scene.pause();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scene: ShooterScene,
      backgroundColor: '#000000'
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, [gameState, theme, isTouch]);

  const handleStart = () => {
    setGameState('playing');
    setScore(0);
    setWave(1);
  };

  const handleRestart = () => {
    setGameState('ready');
    setScore(0);
    setWave(1);
    setFinalScore(0);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div ref={gameRef} className="relative" />

      {/* Start Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-cyan-400 rounded-lg p-8">
            <h2 className="text-4xl font-bold text-cyan-400 mb-4">Space Shooter</h2>
            <p className="text-gray-300 mb-6">
              Defend against waves of enemies! {isTouch ? 'Touch to move your ship.' : 'Use arrow keys to move.'} Your ship auto-fires.
            </p>
            <div className="text-sm text-gray-400 mb-4">
              {isTouch ? (
                <div>Touch : Move Ship</div>
              ) : (
                <div>Arrow Keys : Move</div>
              )}
              <div>Auto-Fire : Enabled</div>
            </div>
            <button
              onClick={handleStart}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Finish Screen */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-cyan-400 rounded-lg p-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-cyan-400 mb-2">Wave {wave} Complete!</h2>
            <div className="text-5xl font-bold text-purple-400 mb-4">
              {finalScore}
            </div>
            <div className="text-lg text-gray-300 mb-6">
              Reward: {Math.floor(finalScore / 3)}₡
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => onComplete(finalScore)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Collect Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 bg-black/80 border border-red-400 rounded-lg p-3 hover:bg-red-900/50 transition-colors pointer-events-auto"
      >
        <X className="w-6 h-6 text-red-400" />
      </button>
    </div>
  );
};
