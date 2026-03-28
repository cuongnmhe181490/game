import Phaser from 'phaser';

import { drawInsetPanel } from '@/game/ui/SceneFrame';
import { createTextButton } from '@/game/ui/TextButton';
import { menuPalette } from '@/game/ui/theme';

export interface GovernancePanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
}

export interface GovernancePanelContent {
  title: string;
  summaryLines: string[];
  detailLines: string[];
}

export class GovernancePanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    buttons: GovernancePanelButton[]
  ) {
    const { width, height } = scene.scale;
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x040607, 0.8).setInteractive();
    const panel = drawInsetPanel(scene, {
      x: 130,
      y: 70,
      width: width - 260,
      height: height - 140,
      fill: menuPalette.panel,
      alpha: 0.86
    });

    const titleText = scene.add.text(164, 100, 'Tri mon', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '31px'
    });

    const leftHeader = scene.add.text(168, 142, 'Tong quan tong mon', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    const rightHeader = scene.add.text(664, 142, 'Noi quy va nhan su', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.summaryText = scene.add.text(168, 156, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: { width: 420 }
    });

    this.detailText = scene.add.text(664, 156, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      lineSpacing: 6,
      wordWrap: { width: 450 }
    });

    const buttonNodes = buttons.map((button, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      return createTextButton(scene, {
        x: 338 + column * 336,
        y: 490 + row * 58,
        width: 264,
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      });
    });

    this.root = scene.add.container(0, 0, [veil, panel, titleText, leftHeader, rightHeader, this.summaryText, this.detailText, ...buttonNodes]);
    this.root.setDepth(1080);
    this.root.setVisible(false);
  }

  show(content: GovernancePanelContent): void {
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