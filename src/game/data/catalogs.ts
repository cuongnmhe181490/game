import buildingsJson from '@/game/data/buildings.json';
import discipleNamesJson from '@/game/data/disciple_names.json';
import discipleTraitsJson from '@/game/data/disciple_traits.json';
import endingsJson from '@/game/data/endings.json';
import explorationEventsJson from '@/game/data/exploration_events.json';
import factionsJson from '@/game/data/factions.json';
import governanceStylesJson from '@/game/data/governance_styles.json';
import itemsJson from '@/game/data/items.json';
import localizationViJson from '@/game/data/localization_vi.json';
import bossesJson from '@/game/data/bosses.json';
import enemiesJson from '@/game/data/enemies.json';
import elderRolesJson from '@/game/data/elder_roles.json';
import majorEventsJson from '@/game/data/events_major.json';
import mapsJson from '@/game/data/maps.json';
import randomEventsJson from '@/game/data/events_random.json';
import realmsJson from '@/game/data/realms.json';
import recipesAlchemyJson from '@/game/data/recipes_alchemy.json';
import sectRulesJson from '@/game/data/sect_rules.json';
import storyChaptersJson from '@/game/data/story_chapters.json';
import techniquesJson from '@/game/data/techniques.json';
import type { ResourceId } from '@/game/state/types';

export const STORY_CHAPTERS_VERSION = 3 as const;
export const EVENT_CATALOG_VERSION = 2 as const;
export const FACTION_CATALOG_VERSION = 2 as const;
export const LOCALIZATION_VERSION = 2 as const;
export const DISCIPLE_TRAITS_VERSION = 2 as const;
export const DISCIPLE_NAMES_VERSION = 1 as const;
export const BUILDING_CATALOG_VERSION = 1 as const;
export const REALM_CATALOG_VERSION = 2 as const;
export const TECHNIQUE_CATALOG_VERSION = 1 as const;
export const EXPLORATION_MAP_CATALOG_VERSION = 1 as const;
export const ENEMY_CATALOG_VERSION = 1 as const;
export const BOSS_CATALOG_VERSION = 1 as const;
export const EXPLORATION_EVENT_CATALOG_VERSION = 1 as const;
export const ITEM_CATALOG_VERSION = 1 as const;
export const ALCHEMY_RECIPE_CATALOG_VERSION = 1 as const;
export const GOVERNANCE_STYLE_CATALOG_VERSION = 1 as const;
export const SECT_RULE_CATALOG_VERSION = 1 as const;
export const ELDER_ROLE_CATALOG_VERSION = 1 as const;
export const ENDING_CATALOG_VERSION = 2 as const;

export type WorldLayerId = 'pham_gioi' | 'linh_gioi';
export type StoryArcId = 'base_game_pham_gioi' | 'future_linh_gioi_arc';
export type SectStrengthBucket = 'fragile' | 'stable' | 'rising' | 'dominant';
export type RandomEventCategory =
  | 'sect_internal'
  | 'disciple'
  | 'survival'
  | 'resource'
  | 'faction'
  | 'opportunity'
  | 'omen'
  | 'cultivation';
export type MajorEventCategory = 'founding' | 'relic' | 'faction' | 'truth' | 'decision' | 'pressure';
export type AlignmentAxis = 'orthodox_alignment' | 'dominion_alignment' | 'outsider_alignment';
export type DefaultFactionRelation = 'trusted' | 'aligned' | 'neutral' | 'strained' | 'hostile';
export type BuildingCategory =
  | 'core'
  | 'cultivation'
  | 'resource'
  | 'lore'
  | 'craft'
  | 'storage'
  | 'defense'
  | 'diplomacy';
