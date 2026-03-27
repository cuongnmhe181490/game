import { realmCatalog, techniqueCatalog, type TechniqueDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState, RealmId } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

export interface TechniqueActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

function getRealmOrder(realmId: RealmId | string): number {
  return realmCatalog.realms.find((realm) => realm.id === realmId)?.order ?? 0;
}

export class TechniqueSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getTechniqueDefinition(techniqueId: string): TechniqueDefinition | null {
    return techniqueCatalog.techniques.find((entry) => entry.id === techniqueId) ?? null;
  }

  getKnownTechniques(snapshot: Readonly<GameState> = this.stateManager.snapshot): TechniqueDefinition[] {
    return snapshot.player.cultivation.knownTechniqueIds
      .map((techniqueId) => this.getTechniqueDefinition(techniqueId))
      .filter((entry): entry is TechniqueDefinition => Boolean(entry));
  }

  getEquippedTechnique(snapshot: Readonly<GameState> = this.stateManager.snapshot): TechniqueDefinition | null {
    const equippedId = snapshot.player.cultivation.equippedMainTechniqueId;
    return equippedId ? this.getTechniqueDefinition(equippedId) : null;
  }

  getEquippedPassiveEffects(snapshot: Readonly<GameState> = this.stateManager.snapshot): TechniqueDefinition['passiveEffects'] {
    return this.getEquippedTechnique(snapshot)?.passiveEffects ?? {};
  }

  getLearnableTechniques(snapshot: Readonly<GameState> = this.stateManager.snapshot): TechniqueDefinition[] {
    return techniqueCatalog.techniques.filter((technique) => {
      return !snapshot.player.cultivation.knownTechniqueIds.includes(technique.id)
        && getRealmOrder(snapshot.player.cultivation.currentRealmId) >= getRealmOrder(technique.requiredRealm);
    });
  }

  canLearnTechnique(techniqueId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): { ok: boolean; reason: string } {
    const definition = this.getTechniqueDefinition(techniqueId);

    if (!definition) {
      return { ok: false, reason: 'Không tìm thấy công pháp.' };
    }

    if (snapshot.player.cultivation.knownTechniqueIds.includes(techniqueId)) {
      return { ok: false, reason: `${definition.name} đã được học.` };
    }

    if (getRealmOrder(snapshot.player.cultivation.currentRealmId) < getRealmOrder(definition.requiredRealm)) {
      return { ok: false, reason: `${definition.name} yêu cầu cảnh giới cao hơn.` };
    }

    return { ok: true, reason: 'ok' };
  }

  learnTechnique(techniqueId: string): TechniqueActionResult {
    const before = this.stateManager.snapshot;
    const evaluation = this.canLearnTechnique(techniqueId, before);
    const definition = this.getTechniqueDefinition(techniqueId);

    if (!evaluation.ok || !definition) {
      return {
        ok: false,
        message: evaluation.reason,
        snapshot: before
      };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.player.cultivation.knownTechniqueIds.push(techniqueId);
      draft.ui.statusMessage = `Đã lĩnh hội ${definition.name}.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `Đã lĩnh hội ${definition.name}.`,
      snapshot
    };
  }

  equipMainTechnique(techniqueId: string): TechniqueActionResult {
    const before = this.stateManager.snapshot;
    const definition = this.getTechniqueDefinition(techniqueId);

    if (!definition) {
      return {
        ok: false,
        message: 'Không tìm thấy công pháp.',
        snapshot: before
      };
    }

    if (!before.player.cultivation.knownTechniqueIds.includes(techniqueId)) {
      return {
        ok: false,
        message: `${definition.name} chưa được học.`,
        snapshot: before
      };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.player.cultivation.equippedMainTechniqueId = techniqueId;
      draft.ui.statusMessage = `Đã lấy ${definition.name} làm công pháp chính.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `Đã lấy ${definition.name} làm công pháp chính.`,
      snapshot
    };
  }
}
