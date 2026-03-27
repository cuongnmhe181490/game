import Phaser from 'phaser';

import { SCENE_KEYS } from '@/game/scenes/sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#081014');
    this.scene.start(SCENE_KEYS.preload);
  }
}

