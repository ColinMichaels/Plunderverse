import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { X, Trophy, RotateCcw } from 'lucide-react';
import { useMinigameSettings, getPhaserThemeColors, getGameDimensions } from './minigameUtils';
import { useMobileLayout } from '@/stores/useMobileLayout';

interface PongProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

export const Pong: React.FC<PongProps> = ({ onComplete, onExit }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const { theme, isMobile, isTouch, getSfxVolume } = useMinigameSettings();
  const { config } = useMobileLayout();

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return;

    const colors = getPhaserThemeColors(theme);
    const { width, height } = getGameDimensions(isMobile);

    class PongScene extends Phaser.Scene {
      private playerPaddle!: Phaser.GameObjects.Rectangle;
      private aiPaddle!: Phaser.GameObjects.Rectangle;
      private ball!: Phaser.GameObjects.Arc;
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private playerScore = 0;
      private aiScore = 0;
      private scoreText!: Phaser.GameObjects.Text;
      private ballVelocity = { x: width * 0.25, y: height * 0.33 };
      private winScore = 11;
      private targetPaddleY = height * 0.5;
      private touchControlsText?: Phaser.GameObjects.Text;

      constructor() {
        super({ key: 'PongScene' });
      }

      create() {
        // Court lines
        const graphics = this.add.graphics();
        graphics.lineStyle(2, colors.border, 1);
        graphics.beginPath();
        for (let y = 0; y < height; y += height * 0.05) {
          graphics.moveTo(width * 0.5, y);
          graphics.lineTo(width * 0.5, y + height * 0.025);
        }
        graphics.strokePath();

        // Player paddle (right)
        this.playerPaddle = this.add.rectangle(width * 0.9625, height * 0.5, width * 0.01875, height * 0.133, colors.primary);
        this.physics.add.existing(this.playerPaddle);
        const playerBody = this.playerPaddle.body as Phaser.Physics.Arcade.Body;
        playerBody.setImmovable(true);
        playerBody.setCollideWorldBounds(true);

        // AI paddle (left)
        this.aiPaddle = this.add.rectangle(width * 0.0375, height * 0.5, width * 0.01875, height * 0.133, colors.danger);
        this.physics.add.existing(this.aiPaddle);
        const aiBody = this.aiPaddle.body as Phaser.Physics.Arcade.Body;
        aiBody.setImmovable(true);
        aiBody.setCollideWorldBounds(true);

        // Ball
        this.ball = this.add.circle(width * 0.5, height * 0.5, width * 0.01, colors.text);
        this.physics.add.existing(this.ball);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        ballBody.setCircle(width * 0.01);
        ballBody.setBounce(1, 1);
        ballBody.setCollideWorldBounds(true);
        ballBody.setVelocity(this.ballVelocity.x, this.ballVelocity.y);

        // Input - keyboard
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Input - touch/mouse
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          this.targetPaddleY = pointer.y;
        });

        // Touch controls hint
        if (isTouch) {
          this.touchControlsText = this.add.text(width * 0.5, height * 0.967, 'Touch to move paddle', {
            fontSize: `${Math.floor(height * 0.023)}px`,
            color: '#888888'
          }).setOrigin(0.5);
        }

        // Collisions
        this.physics.add.collider(this.ball, this.playerPaddle, this.paddleHit as any, undefined, this);
        this.physics.add.collider(this.ball, this.aiPaddle, this.paddleHit as any, undefined, this);

        // Score text
        this.scoreText = this.add.text(width * 0.5, height * 0.067, '0 - 0', {
          fontSize: `${Math.floor(height * 0.08)}px`,
          color: `#${colors.text.toString(16).padStart(6, '0')}`
        }).setOrigin(0.5);
      }

      update() {
        // Player paddle movement
        const playerBody = this.playerPaddle.body as Phaser.Physics.Arcade.Body;
        
        // Keyboard controls
        if (this.cursors.up?.isDown) {
          playerBody.setVelocityY(-height * 0.667);
        } else if (this.cursors.down?.isDown) {
          playerBody.setVelocityY(height * 0.667);
        } else {
          // Touch/mouse controls - smooth movement to target
          const diff = this.targetPaddleY - this.playerPaddle.y;
          if (Math.abs(diff) > 5) {
            playerBody.setVelocityY(diff * 8);
          } else {
            playerBody.setVelocityY(0);
          }
        }

        // AI paddle movement (follows ball with some delay)
        const aiBody = this.aiPaddle.body as Phaser.Physics.Arcade.Body;
        const diff = this.ball.y - this.aiPaddle.y;
        
        if (Math.abs(diff) > 10) {
          const aiSpeed = height * 0.417;
          aiBody.setVelocityY(diff > 0 ? aiSpeed : -aiSpeed);
        } else {
          aiBody.setVelocityY(0);
        }

        // Check for scoring
        if (this.ball.x < 0) {
          this.playerScored();
        } else if (this.ball.x > width) {
          this.aiScored();
        }
      }

      private paddleHit(ball: Phaser.GameObjects.GameObject, paddle: Phaser.GameObjects.GameObject) {
        const ballBody = ball.body as Phaser.Physics.Arcade.Body;
        
        // Add some spin based on where the ball hits the paddle
        const diff = ball.y - paddle.y;
        ballBody.setVelocityY(ballBody.velocity.y + diff * 5);
        
        // Increase ball speed slightly
        const speedIncrease = 1.05;
        ballBody.setVelocity(
          ballBody.velocity.x * speedIncrease,
          ballBody.velocity.y * speedIncrease
        );
      }

      private playerScored() {
        this.playerScore += 1;
        setPlayerScore(this.playerScore);
        this.updateScore();
        this.resetBall(-1);
      }

      private aiScored() {
        this.aiScore += 1;
        setAiScore(this.aiScore);
        this.updateScore();
        this.resetBall(1);
      }

      private updateScore() {
        this.scoreText.setText(`${this.aiScore} - ${this.playerScore}`);
        
        // Check for game over
        if (this.playerScore >= this.winScore || this.aiScore >= this.winScore) {
          this.gameOver();
        }
      }

      private resetBall(direction: number) {
        this.ball.setPosition(width * 0.5, height * 0.5);
        const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
        
        const angle = Phaser.Math.FloatBetween(-0.3, 0.3);
        const speed = height * 0.333;
        ballBody.setVelocity(
          Math.cos(angle) * speed * direction,
          Math.sin(angle) * speed
        );
      }

      private gameOver() {
        // Calculate final score (points won)
        setFinalScore(this.playerScore * 10);
        setGameState('finished');
        this.scene.pause();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width,
      height,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scene: PongScene,
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
    setPlayerScore(0);
    setAiScore(0);
  };

  const handleRestart = () => {
    setGameState('ready');
    setPlayerScore(0);
    setAiScore(0);
    setFinalScore(0);
  };

  const didPlayerWin = playerScore > aiScore;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div ref={gameRef} className={isMobile ? "fixed inset-0" : "relative"} />

      {/* Start Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-green-400 rounded-lg p-8">
            <h2 className="text-4xl font-bold text-green-400 mb-4">Pong</h2>
            <p className="text-gray-300 mb-6">
              Classic arcade pong! First to 11 points wins. Use arrow keys to move your paddle (right side).
            </p>
            <div className="text-sm text-gray-400 mb-4">
              <div>↑ ↓ : Move Paddle</div>
              <div>First to 11 wins</div>
            </div>
            <button
              onClick={handleStart}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Finish Screen */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-md bg-gray-900 border-2 border-green-400 rounded-lg p-8">
            {didPlayerWin ? (
              <>
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-green-400 mb-2">You Win!</h2>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-3xl font-bold text-red-400 mb-2">You Lost!</h2>
              </>
            )}
            <div className="text-4xl font-bold text-white mb-4">
              {aiScore} - {playerScore}
            </div>
            <div className="text-lg text-gray-300 mb-6">
              {didPlayerWin ? `Reward: ${finalScore}₡` : 'Better luck next time!'}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              {didPlayerWin && (
                <button
                  onClick={() => onComplete(finalScore)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Collect Reward
                </button>
              )}
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
