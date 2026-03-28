import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ResourceChipOptions {
  width: number;
  label: string;
  value: string;
}

export function createResourceChip(scene: Phaser.Scene, options: ResourceChipOptions): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(0x08120d, 0.72);
  bg.lineStyle(1, 0x294d3c, 1);
  bg.fillRoundedRect(0, 0, options.width, 32, 16);
  bg.strokeRoundedRect(0, 0, options.width, 32, 16);

  const iconBg = scene.add.circle(16, 16, 11, 0xd4af37, 0.18).setStrokeStyle(1, 0x8c6b22, 0.95);
  const iconText = scene.add.text(16, 16, options.label.slice(0, 1).toUpperCase(), {
    color: '#f3e5ab',
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '11px',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  const valueText = scene.add.text(32, 8, options.value, {
    color: '#f3e5ab',
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '13px',
    fontStyle: 'bold',
    wordWrap: { width: options.width - 40 }
  });

  const root = scene.add.container(0, 0, [bg, iconBg, iconText, valueText]);
  root.setData('valueText', valueText);
  root.setData('label', options.label);
  return root;
}