export type DiscipleTraitType = 'positive' | 'flaw' | 'temperament';
export type TechniqueCategory = 'cultivation' | 'mind' | 'support';
export type EnemyBehaviorType = 'idle_chase' | 'boss_guardian';
export type ItemCategory = 'resource' | 'herb' | 'ore' | 'pill' | 'material' | 'artifact' | 'quest' | 'misc';
export type ItemRarity = 'common' | 'uncommon' | 'rare';
export type GovernanceStyleId = string;
export type SectRuleId = string;
export type ElderRoleId = string;
export type EndingPathId = 'orthodox' | 'dominion' | 'outsider';
export type RealmTierId = 'mortal' | 'spirit' | 'immortal' | 'transcendent';

export interface ResourceDelta extends Partial<Record<ResourceId, number>> {}

export interface StoryChapterUnlockConditions {
  requiredFlags: string[];
  stateThresholds: Record<string, number>;
  notes: string[];
}

export interface StoryChapterDefinition {
  id: string;
  arcId: StoryArcId;
  worldLayerId: WorldLayerId;
  name: string;
  summary: string;
  emotionalGoal: string;
  progressionGoal: string;
  unlockConditions: StoryChapterUnlockConditions;
  majorEventIds: string[];
  recommendedRandomEventCategories: RandomEventCategory[];
  mysteryProgressionNotes: string;
}

export interface WorldLayerDefinition {
  id: WorldLayerId;
  name: string;
  implemented: boolean;
  summary: string;
}

export interface StoryArcDefinition {
  id: StoryArcId;
  worldLayerId: WorldLayerId;
  name: string;
  implemented: boolean;
  baseGameScope: boolean;
  continuationFromEnding: boolean;
  summary: string;
}

export interface StoryChapterCatalog {
  version: typeof STORY_CHAPTERS_VERSION;
  worldName: string;
  catastropheName: string;
  playerSectName: string;
  coreRelicName: string;
  worldLayers: WorldLayerDefinition[];
  arcs: StoryArcDefinition[];
  chapters: StoryChapterDefinition[];
}

export interface EventConditions {
  chapters?: string[];
  minDay?: number;
  maxDay?: number;
  minSectPrestige?: number;
  maxSectPrestige?: number;
  minSectStability?: number;
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  resourcesBelow?: ResourceDelta;
  resourcesAbove?: ResourceDelta;
  sectStrengthIn?: SectStrengthBucket[];
  cooldownDays?: number;
  minPlayerRealmOrder?: number;
  maxPlayerRealmOrder?: number;
  minConstructedBuildings?: number;
  requiredBuildings?: string[];
  requiredFactionRelations?: Record<string, number>;
  requiredDiscipleTraitPresence?: string[];
  requiredDiscipleCount?: number;
  requiredTasks?: string[];
  requiredDiscipleMoodBelow?: number;
  requiredDiscipleLoyaltyBelow?: number;
  requiredDiscipleRiskFlagsAny?: string[];
  requiredDiscipleStatusAny?: string[];
}

export interface EventChoiceDefinition {
  id: string;
  label: string;
  outcome: string;
}

export interface EventEffectDefinition {
  resources?: ResourceDelta;
  sectPrestige?: number;
  sectFortune?: number;
  sectStability?: number;
  greatCrisisDelta?: number;
  truthProgress?: number;
  factionRelations?: Record<string, number>;
  alignment?: Partial<Record<AlignmentAxis, number>>;
  addFlags?: string[];
  removeFlags?: string[];
  addWorldFlags?: string[];
  addChoiceFlags?: string[];
  playerCultivationProgress?: number;
  foundationStability?: number;
  tamMaPressure?: number;
  discipleLoyaltyDelta?: number;
  discipleMoodDelta?: number;
  discipleHealthDelta?: number;
  recruitDiscipleArchetype?: string;
  completeChapter?: string;
  unlockChapter?: string;
  queueEventIds?: string[];
  advanceDays?: number;
}

export interface MajorEventDefinition {
  id: string;
  title: string;
  chapter: string;
  category: MajorEventCategory;
  triggerConditions: EventConditions;
  text: string;
  choices: EventChoiceDefinition[];
  effects: Record<string, EventEffectDefinition>;
  followupFlags: {
    onResolve?: string[];
    byChoice?: Record<string, string[]>;
  };
}

