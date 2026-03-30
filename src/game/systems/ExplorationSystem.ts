import {
  bossCatalog,
  explorationEventCatalog,
  explorationMapCatalog,
  enemyCatalog,
  type BossDefinition,
  type EnemyDefinition,
  type ExplorationEventDefinition,
  type ExplorationMapDefinition
} from '@/game/data';
import type { ExplorationCombatProfile, ExplorationRunOutcome } from '@/game/entities';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState, ResourceDeltaState } from '@/game/state/types';
import { ArtifactSystem } from '@/game/systems/ArtifactSystem';
import { BeastSystem } from '@/game/systems/BeastSystem';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
import { InventorySystem } from '@/game/systems/InventorySystem';
import { ResourceSystem } from '@/game/systems/ResourceSystem';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

function addDelta(target: ResourceDeltaState, source: ResourceDeltaState): ResourceDeltaState {
  const next: ResourceDeltaState = { ...target };

  for (const [resourceId, value] of Object.entries(source)) {
    if (typeof value !== 'number' || value === 0) {
      continue;
    }

    const key = resourceId as keyof ResourceDeltaState;
    next[key] = (next[key] ?? 0) + Math.trunc(value);
  }

  return next;
}

function addItemAmount(target: Record<string, number>, itemId: string, amount: number): void {
  const delta = Math.max(0, Math.trunc(amount));
  if (delta <= 0) {
    return;
  }

  target[itemId] = (target[itemId] ?? 0) + delta;
}

function formatRewards(rewards: ResourceDeltaState): string {
  const labels: Record<string, string> = {
    linhThach: 'linh thach',
    linhKhi: 'linh khi',
    duocThao: 'duoc thao',
    khoangThach: 'khoang thach',
    linhMoc: 'linh moc'
  };

  const entries = Object.entries(rewards).filter(([, value]) => typeof value === 'number' && value > 0);
  return entries.map(([key, value]) => `+${value} ${labels[key] ?? key}`).join(', ') || 'khong thu duoc gi';
}

function getRealmOrder(realmId: string): number {
  const orderMap: Record<string, number> = {
    pham_the: 1,
    luyen_khi: 2,
    truc_co: 3,
    kim_dan: 4,
    nguyen_anh: 5
  };

  return orderMap[realmId] ?? 1;
}

function getChapterOrder(chapterId: string): number {
  const orderMap: Record<string, number> = {
    chapter_1_du_tan_khai_son: 1,
    chapter_2_tong_mon_lap_the: 2,
    chapter_3_kinh_chieu_cuu_thien: 3,
    chapter_4_nhat_niem_dinh_dao: 4
  };

  return orderMap[chapterId] ?? 1;
}

