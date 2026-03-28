import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface InventorySlotOptions {
  size: number;
  label: string;
  count?: string;
}

export function createInventorySlot(scene: Phaser.Scene, options: InventorySlotOptions): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(0x08120d, 0.6);
  bg.lineStyle(1, 0x294d3c, 1);
  bg.fillRoundedRect(0, 0, options.size, options.size, 10);
  bg.strokeRoundedRect(0, 0, options.size, options.size, 10);

  const label = scene.add.text(options.size / 2, options.size / 2 - 6, options.label, {
    color: menuPalette.textMuted,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '11px',
    align: 'center',
    wordWrap: { width: options.size - 12 }
  }).setOrigin(0.5);

  const count = scene.add.text(options.size - 6, options.size - 6, options.count ?? '', {
    color: menuPalette.textStrong,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    backgroundColor: '#071014'
  }).setOrigin(1);

  const root = scene.add.container(0, 0, [bg, label, count]);
  root.setData('labelText', label);
  root.setData('countText', count);
  return root;
}
