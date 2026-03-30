import Phaser from 'phaser';

import { getFeedbackSystem } from '@/game/config/registry';
import { buttonStyle } from '@/game/ui/buttonStyle';

export interface TextButtonOptions {
  x: number;
  y: number;
  width: number;
  label: string;
  detail?: string;
  onClick: () => void;
}

export function createTextButton(
  scene: Phaser.Scene,
  options: TextButtonOptions
): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(0, 0, options.width, 42, buttonStyle.background, 1)
    .setStrokeStyle(1, buttonStyle.border, 0.85)
    .setInteractive({ useHandCursor: true });
  background.setOrigin(0.5);

  const accent = scene.add.rectangle(-options.width / 2 + 8, 0, 4, 30, buttonStyle.accent, 0.82);
  const sheen = scene.add.rectangle(0, -14, options.width - 18, 6, 0xffffff, 0.04);

  const label = scene.add.text(-options.width / 2 + 18, -14, options.label, {
    color: buttonStyle.text,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '14px',
    fontStyle: 'bold',
    wordWrap: { width: options.width - 32 }
  });

  const detail = scene.add.text(-options.width / 2 + 18, 4, options.detail ?? '', {
    color: buttonStyle.textMuted,
    fontFamily: '"Segoe UI", Tahoma, sans-serif',
    fontSize: '11px',
    wordWrap: { width: options.width - 32 }
  });

  const container = scene.add.container(options.x, options.y, [background, sheen, accent, label, detail]);

  const playCue = (cue: Parameters<ReturnType<typeof getFeedbackSystem>['play']>[0]): void => {
    try {
      const feedback = getFeedbackSystem(scene);
      feedback.unlockAudio();
      feedback.play(cue);
    } catch {
      // Keep buttons functional even before the feedback system is available.
    }
  };

  background.on('pointerover', () => {
    playCue('ui-hover');
    background.setFillStyle(buttonStyle.backgroundHover);
    background.setStrokeStyle(1, buttonStyle.borderHover, 1);
    accent.setAlpha(1);
    sheen.setAlpha(0.09);
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 1.012,
      scaleY: 1.012,
      y: options.y - 1,
      duration: 120,
      ease: 'Quad.Out'
    });
  });

  background.on('pointerout', () => {
    background.setFillStyle(buttonStyle.background);
    background.setStrokeStyle(1, buttonStyle.border, 0.8);
    accent.setAlpha(0.82);
    sheen.setAlpha(0.04);
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      y: options.y,
      duration: 120,
      ease: 'Quad.Out'
    });
  });

  background.on('pointerdown', () => {
    playCue('ui-confirm');
    background.setFillStyle(buttonStyle.backgroundPressed);
    background.setStrokeStyle(1, buttonStyle.borderHover, 1);
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 0.988,
      scaleY: 0.988,
      y: options.y + 1,
      duration: 70,
      ease: 'Quad.Out'
    });
    options.onClick();
  });
  background.on('pointerup', () => {
    background.setFillStyle(buttonStyle.backgroundHover);
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 1.012,
      scaleY: 1.012,
      y: options.y - 1,
      duration: 110,
      ease: 'Quad.Out'
    });
  });

  return container;
}
