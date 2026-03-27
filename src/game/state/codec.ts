import { createGameState } from '@/game/state/createGameState';
import type {
  BuildingId,
  DiscipleStatus,
  DiscipleTaskId,
  EndingPathId,
  EventSource,
  FactionAllianceState,
  FactionRelationStatus,
  GameState,
  RealmId,
  ResourceDeltaState,
  ResourceId
} from '@/game/state/types';
import {
  ARC_IDS,
  BUILDING_IDS,
  CHAPTER_IDS,
  REALM_IDS,
  DISCIPLE_TASK_IDS,
  RESOURCE_IDS,
  SAVE_SCHEMA_VERSION,
  WORLD_LAYER_IDS
} from '@/game/state/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeResourceDelta(input: unknown): ResourceDeltaState {
  const result: ResourceDeltaState = {};

  if (!isRecord(input)) {
    return result;
  }

  for (const resourceId of RESOURCE_IDS) {
    if (isNumber(input[resourceId])) {
      result[resourceId] = Math.trunc(input[resourceId]);
    }
  }

  return result;
}

function normalizeResources(input: unknown, fallback: GameState['resources']): GameState['resources'] {
  const result = { ...fallback };

  if (!isRecord(input)) {
    return result;
  }

  for (const resourceId of RESOURCE_IDS) {
    if (isNumber(input[resourceId])) {
      result[resourceId] = Math.max(0, Math.trunc(input[resourceId]));
    }
  }

  return result;
}

function normalizeInventory(input: unknown, fallback: GameState['inventory']): GameState['inventory'] {
  if (!isRecord(input)) {
    return structuredClone(fallback);
  }

  const items: Record<string, number> = {};

  if (isRecord(input.items)) {
    for (const [itemId, quantity] of Object.entries(input.items)) {
      if (!isNumber(quantity)) {
        continue;
      }

      const nextQuantity = Math.max(0, Math.trunc(quantity));
      if (nextQuantity > 0) {
        items[itemId] = nextQuantity;
      }
    }
  }

  return {
    items,
    equippedArtifactItemId: isString(input.equippedArtifactItemId) ? input.equippedArtifactItemId : null,
    lastSummary: isString(input.lastSummary) ? input.lastSummary : fallback.lastSummary
  };
}

function normalizeBuildings(input: unknown, fallback: GameState['sect']['buildings']): GameState['sect']['buildings'] {
  const result = structuredClone(fallback);

  if (!isRecord(input)) {
    return result;
  }

  for (const buildingId of BUILDING_IDS) {
    const raw = input[buildingId];

    if (isRecord(raw)) {
      const normalizedLevel = isNumber(raw.level) ? Math.max(0, Math.trunc(raw.level)) : result[buildingId].level;
      const isConstructed = raw.isConstructed === true || normalizedLevel > 0;
      const isUnlocked = raw.isUnlocked === true || isConstructed;

      result[buildingId] = {
        buildingId,
        level: normalizedLevel,
        isUnlocked,
        isConstructed,
        assignedDiscipleIds: Array.isArray(raw.assignedDiscipleIds)
          ? raw.assignedDiscipleIds.filter(isString)
          : [],
        status:
          raw.status === 'locked' || raw.status === 'idle' || raw.status === 'operational'
            ? raw.status
            : isConstructed
              ? 'operational'
              : isUnlocked
                ? 'idle'
                : 'locked',
        productionModifiers: normalizeResourceDelta(raw.productionModifiers)
      };
      continue;
    }

    if (isNumber(raw)) {
      const level = Math.max(0, Math.trunc(raw));
      result[buildingId] = {
        buildingId,
        level,
        isUnlocked: level > 0,
        isConstructed: level > 0,
        assignedDiscipleIds: [],
        status: level > 0 ? 'operational' : 'locked',
        productionModifiers: {}
      };
    }
  }

  return result;
}

function remapLegacyResources(input: unknown, fallback: GameState['resources']): GameState['resources'] {
  const result = { ...fallback };

  if (!isRecord(input)) {
    return result;
  }

  const legacyMap: Record<string, ResourceId> = {
    spiritStone: 'linhThach',
    food: 'linhKhi',
    herbs: 'duocThao',
    wood: 'linhMoc'
  };

  for (const [legacyKey, nextKey] of Object.entries(legacyMap)) {
    if (isNumber(input[legacyKey])) {
      result[nextKey] = Math.max(0, Math.trunc(input[legacyKey]));
    }
  }

  return result;
}