export interface MajorEventCatalog {
  version: typeof EVENT_CATALOG_VERSION;
  events: MajorEventDefinition[];
}

export interface RandomEventActorRules {
  type: 'disciple' | 'elder' | 'guest';
  preferredTraitIdsAny?: string[];
  requiredTraitIdsAny?: string[];
  requiredRiskFlagsAny?: string[];
  requiredStatusAny?: string[];
  maxMood?: number;
  maxLoyalty?: number;
  minComprehension?: number;
}

export interface RandomEventContextRules {
  actor?: RandomEventActorRules | null;
  buildingIdsAny?: string[];
  factionIdsAny?: string[];
  lowResourceIdsAny?: string[];
}

export interface RandomEventDefinition {
  id: string;
  title: string;
  category: RandomEventCategory;
  weight: number;
  conditions: EventConditions;
  actorRules: RandomEventActorRules | null;
  contextRules?: RandomEventContextRules;
  textTemplate: {
    body: string;
  };
  choices: EventChoiceDefinition[];
  effects: Record<string, EventEffectDefinition>;
  tags?: string[];
}

export interface RandomEventCatalog {
  version: typeof EVENT_CATALOG_VERSION;
  events: RandomEventDefinition[];
}

export interface FactionDefinition {
  id: string;
  name: string;
  shortDescription: string;
  alignment: 'orthodox' | 'mercantile' | 'scholarly' | 'outsider' | 'celestial';
  gameplayRole: string;
  relationDefault: DefaultFactionRelation;
  eventTags: string[];
  notes: string;
}

export interface FactionCatalog {
  version: typeof FACTION_CATALOG_VERSION;
  factions: FactionDefinition[];
}

export interface DiscipleTraitDefinition {
  id: string;
  name: string;
  type: DiscipleTraitType;
  shortEffect: string;
  eventBias: string[];
  description: string;
}

export interface DiscipleTraitCatalog {
  version: typeof DISCIPLE_TRAITS_VERSION;
  generationRules: {
    defaultTraitCount: number;
    minimumTraitCount: number;
    maximumTraitCount: number;
    maxTemperamentTags: number;
  };
  traits: DiscipleTraitDefinition[];
}

export interface DiscipleNamesCatalog {
  version: typeof DISCIPLE_NAMES_VERSION;
  familyNames: string[];
  givenNamesMasculine: string[];
  givenNamesFeminine: string[];
  courtesyNames: string[];
  nicknames: string[];
  titlePrefixes: string[];
}

export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  maxLevel: number;
  unlockConditions: {
    requiredChapterId: string;
    requiredFlags: string[];
    requiredBuildingIds: string[];
  };
  buildCost: ResourceDelta;
  productionPerDay: ResourceDelta;
  bonuses: Array<{
    type: string;
    value: number;
  }>;
  flavorText: string;
}

export interface BuildingCatalog {
  version: typeof BUILDING_CATALOG_VERSION;
  buildings: BuildingDefinition[];
}

export interface RealmDefinition {
  id: string;
  name: string;
  order: number;
  tierId: RealmTierId;
  worldLayerId: WorldLayerId;
  implemented: boolean;
  progressRequired: number;
  description: string;
  breakthroughRequirements: {
    requiredBuildings: string[];
    requiredResources: ResourceDelta;
    requiredFlags: string[];
  };
  unlocks: Record<string, boolean | number>;
  flavorText: string;
  nextRealmHintId?: string;
  futureArcHint?: string;
}

export interface FutureRealmHookDefinition {
  id: string;
  name: string;
  tierId: RealmTierId;
  worldLayerId: WorldLayerId;
  implemented: boolean;
  availableAfterBaseGame: boolean;
  summary: string;
}

export interface RealmCatalog {
  version: typeof REALM_CATALOG_VERSION;
  realms: RealmDefinition[];
  futureRealms?: FutureRealmHookDefinition[];
}

