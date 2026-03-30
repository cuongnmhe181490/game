import type { EntityId } from '@/game/entities';

export const SAVE_SCHEMA_VERSION = 17 as const;

export const BUILDING_IDS = [
  'chinh_dien',
  'tinh_tu_duong',
  'duoc_vien',
  'tang_kinh_cac',
  'luyen_khi_phong',
  'linh_thach_kho',
  'ho_son_tran_dai',
  'tiep_khach_duong'
] as const;
export const RESOURCE_IDS = ['linhThach', 'linhKhi', 'duocThao', 'khoangThach', 'linhMoc'] as const;
export const CHAPTER_IDS = [
  'chapter_1_du_tan_khai_son',
  'chapter_2_tong_mon_lap_the',
  'chapter_3_kinh_chieu_cuu_thien',
  'chapter_4_nhat_niem_dinh_dao'
] as const;
export const WORLD_LAYER_IDS = ['pham_gioi', 'linh_gioi'] as const;
export const ARC_IDS = ['base_game_pham_gioi', 'future_linh_gioi_arc'] as const;
export const REALM_IDS = ['pham_the', 'luyen_khi', 'truc_co', 'kim_dan', 'nguyen_anh'] as const;
export const SECT_VIEWS = ['overview', 'buildings', 'resources', 'disciples', 'events'] as const;
export const EVENT_SOURCES = ['time', 'story', 'system'] as const;
export const EVENT_PHASES = ['idle', 'queued', 'presented'] as const;
export const UI_SCREENS = [
  'main-menu',
  'sect-scene',
  'event-modal',
  'cultivation-panel',
  'diplomacy-panel',
  'governance-panel',
  'inventory-panel',
  'alchemy-panel',
  'exploration-scene',
  'ending-scene'
] as const;
export const BUILDING_STATUSES = ['operational', 'locked', 'idle'] as const;
export const DISCIPLE_TASK_IDS = [
  'tu_luyen',
  'trong_duoc',
  'luyen_dan',
  'thu_thap',
  'tuan_tra',
  'nghi_ngoi'
] as const;
export const CULTIVATION_MODES = ['balanced', 'focused'] as const;
export const DISCIPLE_STATUSES = ['active', 'recovering', 'dissatisfied', 'unstable'] as const;
export const FACTION_RELATION_STATUSES = ['hostile', 'unfriendly', 'neutral', 'favorable', 'allied'] as const;
export const FACTION_ALLIANCE_STATES = ['none', 'offered', 'pact', 'allied'] as const;
export const ITEM_CATEGORIES = ['resource', 'herb', 'ore', 'pill', 'material', 'artifact', 'quest', 'misc'] as const;
export const ENDING_PATH_IDS = ['orthodox', 'dominion', 'outsider'] as const;

export type SaveVersion = typeof SAVE_SCHEMA_VERSION;
export type BuildingId = (typeof BUILDING_IDS)[number];
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type ChapterId = (typeof CHAPTER_IDS)[number];
export type WorldLayerId = (typeof WORLD_LAYER_IDS)[number];
export type ArcId = (typeof ARC_IDS)[number];
export type RealmId = (typeof REALM_IDS)[number];
export type SectView = (typeof SECT_VIEWS)[number];
export type EventSource = (typeof EVENT_SOURCES)[number];
export type EventRuntimePhase = (typeof EVENT_PHASES)[number];
export type ActiveScreen = (typeof UI_SCREENS)[number];
export type BuildingStatus = (typeof BUILDING_STATUSES)[number];
export type DiscipleTaskId = (typeof DISCIPLE_TASK_IDS)[number];
export type CultivationMode = (typeof CULTIVATION_MODES)[number];
export type DiscipleStatus = (typeof DISCIPLE_STATUSES)[number];
export type FactionRelationStatus = (typeof FACTION_RELATION_STATUSES)[number];
export type FactionAllianceState = (typeof FACTION_ALLIANCE_STATES)[number];
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type EndingPathId = (typeof ENDING_PATH_IDS)[number];
export type AlignmentAxis = 'orthodox_alignment' | 'dominion_alignment' | 'outsider_alignment';

export interface MetaState {
  saveVersion: SaveVersion;
  createdAt: string;
  updatedAt: string;
  lastAutosaveAt: string | null;
}

export interface PlayerCultivationState {
  currentRealmId: RealmId;
  cultivationProgress: number;
  breakthroughReady: boolean;
  breakthroughBonus: number;
  foundationStability: number;
  tamMaPressure: number;
  cultivationMode: CultivationMode;
  equippedMainTechniqueId: string | null;
  knownTechniqueIds: string[];
  lastGain: number;
  lastSummary: string;
}

export interface PlayerState {
  name: string;
  title: string;
  sectName: string;
  cultivation: PlayerCultivationState;
}

export interface BuildingState {
  buildingId: BuildingId;
  level: number;
  isUnlocked: boolean;
  isConstructed: boolean;
  assignedDiscipleIds: EntityId[];
  status: BuildingStatus;
  productionModifiers: ResourceDeltaState;
}

export interface SectElderState {
  roleId: string;
  discipleId: EntityId;
  appointedOnDay: number;
}

export interface SectGuestState {
  id: string;
  name: string;
  sourceFactionId: string | null;
  specialty: string;
  remainingDays: number;
  bonusSummary: string;
}

export interface SectState {
  name: string;
  prestige: number;
  reputation: number;
  fortune: number;
  stability: number;
  chapterId: ChapterId;
  defense: number;
  discipleCapacity: number;
  governanceStyleId: string;
  activeRuleIds: string[];
  elderSlots: number;
  guestCultivatorSlots: number;
  elders: SectElderState[];
  guestCultivators: SectGuestState[];
  buildings: Record<BuildingId, BuildingState>;
}

