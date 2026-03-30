import {
  buildingCatalog,
  discipleNamesCatalog,
  discipleTraitCatalog,
  realmCatalog,
  type RealmDefinition
} from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type {
  BuildingId,
  DiscipleProfile,
  DiscipleTaskId,
  GameState,
  RealmId,
  ResourceDeltaState,
  ResourceId
} from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { ResourceSystem } from '@/game/systems/ResourceSystem';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';

const ROOT_TYPES = [
  'Mộc linh căn',
  'Thủy linh căn',
  'Kim linh căn',
  'Hỏa linh căn',
  'Thổ linh căn',
  'Kim hỏa tạp căn',
  'Thủy mộc tạp căn'
] as const;

const POSITIVE_TRAIT_PRIORITIES = ['tai_chat_xuat_chung', 'trung_hau', 'nhan_hau', 'nhay_cam_linh_tuc', 'chiu_kho', 'can_man_ben_bi'] as const;
const FLAW_PRIORITIES = ['bat_on_tam_tinh', 'tham_cong', 'da_nghi', 'luoi_bien', 'thich_loi_tat', 'kieu_tam'] as const;

export const TASK_LABELS: Record<DiscipleTaskId, string> = {
  tu_luyen: 'Tu luyện',
  trong_duoc: 'Trồng dược',
  luyen_dan: 'Luyện đan',
  thu_thap: 'Thu thập',
  tuan_tra: 'Tuần tra',
  nghi_ngoi: 'Nghỉ ngơi'
};

export interface DiscipleActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface DailyDiscipleUpdateResult {
  lines: string[];
}

