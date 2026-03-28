import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export function drawSceneFrame(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const frame = scene.add.graphics();

  frame.fillStyle(menuPalette.backgroundDeep, 1);
  frame.fillRect(0, 0, width, height);
  frame.fillStyle(menuPalette.backgroundLift, 0.42);
  frame.fillEllipse(width * 0.26, height * 0.18, width * 0.34, height * 0.2);
  frame.fillStyle(menuPalette.accentDeep, 0.1);
  frame.fillEllipse(width * 0.78, height * 0.12, width * 0.28, height * 0.14);

  frame.fillStyle(menuPalette.panel, 0.92);
  frame.fillRoundedRect(40, 40, width - 80, height - 80, 28);
  frame.lineStyle(2, menuPalette.frame, 0.9);
  frame.strokeRoundedRect(40, 40, width - 80, height - 80, 28);
  frame.lineStyle(1, 0xffffff, 0.05);
  frame.strokeRoundedRect(54, 54, width - 108, height - 108, 22);
  frame.lineStyle(1, menuPalette.frameSoft, 0.5);
  frame.strokeRoundedRect(64, 64, width - 128, height - 128, 18);

  return frame;
}

export interface InsetPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: number;
  alpha?: number;
  border?: number;
  borderAlpha?: number;
  accentAlpha?: number;
}

export function drawInsetPanel(scene: Phaser.Scene, options: InsetPanelOptions): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  const radius = options.radius ?? 18;
  const fill = options.fill ?? menuPalette.panelAlt;
  const alpha = options.alpha ?? 0.88;
  const border = options.border ?? menuPalette.frame;
  const borderAlpha = options.borderAlpha ?? 0.65;
  const accentAlpha = options.accentAlpha ?? 0.18;

  panel.fillStyle(fill, alpha);
  panel.fillRoundedRect(options.x, options.y, options.width, options.height, radius);
  panel.lineStyle(1.5, border, borderAlpha);
  panel.strokeRoundedRect(options.x, options.y, options.width, options.height, radius);
  panel.lineStyle(1, 0xffffff, 0.04);
  panel.strokeRoundedRect(options.x + 10, options.y + 10, options.width - 20, options.height - 20, Math.max(8, radius - 6));
  panel.fillStyle(menuPalette.accent, accentAlpha);
  panel.fillRoundedRect(options.x + 12, options.y + 12, options.width - 24, 8, 8);

  return panel;
}
