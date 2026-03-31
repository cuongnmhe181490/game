import Phaser from 'phaser';

import { drawSceneFrame } from '@/game/ui/SceneFrame';
import { menuPalette } from '@/game/ui/theme';

export interface EntryShellOptions {
  title: string;
  subtitle: string;
  metaLine?: string;
  iconKey?: string;
}

export class EntryShell {
  readonly shellX: number;
  readonly shellY: number;
  readonly shellWidth: number;
  readonly shellHeight: number;
  readonly contentX: number;
  readonly contentY: number;
  readonly contentWidth: number;
  readonly contentHeight: number;

  constructor(private readonly scene: Phaser.Scene, options: EntryShellOptions) {
    const { width, height } = scene.scale;
    this.shellWidth = Math.min(430, width - 32);
    this.shellHeight = Math.min(844, height - 24);
    this.shellX = Math.floor((width - this.shellWidth) / 2);
    this.shellY = Math.floor((height - this.shellHeight) / 2);
    this.contentX = this.shellX + 16;
    this.contentY = this.shellY + 188;
    this.contentWidth = this.shellWidth - 32;
    this.contentHeight = this.shellHeight - 212;

    scene.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(scene);

    const shell = scene.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(this.shellX, this.shellY, this.shellWidth, this.shellHeight, 32);
    shell.strokeRoundedRect(this.shellX, this.shellY, this.shellWidth, this.shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(this.shellX + 10, this.shellY + 10, this.shellWidth - 20, this.shellHeight - 20, 28);

    if (options.iconKey && scene.textures.exists(options.iconKey)) {
      scene.add.image(this.shellX + this.shellWidth / 2, this.shellY + 54, options.iconKey)
        .setDisplaySize(52, 52)
        .setAlpha(0.92);
    }

    scene.add.text(this.shellX + this.shellWidth / 2, this.shellY + 100, options.title, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '34px'
    }).setOrigin(0.5);

    scene.add.text(this.shellX + this.shellWidth / 2, this.shellY + 136, options.subtitle, {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px'
    }).setOrigin(0.5);

    if (options.metaLine) {
      scene.add.text(this.shellX + this.shellWidth / 2, this.shellY + 160, options.metaLine, {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px'
      }).setOrigin(0.5);
    }
  }
}
