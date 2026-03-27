import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState, ResourceDeltaState } from '@/game/state/types';
import { RESOURCE_IDS } from '@/game/state/types';
import { BuildingSystem } from '@/game/systems/BuildingSystem';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
import { EventRuntimeSystem } from '@/game/systems/EventRuntimeSystem';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { RealmSystem } from '@/game/systems/RealmSystem';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';

const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const STARTER_BUILDING_LEVELS = {
  chinh_dien: 1,
  tinh_tu_duong: 1,
  duoc_vien: 1,
  tang_kinh_cac: 0,
  luyen_khi_phong: 0,
  linh_thach_kho: 1,
  ho_son_tran_dai: 0,
  tiep_khach_duong: 0
} as const;

export interface AdvanceDayResult {
  snapshot: Readonly<GameState>;
  dailyProduction: ResourceDeltaState;
  cultivationGain: number;
  summaryLines: string[];
}

export class TimeSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly buildingSystem: BuildingSystem,
    private readonly discipleSystem: DiscipleSystem,
    private readonly realmSystem: RealmSystem,
    private readonly eventSystem: EventRuntimeSystem,
    private readonly sectIdentitySystem: SectIdentitySystem
  ) {}

  advanceOneDay(): AdvanceDayResult {
    const before = this.stateManager.snapshot;
    const production = this.buildingSystem.getDailyProduction(before);
    const sectModifiers = this.sectIdentitySystem.getCombinedModifiers(before);
    const upkeep = Math.max(1, before.disciples.roster.length);
    const summaryLines = [...production.lines];
    let cultivationGain = 0;

    const snapshot = this.stateManager.update((draft) => {
      draft.time.day += 1;

      if (draft.time.day > DAYS_PER_MONTH) {
        draft.time.day = 1;
        draft.time.month += 1;
      }

      if (draft.time.month > MONTHS_PER_YEAR) {
        draft.time.month = 1;
        draft.time.year += 1;
      }

      for (const resourceId of RESOURCE_IDS) {
        const value = production.delta[resourceId] ?? 0;
        draft.resources[resourceId] = Math.max(0, Math.trunc(draft.resources[resourceId] + value));
      }

      if ((sectModifiers.resourceProductionFlat ?? 0) !== 0) {
        draft.resources.linhKhi = Math.max(0, draft.resources.linhKhi + (sectModifiers.resourceProductionFlat ?? 0));
        summaryLines.push(`Tri mon va noi quy: +${sectModifiers.resourceProductionFlat} linhKhi.`);
      }

      const adjustedUpkeep = Math.max(0, upkeep - (sectModifiers.linhKhiUpkeepReduction ?? 0));
      draft.resources.linhKhi = Math.max(0, draft.resources.linhKhi - adjustedUpkeep);
      summaryLines.push(`Tieu hao duy tri: -${adjustedUpkeep} linhKhi.`);

      const cultivationResult = this.realmSystem.applyDailyCultivationInDraft(draft);
      cultivationGain = cultivationResult.amount;
      summaryLines.push(`Tu hanh: +${cultivationResult.amount} tien do.`);
      summaryLines.push(cultivationResult.summary);

      const discipleResult = this.discipleSystem.applyDailyUpdateInDraft(draft);
      summaryLines.push(...discipleResult.lines);

      const sectIdentityResult = this.sectIdentitySystem.applyDailyUpdateInDraft(draft);
      this.sectIdentitySystem.refreshSectIdentityInDraft(draft);
      summaryLines.push(...sectIdentityResult.lines);

      if (!draft.story.storyFlags.includes('first_resource_cycle_completed')) {
        draft.story.storyFlags.push('first_resource_cycle_completed');
      }

      const restoredAnyBuilding = Object.entries(draft.sect.buildings).some(([buildingId, state]) => {
        const starterLevel = STARTER_BUILDING_LEVELS[buildingId as keyof typeof STARTER_BUILDING_LEVELS] ?? 0;
        return state.level > starterLevel;
      });

      if (restoredAnyBuilding && !draft.story.storyFlags.includes('first_building_restored')) {
        draft.story.storyFlags.push('first_building_restored');
      }

      draft.events.lastCheckedDay = draft.time.day;
      draft.ui.daySummary = summaryLines.join('\n') || 'Hom nay son mon chua tao them bien dong.';
      draft.ui.statusMessage = 'Ngay moi bat dau. Noi mon da van hanh them mot chu ky.';
    });

    this.saveSystem.saveGame(snapshot);
    this.eventSystem.queueMajorEligibleEvent('story');
    this.eventSystem.queueRandomEligibleEvent('time');

    return {
      snapshot: this.stateManager.snapshot,
      dailyProduction: production.delta,
      cultivationGain,
      summaryLines
    };
  }
}
