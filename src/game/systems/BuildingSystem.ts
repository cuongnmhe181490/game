import { buildingCatalog, storyChapterCatalog, type BuildingDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type {
  BuildingId,
  BuildingState,
  DiscipleProfile,
  GameState,
  ResourceDeltaState,
  ResourceId
} from '@/game/state/types';
import { RESOURCE_IDS } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { normalizeCatalogResourceDelta, ResourceSystem } from '@/game/systems/ResourceSystem';

export interface BuildingActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface DailyProductionBreakdown {
  delta: ResourceDeltaState;
  lines: string[];
}

const BUILDING_ORDER = storyChapterCatalog.chapters.map((chapter) => chapter.id);

function addDelta(target: ResourceDeltaState, source: ResourceDeltaState): void {
  for (const resourceId of RESOURCE_IDS) {
    const value = source[resourceId] ?? 0;

    if (value === 0) {
      continue;
    }

    target[resourceId] = (target[resourceId] ?? 0) + value;
  }
}

function formatDelta(delta: ResourceDeltaState): string {
  const labels: Record<string, string> = {
    linhThach: 'linhThạch',
    linhKhi: 'linhKhí',
    duocThao: 'dượcThảo',
    khoangThach: 'khoángThạch',
    linhMoc: 'linhMộc'
  };
  const entries = Object.entries(delta).filter((entry): entry is [string, number] => {
    const value = entry[1];
    return typeof value === 'number' && value !== 0;
  });

  if (entries.length === 0) {
    return 'không đổi';
  }

  return entries
    .map(([resourceId, value]) => `${value > 0 ? '+' : ''}${value} ${labels[resourceId] ?? resourceId}`)
    .join(', ');
}

function getChapterOrder(chapterId: string): number {
  const index = BUILDING_ORDER.indexOf(chapterId);
  return index >= 0 ? index : 0;
}

function getTraitBonus(disciple: DiscipleProfile, resourceId: ResourceId): number {
  if (resourceId === 'linhKhi' && disciple.traitIds.includes('nhay_cam_linh_tuc')) {
    return 1;
  }

  if ((resourceId === 'duocThao' || resourceId === 'linhMoc') && disciple.traitIds.includes('chiu_kho')) {
    return 1;
  }

  if ((resourceId === 'linhThach' || resourceId === 'khoangThach') && disciple.traitIds.includes('thien_ve_tri_su')) {
    return 1;
  }

  return 0;
}

export class BuildingSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly resourceSystem: ResourceSystem
  ) {}

  getBuildingDefinition(buildingId: BuildingId): BuildingDefinition | null {
    return buildingCatalog.buildings.find((entry) => entry.id === buildingId) ?? null;
  }

  getBuildingState(buildingId: BuildingId): BuildingState | null {
    return this.stateManager.snapshot.sect.buildings[buildingId] ?? null;
  }

  canConstruct(buildingId: BuildingId): { ok: boolean; reason: string } {
    const snapshot = this.stateManager.snapshot;
    return this.evaluateConstruct(snapshot, buildingId);
  }

  constructBuilding(buildingId: BuildingId): BuildingActionResult {
    const before = this.stateManager.snapshot;
    const evaluation = this.evaluateConstruct(before, buildingId);

    if (!evaluation.ok) {
      return {
        ok: false,
        message: evaluation.reason,
        snapshot: before
      };
    }

    const definition = this.getBuildingDefinition(buildingId);

    if (!definition) {
      return {
        ok: false,
        message: 'Không tìm thấy dữ liệu công trình.',
        snapshot: before
      };
    }

    const cost = normalizeCatalogResourceDelta(definition.buildCost);
    const snapshot = this.stateManager.update((draft) => {
      for (const resourceId of RESOURCE_IDS) {
        draft.resources[resourceId] = Math.max(0, draft.resources[resourceId] - (cost[resourceId] ?? 0));
      }

      const state = draft.sect.buildings[buildingId];
      state.level = Math.max(1, state.level);
      state.isUnlocked = true;
      state.isConstructed = true;
      state.status = 'operational';
      draft.ui.statusMessage = `Đã dựng ${definition.name}.`;
      this.syncBuildingStatesInDraft(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `Đã dựng ${definition.name}.`,
      snapshot
    };
  }

  canUpgrade(buildingId: BuildingId): { ok: boolean; reason: string } {
    const snapshot = this.stateManager.snapshot;
    return this.evaluateUpgrade(snapshot, buildingId);
  }

  upgradeBuilding(buildingId: BuildingId): BuildingActionResult {
    const before = this.stateManager.snapshot;
    const evaluation = this.evaluateUpgrade(before, buildingId);

    if (!evaluation.ok) {
      return {
        ok: false,
        message: evaluation.reason,
        snapshot: before
      };
    }

    const definition = this.getBuildingDefinition(buildingId);

    if (!definition) {
      return {
        ok: false,
        message: 'Không tìm thấy dữ liệu công trình.',
        snapshot: before
      };
    }

    const state = before.sect.buildings[buildingId];
    const cost = this.getUpgradeCost(buildingId, state.level);
    const snapshot = this.stateManager.update((draft) => {
      for (const resourceId of RESOURCE_IDS) {
        draft.resources[resourceId] = Math.max(0, draft.resources[resourceId] - (cost[resourceId] ?? 0));
      }

      draft.sect.buildings[buildingId].level += 1;
      draft.sect.buildings[buildingId].status = 'operational';
      draft.ui.statusMessage = `${definition.name} đã lên cấp ${draft.sect.buildings[buildingId].level}.`;
      this.syncBuildingStatesInDraft(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${definition.name} đã lên cấp ${snapshot.sect.buildings[buildingId].level}.`,
      snapshot
    };
  }

  syncBuildingStates(): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      this.syncBuildingStatesInDraft(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  getUpgradeCost(buildingId: BuildingId, currentLevel?: number): ResourceDeltaState {
    const definition = this.getBuildingDefinition(buildingId);
    const level = currentLevel ?? this.stateManager.snapshot.sect.buildings[buildingId].level;

    if (!definition) {
      return {};
    }

    const baseCost = normalizeCatalogResourceDelta(definition.buildCost);
    const multiplier = Math.max(1, level + 1);
    const result: ResourceDeltaState = {};

    for (const resourceId of RESOURCE_IDS) {
      const baseValue = baseCost[resourceId] ?? 0;

      if (baseValue > 0) {
        result[resourceId] = baseValue * multiplier;
      }
    }

    return result;
  }

  getDailyProduction(snapshot: Readonly<GameState>): DailyProductionBreakdown {
    const total: ResourceDeltaState = {
      linhThach: 0,
      linhKhi: 0,
      duocThao: 0,
      khoangThach: 0,
      linhMoc: 0
    };
    const lines: string[] = [];

    for (const definition of buildingCatalog.buildings) {
      const buildingId = definition.id as BuildingId;
      const state = snapshot.sect.buildings[buildingId];

      if (!state?.isConstructed || state.level <= 0) {
        continue;
      }

      const buildingDelta = normalizeCatalogResourceDelta(definition.productionPerDay);

      if (buildingId === 'tinh_tu_duong') {
        buildingDelta.linhKhi = (buildingDelta.linhKhi ?? 0) + state.level;
      }

      if (buildingId === 'duoc_vien') {
        buildingDelta.duocThao = (buildingDelta.duocThao ?? 0) + state.level;
      }

      if (buildingId === 'linh_thach_kho') {
        buildingDelta.linhThach = (buildingDelta.linhThach ?? 0) + state.level;
      }

      for (const resourceId of RESOURCE_IDS) {
        const modifier = state.productionModifiers[resourceId] ?? 0;

        if (modifier !== 0) {
          buildingDelta[resourceId] = (buildingDelta[resourceId] ?? 0) + modifier;
        }
      }

      const assignedDisciples = state.assignedDiscipleIds
        .map((discipleId) => snapshot.disciples.roster.find((entry) => entry.id === discipleId))
        .filter((entry): entry is DiscipleProfile => Boolean(entry));

      for (const disciple of assignedDisciples) {
        if (buildingId === 'duoc_vien' && disciple.currentTask === 'trong_duoc') {
          buildingDelta.duocThao = (buildingDelta.duocThao ?? 0) + 1 + getTraitBonus(disciple, 'duocThao');
        }

        if (buildingId === 'tinh_tu_duong' && disciple.currentTask === 'tu_luyen') {
          buildingDelta.linhKhi = (buildingDelta.linhKhi ?? 0) + 1 + getTraitBonus(disciple, 'linhKhi');
        }

        if (buildingId === 'linh_thach_kho' && disciple.currentTask === 'thu_thap') {
          buildingDelta.khoangThach = (buildingDelta.khoangThach ?? 0) + 1 + getTraitBonus(disciple, 'khoangThach');
        }

        if (buildingId === 'luyen_khi_phong' && disciple.currentTask === 'luyen_dan') {
          buildingDelta.linhThach = (buildingDelta.linhThach ?? 0) + 1 + getTraitBonus(disciple, 'linhThach');
        }

        if (buildingId === 'ho_son_tran_dai' && disciple.currentTask === 'tuan_tra') {
          lines.push(`${definition.name}: ${disciple.name} giữ trận, tăng thế phòng thủ.`);
        }
      }

      addDelta(total, buildingDelta);

      if (Object.values(buildingDelta).some((value) => typeof value === 'number' && value !== 0)) {
        lines.push(`${definition.name}: ${formatDelta(buildingDelta)}`);
      }
    }

    for (const disciple of snapshot.disciples.roster) {
      if (disciple.assignedBuildingId) {
        continue;
      }

      const taskDelta: ResourceDeltaState = {};

      if (disciple.currentTask === 'thu_thap') {
        taskDelta.linhMoc = 1 + getTraitBonus(disciple, 'linhMoc');
      }

      if (disciple.currentTask === 'trong_duoc') {
        taskDelta.duocThao = 1 + getTraitBonus(disciple, 'duocThao');
      }

      if (disciple.currentTask === 'tu_luyen') {
        taskDelta.linhKhi = 1 + getTraitBonus(disciple, 'linhKhi');
      }

      addDelta(total, taskDelta);

      if (Object.values(taskDelta).some((value) => typeof value === 'number' && value !== 0)) {
        lines.push(`${disciple.name}: ${formatDelta(taskDelta)} từ nhiệm vụ ${disciple.currentTask}.`);
      }
    }

    return {
      delta: total,
      lines
    };
  }

  private evaluateConstruct(snapshot: Readonly<GameState>, buildingId: BuildingId): { ok: boolean; reason: string } {
    const definition = this.getBuildingDefinition(buildingId);
    const state = snapshot.sect.buildings[buildingId];

    if (!definition || !state) {
      return { ok: false, reason: 'Không tìm thấy công trình.' };
    }

    if (state.isConstructed) {
      return { ok: false, reason: `${definition.name} đã được dựng rồi.` };
    }

    if (!this.isDefinitionUnlocked(snapshot, definition, state.isUnlocked)) {
      return { ok: false, reason: `${definition.name} chưa mở điều kiện.` };
    }

    const cost = normalizeCatalogResourceDelta(definition.buildCost);

    if (!this.resourceSystem.canAfford(this.toNegativeDelta(cost))) {
      return { ok: false, reason: `Tài nguyên chưa đủ để dựng ${definition.name}.` };
    }

    return { ok: true, reason: 'ok' };
  }

  private evaluateUpgrade(snapshot: Readonly<GameState>, buildingId: BuildingId): { ok: boolean; reason: string } {
    const definition = this.getBuildingDefinition(buildingId);
    const state = snapshot.sect.buildings[buildingId];

    if (!definition || !state) {
      return { ok: false, reason: 'Không tìm thấy công trình.' };
    }

    if (!state.isConstructed) {
      return { ok: false, reason: `${definition.name} chưa được dựng.` };
    }

    if (state.level >= definition.maxLevel) {
      return { ok: false, reason: `${definition.name} đã đạt cấp tối đa.` };
    }

    const cost = this.getUpgradeCost(buildingId, state.level);

    if (!this.resourceSystem.canAfford(this.toNegativeDelta(cost))) {
      return { ok: false, reason: `Tài nguyên chưa đủ để nâng ${definition.name}.` };
    }

    return { ok: true, reason: 'ok' };
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

  private isDefinitionUnlocked(
    snapshot: Readonly<GameState>,
    definition: BuildingDefinition,
    stateUnlocked: boolean
  ): boolean {
    if (stateUnlocked) {
      return true;
    }

    if (getChapterOrder(snapshot.story.currentChapterId) < getChapterOrder(definition.unlockConditions.requiredChapterId)) {
      return false;
    }

    if (definition.unlockConditions.requiredFlags.some((flag) => !snapshot.story.storyFlags.includes(flag))) {
      return false;
    }

    return definition.unlockConditions.requiredBuildingIds.every((buildingId) => {
      const state = snapshot.sect.buildings[buildingId as BuildingId];
      return Boolean(state?.isConstructed);
    });
  }

  private syncBuildingStatesInDraft(draft: GameState): void {
    for (const definition of buildingCatalog.buildings) {
      const buildingId = definition.id as BuildingId;
      const state = draft.sect.buildings[buildingId];
      const isUnlocked = this.isDefinitionUnlocked(draft, definition, state.isUnlocked);

      state.isUnlocked = isUnlocked;
      state.status = state.isConstructed ? 'operational' : isUnlocked ? 'idle' : 'locked';
      state.assignedDiscipleIds = state.assignedDiscipleIds.filter((discipleId) =>
        draft.disciples.roster.some((disciple) => disciple.id === discipleId && disciple.assignedBuildingId === buildingId)
      );
    }

    const hoSonLevel = draft.sect.buildings.ho_son_tran_dai.level;
    const patrolCount = draft.disciples.roster.filter((disciple) => disciple.currentTask === 'tuan_tra').length;
    draft.sect.defense = Math.max(0, hoSonLevel * 4 + patrolCount + draft.sect.buildings.chinh_dien.level);
    draft.sect.discipleCapacity = 3 + draft.sect.buildings.chinh_dien.level + draft.sect.buildings.tinh_tu_duong.level * 2;
  }
}
