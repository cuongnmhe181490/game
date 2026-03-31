import Phaser from 'phaser';

import { getFeedbackSystem } from '@/game/config/registry';
import { menuPalette } from '@/game/ui/theme';

export interface EventModalOption {
  label: string;
  detail?: string;
  onSelect?: () => void;
}

export interface EventModalContent {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'major' | 'omen' | 'faction' | 'discovery';
  contextLines?: string[];
  body: string[];
  options: EventModalOption[];
}

export class EventModal {
  private readonly root: Phaser.GameObjects.Container;
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly accentBar: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly contextHeaderText: Phaser.GameObjects.Text;
  private readonly bodyTextLayer: Phaser.GameObjects.Container;
  private readonly optionButtons: Array<{
    background: Phaser.GameObjects.Rectangle;
    container: Phaser.GameObjects.Container;
    label: Phaser.GameObjects.Text;
    detail: Phaser.GameObjects.Text;
  }> = [];
  private optionActions: Array<(() => void) | undefined> = [];
  private resolving = false;
  private contentYStart = 0;
  private contentXStart = 0;
  private contentWidthAvail = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDismiss: () => void
  ) {
    const { width, height } = scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Mobile responsive sizing
    const modalWidth = Math.min(420, width - 24);
    const modalHeight = Math.min(680, height - 48);
    const startX = centerX - modalWidth / 2;
    const startY = centerY - modalHeight / 2;
    const contentWidth = modalWidth - 40;
    const contentX = startX + 20;

    this.contentXStart = contentX;
    this.contentWidthAvail = contentWidth;

    this.veil = scene.add.rectangle(centerX, centerY, width, height, 0x050607, 0.8)
      .setInteractive();

    this.panel = scene.add.graphics();
    this.panel.fillStyle(menuPalette.panel, 0.98);
    this.panel.fillRoundedRect(startX, startY, modalWidth, modalHeight, 24);
    this.panel.lineStyle(2, menuPalette.frame, 1);
    this.panel.strokeRoundedRect(startX, startY, modalWidth, modalHeight, 24);
    
    this.accentBar = scene.add.rectangle(contentX, startY + 24, 120, 6, menuPalette.accent, 0.92)
      .setOrigin(0, 0.5);

    this.titleText = scene.add.text(contentX, startY + 36, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '24px',
      wordWrap: { width: contentWidth }
    });

    this.subtitleText = scene.add.text(contentX, startY + 68, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      wordWrap: { width: contentWidth }
    });

    this.contextHeaderText = scene.add.text(contentX, startY + 92, '', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold'
    });

    this.bodyTextLayer = scene.add.container(0, 0);

    const optionHeight = 56;
    const optionGap = 66;
    const maxOptionsHeight = 3 * optionGap;
    const optionStartY = startY + modalHeight - maxOptionsHeight - 16;
    
    this.contentYStart = startY + 114;

    for (let index = 0; index < 3; index += 1) {
      const baseY = optionStartY + index * optionGap;
      const background = scene.add.rectangle(centerX, baseY + optionHeight / 2, contentWidth, optionHeight, menuPalette.panelAlt, 1)
        .setStrokeStyle(1, menuPalette.frameSoft, 0.9)
        .setInteractive({ useHandCursor: true });

      const label = scene.add.text(contentX + 12, baseY + 8, '', {
        color: menuPalette.textStrong,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '15px'
      });

      const detail = scene.add.text(contentX + 12, baseY + 28, '', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        wordWrap: { width: contentWidth - 24 }
      });

      const container = scene.add.container(0, 0, [background, label, detail]);

      background.on('pointerover', () => {
        this.playCue('ui-hover');
        background.setFillStyle(menuPalette.panelSoft);
        background.setStrokeStyle(1, menuPalette.accent, 1);
      });
      background.on('pointerout', () => {
        background.setFillStyle(menuPalette.panelAlt);
        background.setStrokeStyle(1, menuPalette.frameSoft, 0.9);
      });
      background.on('pointerdown', () => {
        if (this.resolving) {
          return;
        }

        this.resolving = true;
        this.setOptionsEnabled(false);
        this.playCue('event-resolve');
        this.optionActions[index]?.();
      });

      this.optionButtons.push({ background, container, label, detail });
    }

    this.root = scene.add.container(0, 0, [
      this.veil,
      this.panel,
      this.accentBar,
      this.titleText,
      this.subtitleText,
      this.contextHeaderText,
      this.bodyTextLayer,
      ...this.optionButtons.map((option) => option.container)
    ]);

    this.root.setDepth(1000);
    this.root.setVisible(false);

    this.veil.on('pointerdown', () => {
      this.hide();
    });
  }

  show(content: EventModalContent): void {
    this.root.setVisible(true);
    this.root.setAlpha(0);
    this.root.setScale(0.976);
    this.resolving = false;
    const variantPalette = this.getVariantPalette(content.variant ?? 'default');

    this.playCue(this.getVariantCue(content.variant ?? 'default'));

    this.titleText.setText(content.title);
    this.subtitleText.setText(content.subtitle ?? '');
    this.subtitleText.setColor(variantPalette.subtitle);
    this.contextHeaderText.setText(content.contextLines?.length ? variantPalette.contextLabel : '');
    this.contextHeaderText.setColor(variantPalette.context);
    this.accentBar.setFillStyle(variantPalette.barColor, 0.92);

    this.bodyTextLayer.removeAll(true);

    const allLines = [...(content.contextLines ?? []), ...(content.contextLines?.length ? [''] : []), ...content.body];
    
    let currentTextY = this.contentYStart;
    const isMajor = content.variant === 'major';

    allLines.forEach((line, index) => {
      const isContext = index < (content.contextLines?.length ?? 0);
      const fontSize = isContext ? 13 : isMajor ? 14 : 14;
      const lineText = this.scene.add.text(this.contentXStart, currentTextY, line, {
        color: isContext ? variantPalette.context : menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: isContext ? 'italic' : 'normal',
        lineSpacing: 4,
        wordWrap: { width: this.contentWidthAvail }
      });
      this.bodyTextLayer.add(lineText);
      currentTextY += lineText.height + 8;
    });

    // Make context header invisible if no context lines and shift body
    if (!content.contextLines?.length) {
       this.bodyTextLayer.setY(-20);
    } else {
       this.bodyTextLayer.setY(0);
    }

    this.optionButtons.forEach((option, index) => {
      const data = content.options[index];
      option.container.setVisible(Boolean(data));
      option.label.setText(data ? data.label : '');
      option.detail.setText(data?.detail ?? '');
      this.optionActions[index] = data?.onSelect;
    });
    this.setOptionsEnabled(true);

    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.killTweensOf(this.accentBar);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: 'Cubic.Out'
    });
    this.scene.tweens.add({
      targets: this.accentBar,
      alpha: { from: 0.55, to: 0.92 },
      width: { from: 60, to: 120 },
      duration: 180,
      ease: 'Quad.Out'
    });
  }

  hide(): void {
    if (!this.root.visible) {
      return;
    }

    this.resolving = false;
    this.setOptionsEnabled(false);
    this.playCue('ui-close');
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      scaleX: 0.984,
      scaleY: 0.984,
      duration: 110,
      ease: 'Quad.In',
      onComplete: () => {
        this.root.setVisible(false);
        this.root.setAlpha(1);
        this.root.setScale(1);
        this.onDismiss();
      }
    });
  }

  destroy(): void {
    this.root.destroy(true);
  }

  private setOptionsEnabled(enabled: boolean): void {
    this.optionButtons.forEach((option, index) => {
      const canEnable = enabled && option.container.visible && Boolean(this.optionActions[index]);

      if (canEnable) {
        option.background.setInteractive({ useHandCursor: true });
        return;
      }

      option.background.disableInteractive();
    });
  }

  private getVariantPalette(variant: NonNullable<EventModalContent['variant']>): {
    subtitle: string;
    context: string;
    contextLabel: string;
    barColor: number;
  } {
    switch (variant) {
      case 'major':
        return {
          subtitle: menuPalette.warningText,
          context: menuPalette.textStrong,
          contextLabel: 'MỐC CHUYỆN QUAN TRỌNG',
          barColor: menuPalette.accent
        };
      case 'omen':
        return {
          subtitle: '#b7a9d8',
          context: '#d7caef',
          contextLabel: 'DỊ TƯỢNG ĐÁNG CHÚ Ý',
          barColor: 0x7f6ca6
        };
      case 'faction':
        return {
          subtitle: '#93c7be',
          context: '#b8e0d8',
          contextLabel: 'BỐI CẢNH PHE PHÁI',
          barColor: 0x4f8d83
        };
      case 'discovery':
        return {
          subtitle: menuPalette.successText,
          context: '#d7e5ba',
          contextLabel: 'PHÁT HIỆN ĐẶC BIỆT',
          barColor: 0x8aa65d
        };
      default:
        return {
          subtitle: menuPalette.accentText,
          context: menuPalette.accentText,
          contextLabel: 'BỐI CẢNH SỰ KIỆN',
          barColor: menuPalette.frame
        };
    }
  }

  private getVariantCue(variant: NonNullable<EventModalContent['variant']>): Parameters<ReturnType<typeof getFeedbackSystem>['play']>[0] {
    switch (variant) {
      case 'major':
      case 'omen':
        return 'event-major';
      case 'discovery':
        return 'rare-reward';
      default:
        return 'event-open';
    }
  }

  private playCue(cue: Parameters<ReturnType<typeof getFeedbackSystem>['play']>[0]): void {
    try {
      const feedback = getFeedbackSystem(this.scene);
      feedback.unlockAudio();
      feedback.play(cue);
    } catch {
      // Keep modal interactions working even if feedback is unavailable.
    }
  }
}
