import Phaser from 'phaser';

import { drawInsetPanel } from '@/game/ui/SceneFrame';
import { createTextButton } from '@/game/ui/TextButton';
import { menuPalette } from '@/game/ui/theme';

export interface DiplomacyPanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
}

export interface DiplomacyPanelContent {
  title: string;
  summaryLines: string[];
  detailLines: string[];
}

export class DiplomacyPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    buttons: DiplomacyPanelButton[]
  ) {
    const { width, height } = scene.scale;
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x040607, 0.8).setInteractive();
    const panel = drawInsetPanel(scene, {
      x: 140,
      y: 82,
      width: width - 280,
      height: height - 164,
      fill: menuPalette.panel,
      alpha: 0.86
    });

    const titleText = scene.add.text(174, 114, 'Ngoai giao', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '31px'
    });

    const leftHeader = scene.add.text(178, 150, 'Tong quan phe phai', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    const rightHeader = scene.add.text(670, 150, 'Chi tiet va thu tin', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.summaryText = scene.add.text(178, 170, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: { width: 420 }
    });

    this.detailText = scene.add.text(670, 170, '', {
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
        x: 344 + column * 330,
        y: 500 + row * 60,
        width: 260,
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      });
    });

    this.root = scene.add.container(0, 0, [veil, panel, titleText, leftHeader, rightHeader, this.summaryText, this.detailText, ...buttonNodes]);
    this.root.setDepth(1080);
    this.root.setVisible(false);
  }

  show(content: DiplomacyPanelContent): void {
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