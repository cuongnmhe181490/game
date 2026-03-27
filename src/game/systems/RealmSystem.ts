import { buildingCatalog, realmCatalog, type RealmDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { BuildingId, GameState, RealmId, ResourceDeltaState } from '@/game/state/types';
import { RESOURCE_IDS } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { normalizeCatalogResourceDelta, ResourceSystem } from '@/game/systems/ResourceSystem';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';
import { TechniqueSystem } from '@/game/systems/TechniqueSystem';
import type { ArtifactPassiveBonuses } from '@/game/systems/ArtifactSystem';

export interface CultivationGainBreakdown {
  amount: number;
  summary: string;
  resourceDelta: ResourceDeltaState;
}

export interface BreakthroughCheckResult {
  eligible: boolean;
  reason: string;
  currentRealm: RealmDefinition;
  nextRealm: RealmDefinition | null;
}

export interface BreakthroughResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

export class RealmSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly resourceSystem: ResourceSystem,
    private readonly techniqueSystem: TechniqueSystem,
    private readonly artifactBonusesProvider?: { getPassiveBonuses(snapshot?: Readonly<GameState>): ArtifactPassiveBonuses },
    private readonly sectIdentitySystem?: SectIdentitySystem
  ) {}

  getCurrentRealm(snapshot: Readonly<GameState> = this.stateManager.snapshot): RealmDefinition {
    return realmCatalog.realms.find((realm) => realm.id === snapshot.player.cultivation.currentRealmId) ?? realmCatalog.realms[0];
  }

  getNextRealm(snapshot: Readonly<GameState> = this.stateManager.snapshot): RealmDefinition | null {
    const currentRealm = this.getCurrentRealm(snapshot);
    return realmCatalog.realms.find((realm) => realm.order === currentRealm.order + 1) ?? null;
  }

  addCultivationProgress(amount: number, reason = 'Tu hÃ nh thÃªm má»™t nhá»‹p.'): Readonly<GameState> {
    const gain = Math.max(0, Math.trunc(amount));
    const snapshot = this.stateManager.update((draft) => {
      this.applyCultivationGainToDraft(draft, gain, reason);
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  getDailyCultivationGain(snapshot: Readonly<GameState> = this.stateManager.snapshot): CultivationGainBreakdown {
    const cultivation = snapshot.player.cultivation;
    const currentRealm = this.getCurrentRealm(snapshot);
    const equipped = this.techniqueSystem.getEquippedPassiveEffects(snapshot);
    const artifactBonuses = this.artifactBonusesProvider?.getPassiveBonuses(snapshot) ?? {
      dailyCultivationProgressBonus: 0,
      explorationMaxHealthBonus: 0
    };
    const sectModifiers = this.sectIdentitySystem?.getCombinedModifiers(snapshot) ?? {};
    const tinhTuDuongLevel = snapshot.sect.buildings.tinh_tu_duong.level;
    const hoSonLevel = snapshot.sect.buildings.ho_son_tran_dai.level;
    const linhKhiBonus = typeof currentRealm.unlocks.dailyCultivationBaseBonus === 'number'
      ? currentRealm.unlocks.dailyCultivationBaseBonus
      : 0;

    let amount = 2 + linhKhiBonus;
    const lines: string[] = [`Ná»n cáº£nh giá»›i ${currentRealm.name}: +${2 + linhKhiBonus}`];

    if (cultivation.cultivationMode === 'focused') {
      amount += 2;
      lines.push('Cháº¿ Ä‘á»™ tá»¥ khÃ­: +2');
    } else {
      amount += 1;
      lines.push('Cháº¿ Ä‘á»™ bÃ¬nh á»•n: +1');
    }

    if (tinhTuDuongLevel > 0) {
      amount += tinhTuDuongLevel;
      lines.push(`TÄ©nh Tu ÄÆ°á»ng: +${tinhTuDuongLevel}`);
    }

    if (typeof equipped.dailyCultivationProgress === 'number' && equipped.dailyCultivationProgress > 0) {
      amount += equipped.dailyCultivationProgress;
      lines.push(`CÃ´ng phÃ¡p chÃ­nh: +${equipped.dailyCultivationProgress}`);
    }

    if (artifactBonuses.dailyCultivationProgressBonus > 0) {
      amount += artifactBonuses.dailyCultivationProgressBonus;
      lines.push(`PhÃ¡p khÃ­ há»™ thÃ¢n: +${artifactBonuses.dailyCultivationProgressBonus}`);
    }

    if ((sectModifiers.playerCultivationDaily ?? 0) !== 0) {
      amount += sectModifiers.playerCultivationDaily ?? 0;
      lines.push(`Tri mon va noi quy: ${(sectModifiers.playerCultivationDaily ?? 0) > 0 ? '+' : ''}${sectModifiers.playerCultivationDaily ?? 0}`);
    }

    const resourceDelta: ResourceDeltaState = {};

    if (typeof equipped.linhKhiDailyBonus === 'number' && equipped.linhKhiDailyBonus > 0) {
      resourceDelta.linhKhi = equipped.linhKhiDailyBonus;
      lines.push(`Äiá»u tá»©c linh khÃ­: +${equipped.linhKhiDailyBonus} linhKhi`);
    }

    if (cultivation.foundationStability < 40) {
      amount -= 1;
      lines.push('Ná»n cÄƒn xao Ä‘á»™ng: -1');
    }

    if (cultivation.foundationStability < 25) {
      amount -= 1;
      lines.push('Ná»n cÄƒn suy thÃªm: -1');
    }

    if (cultivation.tamMaPressure >= 30) {
      amount -= 1;
      lines.push('TÃ¢m ma Ã¡p lá»±c: -1');
    }

    if (cultivation.tamMaPressure >= 60) {
      amount -= 1;
      lines.push('TÃ¢m niá»‡m nhiá»…u náº·ng: -1');
    }

    if (hoSonLevel > 0 && cultivation.cultivationMode === 'balanced') {
      lines.push(`Há»™ SÆ¡n Tráº­n ÄÃ i giá»¯ tÃ¢m: -${hoSonLevel} tÃ¢m ma`);
    }

    return {
      amount: Math.max(0, amount),
      summary: lines.join('\n'),
      resourceDelta
    };
  }

  checkBreakthroughEligibility(snapshot: Readonly<GameState> = this.stateManager.snapshot): BreakthroughCheckResult {
    const currentRealm = this.getCurrentRealm(snapshot);
    const nextRealm = this.getNextRealm(snapshot);

    if (!nextRealm) {
      return {
        eligible: false,
        reason: 'Da cham gioi han canh gioi hien co cua base game. Hoa Than tro len thuoc mach mo rong hau ket chua mo.',
        currentRealm,
        nextRealm: null
      };
    }

    if (snapshot.player.cultivation.cultivationProgress < currentRealm.progressRequired) {
      return {
        eligible: false,
        reason: `Tiáº¿n Ä‘á»™ chÆ°a Ä‘á»§ Ä‘á»ƒ vÆ°á»£t ${currentRealm.name}.`,
        currentRealm,
        nextRealm
      };
    }

    const missingBuilding = nextRealm.breakthroughRequirements.requiredBuildings.find((buildingId) => {
      return !snapshot.sect.buildings[buildingId as BuildingId]?.isConstructed;
    });

    if (missingBuilding) {
      const buildingName = buildingCatalog.buildings.find((entry) => entry.id === missingBuilding)?.name ?? missingBuilding;
      return {
        eligible: false,
        reason: `Thiáº¿u cÃ´ng trÃ¬nh cáº§n cho Ä‘á»™t phÃ¡: ${buildingName}.`,
        currentRealm,
        nextRealm
      };
    }

    const cost = normalizeCatalogResourceDelta(nextRealm.breakthroughRequirements.requiredResources);

    if (!this.resourceSystem.canAfford(this.toNegativeDelta(cost))) {
      return {
        eligible: false,
        reason: `TÃ i nguyÃªn chÆ°a Ä‘á»§ Ä‘á»ƒ Ä‘á»™t phÃ¡ ${nextRealm.name}.`,
        currentRealm,
        nextRealm
      };
    }

    const missingFlag = nextRealm.breakthroughRequirements.requiredFlags.find((flag) => !snapshot.story.storyFlags.includes(flag));

    if (missingFlag) {
      return {
        eligible: false,
        reason: `ChÆ°a Ä‘áº¡t Ä‘iá»u kiá»‡n truyá»‡n: ${missingFlag}.`,
        currentRealm,
        nextRealm
      };
    }

    return {
      eligible: true,
      reason: `Äá»§ Ä‘iá»u kiá»‡n Ä‘á»™t phÃ¡ lÃªn ${nextRealm.name}.`,
      currentRealm,
      nextRealm
    };
  }

  performBreakthrough(): BreakthroughResult {
    const before = this.stateManager.snapshot;
    const check = this.checkBreakthroughEligibility(before);

    if (!check.eligible || !check.nextRealm) {
      return {
        ok: false,
        message: check.reason,
        snapshot: before
      };
    }

    const nextRealm = check.nextRealm;
    const cost = normalizeCatalogResourceDelta(nextRealm.breakthroughRequirements.requiredResources);
    const equippedEffects = this.techniqueSystem.getEquippedPassiveEffects(before);

    const snapshot = this.stateManager.update((draft) => {
      for (const resourceId of RESOURCE_IDS) {
        draft.resources[resourceId] = Math.max(0, draft.resources[resourceId] - (cost[resourceId] ?? 0));
      }

      const cultivation = draft.player.cultivation;
      cultivation.currentRealmId = nextRealm.id as RealmId;
      cultivation.cultivationProgress = Math.max(0, cultivation.cultivationProgress - check.currentRealm.progressRequired);
      cultivation.breakthroughReady = false;
      cultivation.foundationStability = clampPercent(
        cultivation.foundationStability
          - (cultivation.foundationStability < 50 ? 4 : 2)
          + (equippedEffects.foundationStabilityBonus ?? 0)
          + (typeof nextRealm.unlocks.foundationStabilityBonus === 'number' ? nextRealm.unlocks.foundationStabilityBonus : 0)
      );
      cultivation.tamMaPressure = clampPercent(
        cultivation.tamMaPressure
          + (cultivation.foundationStability < 45 ? 6 : 2)
          - (equippedEffects.tamMaPressureMitigation ?? 0)
      );
      cultivation.lastSummary = `ÄÃ£ Ä‘á»™t phÃ¡ lÃªn ${nextRealm.name}.`;
      this.applyRealmUnlocks(draft, nextRealm);

      const reachedFlag = `realm_${nextRealm.id}_reached`;
      if (!draft.story.storyFlags.includes(reachedFlag)) {
        draft.story.storyFlags.push(reachedFlag);
      }

      if (!draft.story.storyFlags.includes('first_breakthrough_done')) {
        draft.story.storyFlags.push('first_breakthrough_done');
      }

      draft.ui.statusMessage = `ÄÃ£ Ä‘á»™t phÃ¡ lÃªn ${nextRealm.name}.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `ÄÃ£ Ä‘á»™t phÃ¡ lÃªn ${nextRealm.name}.`,
      snapshot
    };
  }

  applyDailyCultivationInDraft(draft: GameState): CultivationGainBreakdown {
    const gain = this.getDailyCultivationGain(draft);
    this.applyCultivationGainToDraft(draft, gain.amount, gain.summary);

    for (const resourceId of RESOURCE_IDS) {
      const value = gain.resourceDelta[resourceId] ?? 0;
      if (value !== 0) {
        draft.resources[resourceId] = Math.max(0, draft.resources[resourceId] + value);
      }
    }

    if (draft.sect.buildings.ho_son_tran_dai.level > 0 && draft.player.cultivation.cultivationMode === 'balanced') {
      draft.player.cultivation.tamMaPressure = clampPercent(
        draft.player.cultivation.tamMaPressure - draft.sect.buildings.ho_son_tran_dai.level
      );
    }

    return gain;
  }

  private applyCultivationGainToDraft(draft: GameState, amount: number, summary: string): void {
    const cultivation = draft.player.cultivation;
    const currentRealm = this.getCurrentRealm(draft);
    cultivation.cultivationProgress = Math.max(0, cultivation.cultivationProgress + Math.max(0, Math.trunc(amount)));
    cultivation.lastGain = Math.max(0, Math.trunc(amount));
    cultivation.lastSummary = summary;
    cultivation.breakthroughReady = cultivation.cultivationProgress >= currentRealm.progressRequired
      && this.checkBreakthroughEligibility(draft).eligible;
  }

  private applyRealmUnlocks(draft: GameState, realm: RealmDefinition): void {
    if (typeof realm.unlocks.sectPrestigeBonus === 'number') {
      draft.sect.prestige += realm.unlocks.sectPrestigeBonus;
    }
  }

  private toNegativeDelta(cost: ResourceDeltaState): ResourceDeltaState {
    const result: ResourceDeltaState = {};

    for (const resourceId of RESOURCE_IDS) {
      const value = cost[resourceId] ?? 0;
      if (value > 0) {
        result[resourceId] = -value;
      }
    }

    return result;
  }
}

