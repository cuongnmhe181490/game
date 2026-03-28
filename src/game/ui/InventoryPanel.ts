import Phaser from 'phaser';

import { drawInsetPanel } from '@/game/ui/SceneFrame';
import { createTextButton } from '@/game/ui/TextButton';
import { menuPalette } from '@/game/ui/theme';

export interface InventoryPanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
}

export interface InventoryPanelContent {
  title: string;
  summaryLines: string[];
  detailLines: string[];
}

export class InventoryPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, buttons: InventoryPanelButton[]) {
    const { width, height } = scene.scale;
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x050607, 0.8).setInteractive();
    const panel = drawInsetPanel(scene, {
      x: 150,
      y: 84,
      width: width - 300,
      height: height - 168,
      fill: menuPalette.panel,
      alpha: 0.86
    });

    const titleText = scene.add.text(182, 116, 'Tui do', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '31px'
    });

    const leftHeader = scene.add.text(186, 156, 'Vat pham dang xem', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    const rightHeader = scene.add.text(658, 156, 'Mo ta va hieu ung', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.summaryText = scene.add.text(186, 174, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: { width: 410 }
    });

    this.detailText = scene.add.text(658, 174, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      lineSpacing: 6,
      wordWrap: { width: 430 }
    });

    const buttonNodes = buttons.map((button, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      return createTextButton(scene, {
        x: 340 + column * 328,
        y: 500 + row * 60,
        width: 258,
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      });
    });

    this.root = scene.add.container(0, 0, [veil, panel, titleText, leftHeader, rightHeader, this.summaryText, this.detailText, ...buttonNodes]);
    this.root.setDepth(1090);
    this.root.setVisible(false);
  }

  show(content: InventoryPanelContent): void {
    this.summaryText.setText(content.summaryLines.join('\n'));
    this.detailText.setText(content.detailLines.join('\n'));
    this.root.setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}