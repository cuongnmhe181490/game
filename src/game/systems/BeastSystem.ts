import { beastCatalog, type BeastDefinition, type BeastRarity } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState, OwnedBeastState } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

export interface BeastActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface BeastView {
  state: OwnedBeastState;
  definition: BeastDefinition;
}

export interface BeastExplorationBonuses {
  activeBeastId: string | null;
  activeBeastName: string | null;
  attackBonus: number;
  maxHealthBonus: number;
  summary: string;
}

const UPGRADE_COST_BASE = 18;
const TRAIN_COST_BASE = 10;

const RARITY_GROWTH: Record<BeastRarity, { attack: number; defense: number; health: number }> = {
  common: { attack: 2, defense: 1, health: 5 },
  uncommon: { attack: 2, defense: 2, health: 6 },
  rare: { attack: 3, defense: 2, health: 7 },
  epic: { attack: 4, defense: 3, health: 8 },
  legendary: { attack: 5, defense: 4, health: 10 }
};

export class BeastSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getDefinition(beastId: string): BeastDefinition | null {
    return beastCatalog.beasts.find((entry) => entry.id === beastId) ?? null;
  }

  listOwned(snapshot: Readonly<GameState> = this.stateManager.snapshot): BeastView[] {
    return snapshot.beasts.owned
      .map((state) => {
        const definition = this.getDefinition(state.beastId);
        return definition ? { state, definition } : null;
      })
      .filter((entry): entry is BeastView => entry !== null);
  }

  getExplorationBonuses(snapshot: Readonly<GameState> = this.stateManager.snapshot): BeastExplorationBonuses {
    const active = this.listOwned(snapshot).find((entry) => entry.state.beastId === snapshot.beasts.activeBeastId) ?? null;

    if (!active) {
      return {
        activeBeastId: null,
        activeBeastName: null,
        attackBonus: 0,
        maxHealthBonus: 0,
        summary: 'Chưa có linh thú đồng hành trong chuyến đi.'
      };
    }

    const attackBonus = Math.max(0, Math.floor(active.state.level / 2) + Math.floor(active.state.training / 3));
    const maxHealthBonus = Math.max(0, Math.floor(active.state.defense / 4) + active.state.training);

    return {
      activeBeastId: active.state.beastId,
      activeBeastName: active.definition.name,
      attackBonus,
      maxHealthBonus,
      summary: `${active.definition.name} hỗ trợ +${attackBonus} tấn công và +${maxHealthBonus} sinh lực khi thám hiểm.`
    };
  }

  getUpgradeCost(beastId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): number {
    const state = snapshot.beasts.owned.find((entry) => entry.beastId === beastId);
    if (!state) {
      return UPGRADE_COST_BASE;
    }

    return UPGRADE_COST_BASE + (state.level - 1) * 12;
  }

  getTrainCost(beastId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): number {
    const state = snapshot.beasts.owned.find((entry) => entry.beastId === beastId);
    if (!state) {
      return TRAIN_COST_BASE;
    }

    return TRAIN_COST_BASE + state.training * 6;
  }

  canUpgrade(beastId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): { ok: boolean; reason: string } {
    const beast = this.listOwned(snapshot).find((entry) => entry.state.beastId === beastId);
    if (!beast) {
      return { ok: false, reason: 'Không tìm thấy linh thú.' };
    }

    if (beast.state.level >= 5) {
      return { ok: false, reason: `${beast.definition.name} đã đạt cấp tối đa tạm thời.` };
    }

    const cost = this.getUpgradeCost(beastId, snapshot);
    if (snapshot.resources.linhThach < cost) {
      return { ok: false, reason: `Cần ${cost} Linh Thạch để nâng cấp.` };
    }

    return { ok: true, reason: 'ok' };
  }

  canTrain(beastId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): { ok: boolean; reason: string } {
    const beast = this.listOwned(snapshot).find((entry) => entry.state.beastId === beastId);
    if (!beast) {
      return { ok: false, reason: 'Không tìm thấy linh thú.' };
    }

    if (beast.state.training >= beast.state.level * 3) {
      return { ok: false, reason: 'Linh thú cần nâng cấp trước khi tiếp tục huấn luyện sâu hơn.' };
    }

    const cost = this.getTrainCost(beastId, snapshot);
    if (snapshot.resources.linhKhi < cost) {
      return { ok: false, reason: `Cần ${cost} Linh Lực để huấn luyện.` };
    }

    return { ok: true, reason: 'ok' };
  }

  upgrade(beastId: string): BeastActionResult {
    const before = this.stateManager.snapshot;
    const evaluation = this.canUpgrade(beastId, before);
    const definition = this.getDefinition(beastId);

    if (!evaluation.ok || !definition) {
      return { ok: false, message: evaluation.reason, snapshot: before };
    }

    const growth = RARITY_GROWTH[definition.rarity];
    const cost = this.getUpgradeCost(beastId, before);
    const snapshot = this.stateManager.update((draft) => {
      const beast = draft.beasts.owned.find((entry) => entry.beastId === beastId);
      if (!beast) {
        return;
      }

      draft.resources.linhThach = Math.max(0, draft.resources.linhThach - cost);
      beast.level += 1;
      beast.attack += growth.attack;
      beast.defense += growth.defense;
      beast.health += growth.health;
      draft.beasts.lastSummary = `${definition.name} đã tăng lên cấp ${beast.level}, khí tức ổn định hơn và linh áp dày thêm.`;
      draft.ui.statusMessage = draft.beasts.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.beasts.lastSummary, snapshot };
  }

  train(beastId: string): BeastActionResult {
    const before = this.stateManager.snapshot;
    const evaluation = this.canTrain(beastId, before);
    const definition = this.getDefinition(beastId);

    if (!evaluation.ok || !definition) {
      return { ok: false, message: evaluation.reason, snapshot: before };
    }

    const cost = this.getTrainCost(beastId, before);
    const snapshot = this.stateManager.update((draft) => {
      const beast = draft.beasts.owned.find((entry) => entry.beastId === beastId);
      if (!beast) {
        return;
      }

      draft.resources.linhKhi = Math.max(0, draft.resources.linhKhi - cost);
      beast.training += 1;
      beast.attack += 1;
      beast.defense += 1;
      beast.health += 3;
      draft.beasts.lastSummary = `${definition.name} vừa hoàn thành một nhịp huấn luyện, phối hợp tốt hơn với tiết tấu của sơn môn.`;
      draft.ui.statusMessage = draft.beasts.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.beasts.lastSummary, snapshot };
  }
}