function remapLegacyBuildings(input: unknown, fallback: GameState['sect']['buildings']): GameState['sect']['buildings'] {
  const result = structuredClone(fallback);

  if (!isRecord(input)) {
    return result;
  }

  const legacyMap: Record<string, BuildingId> = {
    mainHall: 'chinh_dien',
    meditationHall: 'tinh_tu_duong',
    herbGarden: 'duoc_vien'
  };

  for (const [legacyKey, nextKey] of Object.entries(legacyMap)) {
    if (isNumber(input[legacyKey])) {
      const level = Math.max(0, Math.trunc(input[legacyKey]));

      result[nextKey] = {
        buildingId: nextKey,
        level,
        isUnlocked: level > 0,
        isConstructed: level > 0,
        assignedDiscipleIds: [],
        status: level > 0 ? 'operational' : 'locked',
        productionModifiers: {}
      };
    }
  }

  return result;
}

function normalizeDiscipleTaskId(value: unknown): DiscipleTaskId {
  return isString(value) && DISCIPLE_TASK_IDS.includes(value as DiscipleTaskId)
    ? (value as DiscipleTaskId)
    : 'nghi_ngoi';
}

function normalizeDiscipleStatus(value: unknown): DiscipleStatus {
  return value === 'recovering' || value === 'dissatisfied' || value === 'unstable' ? value : 'active';
}

