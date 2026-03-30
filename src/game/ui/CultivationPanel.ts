import Phaser from 'phaser';

import { Icons } from '@/game/config/assets';
import { createPrimaryButton, createSecondaryButton } from '@/game/ui/ActionButtons';
import { PanelFrame } from '@/game/ui/PanelFrame';
import { ProgressBar } from '@/game/ui/ProgressBar';
import { menuPalette } from '@/game/ui/theme';

export interface CultivationPanelButton {
  label: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface CultivationPanelContent {
  title: string;
  summaryLines: string[];
  techniqueLines: string[];
}

interface ParsedCultivationContent {
  realm: string;
  progressValue: number;
  progressMax: number;
  breakthroughReady: boolean;
  note: string;
  realmIconKey: string;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export class CultivationPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly summaryText: Phaser.GameObjects.Text;
  private readonly techniqueText: Phaser.GameObjects.Text;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly realmText: Phaser.GameObjects.Text;
  private readonly noteText: Phaser.GameObjects.Text;
  private readonly emblem: Phaser.GameObjects.Image;
  private readonly progressBar: ProgressBar;

  constructor(
    private readonly scene: Phaser.Scene,
    buttons: CultivationPanelButton[]
  ) {
    const { width, height } = scene.scale;
    const shellWidth = Math.min(500, width - 48);
    const shellHeight = Math.min(820, height - 36);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);

    const veil = scene.add.rectangle(width / 2, height / 2, width, height, 0x050607, 0.74).setInteractive();

    const shell = scene.add.graphics();
    shell.fillStyle(0x071014, 0.97);
    shell.lineStyle(2, 0x294d3c, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 28);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 28);
    shell.lineStyle(1, 0x8c6b22, 0.45);
    shell.strokeRoundedRect(shellX + 8, shellY + 8, shellWidth - 16, shellHeight - 16, 24);

    this.titleText = scene.add.text(shellX + 28, shellY + 26, 'Tu luyện', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '34px'
    });

    const subtitleText = scene.add.text(shellX + 28, shellY + 66, 'Theo dõi cảnh giới, tiến độ đột phá và công pháp đang dùng.', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 2,
      wordWrap: { width: shellWidth - 56 }
    });

    const heroFrame = new PanelFrame(scene, {
      x: shellX + 18,
      y: shellY + 104,
      width: shellWidth - 36,
      height: 260,
      title: 'Cảnh giới hiện tại',
      subtitle: 'Nhịp thổ nạp, nền căn và trạng thái đột phá',
      iconKey: Icons.status.qiRefining
    });

    const auraRing = scene.add.circle(shellX + shellWidth / 2, shellY + 220, 62, 0x0b1812, 0.88).setStrokeStyle(2, 0x8c6b22, 0.9);
    const auraDash = scene.add.circle(shellX + shellWidth / 2, shellY + 220, 74).setStrokeStyle(1, 0xd4af37, 0.35);
    auraDash.setClosePath(false);
    this.emblem = scene.add.image(shellX + shellWidth / 2, shellY + 220, Icons.status.qiRefining).setDisplaySize(76, 76);

    this.realmText = scene.add.text(shellX + 28, shellY + 288, 'Phàm Thể', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '24px'
    });

    this.progressBar = new ProgressBar(scene, {
      width: shellWidth - 72,
      value: 0,
      max: 100,
      label: 'Tiến độ cảnh giới',
      iconKey: Icons.status.qiRefining
    }).setPosition(shellX + 28, shellY + 320);

    this.noteText = scene.add.text(shellX + 28, shellY + 348, '', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 3,
      wordWrap: { width: shellWidth - 56 }
    });

    this.summaryText = scene.add.text(shellX + 36, shellY + 402, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: shellWidth - 72 }
    });

    const techniqueFrame = new PanelFrame(scene, {
      x: shellX + 18,
      y: shellY + 468,
      width: shellWidth - 36,
      height: 182,
      title: 'Công pháp',
      subtitle: 'Lộ trình đang luyện và hiệu ứng thụ động',
      iconKey: Icons.resource.spiritualEnergy
    });

    this.techniqueText = scene.add.text(shellX + 36, shellY + 548, '', {
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
        disabled: button.disabled,
        onClick: button.onClick
      }).setPosition(shellX + 28 + column * (Math.floor((shellWidth - 70) / 2) + 14), shellY + 668 + row * 62);
    });

    this.root = scene.add.container(0, 0, [
      veil,
      shell,
      this.titleText,
      subtitleText,
      heroFrame.root,
      auraRing,
      auraDash,
      this.emblem,
      this.realmText,
      this.progressBar,
      this.noteText,
      this.summaryText,
      techniqueFrame.root,
      this.techniqueText,
      ...buttonNodes
    ]);

    this.root.setDepth(1100);
    this.root.setVisible(false);
  }

  show(content: CultivationPanelContent): void {
    const parsed = this.parseContent(content);

    this.titleText.setText(content.title);
    this.realmText.setText(parsed.realm);
    this.noteText.setText(parsed.note);
    this.summaryText.setText(content.summaryLines.join('\n'));
    this.techniqueText.setText(content.techniqueLines.join('\n'));
    this.progressBar
      .setLabel(`Tiến độ ${parsed.realm}`)
      .setIcon(parsed.realmIconKey)
      .setProgress(parsed.progressValue, parsed.progressMax);

    if (this.scene.textures.exists(parsed.realmIconKey)) {
      this.emblem.setTexture(parsed.realmIconKey);
    }

    this.root.setAlpha(0);
    this.root.setVisible(true);
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 160,
      ease: 'Quad.Out'
    });
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

  private parseContent(content: CultivationPanelContent): ParsedCultivationContent {
    const findLine = (needle: string): string =>
      content.summaryLines.find((line) => normalizeSearchText(line).includes(needle)) ?? '';

    const realmLine = findLine('canh gioi hien tai');
    const progressLine = findLine('tien do');
    const breakthroughLine = findLine('san sang dot pha');
    const noteLine = findLine('dieu kien dot pha');

    const realm = realmLine.split(':').slice(1).join(':').trim() || 'Phàm Thể';
    const progressMatch = progressLine.match(/(\d+)\s*\/\s*(\d+)/);
    const progressValue = progressMatch ? Number(progressMatch[1]) : 0;
    const progressMax = progressMatch ? Number(progressMatch[2]) : 100;
    const breakthroughReady = ['co', 'san sang'].some((token) => normalizeSearchText(breakthroughLine).includes(token));
    const note = breakthroughReady
      ? 'Linh khí đã đầy. Có thể chuẩn bị đột phá nếu điều kiện còn lại đã đủ.'
      : noteLine || content.summaryLines.at(-1) || 'Tiếp tục vận công để tích lũy tiến độ và giữ nền căn ổn định.';

    return {
      realm,
      progressValue,
      progressMax,
      breakthroughReady,
      note,
      realmIconKey: this.getRealmIconKey(realm)
    };
  }

  private getRealmIconKey(realmName: string): string {
    const normalized = normalizeSearchText(realmName);

    if (normalized.includes('hoa than')) {
      return Icons.status.spiritTransformation;
    }
    if (normalized.includes('nguyen anh')) {
      return Icons.status.nascentSoul;
    }
    if (normalized.includes('kim dan')) {
      return Icons.status.goldenCore;
    }
    if (normalized.includes('truc co')) {
      return Icons.status.foundationEstablishment;
    }

    return Icons.status.qiRefining;
  }
}
