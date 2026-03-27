import { itemCatalog, realmCatalog, type ItemCategory, type ItemDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

export interface InventoryActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export class InventorySystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getItemDefinition(itemId: string): ItemDefinition | null {
    return itemCatalog.items.find((item) => item.id === itemId) ?? null;
  }

  getItemCount(itemId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): number {
    return snapshot.inventory.items[itemId] ?? 0;
  }

  hasItem(itemId: string, amount = 1, snapshot: Readonly<GameState> = this.stateManager.snapshot): boolean {
    return this.getItemCount(itemId, snapshot) >= Math.max(1, Math.trunc(amount));
  }

  listItems(snapshot: Readonly<GameState> = this.stateManager.snapshot): Array<{ definition: ItemDefinition; quantity: number }> {
    return itemCatalog.items
      .map((definition) => ({
        definition,
        quantity: this.getItemCount(definition.id, snapshot)
      }))
      .filter((entry) => entry.quantity > 0);
  }

  listItemsByCategory(
    category: ItemCategory,
    snapshot: Readonly<GameState> = this.stateManager.snapshot
  ): Array<{ definition: ItemDefinition; quantity: number }> {
    return this.listItems(snapshot).filter((entry) => entry.definition.category === category);
  }

  addItem(itemId: string, amount: number): Readonly<GameState> {
    const definition = this.getItemDefinition(itemId);
    const delta = Math.max(0, Math.trunc(amount));

    if (!definition || delta <= 0) {
      return this.stateManager.snapshot;
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.inventory.items[itemId] = (draft.inventory.items[itemId] ?? 0) + delta;
      draft.inventory.lastSummary = `Nhận ${delta} ${definition.name} vào kho tông môn.`;
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  removeItem(itemId: string, amount: number): Readonly<GameState> {
    const definition = this.getItemDefinition(itemId);
    const delta = Math.max(0, Math.trunc(amount));

    if (!definition || delta <= 0) {
      return this.stateManager.snapshot;
    }

    const snapshot = this.stateManager.update((draft) => {
      const next = Math.max(0, (draft.inventory.items[itemId] ?? 0) - delta);

      if (next > 0) {
        draft.inventory.items[itemId] = next;
      } else {
        delete draft.inventory.items[itemId];
        if (draft.inventory.equippedArtifactItemId === itemId) {
          draft.inventory.equippedArtifactItemId = null;
        }
      }

      draft.inventory.lastSummary = `Xuất ${delta} ${definition.name} khỏi kho tông môn.`;
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  useItem(itemId: string): InventoryActionResult {
    const before = this.stateManager.snapshot;
    const definition = this.getItemDefinition(itemId);

    if (!definition) {
      return { ok: false, message: 'Không tìm thấy vật phẩm.', snapshot: before };
    }

    if (!definition.usableEffect) {
      return { ok: false, message: `${definition.name} chưa có cách dùng trong sprint này.`, snapshot: before };
    }

    if (!this.hasItem(itemId, 1, before)) {
      return { ok: false, message: `${definition.name} không còn trong kho.`, snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.inventory.items[itemId] -= 1;
      if (draft.inventory.items[itemId] <= 0) {
        delete draft.inventory.items[itemId];
      }

      if (definition.usableEffect?.type === 'player_cultivation_progress') {
        const currentRealm = realmCatalog.realms.find((realm) => realm.id === draft.player.cultivation.currentRealmId)
          ?? realmCatalog.realms[0];
        draft.player.cultivation.cultivationProgress += definition.usableEffect.value;
        draft.player.cultivation.lastGain = definition.usableEffect.value;
        draft.player.cultivation.lastSummary = `${definition.name}: +${definition.usableEffect.value} tiến độ tu hành.`;
        draft.player.cultivation.breakthroughReady = draft.player.cultivation.cultivationProgress >= currentRealm.progressRequired;
      }

      if (definition.usableEffect?.type === 'foundation_stability') {
        draft.player.cultivation.foundationStability = Math.max(
          0,
          Math.min(100, draft.player.cultivation.foundationStability + definition.usableEffect.value)
        );

        if (typeof definition.usableEffect.tamMaPressureDelta === 'number') {
          draft.player.cultivation.tamMaPressure = Math.max(
            0,
            Math.min(100, draft.player.cultivation.tamMaPressure + definition.usableEffect.tamMaPressureDelta)
          );
        }

        draft.player.cultivation.lastSummary = `${definition.name}: ổn định khí tức và nền căn.`;
      }

      draft.inventory.lastSummary = `Đã dùng ${definition.name}.`;
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: `Đã dùng ${definition.name}.`, snapshot };
  }
}
