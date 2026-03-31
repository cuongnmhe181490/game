import Phaser from 'phaser';

import { getFeedbackSystem, getSettingsStore } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createSecondaryButton, EntryShell, PanelFrame, menuPalette } from '@/game/ui';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.settings);
  }

  create(data?: { returnScene?: string }): void {
    const returnScene = data?.returnScene ?? SCENE_KEYS.mainMenu;
    const settingsStore = getSettingsStore(this);
    let settings = settingsStore.getSettings();
    getFeedbackSystem(this).setVolumePreferences(settings.masterVolume, settings.sfxVolume);

    const shell = new EntryShell(this, {
      title: 'Cài đặt',
      subtitle: 'Âm thanh, giao diện, và trải nghiệm chơi',
      metaLine: 'Điều chỉnh nhanh cho phiên chơi hiện tại.'
    });
    const panelWidth = shell.contentWidth;

    const frame = new PanelFrame(this, {
      x: shell.contentX,
      y: shell.contentY,
      width: panelWidth,
      height: shell.contentHeight,
      title: 'Tùy chỉnh',
      subtitle: 'Mỗi dòng là một thiết lập có thể giảm hoặc tăng ngay.'
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
      statusText.setText('Đã cập nhật cài đặt cho phiên chơi hiện tại.');
      refresh();
    };

    const rows: Array<{ label: string; value: string; onMinus?: () => void; onPlus?: () => void }> = [
      {
        label: 'Âm lượng tổng',
        value: `${Math.round(settings.masterVolume * 100)}%`,
        onMinus: () => savePartial({ masterVolume: Math.max(0, settings.masterVolume - 0.1) }),
        onPlus: () => savePartial({ masterVolume: Math.min(1, settings.masterVolume + 0.1) })
      },
      {
        label: 'Âm lượng nhạc',
        value: `${Math.round(settings.musicVolume * 100)}%`,
        onMinus: () => savePartial({ musicVolume: Math.max(0, settings.musicVolume - 0.1) }),
        onPlus: () => savePartial({ musicVolume: Math.min(1, settings.musicVolume + 0.1) })
      },
      {
        label: 'Hiệu ứng âm thanh',
        value: `${Math.round(settings.sfxVolume * 100)}%`,
        onMinus: () => savePartial({ sfxVolume: Math.max(0, settings.sfxVolume - 0.1) }),
        onPlus: () => savePartial({ sfxVolume: Math.min(1, settings.sfxVolume + 0.1) })
      },
      {
        label: 'Tỷ lệ giao diện',
        value: `${Math.round(settings.uiScale * 100)}%`,
        onMinus: () => savePartial({ uiScale: Math.max(0.85, settings.uiScale - 0.05) }),
        onPlus: () => savePartial({ uiScale: Math.min(1.15, settings.uiScale + 0.05) })
      },
      {
        label: 'Hiệu ứng chuyển động',
        value: settings.animationEnabled ? 'Bật' : 'Tắt',
        onMinus: () => savePartial({ animationEnabled: !settings.animationEnabled }),
        onPlus: () => savePartial({ animationEnabled: !settings.animationEnabled })
      },
      {
        label: 'Hiệu ứng hạt',
        value: settings.particlesEnabled ? 'Bật' : 'Tắt',
        onMinus: () => savePartial({ particlesEnabled: !settings.particlesEnabled }),
        onPlus: () => savePartial({ particlesEnabled: !settings.particlesEnabled })
      },
      {
        label: 'Tự động lưu',
        value: settings.autoSaveEnabled ? 'Bật' : 'Tắt',
        onMinus: () => savePartial({ autoSaveEnabled: !settings.autoSaveEnabled }),
        onPlus: () => savePartial({ autoSaveEnabled: !settings.autoSaveEnabled })
      },
      {
        label: 'Gợi ý hướng dẫn',
        value: settings.tutorialHintsEnabled ? 'Bật' : 'Tắt',
        onMinus: () => savePartial({ tutorialHintsEnabled: !settings.tutorialHintsEnabled }),
        onPlus: () => savePartial({ tutorialHintsEnabled: !settings.tutorialHintsEnabled })
      }
    ];

    rows.forEach((row, index) => {
      const y = index * 56;
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
          label: '−',
          detail: '',
          onClick: () => row.onMinus?.()
        }).setPosition(panelWidth - 136, y + 10)
      );
      frame.content.add(
        createSecondaryButton(this, {
          width: 52,
          label: '+',
          detail: '',
          onClick: () => row.onPlus?.()
        }).setPosition(panelWidth - 74, y + 10)
      );
    });

    statusText.setPosition(0, 478);
    frame.content.add(statusText);

    frame.content.add(this.add.text(
      0,
      506,
      'Ghi chú: âm lượng tổng và âm thanh UI đang áp dụng ngay. Các thiết lập còn lại được lưu an toàn cho lần mở tiếp theo.',
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
        label: 'Khôi phục',
        detail: 'Về mặc định',
        onClick: () => {
          settingsStore.resetSettings();
          refresh();
        }
      }).setPosition(0, 566)
    );

    frame.content.add(
      createSecondaryButton(this, {
        width: 156,
        label: 'Quay lại',
        detail: 'Về màn trước',
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
      }).setPosition(168, 566)
    );
  }
}
