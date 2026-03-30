import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

export interface ActionButtonOptions {
  width: number;
  label: string;
  detail?: string;
  iconKey?: string;
  onClick: () => void;
  height?: number;
  disabled?: boolean;
}

class ActionButton extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly iconImage: Phaser.GameObjects.Image;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private readonly variant: 'primary' | 'secondary';
  private readonly disabled: boolean;
  private widthValue: number;
  private heightValue: number;

  constructor(scene: Phaser.Scene, options: ActionButtonOptions, variant: 'primary' | 'secondary') {
    const glow = scene.add.graphics();
    const bg = scene.add.graphics();
    const iconImage = scene.add.image(0, 0, '').setVisible(false);
    const labelText = scene.add.text(0, 0, options.label, {
      color: variant === 'primary' ? '#1a1a1a' : menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold'
    });
    const detailText = scene.add.text(0, 0, options.detail ?? '', {
      color: options.disabled
        ? menuPalette.textSoft
        : variant === 'primary'
          ? '#2b2516'
          : menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px',
      lineSpacing: 2
    });
    const hit = scene.add.rectangle(0, 0, options.width, options.height ?? 52, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    super(scene, 0, 0, [glow, bg, iconImage, labelText, detailText, hit]);
    this.glow = glow;
    this.bg = bg;
    this.iconImage = iconImage;
    this.labelText = labelText;
    this.detailText = detailText;
    this.hit = hit;
    this.variant = variant;
    this.disabled = options.disabled === true;
    this.widthValue = options.width;
    this.heightValue = options.height ?? 52;

    if (!this.disabled) {
      hit.on('pointerdown', () => {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
          targets: this,
          scaleX: 0.985,
          scaleY: 0.985,
          duration: 70,
          ease: 'Quad.Out'
        });
      });
      hit.on('pointerup', () => {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 90,
          ease: 'Quad.Out',
          onComplete: () => {
            this.scene.tweens.add({
              targets: this,
              scaleX: 1,
              scaleY: 1,
              duration: 90,
              ease: 'Quad.Out'
            });
          }
        });
        options.onClick();
      });
      this.bindHover();
    } else {
      hit.disableInteractive();
      this.setAlpha(0.62);
    }
    this.resize(this.widthValue, this.heightValue);
    this.setLabel(options.label);
    this.setDetail(options.detail ?? '');
    this.setIcon(options.iconKey);
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    this.layout();
    return this;
  }

  setDetail(detail: string): this {
    this.detailText.setText(detail);
    this.layout();
    return this;
  }

  setIcon(iconKey?: string): this {
    if (iconKey && this.scene.textures.exists(iconKey)) {
      this.iconImage.setTexture(iconKey).setVisible(true).setDisplaySize(18, 18);
    } else {
      this.iconImage.setVisible(false);
    }
    this.layout();
    return this;
  }

  resize(width: number, height = this.heightValue): this {
    this.widthValue = width;
    this.heightValue = height;
    this.redraw();
    this.layout();
    return this;
  }

  private bindHover(): void {
    this.hit.on('pointerover', () => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.killTweensOf(this.glow);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.02,
        scaleY: 1.02,
        alpha: 1,
        duration: 120,
        ease: 'Quad.Out'
      });
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 1,
        duration: 140,
        ease: 'Quad.Out'
      });
    });
    this.hit.on('pointerout', () => {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.killTweensOf(this.glow);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 120,
        ease: 'Quad.Out'
      });
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.18,
        duration: 140,
        ease: 'Quad.Out'
      });
    });
  }

  private redraw(): void {
    const fill = this.disabled
      ? 0x18211d
      : this.variant === 'primary'
        ? 0x8c6b22
        : 0x10261c;
    const border = this.disabled
      ? 0x52635c
      : this.variant === 'primary'
        ? 0xd4af37
        : 0x294d3c;
    const glowColor = this.disabled
      ? 0x52635c
      : this.variant === 'primary'
        ? 0xd4af37
        : 0x5d8f7a;

    this.glow.clear();
    this.glow.fillStyle(glowColor, this.disabled ? 0.08 : this.variant === 'primary' ? 0.18 : 0.12);
    this.glow.fillRoundedRect(-4, -4, this.widthValue + 8, this.heightValue + 8, 14);
    this.glow.setAlpha(this.disabled ? 0.08 : 0.18);

    this.bg.clear();
    this.bg.fillStyle(fill, this.disabled ? 0.72 : this.variant === 'primary' ? 0.96 : 0.78);
    this.bg.lineStyle(1, border, 1);
    this.bg.fillRoundedRect(0, 0, this.widthValue, this.heightValue, 12);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, this.heightValue, 12);
    this.hit.setSize(this.widthValue, this.heightValue);
  }

  private layout(): void {
    const left = this.iconImage.visible ? 40 : 16;
    const hasDetail = this.detailText.text.trim().length > 0;
    this.iconImage.setPosition(18, this.heightValue / 2);
    this.labelText
      .setPosition(left, hasDetail ? 8 : Math.max(8, (this.heightValue - 22) / 2))
      .setWordWrapWidth(this.widthValue - left - 12);
    this.detailText
      .setVisible(hasDetail)
      .setPosition(left, Math.min(this.heightValue - 22, 29))
      .setWordWrapWidth(this.widthValue - left - 12);
  }
}

export type PrimaryButton = ActionButton;
export type SecondaryButton = ActionButton;

export function createPrimaryButton(scene: Phaser.Scene, options: ActionButtonOptions): PrimaryButton {
  return new ActionButton(scene, options, 'primary');
}

export function createSecondaryButton(scene: Phaser.Scene, options: ActionButtonOptions): SecondaryButton {
  return new ActionButton(scene, options, 'secondary');
}
