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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDismiss: () => void
  ) {
    const { width, height } = scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.veil = scene.add.rectangle(centerX, centerY, width, height, 0x050607, 0.72)
      .setInteractive();

    this.panel = scene.add.graphics();
    this.panel.fillStyle(menuPalette.backgroundDeep, 0.98);
    this.panel.fillRoundedRect(centerX - 452, centerY - 268, 904, 536, 24);
    this.panel.lineStyle(2, menuPalette.frame, 1);
    this.panel.strokeRoundedRect(centerX - 452, centerY - 268, 904, 536, 24);
    
    // Feature image on the left side inside the panel
    const eventImage = scene.add.image(centerX - 428, centerY - 244, 'event-discovery')
      .setOrigin(0, 0)
      .setDisplaySize(380, 488)
      .setAlpha(0.95);

    this.accentBar = scene.add.rectangle(centerX - 10, centerY - 236, 220, 8, menuPalette.accent, 0.92)
      .setOrigin(0, 0.5);

    this.titleText = scene.add.text(centerX - 10, centerY - 226, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '34px'
    });

    this.subtitleText = scene.add.text(centerX - 10, centerY - 182, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px'
    });

    this.contextHeaderText = scene.add.text(centerX - 10, centerY - 154, '', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold'
    });

    this.bodyTextLayer = scene.add.container(0, 0);

    const optionStartY = centerY + 52;
    const optionGap = 68;

    for (let index = 0; index < 3; index += 1) {
      const baseY = optionStartY + index * optionGap;
      const background = scene.add.rectangle(centerX - 10, baseY, 440, 54, menuPalette.panelAlt, 1)
        .setStrokeStyle(1, menuPalette.frameSoft, 0.9)
        .setInteractive({ useHandCursor: true })
        .setOrigin(0, 0.5);

      const label = scene.add.text(centerX + 14, baseY - 16, '', {
        color: menuPalette.textStrong,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '18px'
      });

      const detail = scene.add.text(centerX + 14, baseY + 6, '', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '14px'
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
      eventImage,
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
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const bodyX = centerX - 10;
    const bodyY = centerY - 120;

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

    allLines.forEach((line, index) => {
      const isContext = index < (content.contextLines?.length ?? 0);
      const lineText = this.scene.add.text(bodyX, bodyY + index * 26, line, {
        color: isContext ? variantPalette.context : menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: isContext ? '15px' : '15px',
        fontStyle: isContext ? 'bold' : 'normal',
        wordWrap: { width: 440 }
      });
      this.bodyTextLayer.add(lineText);
    });

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
      width: { from: 170, to: 220 },
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
          contextLabel: 'MOC CHUYEN QUAN TRONG',
          barColor: menuPalette.accent
        };
      case 'omen':
        return {
          subtitle: '#b7a9d8',
          context: '#d7caef',
          contextLabel: 'DI TUONG DANG CHU Y',
          barColor: 0x7f6ca6
        };
      case 'faction':
        return {
          subtitle: '#93c7be',
          context: '#b8e0d8',
          contextLabel: 'BOI CANH PHE PHAI',
          barColor: 0x4f8d83
        };
      case 'discovery':
        return {
          subtitle: menuPalette.successText,
          context: '#d7e5ba',
          contextLabel: 'PHAT HIEN DAC BIET',
          barColor: 0x8aa65d
        };
      default:
        return {
          subtitle: menuPalette.accentText,
          context: menuPalette.accentText,
          contextLabel: 'BOI CANH SU KIEN',
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
