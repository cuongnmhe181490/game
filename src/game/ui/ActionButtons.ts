import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ActionButtonOptions {
  width: number;
  label: string;
  detail?: string;
  onClick: () => void;
}

function createActionButton(
  scene: Phaser.Scene,
  options: ActionButtonOptions,
  variant: 'primary' | 'secondary'
): Phaser.GameObjects.Container {
  const height = 52;
  const bg = scene.add.graphics();
  const fill = variant === 'primary' ? 0x8c6b22 : 0x10261c;
  const border = variant === 'primary' ? 0xd4af37 : 0x294d3c;

  bg.fillStyle(fill, variant === 'primary' ? 0.96 : 0.78);
  bg.lineStyle(1, border, 1);
  bg.fillRoundedRect(0, 0, options.width, height, 10);
  bg.strokeRoundedRect(0, 0, options.width, height, 10);

  const hit = scene.add.rectangle(options.width / 2, height / 2, options.width, height, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });

  const label = scene.add.text(16, 9, options.label, {
    color: variant === 'primary' ? '#1a1a1a' : menuPalette.textStrong,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '16px',
    fontStyle: 'bold',
    wordWrap: { width: options.width - 28 }
  });

  const detail = scene.add.text(16, 30, options.detail ?? '', {
    color: variant === 'primary' ? '#2b2516' : menuPalette.textSoft,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '11px',
    wordWrap: { width: options.width - 28 }
  });

  const root = scene.add.container(0, 0, [bg, hit, label, detail]);
  hit.on('pointerdown', () => options.onClick());
  hit.on('pointerover', () => root.setAlpha(0.94));
  hit.on('pointerout', () => root.setAlpha(1));
  return root;
}

export function createPrimaryButton(scene: Phaser.Scene, options: ActionButtonOptions): Phaser.GameObjects.Container {
  return createActionButton(scene, options, 'primary');
}

export function createSecondaryButton(scene: Phaser.Scene, options: ActionButtonOptions): Phaser.GameObjects.Container {
  return createActionButton(scene, options, 'secondary');
}