export interface SectManagementOverview {
  cultivationSupport: number;
  cultivationPower: number;
  resourceDelta: ResourceDeltaState;
  inventoryRewards: Record<string, number>;
  alchemyCostReduction: number;
  explorationRewardMultiplier: number;
  taskCounts: {
    cultivation: number;
    gathering: number;
    alchemy: number;
    exploration: number;
    rest: number;
  };
  summaryLines: string[];
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

function hasTrait(disciple: DiscipleProfile, traitId: string): boolean {
  return disciple.traitIds.includes(traitId);
}

function findRealm(realmId: RealmId): RealmDefinition {
  return realmCatalog.realms.find((realm) => realm.id === realmId) ?? realmCatalog.realms[0];
}

function findNextRealm(realmId: RealmId): RealmDefinition | null {
  const current = findRealm(realmId);
  return realmCatalog.realms.find((realm) => realm.order === current.order + 1) ?? null;
}

function getRealmName(realmId: RealmId): string {
  return findRealm(realmId).name;
}

function firstAvailableName(index: number): string {
  const family = discipleNamesCatalog.familyNames[index % discipleNamesCatalog.familyNames.length] ?? 'Thanh';
  const givenPool = [
    ...discipleNamesCatalog.givenNamesMasculine,
    ...discipleNamesCatalog.givenNamesFeminine
  ];
  const given = givenPool[index % givenPool.length] ?? `Đệ tử ${index + 1}`;
  return `${family} ${given}`;
}

function getTraitName(traitId: string): string {
  return discipleTraitCatalog.traits.find((trait) => trait.id === traitId)?.name ?? traitId;
}

function taskFitsBuilding(task: DiscipleTaskId, buildingId: BuildingId | null): boolean {
  if (!buildingId) {
    return task === 'thu_thap' || task === 'nghi_ngoi' || task === 'tu_luyen';
  }

  switch (buildingId) {
    case 'tinh_tu_duong':
      return task === 'tu_luyen';
    case 'duoc_vien':
      return task === 'trong_duoc';
    case 'luyen_khi_phong':
      return task === 'luyen_dan';
    case 'linh_thach_kho':
      return task === 'thu_thap';
    case 'ho_son_tran_dai':
      return task === 'tuan_tra';
    default:
      return task === 'nghi_ngoi' || task === 'tu_luyen';
  }
}

function updateRiskFlagsInPlace(disciple: DiscipleProfile): void {
  const nextFlags: string[] = [];

  if (disciple.mood <= 35) {
    nextFlags.push('bat_man');
  }
  if (disciple.loyalty <= 35) {
    nextFlags.push('phan_tam');
  }
  if (disciple.breakthroughReady) {
    nextFlags.push('can_dot_pha');
  }
  if (disciple.health <= 45) {
    nextFlags.push('suy_nhuoc');
  }
  if (hasTrait(disciple, 'bat_on_tam_tinh') && disciple.mood <= 50) {
    nextFlags.push('bat_on');
  }
  if ((hasTrait(disciple, 'tham_cong') || hasTrait(disciple, 'hieu_thang') || hasTrait(disciple, 'tai_chat_xuat_chung')) && disciple.mood <= 60) {
    nextFlags.push('muon_duoc_trong_dung');
  }

  disciple.riskFlags = nextFlags;

  if (disciple.health <= 45) {
    disciple.status = 'recovering';
  } else if (disciple.loyalty <= 35 || disciple.riskFlags.includes('bat_on')) {
    disciple.status = 'unstable';
  } else if (disciple.mood <= 35) {
    disciple.status = 'dissatisfied';
  } else {
    disciple.status = 'active';
  }
}

function refreshSectLevelDiscipleFlags(draft: GameState): void {
  const worldFlags = new Set(draft.story.worldFlags);
  const choiceFlags = new Set(draft.story.choiceFlags.filter((flag) => !flag.startsWith('recent_disciple_')));
  const hasLowMood = draft.disciples.roster.some((disciple) => disciple.riskFlags.includes('bat_man'));
  const hasLowLoyalty = draft.disciples.roster.some((disciple) => disciple.riskFlags.includes('phan_tam'));
  const hasInstability = draft.disciples.roster.some((disciple) => disciple.riskFlags.includes('bat_on'));
  const hasBreakthroughReady = draft.disciples.roster.some((disciple) => disciple.riskFlags.includes('can_dot_pha'));

  if (hasLowMood) {
    worldFlags.add('disciple_dissatisfaction_risk');
  } else {
    worldFlags.delete('disciple_dissatisfaction_risk');
  }

  if (hasLowLoyalty || hasInstability) {
    worldFlags.add('disciple_tension_rising');
  } else {
    worldFlags.delete('disciple_tension_rising');
  }

  if (hasBreakthroughReady) {
    worldFlags.add('disciple_breakthrough_window');
  } else {
    worldFlags.delete('disciple_breakthrough_window');
  }

  draft.story.worldFlags = Array.from(worldFlags);
  draft.story.choiceFlags = Array.from(choiceFlags);
}

function addUniqueFlag(target: string[], flag: string): void {
  if (!target.includes(flag)) {
    target.push(flag);
  }
}

export class DiscipleSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly resourceSystem: ResourceSystem,
    private readonly sectIdentitySystem: SectIdentitySystem
  ) {}

  setCurrentTask(discipleId: string, task: DiscipleTaskId): DiscipleActionResult {
    const before = this.stateManager.snapshot;
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);

    if (!disciple) {
      return {
        ok: false,
        message: 'Không tìm thấy đệ tử.',
        snapshot: before
      };
    }

    const snapshot = this.stateManager.update((draft) => {
      const target = draft.disciples.roster.find((entry) => entry.id === discipleId);

      if (!target) {
        return;
      }

      target.currentTask = task;
      const suggestedBuildingId = this.getSuggestedBuildingForTask(task, draft);

      if (target.assignedBuildingId && target.assignedBuildingId !== suggestedBuildingId) {
        const previousBuilding = draft.sect.buildings[target.assignedBuildingId];
        previousBuilding.assignedDiscipleIds = previousBuilding.assignedDiscipleIds.filter((entry) => entry !== discipleId);
      }

      target.assignedBuildingId = suggestedBuildingId;
      if (suggestedBuildingId) {
        const nextBuilding = draft.sect.buildings[suggestedBuildingId];
        if (!nextBuilding.assignedDiscipleIds.includes(discipleId)) {
          nextBuilding.assignedDiscipleIds.push(discipleId);
        }
      }
      target.mood = clampPercent(target.mood + (task === 'nghi_ngoi' ? 2 : 0));
      const suggestedBuildingName = suggestedBuildingId
        ? buildingCatalog.buildings.find((entry) => entry.id === suggestedBuildingId)?.name ?? suggestedBuildingId
        : null;
      target.lastDailyNote = `Được giao nhiệm vụ ${TASK_LABELS[task]}.`;
      target.lastDailyNote = suggestedBuildingName
        ? `Duoc giao nhiem vu ${TASK_LABELS[task]} tai ${suggestedBuildingName}.`
        : `Duoc giao nhiem vu ${TASK_LABELS[task]}.`;
      updateRiskFlagsInPlace(target);
      refreshSectLevelDiscipleFlags(draft);
      draft.ui.statusMessage = suggestedBuildingName
        ? `${target.name} chuyen sang ${TASK_LABELS[task]} tai ${suggestedBuildingName}.`
        : `${target.name} chuyen sang nhiem vu ${TASK_LABELS[task]}.`;
      draft.ui.statusMessage = `${target.name} chuyển sang nhiệm vụ ${TASK_LABELS[task]}.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${disciple.name} chuyển sang nhiệm vụ ${TASK_LABELS[task]}.`,
      snapshot
    };
  }

  assignToBuilding(discipleId: string, buildingId: BuildingId | null): DiscipleActionResult {
    const before = this.stateManager.snapshot;
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);

    if (!disciple) {
      return {
        ok: false,
        message: 'Không tìm thấy đệ tử.',
        snapshot: before
      };
    }

    const buildingName = buildingId
      ? buildingCatalog.buildings.find((entry) => entry.id === buildingId)?.name ?? buildingId
      : null;

    if (buildingId) {
      const buildingState = before.sect.buildings[buildingId];

      if (!buildingState?.isConstructed) {
        return {
          ok: false,
          message: 'Công trình này chưa sẵn để phân công.',
          snapshot: before
        };
      }
    }

    const snapshot = this.stateManager.update((draft) => {
      const target = draft.disciples.roster.find((entry) => entry.id === discipleId);

      if (!target) {
        return;
      }

      if (target.assignedBuildingId) {
        const previousBuilding = draft.sect.buildings[target.assignedBuildingId];
        previousBuilding.assignedDiscipleIds = previousBuilding.assignedDiscipleIds.filter((entry) => entry !== discipleId);
      }

      target.assignedBuildingId = buildingId;
      target.lastDailyNote = buildingId ? `Được điều sang ${buildingName}.` : 'Được rút khỏi công trình.';

      if (buildingId) {
        const nextBuilding = draft.sect.buildings[buildingId];

        if (!nextBuilding.assignedDiscipleIds.includes(discipleId)) {
          nextBuilding.assignedDiscipleIds.push(discipleId);
        }

        target.mood = clampPercent(target.mood + (taskFitsBuilding(target.currentTask, buildingId) ? 1 : -1));
        draft.ui.statusMessage = `${target.name} được điều tới ${buildingName}.`;
      } else {
        draft.ui.statusMessage = `${target.name} được rút khỏi công trình.`;
      }

      updateRiskFlagsInPlace(target);
      refreshSectLevelDiscipleFlags(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: buildingId ? `${disciple.name} được điều tới ${buildingName}.` : `${disciple.name} rời công trình.`,
      snapshot
    };
  }

  rewardDisciple(discipleId: string): DiscipleActionResult {
    const before = this.stateManager.snapshot;
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);
    const giftCost = 4;

    if (!disciple) {
      return { ok: false, message: 'Không tìm thấy đệ tử.', snapshot: before };
    }

    if (!this.resourceSystem.canAfford({ linhThach: -giftCost })) {
      return { ok: false, message: 'Linh thạch chưa đủ để thưởng.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      const target = draft.disciples.roster.find((entry) => entry.id === discipleId);

      if (!target) {
        return;
      }

      draft.resources.linhThach = Math.max(0, draft.resources.linhThach - giftCost);
      target.mood = clampPercent(target.mood + 6 + (hasTrait(target, 'tai_chat_xuat_chung') ? 1 : 0));
      target.loyalty = clampPercent(target.loyalty + 7 + (hasTrait(target, 'trung_hau') ? 2 : 0));
      target.lastDailyNote = 'Nhận thưởng, lòng người dịu lại.';
      updateRiskFlagsInPlace(target);
      addUniqueFlag(draft.story.choiceFlags, 'recent_disciple_reward');
      refreshSectLevelDiscipleFlags(draft);
      draft.ui.statusMessage = `${target.name} nhận thưởng và tỏ ra phấn chấn hơn.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${disciple.name} nhận thưởng và tỏ ra phấn chấn hơn.`,
      snapshot
    };
  }

  reprimandDisciple(discipleId: string): DiscipleActionResult {
    const before = this.stateManager.snapshot;
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);

    if (!disciple) {
      return { ok: false, message: 'Không tìm thấy đệ tử.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      const target = draft.disciples.roster.find((entry) => entry.id === discipleId);

      if (!target) {
        return;
      }

      target.mood = clampPercent(target.mood - 7);
      const loyaltyDelta = hasTrait(target, 'giu_le') || hasTrait(target, 'trung_hau') ? 1 : -4;
      target.loyalty = clampPercent(target.loyalty + loyaltyDelta);
      target.lastDailyNote = 'Bị khiển trách trước nội môn.';
      updateRiskFlagsInPlace(target);
      addUniqueFlag(draft.story.choiceFlags, 'recent_disciple_reprimand');
      refreshSectLevelDiscipleFlags(draft);
      draft.ui.statusMessage = `${target.name} bị khiển trách, tâm trạng đổi rõ.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${disciple.name} bị khiển trách, tâm trạng đổi rõ.`,
      snapshot
    };
  }

  restDisciple(discipleId: string): DiscipleActionResult {
    const before = this.stateManager.snapshot;
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);

    if (!disciple) {
      return { ok: false, message: 'Không tìm thấy đệ tử.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      const target = draft.disciples.roster.find((entry) => entry.id === discipleId);

      if (!target) {
        return;
      }

      if (target.assignedBuildingId) {
        const building = draft.sect.buildings[target.assignedBuildingId];
        building.assignedDiscipleIds = building.assignedDiscipleIds.filter((entry) => entry !== discipleId);
      }

      target.assignedBuildingId = null;
      target.currentTask = 'nghi_ngoi';
      target.health = clampPercent(target.health + 12);
      target.mood = clampPercent(target.mood + 5);
      target.lastDailyNote = 'Được nghỉ một nhịp để hồi khí.';
      updateRiskFlagsInPlace(target);
      addUniqueFlag(draft.story.choiceFlags, 'recent_disciple_rest');
      refreshSectLevelDiscipleFlags(draft);
      draft.ui.statusMessage = `${target.name} được cho nghỉ và hồi sức.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${disciple.name} được cho nghỉ và hồi sức.`,
      snapshot
    };
  }

  recruitDisciple(archetype: string): DiscipleActionResult {
    const before = this.stateManager.snapshot;

    if (before.disciples.roster.length >= before.sect.discipleCapacity) {
      return {
        ok: false,
        message: 'Sơn môn chưa đủ chỗ để nhận thêm đệ tử.',
        snapshot: before
      };
    }

    let recruitedName = 'Đệ tử mới';
    const snapshot = this.stateManager.update((draft) => {
      const recruit = this.createRecruitProfile(draft, archetype);
      recruitedName = recruit.name;
      draft.disciples.roster.push(recruit);
      addUniqueFlag(draft.story.storyFlags, 'first_disciple_recruited');
      addUniqueFlag(draft.story.worldFlags, `recruit_${archetype}_accepted`);
      refreshSectLevelDiscipleFlags(draft);
      draft.ui.statusMessage = `${recruit.name} gia nhập Thanh Huyền Môn.`;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: `${recruitedName} gia nhập Thanh Huyền Môn.`,
      snapshot
    };
  }

  applyDailyUpdateInDraft(draft: GameState): DailyDiscipleUpdateResult {
    const lines: string[] = [];

    for (const disciple of draft.disciples.roster) {
      const progressGain = this.getDailyProgressGain(draft, disciple);
      disciple.cultivationProgress = Math.max(0, disciple.cultivationProgress + progressGain);

      let moodDelta = this.getBaseMoodDelta(draft, disciple);
      let loyaltyDelta = this.getBaseLoyaltyDelta(draft, disciple);
      let note = `Tu hành thêm ${progressGain} điểm.`;

      if (disciple.currentTask === 'nghi_ngoi') {
        disciple.health = clampPercent(disciple.health + 8);
      } else if (disciple.currentTask === 'tuan_tra') {
        disciple.health = clampPercent(disciple.health - 2);
      } else if (disciple.currentTask === 'luyen_dan') {
        disciple.health = clampPercent(disciple.health - 1);
      } else {
        disciple.health = clampPercent(disciple.health - (disciple.health > 55 ? 0 : 1));
      }

      const currentRealm = findRealm(disciple.realmId);
      disciple.breakthroughReady = disciple.cultivationProgress >= currentRealm.progressRequired;

      if (disciple.breakthroughReady) {
        const breakthrough = this.tryAutoBreakthrough(draft, disciple);
        moodDelta += breakthrough.moodDelta;
        loyaltyDelta += breakthrough.loyaltyDelta;

        if (breakthrough.note) {
          note = breakthrough.note;
          lines.push(breakthrough.note);
        }
      }

      disciple.mood = clampPercent(disciple.mood + moodDelta);
      disciple.loyalty = clampPercent(disciple.loyalty + loyaltyDelta);
      disciple.lastDailyNote = note;
      updateRiskFlagsInPlace(disciple);

      if (disciple.loyalty <= 30) {
        lines.push(`${disciple.name} tỏ rõ lòng người chùng xuống.`);
      } else if (disciple.mood <= 30) {
        lines.push(`${disciple.name} đang bất mãn, cần xử lý sớm.`);
      }
    }

    const management = this.getSectManagementOverview(draft);
    for (const resourceId of Object.keys(management.resourceDelta) as ResourceId[]) {
      const change = management.resourceDelta[resourceId] ?? 0;
      if (change !== 0) {
        draft.resources[resourceId] = Math.max(0, draft.resources[resourceId] + change);
      }
    }

    for (const [itemId, amount] of Object.entries(management.inventoryRewards)) {
      if (amount > 0) {
        draft.inventory.items[itemId] = (draft.inventory.items[itemId] ?? 0) + amount;
      }
    }

    if (management.cultivationSupport > 0) {
      const currentRealm = findRealm(draft.player.cultivation.currentRealmId);
      draft.player.cultivation.cultivationProgress += management.cultivationSupport;
      draft.player.cultivation.lastGain += management.cultivationSupport;
      draft.player.cultivation.breakthroughReady = draft.player.cultivation.cultivationProgress >= currentRealm.progressRequired;
      draft.player.cultivation.lastSummary = `${draft.player.cultivation.lastSummary}\nNoi mon ho tro: +${management.cultivationSupport} tien do tu hanh.`;
    }

    if (management.summaryLines.length > 0) {
      draft.ui.statusMessage = management.summaryLines[management.summaryLines.length - 1] ?? draft.ui.statusMessage;
      draft.inventory.lastSummary = management.summaryLines[management.summaryLines.length - 1] ?? draft.inventory.lastSummary;
      lines.push(...management.summaryLines);
    }

    refreshSectLevelDiscipleFlags(draft);
    return {
      lines: lines.slice(-6)
    };
  }

  createRecruitProfile(snapshot: Readonly<GameState>, archetype: string): DiscipleProfile {
    return this.createDiscipleForArchetype(snapshot, archetype);
  }

  refreshDisciplesInDraft(draft: GameState): void {
    for (const disciple of draft.disciples.roster) {
      updateRiskFlagsInPlace(disciple);
    }

    refreshSectLevelDiscipleFlags(draft);
  }

  getSectManagementOverview(snapshot: Readonly<GameState> = this.stateManager.snapshot): SectManagementOverview {
    const taskCounts = {
      cultivation: 0,
      gathering: 0,
      alchemy: 0,
      exploration: 0,
      rest: 0
    };
    const resourceDelta: ResourceDeltaState = {};
    const inventoryRewards: Record<string, number> = {};
    const summaryLines: string[] = [];
    let cultivationSupport = 0;
    let cultivationPower = 0;
    let herbWorkers = 0;
    let gatherWorkers = 0;

    const libraryLevel = snapshot.sect.buildings.tang_kinh_cac.level;
    const herbGardenLevel = snapshot.sect.buildings.duoc_vien.level;
    const cultivationHallLevel = snapshot.sect.buildings.tinh_tu_duong.level;
    const alchemyPavilionLevel = snapshot.sect.buildings.luyen_khi_phong.level;
    const guardArrayLevel = snapshot.sect.buildings.ho_son_tran_dai.level;

    for (const disciple of snapshot.disciples.roster) {
      const realmOrder = findRealm(disciple.realmId).order;
      cultivationPower += realmOrder * 8 + Math.floor(disciple.comprehension / 12);

      switch (disciple.currentTask) {
        case 'tu_luyen':
          taskCounts.cultivation += 1;
          cultivationSupport += 1 + (disciple.assignedBuildingId === 'tinh_tu_duong' ? 1 : 0) + (libraryLevel > 0 ? 1 : 0);
          break;
        case 'trong_duoc':
          taskCounts.gathering += 1;
          herbWorkers += 1 + (disciple.assignedBuildingId === 'duoc_vien' ? 1 : 0);
          break;
        case 'thu_thap':
          taskCounts.gathering += 1;
          gatherWorkers += 1 + (disciple.assignedBuildingId === 'linh_thach_kho' ? 1 : 0);
          break;
        case 'luyen_dan':
          taskCounts.alchemy += 1;
          cultivationPower += 4;
          break;
        case 'tuan_tra':
          taskCounts.exploration += 1;
          cultivationPower += 2;
          break;
        default:
          taskCounts.rest += 1;
          break;
      }
    }

    if (taskCounts.cultivation > 0 && cultivationHallLevel > 0) {
      const hallBonus = Math.min(taskCounts.cultivation, cultivationHallLevel);
      cultivationSupport += hallBonus;
      summaryLines.push(`Tinh Tu Duong day nhanh nhip tu hanh noi mon: +${hallBonus} tien do.`);
    }

    if (herbWorkers > 0) {
      resourceDelta.duocThao = (resourceDelta.duocThao ?? 0) + herbWorkers;
      inventoryRewards.linh_thao_co_ban = Math.floor((herbWorkers + herbGardenLevel) / 2);
      summaryLines.push(`De tu trong duoc bo sung ${herbWorkers} duoc thao cho son mon.`);
    }

    if (gatherWorkers > 0) {
      resourceDelta.khoangThach = (resourceDelta.khoangThach ?? 0) + gatherWorkers;
      resourceDelta.linhMoc = (resourceDelta.linhMoc ?? 0) + Math.max(0, Math.floor(gatherWorkers / 2));
      inventoryRewards.khoang_thach_tho = Math.floor(gatherWorkers / 2);
      summaryLines.push(`De tu thu thap gom them ${gatherWorkers} khoang thach cho tong mon.`);
    }

    if ((inventoryRewards.linh_thao_co_ban ?? 0) > 0) {
      summaryLines.push(`Vuon duoc noi mon ket ra ${inventoryRewards.linh_thao_co_ban} Linh Thao Co Ban.`);
    }

    if ((inventoryRewards.khoang_thach_tho ?? 0) > 0) {
      summaryLines.push(`Nhom thu thap dua ve ${inventoryRewards.khoang_thach_tho} Khoang Thach Tho.`);
    }

    return {
      cultivationSupport,
      cultivationPower,
      resourceDelta,
      inventoryRewards: Object.fromEntries(Object.entries(inventoryRewards).filter(([, amount]) => amount > 0)),
      alchemyCostReduction: Math.min(2, (taskCounts.alchemy > 0 ? 1 : 0) + (alchemyPavilionLevel >= 2 ? 1 : 0)),
      explorationRewardMultiplier: 1 + Math.min(0.2, taskCounts.exploration * 0.05 + guardArrayLevel * 0.03),
      taskCounts,
      summaryLines
    };
  }

  getSuggestedBuildingForTask(task: DiscipleTaskId, snapshot: Readonly<GameState> = this.stateManager.snapshot): BuildingId | null {
    switch (task) {
      case 'tu_luyen':
        return snapshot.sect.buildings.tinh_tu_duong.isConstructed
          ? 'tinh_tu_duong'
          : snapshot.sect.buildings.tang_kinh_cac.isConstructed
            ? 'tang_kinh_cac'
            : null;
      case 'trong_duoc':
        return snapshot.sect.buildings.duoc_vien.isConstructed ? 'duoc_vien' : null;
      case 'luyen_dan':
        return snapshot.sect.buildings.luyen_khi_phong.isConstructed ? 'luyen_khi_phong' : null;
      case 'thu_thap':
        return snapshot.sect.buildings.linh_thach_kho.isConstructed ? 'linh_thach_kho' : null;
      case 'tuan_tra':
        return snapshot.sect.buildings.ho_son_tran_dai.isConstructed ? 'ho_son_tran_dai' : null;
      default:
        return null;
    }
  }

  applyReputationMilestonesInDraft(draft: GameState, previousReputation: number): string[] {
    const unlockedLines: string[] = [];
    const milestones: Array<{ threshold: number; archetype: string; flag: string }> = [
      { threshold: 10, archetype: 'talented_youth', flag: 'reputation_disciple_10' },
      { threshold: 22, archetype: 'branch_descendant', flag: 'reputation_disciple_22' },
      { threshold: 36, archetype: 'ruined_sect_refugee', flag: 'reputation_disciple_36' }
    ];

    for (const milestone of milestones) {
      if (previousReputation >= milestone.threshold || draft.sect.reputation < milestone.threshold) {
        continue;
      }

      addUniqueFlag(draft.story.worldFlags, milestone.flag);
      draft.sect.prestige += 1;

      if (draft.disciples.roster.length >= draft.sect.discipleCapacity) {
        unlockedLines.push(`Danh vong dat moc ${milestone.threshold}, nhung tong mon chua con cho de nhan de tu moi.`);
        continue;
      }

      const recruit = this.createRecruitProfile(draft, milestone.archetype);
      draft.disciples.roster.push(recruit);
      unlockedLines.push(`${recruit.name} nghe danh Thanh Huyen Mon ma tu nguyen xin nhap mon.`);
    }

    if (unlockedLines.length > 0) {
      draft.ui.statusMessage = unlockedLines[unlockedLines.length - 1];
      refreshSectLevelDiscipleFlags(draft);
    }

    return unlockedLines;
  }

  private getDailyProgressGain(draft: Readonly<GameState>, disciple: DiscipleProfile): number {
    const modifiers = this.sectIdentitySystem.getCombinedModifiers(draft);
    let amount = 1 + Math.floor(disciple.comprehension / 34);

    switch (disciple.currentTask) {
      case 'tu_luyen':
        amount += 2;
        break;
      case 'trong_duoc':
      case 'luyen_dan':
        amount += 1;
        break;
      case 'tuan_tra':
        amount -= 1;
        break;
      case 'nghi_ngoi':
        amount += 0;
        break;
      default:
        break;
    }

    if (disciple.assignedBuildingId === 'tinh_tu_duong' && disciple.currentTask === 'tu_luyen') {
      amount += draft.sect.buildings.tinh_tu_duong.level;
    }

    if (hasTrait(disciple, 'tai_chat_xuat_chung')) {
      amount += 1;
    }

    if (hasTrait(disciple, 'y_chi_ben') && disciple.health <= 55) {
      amount += 1;
    }

    if (hasTrait(disciple, 'nhay_cam_linh_tuc') && disciple.currentTask === 'tu_luyen') {
      amount += 1;
    }

    if (hasTrait(disciple, 'ua_di_hoc') && disciple.assignedBuildingId === 'tang_kinh_cac') {
      amount += 1;
    }

    if (hasTrait(disciple, 'gioi_luyen_dan') && disciple.currentTask === 'luyen_dan') {
      amount += 1;
    }

    if (hasTrait(disciple, 'quen_duong_nui') && (disciple.currentTask === 'thu_thap' || disciple.currentTask === 'tuan_tra')) {
      amount += 1;
    }

    if (hasTrait(disciple, 'luoi_bien') && disciple.currentTask !== 'nghi_ngoi') {
      amount -= 1;
    }

    amount += modifiers.discipleCultivationDaily ?? 0;

    if (disciple.mood <= 35) {
      amount -= 1;
    }

    if (disciple.health <= 45) {
      amount -= 1;
    }

    return Math.max(0, amount);
  }

  private getBaseMoodDelta(draft: Readonly<GameState>, disciple: DiscipleProfile): number {
    const modifiers = this.sectIdentitySystem.getCombinedModifiers(draft);
    let delta = 0;

    switch (disciple.currentTask) {
      case 'tu_luyen':
        delta += 1;
        break;
      case 'trong_duoc':
        delta += 0;
        break;
      case 'luyen_dan':
        delta -= 1;
        break;
      case 'thu_thap':
        delta -= 1;
        break;
      case 'tuan_tra':
        delta -= 2;
        break;
      case 'nghi_ngoi':
        delta += 2;
        break;
    }

    delta += taskFitsBuilding(disciple.currentTask, disciple.assignedBuildingId) ? 1 : disciple.assignedBuildingId ? -2 : 0;

    if (draft.resources.linhKhi < 10) {
      delta -= 1;
    }

    if (disciple.health <= 45) {
      delta -= 1;
    }

    if (hasTrait(disciple, 'chiu_kho') && delta < 0) {
      delta += 1;
    }

    if (hasTrait(disciple, 'luoi_bien') && disciple.currentTask !== 'nghi_ngoi') {
      delta -= 1;
    }

    if (hasTrait(disciple, 'can_man_ben_bi') && disciple.currentTask !== 'nghi_ngoi') {
      delta += 1;
    }

    if (hasTrait(disciple, 'kieu_tam') && disciple.currentTask === 'nghi_ngoi') {
      delta -= 1;
    }

    if (hasTrait(disciple, 'thieu_quyet_doan') && disciple.currentTask === 'tuan_tra') {
      delta -= 1;
    }

    if (draft.sect.stability >= 70) {
      delta += 1;
    } else if (draft.sect.stability <= 35) {
      delta -= 1;
    }

    delta += modifiers.discipleMoodDaily ?? 0;

    return delta;
  }

  private getBaseLoyaltyDelta(draft: Readonly<GameState>, disciple: DiscipleProfile): number {
    const modifiers = this.sectIdentitySystem.getCombinedModifiers(draft);
    let delta = 0;

    if (disciple.mood >= 78) {
      delta += 1;
    }

    if (disciple.mood <= 25) {
      delta -= 1;
    }

    if (hasTrait(disciple, 'trung_hau') && draft.sect.prestige >= 12) {
      delta += 1;
    }

    if (hasTrait(disciple, 'kinh_so_thien_bien') && draft.sect.defense <= 2) {
      delta -= 1;
    }

    if (hasTrait(disciple, 'bat_on_tam_tinh') && disciple.mood <= 40) {
      delta -= 1;
    }

    if (hasTrait(disciple, 'y_chi_ben') && disciple.mood <= 45) {
      delta += 1;
    }

    if (hasTrait(disciple, 'mang_tai_tieng') && draft.sect.prestige <= 10) {
      delta -= 1;
    }

    if (draft.sect.stability >= 68) {
      delta += 1;
    } else if (draft.sect.stability <= 35) {
      delta -= 1;
    }

    delta += modifiers.discipleLoyaltyDaily ?? 0;

    return delta;
  }

  private tryAutoBreakthrough(draft: GameState, disciple: DiscipleProfile): { moodDelta: number; loyaltyDelta: number; note: string | null } {
    const currentRealm = findRealm(disciple.realmId);
    const nextRealm = findNextRealm(disciple.realmId);

    if (!nextRealm || nextRealm.order > 3) {
      return { moodDelta: 0, loyaltyDelta: 0, note: null };
    }

    if (disciple.mood < 45 || disciple.loyalty < 42 || disciple.health < 50) {
      return { moodDelta: 0, loyaltyDelta: 0, note: null };
    }

    disciple.realmId = nextRealm.id as RealmId;
    disciple.cultivationProgress = Math.max(0, disciple.cultivationProgress - currentRealm.progressRequired);
    disciple.breakthroughReady = false;
    draft.sect.prestige += 1;
    draft.sect.stability = clampPercent(draft.sect.stability + 1);
    addUniqueFlag(draft.story.worldFlags, 'disciple_breakthrough_happened');
    addUniqueFlag(draft.story.storyFlags, `disciple_${disciple.id}_breakthrough_done`);
    return {
      moodDelta: 5,
      loyaltyDelta: 2,
      note: `${disciple.name} tự vượt lên ${nextRealm.name}, khí sắc đổi hẳn.`
    };
  }

  private createDiscipleForArchetype(snapshot: Readonly<GameState>, archetype: string): DiscipleProfile {
    const index = snapshot.disciples.roster.length + snapshot.time.day + snapshot.time.month;
    const prestigeBonus = Math.min(8, Math.floor(snapshot.sect.prestige / 12));
    const fortuneBonus = Math.max(0, Math.floor((snapshot.sect.fortune - 45) / 12));
    const positiveFallback = POSITIVE_TRAIT_PRIORITIES.find((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId)) ?? 'trung_hau';
    const flawFallback = FLAW_PRIORITIES.find((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId)) ?? 'tham_cong';
    const temperamentTrait = discipleTraitCatalog.traits.find((trait) => trait.type === 'temperament')?.id ?? null;

    const base: DiscipleProfile = {
      id: `recruit-${snapshot.time.year}-${snapshot.time.month}-${snapshot.time.day}-${index}`,
      name: firstAvailableName(index),
      age: 15 + (index % 8),
      realmId: 'pham_the',
      cultivationProgress: 0,
      breakthroughReady: false,
      rootType: ROOT_TYPES[index % ROOT_TYPES.length],
      comprehension: 56 + prestigeBonus + fortuneBonus,
      temperament: getTraitName(temperamentTrait ?? 'tram_tinh'),
      temperamentTraitId: temperamentTrait,
      loyalty: 58 + Math.min(4, prestigeBonus),
      mood: 60 + Math.min(4, fortuneBonus),
      traitIds: [],
      positiveTraitIds: [positiveFallback],
      flawTraitIds: [],
      currentTask: 'nghi_ngoi',
      assignedBuildingId: null,
      health: 82,
      status: 'active',
      isCoreMember: false,
      riskFlags: [],
      lastDailyNote: 'Mới nhập môn, còn đang quan sát nề nếp của Thanh Huyền Môn.'
    };

    switch (archetype) {
      case 'talented_youth':
        base.rootType = 'Song linh căn mộc thủy';
        base.comprehension = 84;
        base.loyalty = 62;
        base.positiveTraitIds = ['tai_chat_xuat_chung', 'nhay_cam_linh_tuc'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['tham_cong'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.lastDailyNote = 'Tư chất nổi rõ, nhưng lòng còn cần dẫn dắt.';
        break;
      case 'wounded_wanderer':
        base.age = 24;
        base.realmId = 'luyen_khi';
        base.health = 46;
        base.loyalty = 54;
        base.mood = 48;
        base.positiveTraitIds = ['chiu_kho', 'nhan_hau'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['da_nghi'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.lastDailyNote = 'Mang thương tích cũ, tạm đặt lòng tin vào sơn môn.';
        break;
      case 'ruined_sect_refugee':
        base.age = 20;
        base.realmId = 'pham_the';
        base.comprehension = 67;
        base.loyalty = 50;
        base.mood = 45;
        base.positiveTraitIds = ['trung_hau'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.flawTraitIds = ['kinh_so_thien_bien', 'da_nghi'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.lastDailyNote = 'Từ tông môn đổ nát khác mà tới, lòng người chưa yên hẳn.';
        break;
      case 'branch_descendant':
        base.age = 18;
        base.comprehension = 72 + fortuneBonus;
        base.loyalty = 57;
        base.mood = 58;
        base.rootType = 'Thủy mộc tạp căn';
        base.positiveTraitIds = ['y_chi_ben', 'nhay_cam_linh_tuc'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['thieu_quyet_doan'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.lastDailyNote = 'Tự nhận có dây mối với một nhánh cũ của Thanh Huyền Môn, vừa mong được công nhận vừa sợ mang tiếng mạo nhận.';
        break;
      case 'orphan_strange_root':
        base.age = 14;
        base.comprehension = 78 + fortuneBonus;
        base.loyalty = 55;
        base.mood = 63;
        base.rootType = 'Dị linh căn phong ảnh';
        base.positiveTraitIds = ['tai_chat_xuat_chung', 'nhay_cam_linh_tuc'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['kieu_tam'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.lastDailyNote = 'Căn cơ hiếm gặp nhưng tâm chưa định, dễ sản sinh kỳ vọng cả từ trong lên ngoài.';
        break;
      case 'disgraced_transfer':
        base.age = 22;
        base.realmId = 'luyen_khi';
        base.comprehension = 70 + prestigeBonus;
        base.health = 72;
        base.loyalty = 46;
        base.mood = 44;
        base.positiveTraitIds = ['gioi_luyen_dan', 'can_trong'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['mang_tai_tieng', 'da_nghi'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.lastDailyNote = 'Mang theo tay nghề và tiếng xấu, vào môn là cơ hội cũng là gánh nặng.';
        break;
      case 'stubborn_mortal':
        base.age = 19;
        base.comprehension = 52 + prestigeBonus;
        base.loyalty = 64;
        base.mood = 61;
        base.rootType = 'Phàm căn móng';
        base.positiveTraitIds = ['y_chi_ben', 'can_man_ben_bi'].filter((traitId) =>
          discipleTraitCatalog.traits.some((trait) => trait.id === traitId)
        );
        base.flawTraitIds = ['thieu_quyet_doan'].filter((traitId) => discipleTraitCatalog.traits.some((trait) => trait.id === traitId));
        base.lastDailyNote = 'Căn cơ không nói lên điều gì, nhưng ý chí lại có thể giúp người này bớc từng bậc một cách bên bỉ.';
        break;
      default:
        base.flawTraitIds = [flawFallback];
        break;
    }

    base.traitIds = Array.from(new Set([
      ...(base.temperamentTraitId ? [base.temperamentTraitId] : []),
      ...base.positiveTraitIds,
      ...base.flawTraitIds
    ]));
    updateRiskFlagsInPlace(base);
    return base;
  }
}
