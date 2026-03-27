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

function formatRewards(rewards: ResourceDeltaState): string {
  const labels: Record<string, string> = {
    linhThach: 'linh thạch',
    linhKhi: 'linh khí',
    duocThao: 'dược thảo',
    khoangThach: 'khoáng thạch',
    linhMoc: 'linh mộc'
  };

  const entries = Object.entries(rewards).filter(([, value]) => typeof value === 'number' && value > 0);
  return entries.map(([key, value]) => `+${value} ${labels[key] ?? key}`).join(', ') || 'không thu được gì';
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
    private readonly artifactSystem: ArtifactSystem
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
      return { ok: false, reason: 'Không tìm thấy khu vực thám hiểm.' };
    }

    if (!this.isMapUnlocked(mapId, snapshot)) {
      return { ok: false, reason: `${definition.name} chưa mở.` };
    }

    return { ok: true, reason: 'ok' };
  }

  getMapAccessSummary(mapId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): string {
    const definition = this.getMapDefinition(mapId);

    if (!definition) {
      return 'Không có dữ liệu khu vực.';
    }

    const check = this.canEnterMap(mapId, snapshot);
    if (check.ok) {
      return `Nguy cơ ${definition.riskLevel} • Khuyến nghị ${definition.recommendedRealm}.`;
    }

    return check.reason;
  }

  getPlayerCombatProfile(snapshot: Readonly<GameState> = this.stateManager.snapshot): ExplorationCombatProfile {
    const realmOrder = getRealmOrder(snapshot.player.cultivation.currentRealmId);
    const tinhTuLevel = snapshot.sect.buildings.tinh_tu_duong.level;
    const hoSonLevel = snapshot.sect.buildings.ho_son_tran_dai.level;
    const artifactBonuses = this.artifactSystem.getPassiveBonuses(snapshot);
    const maxHealth = 34 + realmOrder * 12 + hoSonLevel * 2 + artifactBonuses.explorationMaxHealthBonus;
    const moveSpeed = 168 + realmOrder * 6;
    const attackDamage = 6 + realmOrder * 3 + Math.max(0, snapshot.player.cultivation.cultivationProgress / 8);

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
        message: 'Không tìm thấy dữ liệu khu vực.',
        snapshot: before
      };
    }

    const appliedRewards = outcome.result === 'victory'
      ? addDelta(outcome.rewards, map.rewardProfile.guaranteed)
      : outcome.rewards;
    const appliedItems: Record<string, number> = { ...(outcome.itemRewards ?? {}) };
    const appliedSectPrestige = (outcome.sectPrestigeDelta ?? 0) + (outcome.result === 'victory' ? map.rewardProfile.sectPrestigeBonus ?? 0 : 0);
    const appliedCultivation = (outcome.playerCultivationProgressDelta ?? 0) + (outcome.result === 'victory' ? map.rewardProfile.playerCultivationProgressBonus ?? 0 : 0);
    const appliedFoundation = outcome.foundationStabilityDelta ?? 0;
    const appliedFactionRelations = { ...(outcome.factionRelationDeltas ?? {}) };

    if (outcome.result === 'victory') {
      for (const [itemId, amount] of Object.entries(map.rewardProfile.itemRewards ?? {})) {
        if (typeof amount !== 'number' || amount <= 0) {
          continue;
        }

        appliedItems[itemId] = (appliedItems[itemId] ?? 0) + Math.trunc(amount);
      }
    }

    const summary = [
      `${map.name}: ${outcome.result === 'victory' ? 'khải hoàn' : outcome.result === 'defeat' ? 'bại lui' : 'rút về'}.`,
      `Thu được ${formatRewards(appliedRewards)}${Object.keys(appliedItems).length > 0 ? ' và vật phẩm hiếm.' : '.'}${appliedCultivation > 0 ? ` Ngộ ra +${appliedCultivation} tiến độ tu hành.` : ''}${appliedSectPrestige > 0 ? ` Uy danh +${appliedSectPrestige}.` : ''}`
    ].join(' ');

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
      draft.exploration.lastSummary = summary;
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
        draft.inventory.lastSummary = `Nhận từ thám hiểm: ${Object.entries(appliedItems).map(([itemId, amount]) => `${amount} ${this.inventorySystem.getItemDefinition(itemId)?.name ?? itemId}`).join(', ')}.`;
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

      if (newlyUnlocked.length > 0) {
        draft.exploration.unlockedMapIds.push(...newlyUnlocked);
        draft.ui.statusMessage = `${summary} Mở khu mới: ${newlyUnlocked.map((mapId) => this.getMapDefinition(mapId)?.name ?? mapId).join(', ')}.`;
      } else {
        draft.ui.statusMessage = summary;
      }

      draft.ui.activeScreen = 'sect-scene';
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: summary,
      snapshot
    };
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