export interface ResourceState extends Record<ResourceId, number> {}
export interface ResourceDeltaState extends Partial<Record<ResourceId, number>> {}

export interface DiscipleProfile {
  id: EntityId;
  name: string;
  age: number;
  realmId: RealmId;
  cultivationProgress: number;
  breakthroughReady: boolean;
  rootType: string;
  comprehension: number;
  temperament: string;
  temperamentTraitId: string | null;
  loyalty: number;
  mood: number;
  traitIds: string[];
  positiveTraitIds: string[];
  flawTraitIds: string[];
  currentTask: DiscipleTaskId;
  assignedBuildingId: BuildingId | null;
  health: number;
  status: DiscipleStatus;
  isCoreMember: boolean;
  riskFlags: string[];
  lastDailyNote: string;
}

export interface DiscipleState {
  roster: DiscipleProfile[];
}

export interface StoryState {
  currentChapterId: ChapterId;
  seenEventIds: string[];
  storyFlags: string[];
  worldFlags: string[];
  choiceFlags: string[];
  pathAlignment: Record<AlignmentAxis, number>;
  greatCrisisLevel: number;
  truthProgress: number;
  chapterProgress: Partial<Record<ChapterId, 'locked' | 'active' | 'completed'>>;
  resolvedMajorEventIds: string[];
  factionRelations: Record<string, number>;
}

export interface EndingState {
  unlockedPaths: EndingPathId[];
  chosenPath: EndingPathId | null;
  completedPath: EndingPathId | null;
  completed: boolean;
  summaryFlags: string[];
  lastSummary: string;
}

export interface ExpansionState {
  currentWorldLayerId: WorldLayerId;
  currentArcId: ArcId;
  completedBaseGame: boolean;
  completedArcIds: string[];
  unlockedArcIds: string[];
  availableContinuationHookIds: string[];
  nextArcId: string | null;
  nextWorldLayerId: string | null;
  canContinueBeyondEnding: boolean;
  lastSummary: string;
}

export interface FactionInteractionRecord {
  day: number;
  type: string;
  summary: string;
}

export interface FactionState {
  factionId: string;
  relationScore: number;
  relationStatus: FactionRelationStatus;
  tradeAccess: boolean;
  warningLevel: number;
  hostilityLevel: number;
  allianceState: FactionAllianceState;
  recentInteractions: FactionInteractionRecord[];
  knownFlags: string[];
}

export interface DiplomacyState {
  factions: Record<string, FactionState>;
  pendingMessageEventIds: string[];
  lastSummary: string;
}

export interface QueuedEventState {
  eventId: string;
  source: EventSource;
  queuedAtDay: number;
  priority: number;
}

export interface EventContextState {
  actorDiscipleId: string | null;
  targetBuildingId: BuildingId | null;
  factionId: string | null;
  resourceId: ResourceId | null;
}

export interface EventResolutionRecord {
  eventId: string;
  eventType: 'random' | 'major';
  title: string;
  resolvedOnDay: number;
  choiceId: string;
  contextSummary?: string;
}

export interface EventState {
  phase: EventRuntimePhase;
  activeEventId: string | null;
  activeEventType: 'random' | 'major' | null;
  activeContext: EventContextState | null;
  queue: QueuedEventState[];
  lastResolvedEventId: string | null;
  lastResolvedEventType: 'random' | 'major' | null;
  history: EventResolutionRecord[];
  lastCheckedDay: number;
  cooldowns: Record<string, number>;
  pendingFollowupEventIds: string[];
}

export interface TimeState {
  day: number;
  month: number;
  year: number;
}

export interface InventoryState {
  items: Record<string, number>;
  equippedArtifactItemId: string | null;
  lastSummary: string;
}

export interface OwnedBeastState {
  beastId: string;
  level: number;
  training: number;
  attack: number;
  defense: number;
  health: number;
}

export interface BeastCollectionState {
  owned: OwnedBeastState[];
  activeBeastId: string | null;
  lastSummary: string;
}

export interface UiState {
  activeScreen: ActiveScreen;
  activeTab: SectView;
  modalEventId: string | null;
  statusMessage: string;
  daySummary: string;
  isCultivationPanelOpen: boolean;
  isDiplomacyPanelOpen: boolean;
  isGovernancePanelOpen: boolean;
  isInventoryPanelOpen: boolean;
  isAlchemyPanelOpen: boolean;
}

export interface ExplorationHistoryRecord {
  mapId: string;
  mapName: string;
  resolvedOnDay: number;
  result: 'victory' | 'retreat' | 'defeat';
  rewards: ResourceDeltaState;
  defeatedBoss: boolean;
  notes: string[];
}

export interface ExplorationState {
  unlockedMapIds: string[];
  discoveredSecretRealmIds: string[];
  secretRealmLastEntryDays: Record<string, number>;
  totalRuns: number;
  defeatedBossIds: string[];
  history: ExplorationHistoryRecord[];
  lastSummary: string;
}

export interface SaveData {
  meta: MetaState;
  player: PlayerState;
  sect: SectState;
  time: TimeState;
  resources: ResourceState;
  inventory: InventoryState;
  beasts: BeastCollectionState;
  disciples: DiscipleState;
  story: StoryState;
  ending: EndingState;
  expansion: ExpansionState;
  diplomacy: DiplomacyState;
  events: EventState;
  exploration: ExplorationState;
  ui: UiState;
}

export type GameState = SaveData;
