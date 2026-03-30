import Phaser from 'phaser';

import { Enemies } from '@/game/config/assets';
import type { BeastDefinition } from '@/game/data';

export function getExpectedBeastPortraitKey(beastId: string): string {
  return `beast_portrait_${beastId}_01`;
}

export function findDedicatedBeastPortraitKey(
  scene: Phaser.Scene,
  beastId: string,
  portraitKey?: string | null
): string | undefined {
  const candidates = [portraitKey, getExpectedBeastPortraitKey(beastId)].filter(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0
  );

  return candidates.find((key) => scene.textures.exists(key));
}

export function resolveBeastPortraitKey(scene: Phaser.Scene, definition: BeastDefinition): string {
  return (
    findDedicatedBeastPortraitKey(scene, definition.id, definition.portraitKey) ??
    (definition.fallbackPortraitKey && scene.textures.exists(definition.fallbackPortraitKey)
      ? definition.fallbackPortraitKey
      : Enemies.demonBeast)
  );
}
