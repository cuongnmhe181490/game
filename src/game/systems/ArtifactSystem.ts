import { itemCatalog, type ArtifactEffectDefinition, type ItemDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

export interface ArtifactActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface ArtifactPassiveBonuses {
  dailyCultivationProgressBonus: number;
  explorationMaxHealthBonus: number;
}

function getEffectValue(effect: ArtifactEffectDefinition | undefined, type: ArtifactEffectDefinition['type']): number {
  return effect?.type === type ? effect.value : 0;
}

export class ArtifactSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getArtifactDefinition(itemId: string): ItemDefinition | null {
    const definition = itemCatalog.items.find((item) => item.id === itemId && item.category === 'artifact');
    return definition ?? null;
  }

  getEquippedArtifact(snapshot: Readonly<GameState> = this.stateManager.snapshot): ItemDefinition | null {
    const equippedId = snapshot.inventory.equippedArtifactItemId;
    return equippedId ? this.getArtifactDefinition(equippedId) : null;
  }

  getPassiveBonuses(snapshot: Readonly<GameState> = this.stateManager.snapshot): ArtifactPassiveBonuses {
    const equipped = this.getEquippedArtifact(snapshot);
    return {
      dailyCultivationProgressBonus: getEffectValue(equipped?.artifactEffect, 'daily_cultivation_progress'),
      explorationMaxHealthBonus: getEffectValue(equipped?.artifactEffect, 'exploration_max_health')
    };
  }

  equipArtifact(itemId: string): ArtifactActionResult {
    const before = this.stateManager.snapshot;
    const definition = this.getArtifactDefinition(itemId);

    if (!definition) {
      return { ok: false, message: 'Không tìm thấy pháp khí.', snapshot: before };
    }

    if ((before.inventory.items[itemId] ?? 0) <= 0) {
      return { ok: false, message: `${definition.name} không có trong kho.`, snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.inventory.equippedArtifactItemId = itemId;
      draft.inventory.lastSummary = `Đã trang bị ${definition.name}.`;
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: `Đã trang bị ${definition.name}.`, snapshot };
  }

  unequipArtifact(): ArtifactActionResult {
    const before = this.stateManager.snapshot;
    const equipped = this.getEquippedArtifact(before);

    if (!equipped) {
      return { ok: false, message: 'Chưa có pháp khí nào được trang bị.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.inventory.equippedArtifactItemId = null;
      draft.inventory.lastSummary = `Đã tháo ${equipped.name}.`;
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: `Đã tháo ${equipped.name}.`, snapshot };
  }
}
