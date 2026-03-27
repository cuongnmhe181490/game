import {
  buildingCatalog,
  discipleNamesCatalog,
  discipleTraitCatalog,
  factionCatalog,
  storyChapterCatalog
} from '@/game/data';
import type {
  BuildingId,
  ChapterId,
  DiscipleProfile,
  FactionAllianceState,
  FactionRelationStatus,
  GameState,
  RealmId
} from '@/game/state/types';
import { SAVE_SCHEMA_VERSION } from '@/game/state/types';

interface CreateGameStateOptions {
  replayModifierId?: string | null;
  replaySeenEndingIds?: string[];
}

function applyReplayModifier(state: GameState, options: CreateGameStateOptions): void {
  const replayModifierId = options.replayModifierId ?? null;

  if (!replayModifierId) {
    return;
  }

  state.story.choiceFlags.push('tutorial_intro_seen', 'replay_run');

  if (options.replaySeenEndingIds && options.replaySeenEndingIds.length > 0) {
    state.story.worldFlags.push(...options.replaySeenEndingIds.map((endingId) => `legacy_seen_${endingId}`));
  }

  switch (replayModifierId) {
    case 'legacy_orthodox':
      state.inventory.items.tu_khi_dan = (state.inventory.items.tu_khi_dan ?? 0) + 1;
      state.player.cultivation.foundationStability += 8;
      state.ui.statusMessage = 'Du am Chinh Dao con luu lai: tong mon bat dau hanh trinh moi voi mot vien Tu Khi Dan va nen tang vung hon.';
      state.inventory.lastSummary = 'Kho tong mon giu lai mot vien Tu Khi Dan nhu ky uc cua hanh trinh da qua.';
      break;
    case 'legacy_dominion':
      state.resources.linhThach += 20;
      state.sect.defense += 1;
      state.ui.statusMessage = 'Uy son cu an de lai dau vet: tong mon bat dau vong moi voi chut linh thach va the thu manh hon.';
      break;
    case 'legacy_outsider':
      state.player.cultivation.cultivationProgress += 4;
      state.inventory.items.tan_phien_co_khi = (state.inventory.items.tan_phien_co_khi ?? 0) + 1;
      state.ui.statusMessage = 'Di van pha mon van chua tat: chuong mon bat dau hanh trinh moi voi mot manh co khi va chut linh cam som hon.';
      state.inventory.lastSummary = 'Kho tong mon co them mot manh co khi cu, nhu vet nut nho tu dao lo da qua.';
      break;
    default:
      state.ui.statusMessage = 'Mot hanh trinh moi bat dau, nhung khong mang theo them du am nao.';
      break;
  }
}

function createInitialBuildings(): GameState['sect']['buildings'] {
  const starterLevels: Partial<Record<BuildingId, number>> = {
    chinh_dien: 1,
    tinh_tu_duong: 1,
    duoc_vien: 1,
    tang_kinh_cac: 0,
    luyen_khi_phong: 0,
    linh_thach_kho: 1,
    ho_son_tran_dai: 0,
    tiep_khach_duong: 0
  };
  const starterUnlocked = new Set<BuildingId>(['luyen_khi_phong']);

  return buildingCatalog.buildings.reduce<GameState['sect']['buildings']>((result, building) => {
    const buildingId = building.id as BuildingId;
    const level = starterLevels[buildingId] ?? 0;

    result[buildingId] = {
      buildingId,
      level,
      isUnlocked: level > 0 || starterUnlocked.has(buildingId),
      isConstructed: level > 0,
      assignedDiscipleIds: [],
      status: level > 0 ? 'operational' : starterUnlocked.has(buildingId) ? 'idle' : 'locked',
      productionModifiers: {}
    };

    return result;
  }, {} as GameState['sect']['buildings']);
}

