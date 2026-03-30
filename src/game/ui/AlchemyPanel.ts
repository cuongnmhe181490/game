import Phaser from 'phaser';

import { drawInsetPanel } from '@/game/ui/SceneFrame';
import { createTextButton } from '@/game/ui/TextButton';
import { menuPalette } from '@/game/ui/theme';

export interface AlchemyPanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
}

export interface AlchemyPanelContent {
  title: string;
  summaryLines: string[];
  detailLines: string[];
  iconKeys?: Array<string | undefined>;
}

export class AlchemyPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly iconNodes: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, buttons: AlchemyPanelButton[]) {
    const { width, height } = scene.scale;
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x050607, 0.8).setInteractive();
    const panel = drawInsetPanel(scene, {
      x: 144,
      y: 86,
      width: width - 288,
      height: height - 172,
      fill: menuPalette.panel,
      alpha: 0.86
    });

    const titleText = scene.add.text(178, 118, 'Luyen dan', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '31px'
    });

    const leftHeader = scene.add.text(182, 158, 'Dan phuong dang xem', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    const rightHeader = scene.add.text(664, 158, 'Nguyen lieu va thanh pham', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.summaryText = scene.add.text(182, 176, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 6,
      wordWrap: { width: 420 }
    });

    this.detailText = scene.add.text(664, 176, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      lineSpacing: 6,
      wordWrap: { width: 418 }
    });

    this.iconNodes = Array.from({ length: 4 }).map((_, index) => {
      const node = scene.add.image(0, 0, '').setVisible(false);
      node.setPosition(182 + index * 48, 150).setDisplaySize(34, 34);
      return node;
    });

    const buttonNodes = buttons.map((button, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      return createTextButton(scene, {
        x: 342 + column * 330,
        y: 500 + row * 60,
        width: 260,
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      });
    });

    this.root = scene.add.container(0, 0, [veil, panel, titleText, leftHeader, rightHeader, this.summaryText, this.detailText, ...this.iconNodes, ...buttonNodes]);
    this.root.setDepth(1095);
    this.root.setVisible(false);
  }

  show(content: AlchemyPanelContent): void {
    this.summaryText.setText(content.summaryLines.join('\n'));
    this.detailText.setText(content.detailLines.join('\n'));
    this.iconNodes.forEach((node, index) => {
      const iconKey = content.iconKeys?.[index];
      if (iconKey && this.root.scene.textures.exists(iconKey)) {
        node.setTexture(iconKey).setVisible(true);
      } else {
        node.setVisible(false);
      }
    });
    this.root.setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
