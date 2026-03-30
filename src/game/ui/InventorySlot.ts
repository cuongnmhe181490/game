import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface InventorySlotOptions {
  size: number;
  label: string;
  count?: string;
  iconKey?: string;
}

export class InventorySlot extends Phaser.GameObjects.Container {
  readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly iconFallback: Phaser.GameObjects.Arc;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private sizeValue: number;

  constructor(scene: Phaser.Scene, options: InventorySlotOptions) {
    const bg = scene.add.graphics();
    const iconFallback = scene.add.circle(0, 0, 14, 0xd4af37, 0.12).setStrokeStyle(1, 0x8c6b22, 0.8);
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const labelText = scene.add.text(0, 0, options.label, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px',
      align: 'center',
      wordWrap: { width: options.size - 12 }
    }).setOrigin(0.5);
    const countText = scene.add.text(0, 0, options.count ?? '', {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      backgroundColor: '#071014'
    }).setOrigin(1);
    const hit = scene.add.rectangle(0, 0, options.size, options.size, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, 0, 0, [bg, iconFallback, iconImage, labelText, countText, hit]);
    this.root = this;
    this.bg = bg;
    this.hit = hit;
    this.iconImage = iconImage;
    this.iconFallback = iconFallback;
    this.labelText = labelText;
    this.countText = countText;
    this.sizeValue = options.size;

    this.bindHover();
    this.resize(options.size);
    this.setLabel(options.label);
    this.setCount(options.count ?? '');
    this.setIcon(options.iconKey);
    this.setData('labelText', this.labelText);
    this.setData('countText', this.countText);
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  setCount(count: string | number): this {
    this.countText.setText(String(count ?? ''));
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true);
      this.iconImage.setDisplaySize(this.sizeValue * 0.32, this.sizeValue * 0.32);
      this.iconFallback.setVisible(false);
      return this;
    }

    this.iconImage.setVisible(false);
    this.iconFallback.setVisible(true);
    return this;
  }

  resize(size: number): this {
    this.sizeValue = size;
    this.redraw();
    this.layout();
    return this;
  }

  private bindHover(): void {
    this.hit.on('pointerover', () => this.setAlpha(1));
    this.hit.on('pointerout', () => this.setAlpha(0.96));
  }

  private redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(0x08120d, 0.6);
    this.bg.lineStyle(1, 0x294d3c, 1);
    this.bg.fillRoundedRect(0, 0, this.sizeValue, this.sizeValue, 10);
    this.bg.strokeRoundedRect(0, 0, this.sizeValue, this.sizeValue, 10);
    this.hit.setSize(this.sizeValue, this.sizeValue);
  }

  private layout(): void {
    const centerX = this.sizeValue / 2;
    this.iconFallback.setPosition(centerX, this.sizeValue * 0.28);
    this.iconImage.setPosition(centerX, this.sizeValue * 0.28);
    this.labelText
      .setPosition(centerX, this.sizeValue * 0.62)
      .setWordWrapWidth(this.sizeValue - 12);
    this.countText.setPosition(this.sizeValue - 6, this.sizeValue - 6);
  }
}

export function createInventorySlot(scene: Phaser.Scene, options: InventorySlotOptions): InventorySlot {
  return new InventorySlot(scene, options);
}
