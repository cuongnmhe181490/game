import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface NavBarItem {
  id: string;
  label: string;
  onClick: () => void;
}

export class NavBar {
  private readonly root: Phaser.GameObjects.Container;
  private readonly items: Array<{ id: string; label: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Arc }> = [];

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
      const icon = scene.add.circle(itemX, 24, 10, 0x8ba99b, 0.18).setStrokeStyle(1, 0x8ba99b, 0.9);
      const label = scene.add.text(itemX, 46, item.label, {
        color: menuPalette.textSoft,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);

      hit.on('pointerdown', item.onClick);

      this.items.push({ id: item.id, label, icon });
      nodes.push(hit, icon, label);
    });

    this.root = scene.add.container(x, y, nodes);
  }

  setActive(id: string): void {
    this.items.forEach((item) => {
      const active = item.id === id;
      item.label.setColor(active ? '#f3e5ab' : menuPalette.textSoft);
      item.icon.setFillStyle(active ? 0xd4af37 : 0x8ba99b, active ? 0.28 : 0.18);
      item.icon.setStrokeStyle(1, active ? 0xd4af37 : 0x8ba99b, 1);
    });
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
