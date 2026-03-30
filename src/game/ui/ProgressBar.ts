import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ProgressBarOptions {
  width: number;
  value: number;
  max: number;
  label?: string;
  iconKey?: string;
  height?: number;
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private widthValue: number;
  private heightValue: number;
  private value = 0;
  private max = 1;
  private displayedValue = 0;
  private progressTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, options: ProgressBarOptions) {
    const width = options.width;
    const height = options.height ?? 22;
    const bg = scene.textures.exists('ui_progress_bar_bg')
      ? scene.add.image(0, 0, 'ui_progress_bar_bg').setOrigin(0)
      : scene.add.graphics();
    const glow = scene.add.graphics();
    const fill = scene.add.graphics();
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const labelText = scene.add.text(0, -20, options.label ?? '', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px'
    });
    const valueText = scene.add.text(width, -20, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
    const hit = scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, 0, 0, [bg, glow, fill, iconImage, labelText, valueText, hit]);
    this.bg = bg;
    this.glow = glow;
    this.fill = fill;
    this.labelText = labelText;
    this.valueText = valueText;
    this.iconImage = iconImage;
    this.hit = hit;
    this.widthValue = width;
    this.heightValue = height;

    this.bindHover();
    this.resize(width, height);
    this.setLabel(options.label ?? '');
    this.setIcon(options.iconKey);
    this.setProgress(options.value, options.max);
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true).setDisplaySize(14, 14).setPosition(7, -10);
      this.labelText.setPosition(18, -20).setWordWrapWidth(this.widthValue - 18);
    } else {
      this.iconImage.setVisible(false);
      this.labelText.setPosition(0, -20).setWordWrapWidth(this.widthValue);
    }
    return this;
  }

  setProgress(value: number, max = this.max): this {
    this.value = Math.max(0, value);
    this.max = Math.max(1, max);
    this.valueText.setText(`${Math.min(this.value, this.max)}/${this.max}`);
    this.progressTween?.stop();
    this.progressTween = this.scene.tweens.addCounter({
      from: this.displayedValue,
      to: this.value,
      duration: 220,
      ease: 'Quad.Out',
      onUpdate: (tween) => {
        this.displayedValue = tween.getValue() ?? this.value;
        this.redrawFill();
      }
    });
    return this;
  }

  resize(width: number, height = this.heightValue): this {
    this.widthValue = width;
    this.heightValue = height;
    this.redrawBase();
    this.redrawFill();
    this.valueText.setPosition(width, -20);
    this.hit.setSize(width, height);
    return this;
  }

  private bindHover(): void {
    this.hit.on('pointerover', () => this.setAlpha(1));
    this.hit.on('pointerout', () => this.setAlpha(0.96));
  }

  private redrawBase(): void {
    if (this.bg instanceof Phaser.GameObjects.Image) {
      this.bg.setDisplaySize(this.widthValue, this.heightValue);
      return;
    }

    this.bg.clear();
    this.bg.fillStyle(0x08120d, 0.8);
    this.bg.lineStyle(1, 0x294d3c, 1);
    this.bg.fillRoundedRect(0, 0, this.widthValue, this.heightValue, this.heightValue / 2);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, this.heightValue, this.heightValue / 2);
  }

  private redrawFill(): void {
    const ratio = Phaser.Math.Clamp(this.displayedValue / this.max, 0, 1);
    const fillWidth = Math.max(0, (this.widthValue - 4) * ratio);
    this.glow.clear();
    this.glow.fillStyle(0xd4af37, 0.18);
    this.glow.fillRoundedRect(2, 2, fillWidth, this.heightValue - 4, (this.heightValue - 4) / 2);
    this.glow.setAlpha(ratio > 0 ? 1 : 0);
    this.fill.clear();
    this.fill.fillStyle(0xd4af37, 0.95);
    this.fill.fillRoundedRect(2, 2, fillWidth, this.heightValue - 4, (this.heightValue - 4) / 2);
  }
}