function createStarterDisciples(): DiscipleProfile[] {
  const temperaments = discipleTraitCatalog.traits.filter((trait) => trait.type === 'temperament');
  const positiveTraits = discipleTraitCatalog.traits.filter((trait) => trait.type === 'positive');
  const flaws = discipleTraitCatalog.traits.filter((trait) => trait.type === 'flaw');

  const picks = [
    {
      family: discipleNamesCatalog.familyNames[0],
      given: discipleNamesCatalog.givenNamesMasculine[0],
      age: 19,
      realmId: 'luyen_khi' as RealmId,
      rootType: 'Mộc linh căn',
      comprehension: 68,
      temperament: temperaments[0]?.name ?? 'Trầm Tĩnh',
      temperamentTraitId: temperaments[0]?.id ?? null,
      loyalty: 72,
      mood: 64,
      positiveTraitIds: [positiveTraits[0]?.id, positiveTraits[4]?.id].filter(Boolean) as string[],
      flawTraitIds: [flaws[0]?.id].filter(Boolean) as string[]
    },
    {
      family: discipleNamesCatalog.familyNames[1],
      given: discipleNamesCatalog.givenNamesFeminine[1],
      age: 17,
      realmId: 'pham_the' as RealmId,
      rootType: 'Thủy linh căn',
      comprehension: 74,
      temperament: temperaments[1]?.name ?? 'Giữ Lễ',
      temperamentTraitId: temperaments[1]?.id ?? null,
      loyalty: 68,
      mood: 71,
      positiveTraitIds: [positiveTraits[1]?.id, positiveTraits[3]?.id].filter(Boolean) as string[],
      flawTraitIds: [flaws[2]?.id].filter(Boolean) as string[]
    },
    {
      family: discipleNamesCatalog.familyNames[2],
      given: discipleNamesCatalog.givenNamesMasculine[2],
      age: 21,
      realmId: 'luyen_khi' as RealmId,
      rootType: 'Kim hỏa tạp căn',
      comprehension: 57,
      temperament: temperaments[2]?.name ?? 'Hiếu Thắng',
      temperamentTraitId: temperaments[2]?.id ?? null,
      loyalty: 61,
      mood: 58,
      positiveTraitIds: [positiveTraits[2]?.id].filter(Boolean) as string[],
      flawTraitIds: [flaws[1]?.id].filter(Boolean) as string[]
    }
  ];

  return picks.map((entry, index) => ({
    id: `starter-disciple-${index + 1}`,
    name: `${entry.family} ${entry.given}`,
    age: entry.age,
    realmId: entry.realmId,
    cultivationProgress: index === 1 ? 8 : 5,
    breakthroughReady: false,
    rootType: entry.rootType,
    comprehension: entry.comprehension,
    temperament: entry.temperament,
    temperamentTraitId: entry.temperamentTraitId,
    loyalty: entry.loyalty,
    mood: entry.mood,
    traitIds: [entry.temperamentTraitId, ...entry.positiveTraitIds, ...entry.flawTraitIds].filter(Boolean) as string[],
    positiveTraitIds: entry.positiveTraitIds,
    flawTraitIds: entry.flawTraitIds,
    currentTask: 'nghi_ngoi',
    assignedBuildingId: null,
    health: 100,
    status: 'active',
    isCoreMember: index === 0,
    riskFlags: [],
    lastDailyNote: 'Mới nhập nhịp sinh hoạt của sơn môn.'
  }));
}

function createInitialFactionRelations(): Record<string, number> {
  return factionCatalog.factions.reduce<Record<string, number>>((result, faction) => {
    const defaults: Record<string, number> = {
      trusted: 30,
      aligned: 15,
      neutral: 0,
      strained: -10,
      hostile: -25
    };

    result[faction.id] = defaults[faction.relationDefault] ?? 0;
    return result;
  }, {});
}

function getRelationStatus(score: number): FactionRelationStatus {
  if (score <= -40) {
    return 'hostile';
  }

  if (score <= -15) {
    return 'unfriendly';
  }

  if (score >= 45) {
    return 'allied';
  }

  if (score >= 15) {
    return 'favorable';
  }

  return 'neutral';
}

function getAllianceState(score: number, factionId: string): FactionAllianceState {
  if (score >= 45) {
    return 'allied';
  }

  if (factionId === 'cuu_tieu_quan' && score >= 20) {
    return 'offered';
  }

  return 'none';
}

function createInitialDiplomacyState(
  relations: GameState['story']['factionRelations']
): GameState['diplomacy'] {
  return {
    factions: factionCatalog.factions.reduce<GameState['diplomacy']['factions']>((result, faction) => {
      const relationScore = relations[faction.id] ?? 0;

      result[faction.id] = {
        factionId: faction.id,
        relationScore,
        relationStatus: getRelationStatus(relationScore),
        tradeAccess: faction.id === 'xich_luyen_bao' && relationScore >= 10,
        warningLevel: relationScore <= -15 ? 1 : 0,
        hostilityLevel: relationScore <= -40 ? 2 : relationScore <= -25 ? 1 : 0,
        allianceState: getAllianceState(relationScore, faction.id),
        recentInteractions: [],
        knownFlags: []
      };

      return result;
    }, {}),
    pendingMessageEventIds: [],
    lastSummary: 'Ngoai giao hien tai van con yen lang.'
  };
}