function normalizeRealmId(value: unknown): RealmId {
  return isString(value) && REALM_IDS.includes(value as RealmId) ? (value as RealmId) : 'pham_the';
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function normalizeEndingPathId(value: unknown): EndingPathId | null {
  return value === 'orthodox' || value === 'dominion' || value === 'outsider' ? value : null;
}

function normalizePathAlignment(
  input: unknown,
  fallback: GameState['story']['pathAlignment']
): GameState['story']['pathAlignment'] {
  const result = { ...fallback };

  if (!isRecord(input)) {
    return result;
  }

  for (const axis of Object.keys(fallback) as Array<keyof GameState['story']['pathAlignment']>) {
    if (isNumber(input[axis])) {
      result[axis] = Math.max(-10, Math.min(10, Math.trunc(input[axis])));
    }
  }

  return result;
}

function normalizeChapterProgress(input: unknown, fallback: GameState['story']['chapterProgress']): GameState['story']['chapterProgress'] {
  const result = { ...fallback };

  if (!isRecord(input)) {
    return result;
  }

  for (const chapterId of CHAPTER_IDS) {
    const raw = input[chapterId];

    if (raw === 'locked' || raw === 'active' || raw === 'completed') {
      result[chapterId] = raw;
    }
  }

  return result;
}

function normalizeFactionRelations(
  input: unknown,
  fallback: GameState['story']['factionRelations']
): GameState['story']['factionRelations'] {
  const result = { ...fallback };

  if (!isRecord(input)) {
    return result;
  }

  for (const [factionId, value] of Object.entries(input)) {
    if (isNumber(value)) {
      result[factionId] = Math.trunc(value);
    }
  }

  return result;
}

function normalizeFactionRelationStatus(value: unknown): FactionRelationStatus {
  return value === 'hostile' || value === 'unfriendly' || value === 'favorable' || value === 'allied'
    ? value
    : 'neutral';
}

function normalizeFactionAllianceState(value: unknown): FactionAllianceState {
  return value === 'offered' || value === 'pact' || value === 'allied' ? value : 'none';
}

function normalizeDiplomacy(
  input: unknown,
  fallback: GameState['diplomacy'],
  factionRelations: GameState['story']['factionRelations']
): GameState['diplomacy'] {
  const result: GameState['diplomacy'] = structuredClone(fallback);

  for (const [factionId, relationScore] of Object.entries(factionRelations)) {
    const state = result.factions[factionId];

    if (!state) {
      continue;
    }

    state.relationScore = Math.trunc(relationScore);
  }

  if (!isRecord(input)) {
    return result;
  }

  if (isRecord(input.factions)) {
    for (const [factionId, rawState] of Object.entries(input.factions)) {
      if (!isRecord(rawState) || !result.factions[factionId]) {
        continue;
      }

      result.factions[factionId] = {
        factionId,
        relationScore: isNumber(rawState.relationScore)
          ? Math.trunc(rawState.relationScore)
          : result.factions[factionId].relationScore,
        relationStatus: normalizeFactionRelationStatus(rawState.relationStatus),
        tradeAccess: rawState.tradeAccess === true,
        warningLevel: isNumber(rawState.warningLevel) ? Math.max(0, Math.trunc(rawState.warningLevel)) : 0,
        hostilityLevel: isNumber(rawState.hostilityLevel) ? Math.max(0, Math.trunc(rawState.hostilityLevel)) : 0,
        allianceState: normalizeFactionAllianceState(rawState.allianceState),
        recentInteractions: Array.isArray(rawState.recentInteractions)
          ? rawState.recentInteractions
              .filter(isRecord)
              .map((entry) => ({
                day: isNumber(entry.day) ? Math.max(1, Math.trunc(entry.day)) : 1,
                type: isString(entry.type) ? entry.type : 'note',
                summary: isString(entry.summary) ? entry.summary : 'Tuong tac ngoai giao.'
              }))
              .slice(-6)
          : [],
        knownFlags: normalizeStringArray(rawState.knownFlags)
      };
    }
  }

  result.pendingMessageEventIds = normalizeStringArray(input.pendingMessageEventIds);
  result.lastSummary = isString(input.lastSummary) ? input.lastSummary : fallback.lastSummary;
  return result;
}

function normalizeExploration(input: unknown, fallback: GameState['exploration']): GameState['exploration'] {
  if (!isRecord(input)) {
    return fallback;
  }

  const unlockedMapIds = Array.from(new Set(normalizeStringArray(input.unlockedMapIds)));
  const safeUnlockedMapIds = unlockedMapIds.length > 0
    ? unlockedMapIds
    : [...fallback.unlockedMapIds];

  return {
    unlockedMapIds: safeUnlockedMapIds,
    totalRuns: isNumber(input.totalRuns) ? Math.max(0, Math.trunc(input.totalRuns)) : fallback.totalRuns,
    defeatedBossIds: Array.from(new Set(normalizeStringArray(input.defeatedBossIds))),
    history: Array.isArray(input.history)
      ? input.history
          .filter(isRecord)
          .map((entry) => ({
            mapId: isString(entry.mapId) ? entry.mapId : 'unknown-map',
            mapName: isString(entry.mapName) ? entry.mapName : 'Khu vực',
            resolvedOnDay: isNumber(entry.resolvedOnDay) ? Math.max(1, Math.trunc(entry.resolvedOnDay)) : 1,
            result:
              entry.result === 'victory' || entry.result === 'retreat' || entry.result === 'defeat'
                ? entry.result
                : 'retreat',
            rewards: normalizeResourceDelta(entry.rewards),
            defeatedBoss: entry.defeatedBoss === true,
            notes: normalizeStringArray(entry.notes)
          }))
      : fallback.history,
    lastSummary: isString(input.lastSummary) ? input.lastSummary : fallback.lastSummary
  };
}

function normalizeEnding(input: unknown, fallback: GameState['ending']): GameState['ending'] {
  if (!isRecord(input)) {
    return structuredClone(fallback);
  }

  const unlockedPaths = Array.from(
    new Set(
      normalizeStringArray(input.unlockedPaths)
        .map((entry) => normalizeEndingPathId(entry))
        .filter((entry): entry is EndingPathId => entry !== null)
    )
  );

  return {
    unlockedPaths,
    chosenPath: normalizeEndingPathId(input.chosenPath),
    completedPath: normalizeEndingPathId(input.completedPath),
    completed: input.completed === true,
    summaryFlags: normalizeStringArray(input.summaryFlags),
    lastSummary: isString(input.lastSummary) ? input.lastSummary : fallback.lastSummary
  };
}

function normalizeExpansion(input: unknown, fallback: GameState['expansion']): GameState['expansion'] {
  if (!isRecord(input)) {
    return structuredClone(fallback);
  }

  return {
    currentWorldLayerId:
      isString(input.currentWorldLayerId) && WORLD_LAYER_IDS.includes(input.currentWorldLayerId as GameState['expansion']['currentWorldLayerId'])
        ? (input.currentWorldLayerId as GameState['expansion']['currentWorldLayerId'])
        : fallback.currentWorldLayerId,
    currentArcId:
      isString(input.currentArcId) && ARC_IDS.includes(input.currentArcId as GameState['expansion']['currentArcId'])
        ? (input.currentArcId as GameState['expansion']['currentArcId'])
        : fallback.currentArcId,
    completedBaseGame: input.completedBaseGame === true,
    completedArcIds: Array.from(new Set(normalizeStringArray(input.completedArcIds))),
    unlockedArcIds: Array.from(new Set(normalizeStringArray(input.unlockedArcIds))).length > 0
      ? Array.from(new Set(normalizeStringArray(input.unlockedArcIds)))
      : [...fallback.unlockedArcIds],
    availableContinuationHookIds: Array.from(new Set(normalizeStringArray(input.availableContinuationHookIds))),
    nextArcId: isString(input.nextArcId) ? input.nextArcId : null,
    nextWorldLayerId: isString(input.nextWorldLayerId) ? input.nextWorldLayerId : null,
    canContinueBeyondEnding: input.canContinueBeyondEnding === true,
    lastSummary: isString(input.lastSummary) ? input.lastSummary : fallback.lastSummary
  };
}

function normalizeGameState(parsed: unknown): GameState | null {
  const base = createGameState();

  if (!isRecord(parsed)) {
    return null;
  }

  if (
    isRecord(parsed.meta) &&
    (
      parsed.meta.saveVersion === SAVE_SCHEMA_VERSION ||
      parsed.meta.saveVersion === 14 ||
      parsed.meta.saveVersion === 12 ||
      parsed.meta.saveVersion === 10 ||
      parsed.meta.saveVersion === 9 ||
      parsed.meta.saveVersion === 8 ||
      parsed.meta.saveVersion === 7 ||
      parsed.meta.saveVersion === 6 ||
      parsed.meta.saveVersion === 5
    )
  ) {
    return {
      meta: {
        saveVersion: SAVE_SCHEMA_VERSION,
        createdAt: isString(parsed.meta.createdAt) ? parsed.meta.createdAt : base.meta.createdAt,
        updatedAt: isString(parsed.meta.updatedAt) ? parsed.meta.updatedAt : base.meta.updatedAt,
        lastAutosaveAt: isString(parsed.meta.lastAutosaveAt) ? parsed.meta.lastAutosaveAt : null
      },
      player: isRecord(parsed.player)
        ? {
            name: isString(parsed.player.name) ? parsed.player.name : base.player.name,
            title: isString(parsed.player.title) ? parsed.player.title : base.player.title,
            sectName: isString(parsed.player.sectName) ? parsed.player.sectName : base.player.sectName,
            cultivation: isRecord(parsed.player.cultivation)
              ? {
                  currentRealmId: normalizeRealmId(parsed.player.cultivation.currentRealmId),
                  cultivationProgress: isNumber(parsed.player.cultivation.cultivationProgress)
                    ? Math.max(0, Math.trunc(parsed.player.cultivation.cultivationProgress))
                    : base.player.cultivation.cultivationProgress,
                  breakthroughReady: parsed.player.cultivation.breakthroughReady === true,
                  foundationStability: isNumber(parsed.player.cultivation.foundationStability)
                    ? Math.max(0, Math.min(100, Math.trunc(parsed.player.cultivation.foundationStability)))
                    : base.player.cultivation.foundationStability,
                  tamMaPressure: isNumber(parsed.player.cultivation.tamMaPressure)
                    ? Math.max(0, Math.min(100, Math.trunc(parsed.player.cultivation.tamMaPressure)))
                    : base.player.cultivation.tamMaPressure,
                  cultivationMode:
                    parsed.player.cultivation.cultivationMode === 'focused' ? 'focused' : 'balanced',
                  equippedMainTechniqueId: isString(parsed.player.cultivation.equippedMainTechniqueId)
                    ? parsed.player.cultivation.equippedMainTechniqueId
                    : base.player.cultivation.equippedMainTechniqueId,
                  knownTechniqueIds: Array.isArray(parsed.player.cultivation.knownTechniqueIds)
                    ? parsed.player.cultivation.knownTechniqueIds.filter(isString)
                    : base.player.cultivation.knownTechniqueIds,
                  lastGain: isNumber(parsed.player.cultivation.lastGain)
                    ? Math.max(0, Math.trunc(parsed.player.cultivation.lastGain))
                    : base.player.cultivation.lastGain,
                  lastSummary: isString(parsed.player.cultivation.lastSummary)
                    ? parsed.player.cultivation.lastSummary
                    : base.player.cultivation.lastSummary
                }
              : base.player.cultivation
          }
        : base.player,
      sect: isRecord(parsed.sect)
        ? {
            name: isString(parsed.sect.name) ? parsed.sect.name : base.sect.name,
            prestige: isNumber(parsed.sect.prestige) ? Math.max(0, Math.trunc(parsed.sect.prestige)) : base.sect.prestige,
            fortune: isNumber(parsed.sect.fortune) ? Math.max(0, Math.min(100, Math.trunc(parsed.sect.fortune))) : base.sect.fortune,
            stability: isNumber(parsed.sect.stability) ? Math.max(0, Math.min(100, Math.trunc(parsed.sect.stability))) : base.sect.stability,
            chapterId:
              isString(parsed.sect.chapterId) && CHAPTER_IDS.includes(parsed.sect.chapterId as GameState['sect']['chapterId'])
                ? (parsed.sect.chapterId as GameState['sect']['chapterId'])
                : base.sect.chapterId,
            defense: isNumber(parsed.sect.defense) ? Math.max(0, Math.trunc(parsed.sect.defense)) : base.sect.defense,
            discipleCapacity:
              isNumber(parsed.sect.discipleCapacity)
                ? Math.max(1, Math.trunc(parsed.sect.discipleCapacity))
                : base.sect.discipleCapacity,
            governanceStyleId: isString(parsed.sect.governanceStyleId) ? parsed.sect.governanceStyleId : base.sect.governanceStyleId,
            activeRuleIds: normalizeStringArray(parsed.sect.activeRuleIds).slice(0, 2),
            elderSlots: isNumber(parsed.sect.elderSlots) ? Math.max(0, Math.trunc(parsed.sect.elderSlots)) : base.sect.elderSlots,
            guestCultivatorSlots:
              isNumber(parsed.sect.guestCultivatorSlots)
                ? Math.max(0, Math.trunc(parsed.sect.guestCultivatorSlots))
                : base.sect.guestCultivatorSlots,
            elders: Array.isArray(parsed.sect.elders)
              ? parsed.sect.elders
                  .filter(isRecord)
                  .map((entry) => ({
                    roleId: isString(entry.roleId) ? entry.roleId : 'truong_lao_tu_hanh',
                    discipleId: isString(entry.discipleId) ? entry.discipleId : '',
                    appointedOnDay: isNumber(entry.appointedOnDay) ? Math.max(1, Math.trunc(entry.appointedOnDay)) : 1
                  }))
                  .filter((entry) => entry.discipleId.length > 0)
                  .slice(0, 4)
              : base.sect.elders,
            guestCultivators: Array.isArray(parsed.sect.guestCultivators)
              ? parsed.sect.guestCultivators
                  .filter(isRecord)
                  .map((entry, index) => ({
                    id: isString(entry.id) ? entry.id : `guest-${index + 1}`,
                    name: isString(entry.name) ? entry.name : `Khách khanh ${index + 1}`,
                    sourceFactionId: isString(entry.sourceFactionId) ? entry.sourceFactionId : null,
                    specialty: isString(entry.specialty) ? entry.specialty : 'tro_giup_noi_mon',
                    remainingDays: isNumber(entry.remainingDays) ? Math.max(1, Math.trunc(entry.remainingDays)) : 3,
                    bonusSummary: isString(entry.bonusSummary) ? entry.bonusSummary : 'Khách khanh tạm lưu hỗ trợ sơn môn.'
                  }))
                  .slice(0, 4)
              : base.sect.guestCultivators,
            buildings: normalizeBuildings(parsed.sect.buildings, base.sect.buildings)
          }
        : base.sect,
      time: isRecord(parsed.time)
        ? {
            day: isNumber(parsed.time.day) ? Math.max(1, Math.trunc(parsed.time.day)) : base.time.day,
            month: isNumber(parsed.time.month) ? Math.max(1, Math.trunc(parsed.time.month)) : base.time.month,
            year: isNumber(parsed.time.year) ? Math.max(1, Math.trunc(parsed.time.year)) : base.time.year
          }
        : base.time,
      resources: normalizeResources(parsed.resources, base.resources),
      inventory: normalizeInventory(parsed.inventory, base.inventory),
      disciples:
        isRecord(parsed.disciples) && Array.isArray(parsed.disciples.roster)
          ? {
              roster: parsed.disciples.roster.filter(isRecord).map((entry, index) => ({
                id: isString(entry.id) ? entry.id : `loaded-disciple-${index + 1}`,
                name: isString(entry.name) ? entry.name : `Đệ tử ${index + 1}`,
                age: isNumber(entry.age) ? Math.max(12, Math.trunc(entry.age)) : 18 + index,
                realmId: normalizeRealmId(entry.realmId ?? entry.realm),
                cultivationProgress: isNumber(entry.cultivationProgress)
                  ? Math.max(0, Math.trunc(entry.cultivationProgress))
                  : 0,
                breakthroughReady: entry.breakthroughReady === true,
                rootType: isString(entry.rootType) ? entry.rootType : 'Tạp linh căn',
                comprehension: isNumber(entry.comprehension)
                  ? Math.max(10, Math.min(100, Math.trunc(entry.comprehension)))
                  : 50,
                temperament: isString(entry.temperament) ? entry.temperament : 'Trầm Tĩnh',
                temperamentTraitId: isString(entry.temperamentTraitId) ? entry.temperamentTraitId : null,
                loyalty: isNumber(entry.loyalty) ? Math.max(0, Math.min(100, Math.trunc(entry.loyalty))) : 50,
                mood: isNumber(entry.mood) ? Math.max(0, Math.min(100, Math.trunc(entry.mood))) : 55,
                traitIds: normalizeStringArray(entry.traitIds),
                positiveTraitIds: normalizeStringArray(entry.positiveTraitIds),
                flawTraitIds: normalizeStringArray(entry.flawTraitIds),
                currentTask: normalizeDiscipleTaskId(entry.currentTask),
                assignedBuildingId:
                  isString(entry.assignedBuildingId) && BUILDING_IDS.includes(entry.assignedBuildingId as BuildingId)
                    ? (entry.assignedBuildingId as BuildingId)
                    : null
                ,
                health: isNumber(entry.health) ? Math.max(0, Math.min(100, Math.trunc(entry.health))) : 100,
                status: normalizeDiscipleStatus(entry.status),
                isCoreMember: entry.isCoreMember === true,
                riskFlags: normalizeStringArray(entry.riskFlags),
                lastDailyNote: isString(entry.lastDailyNote) ? entry.lastDailyNote : 'Chưa có biến động đáng kể.'
              }))
              .map((entry) => ({
                ...entry,
                positiveTraitIds: entry.positiveTraitIds.length > 0
                  ? entry.positiveTraitIds
                  : entry.traitIds.filter((traitId) => !entry.flawTraitIds.includes(traitId) && traitId !== entry.temperamentTraitId),
                traitIds: Array.from(new Set([
                  ...entry.traitIds,
                  ...entry.positiveTraitIds,
                  ...entry.flawTraitIds,
                  ...(entry.temperamentTraitId ? [entry.temperamentTraitId] : [])
                ]))
              }))
            }
          : base.disciples,
      story: (() => {
        const normalizedStory = isRecord(parsed.story)
          ? {
              currentChapterId:
                isString(parsed.story.currentChapterId) &&
                CHAPTER_IDS.includes(parsed.story.currentChapterId as GameState['story']['currentChapterId'])
                  ? (parsed.story.currentChapterId as GameState['story']['currentChapterId'])
                  : base.story.currentChapterId,
              seenEventIds: normalizeStringArray(parsed.story.seenEventIds),
              storyFlags: normalizeStringArray(parsed.story.storyFlags ?? parsed.story.flags ?? base.story.storyFlags),
              worldFlags: normalizeStringArray(parsed.story.worldFlags),
              choiceFlags: normalizeStringArray(parsed.story.choiceFlags),
              pathAlignment: normalizePathAlignment(parsed.story.pathAlignment, base.story.pathAlignment),
              greatCrisisLevel: isNumber(parsed.story.greatCrisisLevel)
                ? Math.max(0, Math.min(100, Math.trunc(parsed.story.greatCrisisLevel)))
                : base.story.greatCrisisLevel,
              truthProgress: isNumber(parsed.story.truthProgress)
                ? Math.max(0, Math.min(100, Math.trunc(parsed.story.truthProgress)))
                : base.story.truthProgress,
              chapterProgress: normalizeChapterProgress(parsed.story.chapterProgress, base.story.chapterProgress),
              resolvedMajorEventIds: normalizeStringArray(parsed.story.resolvedMajorEventIds),
              factionRelations: normalizeFactionRelations(parsed.story.factionRelations, base.story.factionRelations)
            }
          : base.story;

        return normalizedStory;
      })(),
      ending: normalizeEnding(parsed.ending, base.ending),
      expansion: normalizeExpansion(parsed.expansion, base.expansion),
      diplomacy: normalizeDiplomacy(
        parsed.diplomacy,
        base.diplomacy,
        isRecord(parsed.story)
          ? normalizeFactionRelations(parsed.story.factionRelations, base.story.factionRelations)
          : base.story.factionRelations
      ),
      events: isRecord(parsed.events)
        ? {
            phase: parsed.events.phase === 'queued' || parsed.events.phase === 'presented' ? parsed.events.phase : 'idle',
            activeEventId: isString(parsed.events.activeEventId) ? parsed.events.activeEventId : null,
            activeEventType:
              parsed.events.activeEventType === 'random' || parsed.events.activeEventType === 'major'
                ? parsed.events.activeEventType
                : null,
            activeContext:
              isRecord(parsed.events.activeContext)
                ? {
                    actorDiscipleId: isString(parsed.events.activeContext.actorDiscipleId)
                      ? parsed.events.activeContext.actorDiscipleId
                      : null,
                    targetBuildingId: isString(parsed.events.activeContext.targetBuildingId)
                      ? (parsed.events.activeContext.targetBuildingId as BuildingId)
                      : null,
                    factionId: isString(parsed.events.activeContext.factionId) ? parsed.events.activeContext.factionId : null,
                    resourceId: isString(parsed.events.activeContext.resourceId)
                      ? (parsed.events.activeContext.resourceId as ResourceId)
                      : null
                  }
                : null,
            queue: Array.isArray(parsed.events.queue)
              ? parsed.events.queue
                  .filter(isRecord)
                  .map((entry) => ({
                    eventId: isString(entry.eventId) ? entry.eventId : '',
                    source: (entry.source === 'story' || entry.source === 'system' ? entry.source : 'time') as EventSource,
                    queuedAtDay: isNumber(entry.queuedAtDay) ? Math.max(1, Math.trunc(entry.queuedAtDay)) : base.time.day,
                    priority: isNumber(entry.priority) ? Math.trunc(entry.priority) : 0
                  }))
                  .filter((entry) => entry.eventId.length > 0)
              : [],
            lastResolvedEventId: isString(parsed.events.lastResolvedEventId) ? parsed.events.lastResolvedEventId : null,
            lastResolvedEventType:
              parsed.events.lastResolvedEventType === 'random' || parsed.events.lastResolvedEventType === 'major'
                ? parsed.events.lastResolvedEventType
                : null,
            history: Array.isArray(parsed.events.history)
              ? parsed.events.history
                  .filter(isRecord)
                  .map((entry) => ({
                    eventId: isString(entry.eventId) ? entry.eventId : '',
                    eventType: (entry.eventType === 'major' ? 'major' : 'random') as 'major' | 'random',
                    title: isString(entry.title) ? entry.title : isString(entry.eventId) ? entry.eventId : 'Sự kiện',
                    resolvedOnDay: isNumber(entry.resolvedOnDay) ? Math.max(1, Math.trunc(entry.resolvedOnDay)) : base.time.day,
                    choiceId: isString(entry.choiceId) ? entry.choiceId : 'unknown',
                    contextSummary: isString(entry.contextSummary) ? entry.contextSummary : undefined
                  }))
                  .filter((entry) => entry.eventId.length > 0)
              : [],
            lastCheckedDay: isNumber(parsed.events.lastCheckedDay) ? Math.max(0, Math.trunc(parsed.events.lastCheckedDay)) : 0,
            cooldowns: isRecord(parsed.events.cooldowns)
              ? Object.fromEntries(
                  Object.entries(parsed.events.cooldowns).filter((entry): entry is [string, number] => isNumber(entry[1]))
                )
              : {},
            pendingFollowupEventIds: normalizeStringArray(parsed.events.pendingFollowupEventIds)
          }
        : base.events,
      exploration: normalizeExploration(parsed.exploration, base.exploration),
      ui: isRecord(parsed.ui)
        ? {
            activeScreen:
              parsed.ui.activeScreen === 'main-menu' ||
              parsed.ui.activeScreen === 'event-modal' ||
              parsed.ui.activeScreen === 'cultivation-panel' ||
              parsed.ui.activeScreen === 'diplomacy-panel' ||
              parsed.ui.activeScreen === 'governance-panel' ||
              parsed.ui.activeScreen === 'inventory-panel' ||
              parsed.ui.activeScreen === 'alchemy-panel' ||
              parsed.ui.activeScreen === 'ending-scene' ||
              parsed.ui.activeScreen === 'exploration-scene'
                ? parsed.ui.activeScreen
                : 'sect-scene',
            activeTab:
              parsed.ui.activeTab === 'buildings' ||
              parsed.ui.activeTab === 'resources' ||
              parsed.ui.activeTab === 'disciples' ||
              parsed.ui.activeTab === 'events'
                ? parsed.ui.activeTab
                : 'overview',
            modalEventId: isString(parsed.ui.modalEventId) ? parsed.ui.modalEventId : null,
            statusMessage: isString(parsed.ui.statusMessage) ? parsed.ui.statusMessage : base.ui.statusMessage,
            daySummary: isString(parsed.ui.daySummary) ? parsed.ui.daySummary : base.ui.daySummary,
            isCultivationPanelOpen: parsed.ui.isCultivationPanelOpen === true,
            isDiplomacyPanelOpen: parsed.ui.isDiplomacyPanelOpen === true,
            isGovernancePanelOpen: parsed.ui.isGovernancePanelOpen === true,
            isInventoryPanelOpen: parsed.ui.isInventoryPanelOpen === true,
            isAlchemyPanelOpen: parsed.ui.isAlchemyPanelOpen === true
          }
        : base.ui
    };
  }

  if (isRecord(parsed.meta) && parsed.meta.version === 3) {
    return {
      ...base,
      meta: {
        ...base.meta,
        createdAt: isString(parsed.meta.createdAt) ? parsed.meta.createdAt : base.meta.createdAt,
        updatedAt: isString(parsed.meta.updatedAt) ? parsed.meta.updatedAt : base.meta.updatedAt
      },
      sect: isRecord(parsed.sect)
        ? {
            ...base.sect,
            name: isString(parsed.sect.name) ? parsed.sect.name : base.sect.name,
            prestige: isNumber(parsed.sect.prestige) ? Math.max(0, Math.trunc(parsed.sect.prestige)) : base.sect.prestige,
            buildings: remapLegacyBuildings(parsed.sect.buildings, base.sect.buildings)
          }
        : base.sect,
      time: isRecord(parsed.realm)
        ? {
            day: isNumber(parsed.realm.day) ? Math.max(1, Math.trunc(parsed.realm.day)) : base.time.day,
            month: 1,
            year: 1
          }
        : base.time,
      resources: remapLegacyResources(parsed.resources, base.resources),
      disciples:
        isRecord(parsed.disciples) && Array.isArray(parsed.disciples.roster)
          ? {
              roster: parsed.disciples.roster.filter(isRecord).map((entry, index) => ({
                id: isString(entry.id) ? entry.id : `legacy-disciple-${index + 1}`,
                name: isString(entry.name) ? entry.name : `Đệ tử ${index + 1}`,
                age: 18 + index,
                realmId: normalizeRealmId(entry.realm),
                cultivationProgress: 0,
                breakthroughReady: false,
                rootType: 'Tạp linh căn',
                comprehension: 50,
                temperament: 'Trầm Tĩnh',
                temperamentTraitId: null,
                loyalty: 60,
                mood: 60,
                traitIds: [],
                positiveTraitIds: [],
                flawTraitIds: [],
                currentTask: 'nghi_ngoi',
                assignedBuildingId: null,
                health: 100,
                status: 'active',
                isCoreMember: false,
                riskFlags: [],
                lastDailyNote: 'Được đưa sang schema đệ tử mới.'
              }))
            }
          : base.disciples,
      story: isRecord(parsed.story)
        ? {
            ...base.story,
            seenEventIds: Array.isArray(parsed.story.seenEventIds) ? parsed.story.seenEventIds.filter(isString) : [],
            storyFlags: Array.isArray(parsed.story.flags) ? parsed.story.flags.filter(isString) : base.story.storyFlags,
            pathAlignment: base.story.pathAlignment,
            greatCrisisLevel: base.story.greatCrisisLevel,
            truthProgress: base.story.truthProgress
          }
        : base.story,
      ending: base.ending,
      expansion: base.expansion,
      diplomacy: base.diplomacy,
      events: isRecord(parsed.events)
        ? {
            ...base.events,
            activeEventId: isString(parsed.events.activeEventId) ? parsed.events.activeEventId : null,
            lastResolvedEventId: isString(parsed.events.lastResolvedEventId) ? parsed.events.lastResolvedEventId : null,
            history: Array.isArray(parsed.events.history)
              ? parsed.events.history
                  .filter(isRecord)
                  .map((entry) => ({
                    eventId: isString(entry.eventId) ? entry.eventId : '',
                    eventType: 'random' as const,
                    title: isString(entry.eventId) ? entry.eventId : 'Sự kiện',
                    resolvedOnDay: isNumber(entry.resolvedOnDay) ? Math.max(1, Math.trunc(entry.resolvedOnDay)) : base.time.day,
                    choiceId: isString(entry.choiceId) ? entry.choiceId : 'unknown'
                  }))
                  .filter((entry) => entry.eventId.length > 0)
              : []
          }
        : base.events,
      exploration: base.exploration
    };
  }

  return null;
}

export function deserializeGameState(serializedState: string): GameState | null {
  try {
    return normalizeGameState(JSON.parse(serializedState) as unknown);
  } catch {
    return null;
  }
}
