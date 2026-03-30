import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ItemCardOptions {
  width: number;
  height: number;
  name: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  iconKey?: string;
}

export function formatRarityLabel(rarity: ItemCardOptions['rarity']): string {
  switch (rarity) {
    case 'legendary':
      return 'Truyền kỳ';
    case 'epic':
      return 'Cực phẩm';
    case 'rare':
      return 'Hiếm';
    case 'uncommon':
      return 'Tốt';
    default:
      return 'Thường';
  }
}

const RARITY_STYLES = {
  common: {
    border: 0x52635c,
    accent: 0x8f9a96
  },
  uncommon: {
    border: 0x3f7d6d,
    accent: 0x8ed0b7
  },
  rare: {
    border: 0x8c6b22,
    accent: 0xd4af37
  },
  epic: {
    border: 0x7c3aed,
    accent: 0xc084fc
  },
  legendary: {
    border: 0xf59e0b,
    accent: 0xfcd34d
  }
} as const;

export class ItemCard extends Phaser.GameObjects.Container {
  readonly root: Phaser.GameObjects.Container;

  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly rarityFrame: Phaser.GameObjects.Graphics;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly iconFallback: Phaser.GameObjects.Arc;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly rarityBadge: Phaser.GameObjects.Text;
  private readonly quantityBadge: Phaser.GameObjects.Text;
  private readonly fallbackBadge: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;

  private widthValue: number;
  private heightValue: number;
  private rarityValue: ItemCardOptions['rarity'];

  constructor(scene: Phaser.Scene, options: ItemCardOptions) {
    const bg = scene.add.graphics();
    const glow = scene.add.graphics();
    const rarityFrame = scene.add.graphics();
    const iconFallback = scene.add.circle(0, 0, 18, 0xd4af37, 0.12).setStrokeStyle(1, 0x8c6b22, 0.8);
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const nameText = scene.add.text(0, 0, options.name, {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2,
      wordWrap: { width: options.width - 18 }
    }).setOrigin(0.5, 0);
    const rarityBadge = scene.add.text(0, 0, formatRarityLabel(options.rarity), {
      color: '#f5f0db',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      backgroundColor: '#071014',
      padding: { x: 6, y: 3 }
    }).setOrigin(0, 0);
    const quantityBadge = scene.add.text(0, 0, `x${options.quantity}`, {
      color: '#f5f0db',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      backgroundColor: '#071014',
      padding: { x: 6, y: 3 }
    }).setOrigin(1, 0);
    const fallbackBadge = scene.add.text(0, 0, 'Art tạm', {
      color: '#f5f0db',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      backgroundColor: '#2b1d13',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5, 1).setVisible(false);
    const hit = scene.add.rectangle(0, 0, options.width, options.height, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, 0, 0, [glow, bg, rarityFrame, iconFallback, iconImage, nameText, rarityBadge, quantityBadge, fallbackBadge, hit]);
    scene.add.existing(this);

    this.root = this;
    this.bg = bg;
    this.glow = glow;
    this.rarityFrame = rarityFrame;
    this.iconImage = iconImage;
    this.iconFallback = iconFallback;
    this.nameText = nameText;
    this.rarityBadge = rarityBadge;
    this.quantityBadge = quantityBadge;
    this.fallbackBadge = fallbackBadge;
    this.hit = hit;
    this.widthValue = options.width;
    this.heightValue = options.height;
    this.rarityValue = options.rarity;

    this.bindHover();
    this.resize(options.width, options.height);
    this.setRarity(options.rarity);
    this.setName(options.name);
    this.setQuantity(options.quantity);
    this.setIcon(options.iconKey);
  }

  setName(name: string): this {
    this.nameText.setText(name);
    return this;
  }

  setQuantity(quantity: number): this {
    this.quantityBadge.setText(`x${Math.max(0, Math.trunc(quantity))}`);
    return this;
  }

  setRarity(rarity: ItemCardOptions['rarity']): this {
    this.rarityValue = rarity;
    this.rarityBadge.setText(formatRarityLabel(rarity));
    this.redraw();
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true);
      this.iconImage.setDisplaySize(this.widthValue * 0.34, this.widthValue * 0.34);
      this.iconFallback.setVisible(false);
      this.fallbackBadge.setVisible(false);
      return this;
    }

    this.iconImage.setVisible(false);
    this.iconFallback.setVisible(true);
    this.fallbackBadge.setVisible(true);
    return this;
  }

  resize(width: number, height: number): this {
    this.widthValue = width;
    this.heightValue = height;
    this.redraw();
    this.layout();
    return this;
  }

  private bindHover(): void {
    this.hit.on('pointerover', () => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.018,
        scaleY: 1.018,
        alpha: 1,
        duration: 110,
        ease: 'Quad.Out'
      });
    });
    this.hit.on('pointerout', () => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 110,
        ease: 'Quad.Out'
      });
    });
  }

  private redraw(): void {
    const style = RARITY_STYLES[this.rarityValue];
    const glowAlpha = this.rarityValue === 'legendary' ? 0.28 : this.rarityValue === 'epic' ? 0.22 : 0;
    this.glow.clear();
    if (glowAlpha > 0) {
      this.glow.fillStyle(style.accent, glowAlpha);
      this.glow.fillRoundedRect(-5, -5, this.widthValue + 10, this.heightValue + 10, 20);
    }

    this.bg.clear();
    this.bg.fillStyle(0x0c1815, 0.82);
    this.bg.lineStyle(1, 0x294d3c, 0.9);
    this.bg.fillRoundedRect(0, 0, this.widthValue, this.heightValue, 18);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, this.heightValue, 18);

    this.rarityFrame.clear();
    this.rarityFrame.lineStyle(this.rarityValue === 'common' ? 2 : 3, style.border, 0.98);
    this.rarityFrame.strokeRoundedRect(3, 3, this.widthValue - 6, this.heightValue - 6, 16);
    this.rarityFrame.fillStyle(style.accent, this.rarityValue === 'legendary' ? 0.2 : 0.14);
    this.rarityFrame.fillRoundedRect(12, 12, this.widthValue - 24, 6, 4);

    this.iconFallback
      .setStrokeStyle(1, style.border, 0.95)
      .setFillStyle(style.accent, 0.14);
    this.hit.setSize(this.widthValue, this.heightValue);
  }

  private layout(): void {
    const centerX = this.widthValue / 2;
    this.iconFallback.setPosition(centerX, 52);
    this.iconImage.setPosition(centerX, 52);
    this.rarityBadge.setPosition(10, 10);
    this.nameText
      .setPosition(centerX, 86)
      .setWordWrapWidth(this.widthValue - 18);
    this.quantityBadge.setPosition(this.widthValue - 10, 10);
    this.fallbackBadge.setPosition(centerX, this.heightValue - 10);
  }
}