export interface ExplorationActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export class ExplorationSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly resourceSystem: ResourceSystem,
    private readonly inventorySystem: InventorySystem,
    private readonly artifactSystem: ArtifactSystem,
    private readonly beastSystem: BeastSystem,
    private readonly discipleSystem: DiscipleSystem
  ) {}

  getMaps(): ExplorationMapDefinition[] {
    return explorationMapCatalog.maps;
  }

  getMapDefinition(mapId: string): ExplorationMapDefinition | null {
    return explorationMapCatalog.maps.find((map) => map.id === mapId) ?? null;
  }

  getStarterMap(): ExplorationMapDefinition {
    return explorationMapCatalog.maps[0];
  }

  getEnemyDefinition(enemyId: string): EnemyDefinition | null {
    return enemyCatalog.enemies.find((enemy) => enemy.id === enemyId) ?? null;
  }

  getBossDefinition(bossId: string): BossDefinition | null {
    return bossCatalog.bosses.find((boss) => boss.id === bossId) ?? null;
  }

  getExplorationEvent(eventId: string): ExplorationEventDefinition | null {
    return explorationEventCatalog.events.find((event) => event.id === eventId) ?? null;
  }

  isMapUnlocked(mapId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): boolean {
    const definition = this.getMapDefinition(mapId);

    if (!definition) {
      return false;
    }

    return snapshot.exploration.unlockedMapIds.includes(mapId) || this.meetsUnlockConditions(definition, snapshot);
  }

  canEnterMap(mapId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): { ok: boolean; reason: string } {
    const definition = this.getMapDefinition(mapId);

    if (!definition) {
      return { ok: false, reason: 'Khong tim thay khu vuc tham hiem.' };
    }

    if (!this.isMapUnlocked(mapId, snapshot)) {
      return { ok: false, reason: `${definition.name} chua mo.` };
    }

    if (definition.secretRealmConfig) {
      const lastEntryDay = snapshot.exploration.secretRealmLastEntryDays[mapId] ?? 0;
      const daysSinceLastEntry = snapshot.time.day - lastEntryDay;

      if (lastEntryDay > 0 && daysSinceLastEntry < definition.secretRealmConfig.entryCooldownDays) {
        const remaining = definition.secretRealmConfig.entryCooldownDays - daysSinceLastEntry;
        return { ok: false, reason: `${definition.name} tam dong kin. Can cho them ${remaining} ngay nua.` };
      }
    }

    return { ok: true, reason: 'ok' };
  }

  getMapAccessSummary(mapId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): string {
    const definition = this.getMapDefinition(mapId);

    if (!definition) {
      return 'Khong co du lieu khu vuc.';
    }

    const check = this.canEnterMap(mapId, snapshot);
    if (check.ok) {
      return `${definition.isSecretRealm ? 'Bi canh an hien' : 'Khu thuong'} • Nguy co ${definition.riskLevel} • Khuyen nghi ${definition.recommendedRealm}.`;
    }

    return check.reason;
  }

  getPlayerCombatProfile(snapshot: Readonly<GameState> = this.stateManager.snapshot): ExplorationCombatProfile {
    const realmOrder = getRealmOrder(snapshot.player.cultivation.currentRealmId);
    const tinhTuLevel = snapshot.sect.buildings.tinh_tu_duong.level;
    const hoSonLevel = snapshot.sect.buildings.ho_son_tran_dai.level;
    const artifactBonuses = this.artifactSystem.getPassiveBonuses(snapshot);
    const beastBonuses = this.beastSystem.getExplorationBonuses(snapshot);
    const maxHealth = 34 + realmOrder * 12 + hoSonLevel * 2 + artifactBonuses.explorationMaxHealthBonus + beastBonuses.maxHealthBonus;
    const moveSpeed = 168 + realmOrder * 6;
    const attackDamage = 6 + realmOrder * 3 + Math.max(0, snapshot.player.cultivation.cultivationProgress / 8) + beastBonuses.attackBonus;

    return {
      maxHealth,
      moveSpeed,
      attackDamage: Math.trunc(attackDamage),
      attackRange: 72 + tinhTuLevel * 4,
      attackCooldownMs: 460
    };
  }

  completeRun(outcome: ExplorationRunOutcome): ExplorationActionResult {
    const before = this.stateManager.snapshot;
    const map = this.getMapDefinition(outcome.mapId);

    if (!map) {
      return {
        ok: false,
        message: 'Khong tim thay du lieu khu vuc.',
        snapshot: before
      };
    }

    const explorationSupport = this.discipleSystem.getSectManagementOverview(before);
    const rewardMultiplier = outcome.result === 'victory' ? explorationSupport.explorationRewardMultiplier : 1;
    const appliedRewards = outcome.result === 'victory'
      ? addDelta(outcome.rewards, map.rewardProfile.guaranteed)
      : outcome.rewards;
    const appliedItems: Record<string, number> = { ...(outcome.itemRewards ?? {}) };
    const appliedSectPrestige = (outcome.sectPrestigeDelta ?? 0) + (outcome.result === 'victory' ? map.rewardProfile.sectPrestigeBonus ?? 0 : 0);
    const appliedCultivation = (outcome.playerCultivationProgressDelta ?? 0) + (outcome.result === 'victory' ? map.rewardProfile.playerCultivationProgressBonus ?? 0 : 0);
    const appliedFoundation = outcome.foundationStabilityDelta ?? 0;
    const appliedFactionRelations = { ...(outcome.factionRelationDeltas ?? {}) };
    const reputationGain = outcome.result === 'victory'
      ? (map.isSecretRealm ? 4 : 1) + (outcome.defeatedBoss ? 1 : 0)
      : 0;

    if (outcome.result === 'victory') {
      for (const [resourceId, value] of Object.entries(appliedRewards)) {
        if (typeof value !== 'number' || value <= 0) {
          continue;
        }

        const bonus = Math.floor(value * Math.max(0, rewardMultiplier - 1));
        if (bonus > 0) {
          const key = resourceId as keyof ResourceDeltaState;
          appliedRewards[key] = (appliedRewards[key] ?? 0) + bonus;
        }
      }

      for (const [itemId, amount] of Object.entries(map.rewardProfile.itemRewards ?? {})) {
        if (typeof amount !== 'number' || amount <= 0) {
          continue;
        }

        appliedItems[itemId] = (appliedItems[itemId] ?? 0) + Math.trunc(amount);
      }

      for (const [itemId, amount] of Object.entries(this.getGatheredMaterialRewards(map.id, appliedRewards))) {
        addItemAmount(appliedItems, itemId, amount);
      }
    }

    const itemSummary = Object.entries(appliedItems)
      .map(([itemId, amount]) => `${amount} ${this.inventorySystem.getItemDefinition(itemId)?.name ?? itemId}`)
      .join(', ');

    const summary = [
      `${map.name}: ${outcome.result === 'victory' ? 'khai hoan' : outcome.result === 'defeat' ? 'bai lui' : 'rut ve'}.`,
      `Thu duoc ${formatRewards(appliedRewards)}${itemSummary ? `; nhat them ${itemSummary}.` : '.'}${appliedCultivation > 0 ? ` Ngo ra +${appliedCultivation} tien do tu hanh.` : ''}${appliedSectPrestige > 0 ? ` Uy danh +${appliedSectPrestige}.` : ''}${reputationGain > 0 ? ` Danh vong +${reputationGain}.` : ''}`
    ].join(' ');

    let finalSummary = rewardMultiplier > 1
      ? `${summary} Nhom ho tro bi canh giup tang thuong x${rewardMultiplier.toFixed(2)}.`
      : summary;

    if (map.secretRealmConfig && outcome.result === 'victory') {
      finalSummary = `${finalSummary} Thuong hiem tu bi canh an: ${map.secretRealmConfig.rareDropNote}`;
    }

    const snapshot = this.stateManager.update((draft) => {
      for (const [resourceId, value] of Object.entries(appliedRewards)) {
        if (typeof value !== 'number') {
          continue;
        }

        const key = resourceId as keyof GameState['resources'];
        draft.resources[key] = Math.max(0, draft.resources[key] + Math.trunc(value));
      }

      for (const [itemId, amount] of Object.entries(appliedItems)) {
        if (typeof amount !== 'number' || amount <= 0) {
          continue;
        }

        draft.inventory.items[itemId] = (draft.inventory.items[itemId] ?? 0) + Math.trunc(amount);
      }

      draft.sect.prestige = Math.max(0, draft.sect.prestige + appliedSectPrestige);
      draft.sect.reputation = Math.max(0, draft.sect.reputation + reputationGain);
      draft.sect.stability = Math.max(
        0,
        Math.min(100, draft.sect.stability + (outcome.result === 'victory' ? 1 : outcome.result === 'defeat' ? -2 : 0))
      );
      draft.sect.fortune = Math.max(
        0,
        Math.min(100, draft.sect.fortune + ((outcome.storyFlags ?? []).some((flag) => flag.includes('inheritance') || flag.includes('records')) ? 1 : 0))
      );
      draft.player.cultivation.cultivationProgress = Math.max(0, draft.player.cultivation.cultivationProgress + appliedCultivation);
      draft.player.cultivation.foundationStability = Math.max(
        0,
        Math.min(100, draft.player.cultivation.foundationStability + appliedFoundation)
      );

      draft.exploration.totalRuns += 1;
      if (map.secretRealmConfig) {
        draft.exploration.secretRealmLastEntryDays[map.id] = draft.time.day;
      }
      draft.exploration.lastSummary = finalSummary;
      draft.exploration.history.push({
        mapId: map.id,
        mapName: map.name,
        resolvedOnDay: draft.time.day,
        result: outcome.result,
        rewards: appliedRewards,
        defeatedBoss: outcome.defeatedBoss,
        notes: outcome.notes
      });

      if (Object.keys(appliedItems).length > 0) {
        draft.inventory.lastSummary = `Nhan tu tham hiem: ${itemSummary}.`;
      }

      for (const flag of outcome.storyFlags ?? []) {
        if (!draft.story.storyFlags.includes(flag)) {
          draft.story.storyFlags.push(flag);
        }
      }

      for (const flag of outcome.worldFlags ?? []) {
        if (!draft.story.worldFlags.includes(flag)) {
          draft.story.worldFlags.push(flag);
        }
      }

      for (const flag of outcome.choiceFlags ?? []) {
        if (!draft.story.choiceFlags.includes(flag)) {
          draft.story.choiceFlags.push(flag);
        }
      }

      if (!draft.story.choiceFlags.includes('tutorial_returned_exploration')) {
        draft.story.choiceFlags.push('tutorial_returned_exploration');
      }

      for (const [factionId, delta] of Object.entries(appliedFactionRelations)) {
        if (typeof delta !== 'number') {
          continue;
        }

        draft.story.factionRelations[factionId] = (draft.story.factionRelations[factionId] ?? 0) + Math.trunc(delta);
      }

      if (!draft.exploration.unlockedMapIds.includes(map.id)) {
        draft.exploration.unlockedMapIds.push(map.id);
      }

      if (outcome.defeatedBoss) {
        const boss = this.getBossDefinition(map.bossId);

        if (boss && !draft.exploration.defeatedBossIds.includes(boss.id)) {
          draft.exploration.defeatedBossIds.push(boss.id);
        }

        const clearFlag = `map_${map.id}_cleared`;
        if (!draft.story.worldFlags.includes(clearFlag)) {
          draft.story.worldFlags.push(clearFlag);
        }

        if (boss?.bossFlagOnDefeat && !draft.story.storyFlags.includes(boss.bossFlagOnDefeat)) {
          draft.story.storyFlags.push(boss.bossFlagOnDefeat);
        }
      }

      if (outcome.result === 'victory' && !draft.story.storyFlags.includes('first_exploration_victory')) {
        draft.story.storyFlags.push('first_exploration_victory');
      }

      const newlyUnlocked = explorationMapCatalog.maps
        .filter((entry) => !draft.exploration.unlockedMapIds.includes(entry.id) && this.meetsUnlockConditions(entry, draft))
        .map((entry) => entry.id);
      const newlyDiscoveredSecretRealms = newlyUnlocked.filter((mapId) => this.getMapDefinition(mapId)?.isSecretRealm);

      if (newlyUnlocked.length > 0) {
        draft.exploration.unlockedMapIds.push(...newlyUnlocked);
        for (const mapId of newlyDiscoveredSecretRealms) {
          if (!draft.exploration.discoveredSecretRealmIds.includes(mapId)) {
            draft.exploration.discoveredSecretRealmIds.push(mapId);
          }
        }
        const unlockNames = newlyUnlocked.map((mapId) => this.getMapDefinition(mapId)?.name ?? mapId).join(', ');
        const secretBanner = newlyDiscoveredSecretRealms
          .map((mapId) => this.getMapDefinition(mapId)?.discoveryBanner)
          .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
          .join(' ');
        draft.ui.statusMessage = `${finalSummary} Mo khu moi: ${unlockNames}.${secretBanner ? ` ${secretBanner}` : ''}`;
      } else {
        draft.ui.statusMessage = finalSummary;
      }

      if (draft.sect.reputation > before.sect.reputation) {
        this.discipleSystem.applyReputationMilestonesInDraft(draft, before.sect.reputation);
      }

      draft.ui.activeScreen = 'sect-scene';
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: finalSummary,
      snapshot
    };
  }

  private getGatheredMaterialRewards(mapId: string, rewards: ResourceDeltaState): Record<string, number> {
    const gathered: Record<string, number> = {};
    const herbAmount = Math.max(0, Math.trunc(rewards.duocThao ?? 0));
    const oreAmount = Math.max(0, Math.trunc(rewards.khoangThach ?? 0));
    const woodAmount = Math.max(0, Math.trunc(rewards.linhMoc ?? 0));

    if (herbAmount >= 3) {
      addItemAmount(gathered, 'linh_thao_co_ban', Math.floor(herbAmount / 3));
    }

    if (oreAmount >= 2) {
      addItemAmount(gathered, 'khoang_thach_tho', Math.floor(oreAmount / 2));
    }

    if (mapId === 'hau_son_coc' && herbAmount >= 5) {
      addItemAmount(gathered, 'hoa_linh_thao', 1);
    }

    if (mapId === 'hac_moc_lam' && woodAmount >= 6) {
      addItemAmount(gathered, 'hac_moc_tam', 1);
    }

    if (mapId === 'co_tich_co_khu' && herbAmount >= 6) {
      addItemAmount(gathered, 'khuyet_mach_thao', 1);
    }

    if (mapId === 'linh_son_mat_dao' && oreAmount >= 6) {
      addItemAmount(gathered, 'am_hoa_tinh_sa', 1);
    }

    return gathered;
  }

  private meetsUnlockConditions(
    definition: ExplorationMapDefinition,
    snapshot: Readonly<GameState>
  ): boolean {
    if (getChapterOrder(snapshot.story.currentChapterId) < getChapterOrder(definition.chapterUnlock)) {
      return false;
    }

    const conditions = definition.unlockConditions;
    if (!conditions) {
      return true;
    }

    if ((conditions.minSectPrestige ?? 0) > snapshot.sect.prestige) {
      return false;
    }

    if ((conditions.minSectReputation ?? 0) > snapshot.sect.reputation) {
      return false;
    }

    if ((conditions.minPlayerRealmOrder ?? 0) > getRealmOrder(snapshot.player.cultivation.currentRealmId)) {
      return false;
    }

    if ((conditions.requiredStoryFlags ?? []).some((flag) => !snapshot.story.storyFlags.includes(flag))) {
      return false;
    }

    if ((conditions.requiredWorldFlags ?? []).some((flag) => !snapshot.story.worldFlags.includes(flag))) {
      return false;
    }

    if ((conditions.requiredClearedMapIds ?? []).some((mapId) => !snapshot.story.worldFlags.includes(`map_${mapId}_cleared`))) {
      return false;
    }

    return true;
  }
}
