import Phaser from 'phaser';

import { getFeedbackSystem, getSettingsStore } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createTextButton, drawInsetPanel, drawSceneFrame, menuPalette } from '@/game/ui';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.settings);
  }

  create(data?: { returnScene?: string }): void {
    const returnScene = data?.returnScene ?? SCENE_KEYS.mainMenu;
    const settingsStore = getSettingsStore(this);
    let settings = settingsStore.getSettings();
    getFeedbackSystem(this).setVolumePreferences(settings.masterVolume, settings.sfxVolume);

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);
    drawInsetPanel(this, { x: 130, y: 70, width: 1020, height: 584, fill: menuPalette.panel, alpha: 0.92 });

    this.add.text(164, 100, 'Settings', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: '34px'
    });

    const statusText = this.add.text(164, 606, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      wordWrap: { width: 900 }
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
      const y = 170 + index * 52;
      this.add.text(168, y, row.label, {
        color: menuPalette.textStrong,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '17px'
      });
      this.add.text(530, y, row.value, {
        color: menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '17px'
      });
      createTextButton(this, {
        x: 770,
        y: y + 10,
        width: 92,
        label: '-',
        detail: 'Giam / doi',
        onClick: () => row.onMinus?.()
      });
      createTextButton(this, {
        x: 888,
        y: y + 10,
        width: 92,
        label: '+',
        detail: 'Tang / doi',
        onClick: () => row.onPlus?.()
      });
    });

    this.add.text(168, 554, 'Ghi chu: music volume va particle toggle da duoc luu san cho cac pass tiep theo; sound feedback hien tai da an theo master + sfx volume.', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      wordWrap: { width: 820 }
    });

    createTextButton(this, {
      x: 250,
      y: 610,
      width: 180,
      label: 'Reset settings',
      detail: 'Ve mac dinh',
      onClick: () => {
        settingsStore.resetSettings();
        refresh();
      }
    });
    createTextButton(this, {
      x: 464,
      y: 610,
      width: 180,
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
    });
  }
}
