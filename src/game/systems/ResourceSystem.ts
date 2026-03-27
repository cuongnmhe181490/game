import { buildingCatalog } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { BuildingId, GameState, ResourceDeltaState, ResourceId } from '@/game/state/types';
import { RESOURCE_IDS } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

const LEGACY_RESOURCE_MAP: Record<string, ResourceId> = {
  spiritStone: 'linhThach',
  food: 'linhKhi',
  herbs: 'duocThao',
  wood: 'linhMoc'
};

function clampResourceValue(value: number): number {
  return Math.max(0, Math.trunc(value));
}

export function normalizeCatalogResourceDelta(
  delta?: Record<string, number> | Partial<Record<ResourceId, number>>
): ResourceDeltaState {
  const result: ResourceDeltaState = {};

  if (!delta) {
    return result;
  }

  for (const [key, value] of Object.entries(delta)) {
    if (typeof value !== 'number') {
      continue;
    }

    const mappedKey = (RESOURCE_IDS.includes(key as ResourceId) ? key : LEGACY_RESOURCE_MAP[key]) as ResourceId | undefined;

    if (!mappedKey) {
      continue;
    }

    result[mappedKey] = (result[mappedKey] ?? 0) + Math.trunc(value);
  }

  return result;
}

export class ResourceSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  canAfford(cost: ResourceDeltaState): boolean {
    const snapshot = this.stateManager.snapshot;

    return RESOURCE_IDS.every((resourceId) => snapshot.resources[resourceId] + (cost[resourceId] ?? 0) >= 0);
  }

  add(resourceId: ResourceId, amount: number): Readonly<GameState> {
    return this.applyDelta({
      [resourceId]: Math.abs(Math.trunc(amount))
    });
  }

  subtract(resourceId: ResourceId, amount: number): Readonly<GameState> {
    return this.applyDelta({
      [resourceId]: -Math.abs(Math.trunc(amount))
    });
  }

  applyDelta(delta: ResourceDeltaState): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      for (const resourceId of RESOURCE_IDS) {
        const change = delta[resourceId] ?? 0;

        if (change === 0) {
          continue;
        }

        draft.resources[resourceId] = clampResourceValue(draft.resources[resourceId] + change);
      }
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  getDailyProduction(snapshot: Readonly<GameState>): ResourceDeltaState {
    const production: ResourceDeltaState = {
      linhThach: 0,
      linhKhi: 0,
      duocThao: 0,
      khoangThach: 0,
      linhMoc: 0
    };

    for (const building of buildingCatalog.buildings) {
      const level = snapshot.sect.buildings[building.id as BuildingId]?.level ?? 0;

      if (level <= 0) {
        continue;
      }

      const mapped = normalizeCatalogResourceDelta(building.productionPerDay as Record<string, number>);

      for (const resourceId of RESOURCE_IDS) {
        production[resourceId] = (production[resourceId] ?? 0) + (mapped[resourceId] ?? 0) * level;
      }
    }

    production.linhKhi = (production.linhKhi ?? 0) + 2 + snapshot.sect.buildings.tinh_tu_duong.level;
    production.linhThach = (production.linhThach ?? 0) + snapshot.sect.buildings.linh_thach_kho.level;
    production.duocThao = (production.duocThao ?? 0) + snapshot.sect.buildings.duoc_vien.level * 2;
    production.khoangThach = (production.khoangThach ?? 0) + Math.max(1, snapshot.sect.buildings.chinh_dien.level);
    production.linhMoc = (production.linhMoc ?? 0) + 1 + snapshot.sect.buildings.chinh_dien.level;

    return production;
  }
}
