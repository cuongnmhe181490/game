import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ResourceChipOptions {
  width: number;
  label: string;
  value: string;
  iconKey?: string;
  height?: number;
}

export class ResourceChip extends Phaser.GameObjects.Container {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly iconFallback: Phaser.GameObjects.Arc;
  private readonly iconFallbackText: Phaser.GameObjects.Text;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private widthValue: number;
  private readonly heightValue: number;

  constructor(scene: Phaser.Scene, options: ResourceChipOptions) {
    const height = options.height ?? 40;

    const bg = scene.add.graphics();
    const iconFallback = scene.add.circle(0, 0, 11, 0xd4af37, 0.18).setStrokeStyle(1, 0x8c6b22, 0.95);
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const iconFallbackText = scene.add.text(0, 0, options.label.slice(0, 1).toUpperCase(), {
      color: '#f3e5ab',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    const labelText = scene.add.text(0, 0, options.label, {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold'
    });
    const valueText = scene.add.text(0, 0, options.value, {
      color: '#f3e5ab',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });
    const hit = scene.add.rectangle(0, 0, options.width, height, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, 0, 0, [bg, iconFallback, iconImage, iconFallbackText, labelText, valueText, hit]);
    this.root = this;
    this.bg = bg;
    this.hit = hit;
    this.iconFallback = iconFallback;
    this.iconImage = iconImage;
    this.iconFallbackText = iconFallbackText;
    this.labelText = labelText;
    this.valueText = valueText;
    this.widthValue = options.width;
    this.heightValue = height;

    this.bindHover();
    this.resize(options.width);
    this.setLabel(options.label);
    this.setValue(options.value);
    this.setIcon(options.iconKey);
    this.setData('valueText', this.valueText);
    this.setData('labelText', this.labelText);
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    this.iconFallbackText.setText(label.slice(0, 1).toUpperCase() || '?');
    return this;
  }

  setValue(value: string | number): this {
    this.valueText.setText(String(value));
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true);
      this.iconImage.setDisplaySize(18, 18);
      this.iconFallback.setVisible(false);
      this.iconFallbackText.setVisible(false);
      return this;
    }

    this.iconImage.setVisible(false);
    this.iconFallback.setVisible(true);
    this.iconFallbackText.setVisible(true);
    return this;
  }

  resize(width: number): this {
    this.widthValue = width;
    this.redraw();
    this.layout();
    return this;
  }

  private bindHover(): void {
    this.hit.on('pointerover', () => {
      this.setScale(1.01);
      this.setAlpha(1);
    });
    this.hit.on('pointerout', () => {
      this.setScale(1);
      this.setAlpha(0.98);
    });
  }

  private redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(0x08120d, 0.72);
    this.bg.lineStyle(1, 0x294d3c, 1);
    this.bg.fillRoundedRect(0, 0, this.widthValue, this.heightValue, this.heightValue / 2);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, this.heightValue, this.heightValue / 2);
    this.hit.setSize(this.widthValue, this.heightValue);
  }

  private layout(): void {
    const iconCenterY = this.heightValue / 2;
    this.iconFallback.setPosition(18, iconCenterY);
    this.iconFallbackText.setPosition(18, iconCenterY);
    this.iconImage.setPosition(18, iconCenterY);

    this.labelText.setPosition(34, 7).setWordWrapWidth(this.widthValue - 42);
    this.valueText.setPosition(34, 19).setWordWrapWidth(this.widthValue - 42);
  }
}

export function createResourceChip(scene: Phaser.Scene, options: ResourceChipOptions): ResourceChip {
  return new ResourceChip(scene, options);
}
