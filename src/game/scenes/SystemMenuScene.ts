import Phaser from 'phaser';

import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createTextButton, drawInsetPanel, menuPalette } from '@/game/ui';

export class SystemMenuScene extends Phaser.Scene {
  private resumeOnStop = true;

  constructor() {
    super(SCENE_KEYS.systemMenu);
  }

  create(data?: { returnScene?: string }): void {
    const returnScene = data?.returnScene ?? SCENE_KEYS.sect;
    const { width, height } = this.scale;
    const panelWidth = Math.min(360, width - 32);
    const panelHeight = 332;
    const panelX = Math.floor((width - panelWidth) / 2);
    const panelY = Math.floor((height - panelHeight) / 2);

    this.resumeOnStop = true;

    if (returnScene !== SCENE_KEYS.mainMenu && this.scene.isActive(returnScene)) {
      this.scene.pause(returnScene);
    }

    this.cameras.main.setBackgroundColor('rgba(4,8,8,0.78)');
    drawInsetPanel(this, { x: panelX, y: panelY, width: panelWidth, height: panelHeight, fill: menuPalette.panel, alpha: 0.96 });

    this.add.text(panelX + 28, panelY + 28, 'Menu tạm dừng', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: '28px'
    });
    this.add.text(panelX + 28, panelY + 68, 'Tiếp tục, mở Save Slots, vào Settings, hoặc quay về main menu.', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      wordWrap: { width: panelWidth - 56 }
    });

    createTextButton(this, {
      x: panelX + panelWidth / 2,
      y: panelY + 132,
      width: panelWidth - 52,
      label: 'Tiếp tục',
      detail: 'Đóng menu và quay lại màn đang chơi',
      onClick: () => this.scene.stop()
    });
    createTextButton(this, {
      x: panelX + panelWidth / 2,
      y: panelY + 192,
      width: panelWidth - 52,
      label: 'Save / Load',
      detail: 'Mở quản lý save slots',
      onClick: () => {
        this.resumeOnStop = false;
        this.scene.start(SCENE_KEYS.saveSlots, { returnScene });
      }
    });
    createTextButton(this, {
      x: panelX + panelWidth / 2,
      y: panelY + 252,
      width: panelWidth - 52,
      label: 'Settings',
      detail: 'Âm thanh, UI, animation, auto-save',
      onClick: () => {
        this.resumeOnStop = false;
        this.scene.start(SCENE_KEYS.settings, { returnScene });
      }
    });
    createTextButton(this, {
      x: panelX + panelWidth / 2,
      y: panelY + 312,
      width: panelWidth - 52,
      label: 'Main Menu',
      detail: 'Quay về menu chính',
      onClick: () => {
        this.resumeOnStop = false;
        if (returnScene !== SCENE_KEYS.mainMenu) {
          this.scene.stop(returnScene);
        }
        this.scene.start(SCENE_KEYS.mainMenu);
      }
    });

    const closeMenu = (): void => {
      this.scene.stop();
    };
    this.input.keyboard?.on('keydown-ESC', closeMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', closeMenu);
      if (this.resumeOnStop && returnScene !== SCENE_KEYS.mainMenu && this.scene.isPaused(returnScene)) {
        this.scene.resume(returnScene);
      }
    });
  }
}
