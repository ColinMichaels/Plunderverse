import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { X, Trophy, RotateCcw } from 'lucide-react';

interface AsteroidsProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

export const Asteroids: React.FC<AsteroidsProps> = ({ onComplete, onExit }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return;

    class AsteroidsScene extends Phaser.Scene {
      private ship!: Phaser.GameObjects.Triangle;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private bullets!: Phaser.Physics.Arcade.Group;
      private asteroids!: Phaser.Physics.Arcade.Group;
      private shipVelocity = new Phaser.Math.Vector2(0, 0);
      private score = 0;
      private lives = 3;
      private scoreText!: Phaser.GameObjects.Text;
      private livesText!: Phaser.GameObjects.Text;
      private lastFired = 0;
      private isInvulnerable = false;

      constructor() {
        super({ key: 'AsteroidsScene' });
      }

      create() {
        // Create starfield background
        const graphics = this.add.graphics();
        for (let i = 0; i < 200; i++) {
          const x = Phaser.Math.Between(0, 800);
          const y = Phaser.Math.Between(0, 600);
          const size = Phaser.Math.Between(1, 2);
          graphics.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
          graphics.fillCircle(x, y, size);
        }

        // Create ship
        this.ship = this.add.triangle(400, 300, 0, -15, -10, 10, 10, 10, 0x8b5cf6);
        this.physics.add.existing(this.ship);
        const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
        shipBody.setDrag(0.99);
        shipBody.setMaxVelocity(300);
        shipBody.setCollideWorldBounds(true, 1, 1);

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.input.keyboard!.addKey('Space');

        // Bullets
        this.bullets = this.physics.add.group({
          defaultKey: 'bullet',
          maxSize: 10
        });

        // Asteroids
        this.asteroids = this.physics.add.group();
        this.spawnAsteroids(4);

        // Collisions
        this.physics.add.overlap(this.bullets, this.asteroids, this.bulletHitAsteroid as any, undefined, this);
        this.physics.add.overlap(this.ship, this.asteroids, this.shipHitAsteroid as any, undefined, this);

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
          fontSize: '24px',
          color: '#06b6d4'
        });
        this.livesText = this.add.text(16, 50, 'Lives: 3', {
          fontSize: '24px',
          color: '#f87171'
        });

        // Wrap around edges
        this.physics.world.setBounds(0, 0, 800, 600);
      }

      update(time: number) {
        // Ship rotation
        if (this.cursors.left?.isDown) {
          this.ship.angle -= 5;
        } else if (this.cursors.right?.isDown) {
          this.ship.angle += 5;
        }

        // Ship thrust
        if (this.cursors.up?.isDown) {
          const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
          this.physics.velocityFromRotation(
            this.ship.rotation - Math.PI / 2,
            200,
            shipBody.acceleration
          );
        } else {
          const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
          shipBody.setAcceleration(0);
        }

        // Shooting
        if (this.cursors.space?.isDown && time > this.lastFired + 200) {
          this.fireBullet();
          this.lastFired = time;
        }

        // Wrap ship position
        this.wrapPosition(this.ship);

        // Wrap asteroids and bullets
        this.asteroids.children.entries.forEach((asteroid) => {
          this.wrapPosition(asteroid as Phaser.GameObjects.GameObject);
        });
        this.bullets.children.entries.forEach((bullet) => {
          this.wrapPosition(bullet as Phaser.GameObjects.GameObject);
        });

        // Win condition
        if (this.asteroids.countActive() === 0) {
          this.spawnAsteroids(this.score / 100 + 4);
        }
      }

      private fireBullet() {
        const bullet = this.bullets.get(this.ship.x, this.ship.y);
        if (!bullet) return;

        bullet.setActive(true);
        bullet.setVisible(true);

        // Create bullet graphics if not already created
        if (!this.textures.exists('bullet')) {
          const graphics = this.add.graphics();
          graphics.fillStyle(0xffff00, 1);
          graphics.fillCircle(0, 0, 3);
          graphics.generateTexture('bullet', 6, 6);
          graphics.destroy();
        }

        bullet.setTexture('bullet');
        
        const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
        this.physics.velocityFromRotation(
          this.ship.rotation - Math.PI / 2,
          400,
          bulletBody.velocity
        );

        // Bullet lifetime
        this.time.delayedCall(2000, () => {
          bullet.setActive(false);
          bullet.setVisible(false);
        });
      }

      private spawnAsteroids(count: number) {
        for (let i = 0; i < count; i++) {
          const x = Phaser.Math.Between(0, 800);
          const y = Phaser.Math.Between(0, 600);
          const asteroid = this.createAsteroid(x, y, 3);
        }
      }

      private createAsteroid(x: number, y: number, size: number): Phaser.GameObjects.Arc {
        const asteroid = this.add.circle(x, y, size * 15, 0x888888);
        this.physics.add.existing(asteroid);
        this.asteroids.add(asteroid);
        
        const asteroidBody = asteroid.body as Phaser.Physics.Arcade.Body;
        asteroidBody.setCircle(size * 15);
        
        const speed = Phaser.Math.Between(50, 150);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        asteroidBody.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );

        (asteroid as any).asteroidSize = size;
        return asteroid;
      }

      private bulletHitAsteroid(bullet: Phaser.GameObjects.GameObject, asteroid: Phaser.GameObjects.GameObject) {
        bullet.setActive(false);
        bullet.setVisible(false);

        const size = (asteroid as any).asteroidSize;
        this.score += (4 - size) * 10;
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Update React state
        setScore(this.score);

        // Split asteroid
        if (size > 1) {
          for (let i = 0; i < 2; i++) {
            this.createAsteroid(asteroid.x, asteroid.y, size - 1);
          }
        }

        asteroid.destroy();
      }

      private shipHitAsteroid(ship: Phaser.GameObjects.GameObject, asteroid: Phaser.GameObjects.GameObject) {
        if (this.isInvulnerable) return;

        this.lives -= 1;
        this.livesText.setText(`Lives: ${this.lives}`);
        setLives(this.lives);

        if (this.lives <= 0) {
          this.gameOver();
          return;
        }

        // Respawn with invulnerability
        this.ship.setPosition(400, 300);
        const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
        shipBody.setVelocity(0, 0);
        
        this.isInvulnerable = true;
        this.ship.setAlpha(0.5);

        this.time.delayedCall(2000, () => {
          this.isInvulnerable = false;
          this.ship.setAlpha(1);
        });
      }

      private gameOver() {
        setFinalScore(this.score);
        setGameState('finished');
        this.scene.pause();
      }

      private wrapPosition(gameObject: Phaser.GameObjects.GameObject) {
        const obj = gameObject as any;
        if (obj.x < 0) obj.x = 800;
        if (obj.x > 800) obj.x = 0;
        if (obj.y < 0) obj.y = 600;
        if (obj.y > 600) obj.y = 0;
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
      scene: AsteroidsScene,
      backgroundColor: '#000000'
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, [gameState]);

  const handleStart = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
  };

  const handleRestart = () => {
    setGameState('ready');
    setScore(0);
    setLives(3);
    setFinalScore(0);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div ref={gameRef} className="relative" />

      {/* Start Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-purple-400 rounded-lg p-8">
            <h2 className="text-4xl font-bold text-purple-400 mb-4">Asteroids</h2>
            <p className="text-gray-300 mb-6">
              Destroy asteroids and survive! Use arrow keys to rotate and thrust, spacebar to shoot.
            </p>
            <div className="text-sm text-gray-400 mb-4">
              <div>← → : Rotate</div>
              <div>↑ : Thrust</div>
              <div>Space : Fire</div>
            </div>
            <button
              onClick={handleStart}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Finish Screen */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-purple-400 rounded-lg p-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-purple-400 mb-2">Game Over!</h2>
            <div className="text-5xl font-bold text-cyan-400 mb-4">
              {finalScore}
            </div>
            <div className="text-lg text-gray-300 mb-6">
              Reward: {Math.floor(finalScore / 2)}₡
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
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
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
