import Phaser from 'phaser';

import { getFeedbackSystem, getSettingsStore } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createSecondaryButton, drawSceneFrame, PanelFrame, menuPalette } from '@/game/ui';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.settings);
  }

  create(data?: { returnScene?: string }): void {
    const returnScene = data?.returnScene ?? SCENE_KEYS.mainMenu;
    const settingsStore = getSettingsStore(this);
    let settings = settingsStore.getSettings();
    getFeedbackSystem(this).setVolumePreferences(settings.masterVolume, settings.sfxVolume);

    const { width, height } = this.scale;
    const shellWidth = Math.min(430, width - 32);
    const shellHeight = Math.min(844, height - 24);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);
    const panelWidth = shellWidth - 32;

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);

    const shell = this.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(shellX + 10, shellY + 10, shellWidth - 20, shellHeight - 20, 28);

    const frame = new PanelFrame(this, {
      x: shellX + 16,
      y: shellY + 24,
      width: panelWidth,
      height: shellHeight - 48,
      title: 'Settings',
      subtitle: 'Am thanh, giao dien, animation, auto-save, va tutorial hints.'
    });
    this.add.existing(frame.root);

    const statusText = this.add.text(0, 0, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      wordWrap: { width: panelWidth - 36 }
    });

    const refresh = (): void => {
      this.scene.restart(data);
    };

    const savePartial = (partial: Partial<typeof settings>): void => {
      settings = settingsStore.saveSettings(partial);
      getFeedbackSystem(this).setVolumePreferences(settings.masterVolume, settings.sfxVolume);
      statusText.setText('Da cap nhat settings cho phien choi hien tai.');
      refresh();
    };

    const rows: Array<{ label: string; value: string; onMinus?: () => void; onPlus?: () => void }> = [
      {
        label: 'Master volume',
        value: `${Math.round(settings.masterVolume * 100)}%`,
        onMinus: () => savePartial({ masterVolume: Math.max(0, settings.masterVolume - 0.1) }),
        onPlus: () => savePartial({ masterVolume: Math.min(1, settings.masterVolume + 0.1) })
      },
      {
        label: 'Music volume',
        value: `${Math.round(settings.musicVolume * 100)}%`,
        onMinus: () => savePartial({ musicVolume: Math.max(0, settings.musicVolume - 0.1) }),
        onPlus: () => savePartial({ musicVolume: Math.min(1, settings.musicVolume + 0.1) })
      },
      {
        label: 'Sound effects',
        value: `${Math.round(settings.sfxVolume * 100)}%`,
        onMinus: () => savePartial({ sfxVolume: Math.max(0, settings.sfxVolume - 0.1) }),
        onPlus: () => savePartial({ sfxVolume: Math.min(1, settings.sfxVolume + 0.1) })
      },
      {
        label: 'UI scale',
        value: `${Math.round(settings.uiScale * 100)}%`,
        onMinus: () => savePartial({ uiScale: Math.max(0.85, settings.uiScale - 0.05) }),
        onPlus: () => savePartial({ uiScale: Math.min(1.15, settings.uiScale + 0.05) })
      },
      {
        label: 'Animation',
        value: settings.animationEnabled ? 'Bat' : 'Tat',
        onMinus: () => savePartial({ animationEnabled: !settings.animationEnabled }),
        onPlus: () => savePartial({ animationEnabled: !settings.animationEnabled })
      },
      {
        label: 'Particle effects',
        value: settings.particlesEnabled ? 'Bat' : 'Tat',
        onMinus: () => savePartial({ particlesEnabled: !settings.particlesEnabled }),
        onPlus: () => savePartial({ particlesEnabled: !settings.particlesEnabled })
      },
      {
        label: 'Auto-save',
        value: settings.autoSaveEnabled ? 'Bat' : 'Tat',
        onMinus: () => savePartial({ autoSaveEnabled: !settings.autoSaveEnabled }),
        onPlus: () => savePartial({ autoSaveEnabled: !settings.autoSaveEnabled })
      },
      {
        label: 'Tutorial hints',
        value: settings.tutorialHintsEnabled ? 'Bat' : 'Tat',
        onMinus: () => savePartial({ tutorialHintsEnabled: !settings.tutorialHintsEnabled }),
        onPlus: () => savePartial({ tutorialHintsEnabled: !settings.tutorialHintsEnabled })
      }
    ];

    rows.forEach((row, index) => {
      const y = index * 58;
      frame.content.add(this.add.text(0, y, row.label, {
        color: menuPalette.textStrong,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '16px'
      }));
      frame.content.add(this.add.text(0, y + 22, row.value, {
        color: menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '13px'
      }));
      frame.content.add(
        createSecondaryButton(this, {
          width: 52,
          label: '-',
          detail: '',
          onClick: () => row.onMinus?.()
        }).setPosition(panelWidth - 136, y + 12)
      );
      frame.content.add(
        createSecondaryButton(this, {
          width: 52,
          label: '+',
          detail: '',
          onClick: () => row.onPlus?.()
        }).setPosition(panelWidth - 74, y + 12)
      );
    });

    statusText.setPosition(0, 488);
    frame.content.add(statusText);

    frame.content.add(this.add.text(0, 516,
      'Ghi chu: music volume, particle toggle, va UI scale duoc luu an toan; sound feedback da dung master + sfx volume.',
      {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: panelWidth - 36 }
      }
    ));

    frame.content.add(
      createSecondaryButton(this, {
        width: 156,
        label: 'Reset',
        detail: 'Ve mac dinh',
        onClick: () => {
          settingsStore.resetSettings();
          refresh();
        }
      }).setPosition(86, 620)
    );

    frame.content.add(
      createSecondaryButton(this, {
        width: 156,
        label: 'Quay lai',
        detail: 'Ve menu truoc do',
        onClick: () => {
          if (returnScene === SCENE_KEYS.mainMenu) {
            this.scene.start(returnScene);
            return;
          }
          if (this.scene.isPaused(returnScene)) {
            this.scene.resume(returnScene);
          }
          this.scene.stop();
        }
      }).setPosition(254, 620)
    );
  }
}