export interface TechniqueDefinition {
  id: string;
  name: string;
  category: TechniqueCategory;
  path: 'orthodox' | 'balanced' | 'outsider';
  requiredRealm: string;
  passiveEffects: {
    dailyCultivationProgress?: number;
    foundationStabilityBonus?: number;
    tamMaPressureMitigation?: number;
    linhKhiDailyBonus?: number;
  };
  description: string;
  flavorText: string;
}

export interface TechniqueCatalog {
  version: typeof TECHNIQUE_CATALOG_VERSION;
  techniques: TechniqueDefinition[];
}

export interface ItemEffectDefinition {
  type: 'player_cultivation_progress' | 'foundation_stability';
  value: number;
  tamMaPressureDelta?: number;
}

export interface ArtifactEffectDefinition {
  type: 'daily_cultivation_progress' | 'exploration_max_health';
  value: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  flavorText: string;
  stackable: boolean;
  value: number;
  usableEffect?: ItemEffectDefinition;
  artifactEffect?: ArtifactEffectDefinition;
  craftingTags?: string[];
}

export interface ItemCatalog {
  version: typeof ITEM_CATALOG_VERSION;
  items: ItemDefinition[];
}

export interface RecipeIngredientDefinition {
  itemId: string;
  amount: number;
}

export interface AlchemyRecipeDefinition {
  id: string;
  name: string;
  requiredBuildingId: string;
  ingredients: RecipeIngredientDefinition[];
  outputs: RecipeIngredientDefinition[];
  description: string;
}

export interface AlchemyRecipeCatalog {
  version: typeof ALCHEMY_RECIPE_CATALOG_VERSION;
  recipes: AlchemyRecipeDefinition[];
}

export interface LocalizationCatalog {
  version: typeof LOCALIZATION_VERSION;
  locale: 'vi-VN';
  strings: Record<string, string>;
}

export interface SectModifierDefinition {
  discipleMoodDaily?: number;
  discipleLoyaltyDaily?: number;
  discipleCultivationDaily?: number;
  playerCultivationDaily?: number;
  resourceProductionFlat?: number;
  stabilityDaily?: number;
  fortuneDaily?: number;
  linhThachUpkeep?: number;
  linhKhiUpkeepReduction?: number;
  disciplineWeight?: number;
  diplomacyWeight?: number;
  recruitmentWeight?: number;
  discipleCapacity?: number;
  explorationSafety?: number;
  alchemyOutputBonus?: number;
}

export interface GovernanceStyleDefinition {
  id: GovernanceStyleId;
  name: string;
  summary: string;
  effects: SectModifierDefinition;
}

export interface GovernanceStyleCatalog {
  version: typeof GOVERNANCE_STYLE_CATALOG_VERSION;
  styles: GovernanceStyleDefinition[];
}

export interface SectRuleDefinition {
  id: SectRuleId;
  name: string;
  summary: string;
  effects: SectModifierDefinition;
}

export interface SectRuleCatalog {
  version: typeof SECT_RULE_CATALOG_VERSION;
  rules: SectRuleDefinition[];
}

export interface ElderRoleDefinition {
  id: ElderRoleId;
  name: string;
  summary: string;
  effects: SectModifierDefinition;
}

export interface ElderRoleCatalog {
  version: typeof ELDER_ROLE_CATALOG_VERSION;
  roles: ElderRoleDefinition[];
}

export interface EndingDefinition {
  id: EndingPathId;
  title: string;
  routeName: string;
  alignmentAxis: AlignmentAxis;
  summary: string;
  doctrineSummary: string;
  sectFateSummary: string;
  playerSummary: string;
  futureHint: string;
  continuationHookIds?: string[];
  nextArcId?: StoryArcId;
  nextWorldLayerId?: WorldLayerId;
}

export interface EndingCatalog {
  version: typeof ENDING_CATALOG_VERSION;
  endings: EndingDefinition[];
}

export interface ExplorationRewardProfile {
  guaranteed: ResourceDelta;
  bossBonus: ResourceDelta;
  retreatKeepRatio: number;
  itemRewards?: Record<string, number>;
  sectPrestigeBonus?: number;
  playerCultivationProgressBonus?: number;
}

