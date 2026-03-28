import Phaser from 'phaser';

import { drawInsetPanel } from '@/game/ui/SceneFrame';
import { createTextButton } from '@/game/ui/TextButton';
import { menuPalette } from '@/game/ui/theme';

export interface CultivationPanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
}

export interface CultivationPanelContent {
  title: string;
  summaryLines: string[];
  techniqueLines: string[];
}

export class CultivationPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly techniqueText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    buttons: CultivationPanelButton[]
  ) {
    const { width, height } = scene.scale;
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x050607, 0.65).setInteractive();
    const panel = drawInsetPanel(scene, {
      x: 150,
      y: 72,
      width: width - 300,
      height: height - 144,
      fill: menuPalette.panel,
      alpha: 0.86
    });

    const titleText = scene.add.text(184, 102, 'Tu hanh', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '32px'
    });

    const leftHeader = scene.add.text(186, 138, 'Tong quan', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    const rightHeader = scene.add.text(666, 138, 'Cong phap', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.summaryText = scene.add.text(186, 156, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: { width: 420 }
    });

    this.techniqueText = scene.add.text(666, 156, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      lineSpacing: 6,
      wordWrap: { width: 410 }
    });

    const buttonNodes = buttons.map((button, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      return createTextButton(scene, {
        x: 342 + column * 330,
        y: 492 + row * 60,
        width: 260,
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      });
    });

    this.root = scene.add.container(0, 0, [
      veil,
      panel,
      titleText,
      leftHeader,
      rightHeader,
      this.summaryText,
      this.techniqueText,
      ...buttonNodes
    ]);

    this.root.setDepth(1100);
    this.root.setVisible(false);
  }

  show(content: CultivationPanelContent): void {
    this.summaryText.setText(content.summaryLines.join('\n'));
    this.techniqueText.setText(content.techniqueLines.join('\n'));
    this.root.setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  destroy(): void {
    this.root.destroy(true);
  }
}