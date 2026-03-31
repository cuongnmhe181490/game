import Phaser from 'phaser';

import { createPrimaryButton, createSecondaryButton } from '@/game/ui/ActionButtons';
import { PanelFrame } from '@/game/ui/PanelFrame';
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
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly iconNodes: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, buttons: AlchemyPanelButton[]) {
    const { width, height } = scene.scale;
    const shellWidth = Math.min(500, width - 48);
    const shellHeight = Math.min(820, height - 36);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);

    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x050607, 0.78).setInteractive();

    const shell = scene.add.graphics();
    shell.fillStyle(0x071014, 0.97);
    shell.lineStyle(2, 0x294d3c, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 28);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 28);
    shell.lineStyle(1, 0x8c6b22, 0.45);
    shell.strokeRoundedRect(shellX + 8, shellY + 8, shellWidth - 16, shellHeight - 16, 24);

    this.titleText = scene.add.text(shellX + 28, shellY + 26, 'Luyện đan', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '34px'
    });

    const subtitleText = scene.add.text(shellX + 28, shellY + 66, 'Theo dõi đan phương đang chọn, nguyên liệu và thành phẩm.', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 2,
      wordWrap: { width: shellWidth - 56 }
    });

    const recipeFrame = new PanelFrame(scene, {
      x: shellX + 18,
      y: shellY + 104,
      width: shellWidth - 36,
      height: 220,
      title: 'Đan phương đang xem',
      subtitle: 'Điều kiện, công trình yêu cầu, và khả năng luyện ngay'
    });

    this.iconNodes = Array.from({ length: 4 }).map((_, index) => {
      const node = scene.add.image(0, 0, '').setVisible(false);
      const col = index % 4;
      node.setPosition(shellX + 38 + col * 46, shellY + 156).setDisplaySize(34, 34);
      return node;
    });

    this.summaryText = scene.add.text(shellX + 36, shellY + 196, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: shellWidth - 72 }
    });

    const ingredientFrame = new PanelFrame(scene, {
      x: shellX + 18,
      y: shellY + 344,
      width: shellWidth - 36,
      height: 260,
      title: 'Nguyên liệu và thành phẩm',
      subtitle: 'Đếm nhanh nguyên liệu hiện có và tác dụng của đan dược'
    });

    this.detailText = scene.add.text(shellX + 36, shellY + 424, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: shellWidth - 72 }
    });

    const buttonNodes = buttons.map((button, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const factory = index === 0 ? createPrimaryButton : createSecondaryButton;
      return factory(scene, {
        width: Math.floor((shellWidth - 70) / 2),
        label: button.label,
        detail: button.detail,
        onClick: button.onClick
      }).setPosition(shellX + 28 + column * (Math.floor((shellWidth - 70) / 2) + 14), shellY + 628 + row * 62);
    });

    this.root = scene.add.container(0, 0, [
      veil,
      shell,
      this.titleText,
      subtitleText,
      recipeFrame.root,
      ingredientFrame.root,
      ...this.iconNodes,
      this.summaryText,
      this.detailText,
      ...buttonNodes
    ]);
    this.root.setDepth(1095);
    this.root.setVisible(false);
  }

  show(content: AlchemyPanelContent): void {
    this.titleText.setText(content.title);
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
    this.root.setAlpha(0);
    this.root.setVisible(true);
    this.root.scene.tweens.killTweensOf(this.root);
    this.root.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 160,
      ease: 'Quad.Out'
    });
  }

  hide(): void {
    this.root.setVisible(false);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