export function createGameState(options: CreateGameStateOptions = {}): GameState {
  const now = new Date().toISOString();
  const firstChapterId = storyChapterCatalog.chapters[0].id as ChapterId;
  const factionRelations = createInitialFactionRelations();

  const state: GameState = {
    meta: {
      saveVersion: SAVE_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      lastAutosaveAt: null
    },
    player: {
      name: 'Tân chưởng môn',
      title: 'Khai Tông Chủ',
      sectName: storyChapterCatalog.playerSectName,
      cultivation: {
        currentRealmId: 'pham_the',
        cultivationProgress: 6,
        breakthroughReady: false,
        foundationStability: 72,
        tamMaPressure: 0,
        cultivationMode: 'balanced',
        equippedMainTechniqueId: 'thanh_tuc_quyet',
        knownTechniqueIds: ['thanh_tuc_quyet'],
        lastGain: 0,
        lastSummary: 'Chưa vận công chu kỳ mới.'
      }
    },
    sect: {
      name: storyChapterCatalog.playerSectName,
      prestige: 6,
      fortune: 50,
      stability: 62,
      chapterId: firstChapterId,
      defense: 1,
      discipleCapacity: 6,
      governanceStyleId: 'on_hoa',
      activeRuleIds: ['thuong_cong'],
      elderSlots: 2,
      guestCultivatorSlots: 1,
      elders: [],
      guestCultivators: [],
      buildings: createInitialBuildings()
    },
    time: {
      day: 1,
      month: 1,
      year: 1
    },
    resources: {
      linhThach: 120,
      linhKhi: 42,
      duocThao: 16,
      khoangThach: 12,
      linhMoc: 18
    },
    inventory: {
      items: {
        linh_thao_co_ban: 4,
        hoa_linh_thao: 2,
        khoang_thach_tho: 3,
        tan_phien_co_khi: 1,
        tu_khi_dan: 2,
        tu_linh_ngoc_boi: 1
      },
      equippedArtifactItemId: null,
      lastSummary: 'Kho tông môn vừa được chỉnh lý lại, có vài dược liệu và một món pháp khí cũ.'
    },
    disciples: {
      roster: createStarterDisciples()
    },
    story: {
      currentChapterId: firstChapterId,
      seenEventIds: [],
      storyFlags: ['chapter_1_start', 'chapter1_started', 'first_disciple_recruited'],
      worldFlags: [],
      choiceFlags: [],
      pathAlignment: {
        orthodox_alignment: 0,
        dominion_alignment: 0,
        outsider_alignment: 0
      },
      greatCrisisLevel: 0,
      truthProgress: 0,
      chapterProgress: {
        chapter_1_du_tan_khai_son: 'active',
        chapter_2_tong_mon_lap_the: 'locked',
        chapter_3_kinh_chieu_cuu_thien: 'locked',
        chapter_4_nhat_niem_dinh_dao: 'locked'
      },
      resolvedMajorEventIds: [],
      factionRelations
    },
    ending: {
      unlockedPaths: [],
      chosenPath: null,
      completedPath: null,
      completed: false,
      summaryFlags: [],
      lastSummary: 'Chua dat nguong ket cuoc cua base game.'
    },
    expansion: {
      currentWorldLayerId: 'pham_gioi',
      currentArcId: 'base_game_pham_gioi',
      completedBaseGame: false,
      completedArcIds: [],
      unlockedArcIds: ['base_game_pham_gioi'],
      availableContinuationHookIds: [],
      nextArcId: null,
      nextWorldLayerId: null,
      canContinueBeyondEnding: false,
      lastSummary: 'Mach mo rong hau ket chua duoc mo trong ban hien tai.'
    },
    diplomacy: createInitialDiplomacyState(factionRelations),
    events: {
      phase: 'idle',
      activeEventId: null,
      activeEventType: null,
      activeContext: null,
      queue: [],
      lastResolvedEventId: null,
      lastResolvedEventType: null,
      history: [],
      lastCheckedDay: 0,
      cooldowns: {},
      pendingFollowupEventIds: []
    },
    exploration: {
      unlockedMapIds: ['hau_son_coc'],
      totalRuns: 0,
      defeatedBossIds: [],
      history: [],
      lastSummary: 'Chưa có chuyến thám hiểm nào.'
    },
    ui: {
      activeScreen: 'sect-scene',
      activeTab: 'overview',
      modalEventId: null,
      statusMessage: 'Thanh Huyền Môn vừa mở sơn môn trở lại.',
      daySummary: 'Chưa có tổng kết vòng ngày.',
      isCultivationPanelOpen: false,
      isDiplomacyPanelOpen: false,
      isGovernancePanelOpen: false,
      isInventoryPanelOpen: false,
      isAlchemyPanelOpen: false
    }
  };

  applyReplayModifier(state, options);
  return state;
}
