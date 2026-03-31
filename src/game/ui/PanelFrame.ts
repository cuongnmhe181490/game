import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface PanelFrameOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  iconKey?: string;
}

export class PanelFrame extends Phaser.GameObjects.Container {
  readonly root: Phaser.GameObjects.Container;
  readonly content: Phaser.GameObjects.Container;
  readonly titleText: Phaser.GameObjects.Text;
  readonly subtitleText?: Phaser.GameObjects.Text;

  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly iconImage: Phaser.GameObjects.Image;
  private widthValue: number;
  private heightValue: number;

  constructor(scene: Phaser.Scene, options: PanelFrameOptions) {
    const bg = scene.add.graphics();
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const titleText = scene.add.text(0, 0, options.title, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '21px',
      fontStyle: 'bold'
    });
    const subtitleText = options.subtitle
      ? scene.add.text(0, 0, options.subtitle, {
          color: menuPalette.textSoft,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '12px',
          lineSpacing: 2
        })
      : undefined;
    const content = scene.add.container(0, 0);
    const hit = scene.add.rectangle(0, 0, options.width, options.height, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, options.x, options.y, [
      bg,
      hit,
      iconImage,
      titleText,
      ...(subtitleText ? [subtitleText] : []),
      content
    ]);
    this.root = this;

    this.bg = bg;
    this.iconImage = iconImage;
    this.titleText = titleText;
    this.subtitleText = subtitleText;
    this.content = content;
    this.hit = hit;
    this.widthValue = options.width;
    this.heightValue = options.height;

    this.bindHover();
    this.resize(options.width, options.height);
    this.setTitle(options.title);
    this.setSubtitle(options.subtitle);
    this.setIcon(options.iconKey);
  }

  setTitle(title: string): this {
    this.titleText.setText(title);
    this.layout();
    return this;
  }

  setSubtitle(subtitle?: string): this {
    if (this.subtitleText) {
      this.subtitleText.setText(subtitle ?? '');
    }
    this.layout();
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true).setDisplaySize(22, 22);
    } else {
      this.iconImage.setVisible(false);
    }
    this.layout();
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
        alpha: 1,
        duration: 120,
        ease: 'Quad.Out'
      });
    });
    this.hit.on('pointerout', () => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        alpha: 0.98,
        duration: 120,
        ease: 'Quad.Out'
      });
    });
  }

  private redraw(): void {
    this.bg.clear();
    this.bg.fillStyle(0x10261c, 0.72);
    this.bg.lineStyle(1, 0x294d3c, 1);
    this.bg.fillRoundedRect(0, 0, this.widthValue, this.heightValue, 16);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, this.heightValue, 16);
    this.bg.lineStyle(1, 0x8c6b22, 0.55);
    this.bg.strokeRoundedRect(3, 3, this.widthValue - 6, this.heightValue - 6, 14);
    this.bg.fillStyle(0xd4af37, 0.18);
    this.bg.fillRoundedRect(14, 14, this.widthValue - 28, 6, 4);
    this.hit.setSize(this.widthValue, this.heightValue);
  }

  private layout(): void {
    const iconOffset = this.iconImage.visible ? 30 : 0;
    this.iconImage.setPosition(28, 40);
    this.titleText.setPosition(18 + iconOffset, 26).setWordWrapWidth(this.widthValue - 36 - iconOffset);
    this.subtitleText?.setPosition(18, 56).setWordWrapWidth(this.widthValue - 36);
    this.content.setPosition(18, this.subtitleText && this.subtitleText.text ? 92 : 78);
  }
}
