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
    this.resumeOnStop = true;

    if (returnScene !== SCENE_KEYS.mainMenu && this.scene.isActive(returnScene)) {
      this.scene.pause(returnScene);
    }

    this.cameras.main.setBackgroundColor('rgba(4,8,8,0.78)');
    drawInsetPanel(this, { x: 400, y: 150, width: 480, height: 420, fill: menuPalette.panel, alpha: 0.96 });

    this.add.text(438, 188, 'Menu tam dung', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: '30px'
    });
    this.add.text(440, 232, 'Co the tiep tuc, mo Save Slots, Settings, hoac quay ve main menu.', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      wordWrap: { width: 400 }
    });

    createTextButton(this, {
      x: 640,
      y: 302,
      width: 300,
      label: 'Tiep tuc',
      detail: 'Dong menu va quay lai man dang choi',
      onClick: () => this.scene.stop()
    });
    createTextButton(this, {
      x: 640,
      y: 364,
      width: 300,
      label: 'Save / Load',
      detail: 'Mo quan ly save slots',
      onClick: () => {
        this.resumeOnStop = false;
        this.scene.start(SCENE_KEYS.saveSlots, { returnScene });
      }
    });
    createTextButton(this, {
      x: 640,
      y: 426,
      width: 300,
      label: 'Settings',
      detail: 'Audio, UI, animation, auto-save',
      onClick: () => {
        this.resumeOnStop = false;
        this.scene.start(SCENE_KEYS.settings, { returnScene });
      }
    });
    createTextButton(this, {
      x: 640,
      y: 488,
      width: 300,
      label: 'Main Menu',
      detail: 'Quay ve menu chinh',
      onClick: () => {
        this.resumeOnStop = false;
        if (returnScene !== SCENE_KEYS.mainMenu) {
          this.scene.stop(returnScene);
        }
        this.scene.start(SCENE_KEYS.mainMenu);
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.stop());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners('keydown-ESC');
      if (this.resumeOnStop && returnScene !== SCENE_KEYS.mainMenu && this.scene.isPaused(returnScene)) {
        this.scene.resume(returnScene);
      }
    });
  }
}