export interface ExplorationMapDefinition {
  id: string;
  name: string;
  description: string;
  chapterUnlock: string;
  riskLevel: number;
  recommendedRealm: string;
  enemyPool: string[];
  bossId: string;
  rewardProfile: ExplorationRewardProfile;
  eventPool: string[];
  environmentTags: string[];
  specialDiscoveryTags?: string[];
  unlockConditions?: {
    requiredStoryFlags?: string[];
    requiredWorldFlags?: string[];
    requiredClearedMapIds?: string[];
    minPlayerRealmOrder?: number;
    minSectPrestige?: number;
  };
}

export interface ExplorationMapCatalog {
  version: typeof EXPLORATION_MAP_CATALOG_VERSION;
  maps: ExplorationMapDefinition[];
}

export interface EnemyDropDefinition {
  resourceId: ResourceId;
  amount: number;
  chance: number;
}

export interface ItemDropDefinition {
  itemId: string;
  amount: number;
  chance: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHealth: number;
  moveSpeed: number;
  damage: number;
  behaviorType: EnemyBehaviorType;
  detectionRange: number;
  attackCooldownMs: number;
  dropTable: EnemyDropDefinition[];
  flavorText: string;
}

export interface EnemyCatalog {
  version: typeof ENEMY_CATALOG_VERSION;
  enemies: EnemyDefinition[];
}

export interface BossDefinition extends EnemyDefinition {
  bossFlagOnDefeat: string;
  itemDrops?: ItemDropDefinition[];
}

export interface BossCatalog {
  version: typeof BOSS_CATALOG_VERSION;
  bosses: BossDefinition[];
}

export interface ExplorationEventDefinition {
  id: string;
  title: string;
  allowedMapIds?: string[];
  requiredEnvironmentTags?: string[];
  body: string;
  choices: EventChoiceDefinition[];
  effects: Record<
    string,
    EventEffectDefinition & {
      healthDelta?: number;
      itemAdds?: Record<string, number>;
    }
  >;
}

export interface ExplorationEventCatalog {
  version: typeof EXPLORATION_EVENT_CATALOG_VERSION;
  events: ExplorationEventDefinition[];
}

export const storyChapterCatalog = storyChaptersJson as unknown as StoryChapterCatalog;
export const majorEventCatalog = majorEventsJson as unknown as MajorEventCatalog;
export const randomEventCatalog = randomEventsJson as unknown as RandomEventCatalog;
export const factionCatalog = factionsJson as unknown as FactionCatalog;
export const localizationViCatalog = localizationViJson as unknown as LocalizationCatalog;
export const discipleTraitCatalog = discipleTraitsJson as unknown as DiscipleTraitCatalog;
export const discipleNamesCatalog = discipleNamesJson as unknown as DiscipleNamesCatalog;
export const buildingCatalog = buildingsJson as unknown as BuildingCatalog;
export const realmCatalog = realmsJson as unknown as RealmCatalog;
export const techniqueCatalog = techniquesJson as unknown as TechniqueCatalog;
export const itemCatalog = itemsJson as unknown as ItemCatalog;
export const alchemyRecipeCatalog = recipesAlchemyJson as unknown as AlchemyRecipeCatalog;
export const governanceStyleCatalog = governanceStylesJson as unknown as GovernanceStyleCatalog;
export const sectRuleCatalog = sectRulesJson as unknown as SectRuleCatalog;
export const elderRoleCatalog = elderRolesJson as unknown as ElderRoleCatalog;
export const endingCatalog = endingsJson as unknown as EndingCatalog;
export const explorationMapCatalog = mapsJson as unknown as ExplorationMapCatalog;
export const enemyCatalog = enemiesJson as unknown as EnemyCatalog;
export const bossCatalog = bossesJson as unknown as BossCatalog;
export const explorationEventCatalog = explorationEventsJson as unknown as ExplorationEventCatalog;
