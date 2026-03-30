import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface NavBarItem {
  id: string;
  label: string;
  iconKey?: string;
  badge?: number;
  onClick: () => void;
}

export class NavBar {
  private readonly root: Phaser.GameObjects.Container;
  private readonly items: Array<{
    id: string;
    chip: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    iconFallback: Phaser.GameObjects.Arc;
    iconImage: Phaser.GameObjects.Image;
    badge?: Phaser.GameObjects.Text;
  }> = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, items: NavBarItem[]) {
    const bg = scene.add.graphics();
    bg.fillStyle(0x071014, 0.96);
    bg.lineStyle(1, 0x294d3c, 1);
    bg.fillRoundedRect(0, 0, width, 76, 18);
    bg.strokeRoundedRect(0, 0, width, 76, 18);

    const nodes: Phaser.GameObjects.GameObject[] = [bg];
    const gap = width / items.length;

    items.forEach((item, index) => {
      const itemX = gap * index + gap / 2;
      const hit = scene.add.rectangle(itemX, 38, gap, 76, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      const chip = scene.add.graphics();
      chip.fillStyle(0xd4af37, 0.0);
      chip.lineStyle(1, 0xd4af37, 0.0);
      chip.fillRoundedRect(itemX - 34, 6, 68, 56, 16);
      chip.strokeRoundedRect(itemX - 34, 6, 68, 56, 16);
      const iconFallback = scene.add.circle(itemX, 24, 10, 0x8ba99b, 0.18).setStrokeStyle(1, 0x8ba99b, 0.9);
      const iconImage = scene.add.image(itemX, 24, '').setVisible(false);
      if (item.iconKey && scene.textures.exists(item.iconKey)) {
        iconImage.setTexture(item.iconKey).setDisplaySize(18, 18).setVisible(true);
        iconFallback.setVisible(false);
      }
      const label = scene.add.text(itemX, 46, item.label, {
        color: menuPalette.textSoft,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);
      const badge = typeof item.badge === 'number' && item.badge > 0
        ? scene.add.text(itemX + 18, 12, item.badge > 9 ? '9+' : String(item.badge), {
            color: '#f5f0db',
            fontFamily: '"Segoe UI", Tahoma, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            backgroundColor: '#8c6b22',
            padding: { x: 5, y: 2 }
          }).setOrigin(0.5)
        : undefined;

      hit.on('pointerdown', item.onClick);
      hit.on('pointerover', () => label.setAlpha(1));
      hit.on('pointerout', () => label.setAlpha(0.92));

      this.items.push({ id: item.id, chip, label, iconFallback, iconImage, badge });
      nodes.push(chip, hit, iconFallback, iconImage, label);
      if (badge) {
        nodes.push(badge);
      }
    });

    this.root = scene.add.container(x, y, nodes);
  }

  setActive(id: string): void {
    this.items.forEach((item) => {
      const active = item.id === id;
      item.label.setColor(active ? '#f3e5ab' : menuPalette.textSoft);
      item.chip.clear();
      item.chip.fillStyle(0xd4af37, active ? 0.12 : 0);
      item.chip.lineStyle(1, 0xd4af37, active ? 0.22 : 0);
      const x = item.label.x;
      item.chip.fillRoundedRect(x - 34, 6, 68, 56, 16);
      item.chip.strokeRoundedRect(x - 34, 6, 68, 56, 16);
      item.iconFallback.setFillStyle(active ? 0xd4af37 : 0x8ba99b, active ? 0.28 : 0.18);
      item.iconFallback.setStrokeStyle(1, active ? 0xd4af37 : 0x8ba99b, 1);
      item.iconImage.setTint(active ? 0xf3e5ab : 0x8ba99b);
    });
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
