import Phaser from 'phaser';

export class MobileSplashScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Image;
  private parrotSprite!: Phaser.GameObjects.Sprite;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private glowEffect!: Phaser.FX.Glow;
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'MobileSplashScene' });
  }

  preload() {
    this.load.image('logo', '/media/Plunderverse_logo.png');
  }

  create() {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor('#000000');

    this.createStarfield();

    this.logo = this.add.image(width / 2, height / 3, 'logo');
    this.logo.setScale(0);
    this.logo.setAlpha(0);

    this.tweens.add({
      targets: this.logo,
      scale: 0.3,
      alpha: 1,
      duration: 1500,
      ease: 'Back.easeOut',
    });

    this.titleText = this.add.text(width / 2, height / 2, 'PLUNDERVERSE', {
      fontSize: '48px',
      color: '#ff6b35',
      fontStyle: 'bold',
      fontFamily: 'Inter, system-ui, sans-serif',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Power2',
    });

    this.subtitleText = this.add.text(width / 2, height / 2 + 50, 'Mobile Commander Interface', {
      fontSize: '16px',
      color: '#00d4ff',
      fontFamily: 'Inter, system-ui, sans-serif',
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setAlpha(0);

    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      duration: 1000,
      delay: 800,
      ease: 'Power2',
    });

    this.createHolographicParrot(width / 2 + 200, height / 2 + 120);

    this.createStartButton();

    this.createAmbientParticles();

    this.input.once('pointerdown', () => {
      this.startGame();
    });

    this.time.delayedCall(800, () => {
      this.cameras.main.flash(200, 0, 212, 255, false);
    });
  }

  private createStarfield() {
    const { width, height } = this.cameras.main;
    const stars: Phaser.GameObjects.Graphics[] = [];
    
    for (let i = 0; i < 100; i++) {
      const star = this.add.graphics();
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      
      star.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      star.fillCircle(x, y, size);
      
      stars.push(star);
      
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.2, 1),
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createHolographicParrot(x: number, y: number) {
    const parrotGraphics = this.add.graphics();

    parrotGraphics.fillStyle(0x00ff88, 0.8);
    parrotGraphics.fillCircle(0, 0, 30);
    
    parrotGraphics.fillStyle(0x00ff88, 0.6);
    parrotGraphics.fillCircle(20, -10, 10);
    
    parrotGraphics.fillStyle(0xffd700, 0.7);
    parrotGraphics.fillRect(-15, 20, 10, 30);
    parrotGraphics.fillRect(5, 20, 10, 30);
    
    parrotGraphics.fillCircle(-20, 45, 10);
    parrotGraphics.fillCircle(20, 45, 10);

    const renderTexture = this.add.renderTexture(0, 0, 80, 100);
    renderTexture.draw(parrotGraphics, 40, 40);
    parrotGraphics.destroy();

    this.parrotSprite = this.add.sprite(x, y, renderTexture.texture.key);
    this.parrotSprite.setAlpha(0);
    this.parrotSprite.setScale(0.5);

    this.tweens.add({
      targets: this.parrotSprite,
      alpha: 0.8,
      duration: 1500,
      delay: 1200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.parrotSprite,
      y: y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.parrotSprite,
      alpha: { from: 0.8, to: 0.3 },
      duration: 500,
      delay: 1200,
      repeat: -1,
      yoyo: true,
    });
  }

  private createStartButton() {
    const { width, height } = this.cameras.main;

    const buttonBg = this.add.rectangle(0, 0, 200, 50, 0xff6b35, 0.9);
    buttonBg.setStrokeStyle(2, 0x00d4ff);

    const buttonText = this.add.text(0, 0, 'TAP TO START', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Inter, system-ui, sans-serif',
    });
    buttonText.setOrigin(0.5);

    this.startButton = this.add.container(width / 2, height - 100, [buttonBg, buttonText]);
    this.startButton.setSize(200, 50);
    this.startButton.setInteractive();
    this.startButton.setAlpha(0);

    this.startButton.on('pointerdown', () => {
      this.startGame();
    });

    this.tweens.add({
      targets: this.startButton,
      alpha: 1,
      duration: 1000,
      delay: 1500,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.startButton,
      scale: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createAmbientParticles() {
    const { width, height } = this.cameras.main;

    const particles = this.add.particles(0, 0, 'logo', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.02, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 3000,
      frequency: 200,
      tint: [0x00d4ff, 0xff6b35, 0x00ff88],
    });
  }

  protected startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainGameScene');
    });
  }
}
