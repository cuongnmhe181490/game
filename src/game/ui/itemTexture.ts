import Phaser from 'phaser';

import { Items } from '@/game/config/assets';

export function findDedicatedItemTextureKey(
  scene: Phaser.Scene,
  itemId: string,
  category: string
): string | undefined {
  const candidates = [
    `item_${category}_${itemId}_01`,
    `item_pill_${itemId}_01`,
    `item_material_${itemId}_01`,
    `item_artifact_${itemId}_01`,
    `item_relic_${itemId}_01`,
    `item_quest_${itemId}_01`,
    `item_misc_${itemId}_01`,
    `item_ore_${itemId}_01`,
    `item_herb_${itemId}_01`
  ];

  return candidates.find((key) => scene.textures.exists(key));
}

export function getFallbackItemTextureKey(category: string): string {
  switch (category) {
    case 'pill':
      return Items.pill.spirit;
    case 'artifact':
      return Items.artifact.talisman;
    case 'quest':
      return Items.relic.ancientScroll;
    default:
      return Items.artifact.talisman;
  }
}

export function resolveItemTextureKey(
  scene: Phaser.Scene,
  itemId: string,
  category: string
): string | undefined {
  return findDedicatedItemTextureKey(scene, itemId, category) ?? getFallbackItemTextureKey(category);
}
