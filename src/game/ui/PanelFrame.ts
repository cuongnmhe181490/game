import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface PanelFrameOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
}

export class PanelFrame {
  readonly root: Phaser.GameObjects.Container;
  readonly content: Phaser.GameObjects.Container;
  readonly titleText: Phaser.GameObjects.Text;
  readonly subtitleText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: PanelFrameOptions) {
    const bg = scene.add.graphics();
    bg.fillStyle(0x10261c, 0.72);
    bg.lineStyle(1, 0x294d3c, 1);
    bg.fillRoundedRect(0, 0, options.width, options.height, 16);
    bg.strokeRoundedRect(0, 0, options.width, options.height, 16);
    bg.lineStyle(1, 0x8c6b22, 0.55);
    bg.strokeRoundedRect(3, 3, options.width - 6, options.height - 6, 14);
    bg.fillStyle(0xd4af37, 0.18);
    bg.fillRoundedRect(14, 14, options.width - 28, 6, 4);

    this.titleText = scene.add.text(18, 28, options.title, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '22px',
      fontStyle: 'bold',
      wordWrap: { width: options.width - 36 }
    });

    this.subtitleText = options.subtitle
      ? scene.add.text(18, 58, options.subtitle, {
          color: menuPalette.textSoft,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '12px',
          wordWrap: { width: options.width - 36 }
        })
      : undefined;

    this.content = scene.add.container(18, options.subtitle ? 90 : 76);
    this.root = scene.add.container(options.x, options.y, [
      bg,
      this.titleText,
      ...(this.subtitleText ? [this.subtitleText] : []),
      this.content
    ]);
  }
}
