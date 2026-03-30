import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ResourceBarOptions {
  width: number;
  name: string;
  current: number | string;
  max: number | string;
  iconKey?: string;
  color?: 'gold' | 'spirit' | 'blood';
}

export class ResourceBar extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly iconFallback: Phaser.GameObjects.Arc;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private widthValue: number;
  private currentValue = 0;
  private maxValue = 1;
  private color: 'gold' | 'spirit' | 'blood';

  constructor(scene: Phaser.Scene, options: ResourceBarOptions) {
    const bg = scene.add.graphics();
    const track = scene.add.graphics();
    const fill = scene.add.graphics();
    const iconFallback = scene.add.circle(12, 18, 8, 0x8ba99b, 0.18).setStrokeStyle(1, 0x8ba99b, 0.9);
    const iconImage = scene.add.image(12, 18, '').setVisible(false);
    const nameText = scene.add.text(26, 4, options.name, {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px'
    });
    const valueText = scene.add.text(options.width - 8, 4, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    super(scene, 0, 0, [bg, track, fill, iconFallback, iconImage, nameText, valueText]);
    scene.add.existing(this);
    this.bg = bg;
    this.track = track;
    this.fill = fill;
    this.iconImage = iconImage;
    this.iconFallback = iconFallback;
    this.nameText = nameText;
    this.valueText = valueText;
    this.widthValue = options.width;
    this.color = options.color ?? 'gold';

    this.resize(options.width);
    this.setName(options.name);
    this.setIcon(options.iconKey);
    this.setValue(options.current, options.max);
  }

  setName(name: string): this {
    this.nameText.setText(name);
    return this;
  }

  setValue(current: number | string, max: number | string): this {
    const parsedCurrent = typeof current === 'number' ? current : Number.parseInt(String(current), 10);
    const parsedMax = typeof max === 'number' ? max : Number.parseInt(String(max), 10);
    this.currentValue = Number.isFinite(parsedCurrent) ? Math.max(0, parsedCurrent) : 0;
    this.maxValue = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 1;
    this.valueText.setText(`${current}/${max}`);
    this.redrawFill();
    return this;
  }

  setIcon(assetKey?: string): this {
    if (assetKey && this.scene.textures.exists(assetKey)) {
      this.iconImage.setTexture(assetKey).setVisible(true).setDisplaySize(16, 16);
      this.iconFallback.setVisible(false);
      return this;
    }

    this.iconImage.setVisible(false);
    this.iconFallback.setVisible(true);
    return this;
  }

  resize(width: number): this {
    this.widthValue = width;
    this.bg.clear();
    this.bg.fillStyle(0x10261c, 0.72);
    this.bg.lineStyle(1, 0x294d3c, 1);
    this.bg.fillRoundedRect(0, 0, this.widthValue, 34, 17);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, 34, 17);

    this.track.clear();
    this.track.fillStyle(0x050607, 0.45);
    this.track.fillRoundedRect(26, 20, this.widthValue - 34, 8, 4);

    this.valueText.setPosition(this.widthValue - 8, 4);
    this.redrawFill();
    return this;
  }

  private redrawFill(): void {
    const ratio = Phaser.Math.Clamp(this.currentValue / this.maxValue, 0, 1);
    const colorMap = {
      gold: 0xd4af37,
      spirit: 0x5bc0eb,
      blood: 0xef4444
    } as const;
    this.fill.clear();
    this.fill.fillStyle(colorMap[this.color], 0.95);
    this.fill.fillRoundedRect(26, 20, Math.max(0, (this.widthValue - 34) * ratio), 8, 4);
  }
}
