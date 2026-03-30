import Phaser from 'phaser';

import { assetManifest, type AssetManifestEntry } from '@/game/config/assetManifest';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { menuPalette } from '@/game/ui/theme';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  private queueAsset(entry: AssetManifestEntry): void {
    if (entry.type === 'svg') {
      this.load.svg(entry.key, entry.path, entry.svgConfig);
      return;
    }

    this.load.image(entry.key, entry.path);
  }

  preload(): void {
    const { width, height } = this.scale;
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();

    this.cameras.main.setBackgroundColor(menuPalette.background);

    progressBox.fillStyle(menuPalette.panel, 0.95);
    progressBox.fillRoundedRect(width * 0.2, height * 0.72, width * 0.6, 28, 12);
    progressBox.lineStyle(1, menuPalette.frame, 1);
    progressBox.strokeRoundedRect(width * 0.2, height * 0.72, width * 0.6, 28, 12);

    this.add.text(width / 2, height * 0.28, 'Mo son mon', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '36px'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.35, 'Dang khoi phuc save, dung giao dien, va chuan bi ban base game...', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '18px'
    }).setOrigin(0.5);

    const progressText = this.add.text(width / 2, height * 0.78, 'Dang tai tai nguyen...', {
      color: menuPalette.textSoft,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px'
    }).setOrigin(0.5);

    const handleProgress = (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(menuPalette.accent, 1);
      progressBar.fillRoundedRect(width * 0.205, height * 0.727, width * 0.59 * value, 14, 8);
    };

    const handleLoadError = (file: Phaser.Loader.File) => {
      if (file.key === 'sect-crest' || file.key === 'icon_ui_sect_crest') {
        progressText.setText('Khong tai duoc bieu trung tong mon. Game van tiep tuc voi giao dien du phong.');
        return;
      }

      progressText.setText(`Thieu tai nguyen tuy chon: ${file.key}`);
    };

    const cleanupLoadListeners = () => {
      this.load.off('progress', handleProgress);
      this.load.off('loaderror', handleLoadError);
    };

    this.load.on('progress', handleProgress);
    this.load.on('loaderror', handleLoadError);

    this.load.once('complete', () => {
      cleanupLoadListeners();
      progressBar.destroy();
      progressBox.destroy();
      progressText.setText('Tai xong. Dang vao menu chinh...');

      this.time.delayedCall(180, () => {
        this.scene.start(SCENE_KEYS.mainMenu);
      });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupLoadListeners);

    assetManifest.forEach((entry) => this.queueAsset(entry));
  }
}
