import {
  EVENT_CATALOG_VERSION,
  majorEventCatalog,
  randomEventCatalog,
  realmCatalog,
  storyChapterCatalog,
  type AlignmentAxis,
  type EventConditions,
  type EventEffectDefinition,
  type MajorEventDefinition as RawMajorEventDefinition,
  type RandomEventActorRules,
  type RandomEventCategory,
  type RandomEventContextRules,
  type RandomEventDefinition as RawRandomEventDefinition,
  type SectStrengthBucket
} from '@/game/data/catalogs';
import type { ResourceId } from '@/game/state/types';
import { RESOURCE_IDS } from '@/game/state/types';
import { normalizeCatalogResourceDelta } from '@/game/systems/ResourceSystem';

export { EVENT_CATALOG_VERSION } from '@/game/data/catalogs';
export type { AlignmentAxis, SectStrengthBucket };

export type EventCategory = RandomEventCategory;
export type EventKind = 'random' | 'major';
export type EventRarity = 'common' | 'uncommon' | 'rare';

export interface EventTrigger {
  chapterIds?: string[];
  minDay?: number;
  maxDay?: number;
  minSectPrestige?: number;
  maxSectPrestige?: number;
  minSectStability?: number;
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  resourceBelow?: Partial<Record<ResourceId, number>>;
  resourceAbove?: Partial<Record<ResourceId, number>>;
  strengthBuckets?: SectStrengthBucket[];
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

export interface EventStoryFlags {
  add?: string[];
  remove?: string[];
}

export interface EventFlagEffects {
  story?: EventStoryFlags;
  worldAdd?: string[];
  choiceAdd?: string[];
}

export interface EventFactionEffects {
  factionId: string;
  delta: number;
}

export interface EventChoiceEffect {
  resources?: Partial<Record<ResourceId, number>>;
  sectPrestige?: number;
  sectFortune?: number;
  sectStability?: number;
  greatCrisisDelta?: number;
  truthProgress?: number;
  advanceDays?: number;
  flags?: EventFlagEffects;
  factionReputation?: EventFactionEffects[];
  alignmentShift?: Partial<Record<AlignmentAxis, number>>;
  queueEventIds?: string[];
  playerCultivationProgress?: number;
  foundationStability?: number;
  tamMaPressure?: number;
  discipleLoyaltyDelta?: number;
  discipleMoodDelta?: number;
  discipleHealthDelta?: number;
  recruitDiscipleArchetype?: string;
  completeChapter?: string;
  unlockChapter?: string;
}

export interface EventChoice {
  id: string;
  label: string;
  outcome: string;
  effects: EventChoiceEffect;
}

export interface EventContextRules {
  actor?: RandomEventActorRules | null;
  buildingIdsAny?: string[];
  factionIdsAny?: string[];
  lowResourceIdsAny?: ResourceId[];
}

export interface EventDefinition {
  id: string;
  kind: 'random';
  chapterId: string;
  category: EventCategory;
  rarity: EventRarity;
  weight: number;
  priority: number;
  cadenceDays: number;
  tags: string[];
  title: string;
  summary: string;
  body: string;
  trigger: EventTrigger;
  contextRules: EventContextRules;
  choices: EventChoice[];
}

export interface RuntimeMajorEventDefinition {
  id: string;
  kind: 'major';
  chapterId: string;
  category: RawMajorEventDefinition['category'];
  priority: number;
  title: string;
  body: string;
  trigger: EventTrigger;
  choices: EventChoice[];
  onResolveFlags: string[];
  choiceFollowupFlags: Record<string, string[]>;
}

const CHAPTER_ORDER = new Map(storyChapterCatalog.chapters.map((chapter, index) => [chapter.id, index + 1]));
const REALM_ORDER = new Map(realmCatalog.realms.map((realm) => [realm.id, realm.order]));

function inferRarity(weight: number): EventRarity {
  if (weight >= 10) {
    return 'common';
  }

  if (weight >= 7) {
    return 'uncommon';
  }

  return 'rare';
}

function inferPriority(event: RawRandomEventDefinition): number {
  if (event.category === 'omen' || event.category === 'faction' || event.category === 'cultivation') {
    return 2;
  }

  if (event.category === 'opportunity') {
    return 1;
  }

  return 0;
}

function inferCadenceDays(category: EventCategory): number {
  switch (category) {
    case 'sect_internal':
    case 'disciple':
    case 'resource':
    case 'survival':
      return 1;
    case 'opportunity':
    case 'cultivation':
      return 2;
    case 'faction':
    case 'omen':
      return 3;
    default:
      return 1;
  }
}

function toResourceIds(values?: string[]): ResourceId[] | undefined {
  if (!values) {
    return undefined;
  }

  return values
    .map((value) => normalizeCatalogResourceDelta({ [value]: 0 }))
    .map((delta) => Object.keys(delta)[0] as ResourceId | undefined)
    .filter((value): value is ResourceId => Boolean(value));
}

function normalizeTrigger(conditions: EventConditions): EventTrigger {
  return {
    chapterIds: conditions.chapters,
    minDay: conditions.minDay,
    maxDay: conditions.maxDay,
    minSectPrestige: conditions.minSectPrestige,
    maxSectPrestige: conditions.maxSectPrestige,
    minSectStability: conditions.minSectStability,
    requiredFlags: conditions.requiredFlags,
    forbiddenFlags: conditions.forbiddenFlags,
    resourceBelow: normalizeCatalogResourceDelta(conditions.resourcesBelow),
    resourceAbove: normalizeCatalogResourceDelta(conditions.resourcesAbove),
    strengthBuckets: conditions.sectStrengthIn,
    cooldownDays: conditions.cooldownDays,
    minPlayerRealmOrder: conditions.minPlayerRealmOrder,
    maxPlayerRealmOrder: conditions.maxPlayerRealmOrder,
    minConstructedBuildings: conditions.minConstructedBuildings,
    requiredBuildings: conditions.requiredBuildings,
    requiredFactionRelations: conditions.requiredFactionRelations,
    requiredDiscipleTraitPresence: conditions.requiredDiscipleTraitPresence,
    requiredDiscipleCount: conditions.requiredDiscipleCount,
    requiredTasks: conditions.requiredTasks,
    requiredDiscipleMoodBelow: conditions.requiredDiscipleMoodBelow,
    requiredDiscipleLoyaltyBelow: conditions.requiredDiscipleLoyaltyBelow,
    requiredDiscipleRiskFlagsAny: conditions.requiredDiscipleRiskFlagsAny,
    requiredDiscipleStatusAny: conditions.requiredDiscipleStatusAny
  };
}

function normalizeFactionEffects(effect?: EventEffectDefinition): EventFactionEffects[] | undefined {
  if (!effect?.factionRelations) {
    return undefined;
  }

  return Object.entries(effect.factionRelations).map(([factionId, delta]) => ({
    factionId,
    delta
  }));
}

function normalizeChoice(choice: { id: string; label: string; outcome: string }, effect?: EventEffectDefinition): EventChoice {
  return {
    id: choice.id,
    label: choice.label,
    outcome: choice.outcome,
    effects: {
      resources: normalizeCatalogResourceDelta(effect?.resources),
      sectPrestige: effect?.sectPrestige,
      sectFortune: effect?.sectFortune,
      sectStability: effect?.sectStability,
      greatCrisisDelta: effect?.greatCrisisDelta,
      truthProgress: effect?.truthProgress,
      advanceDays: effect?.advanceDays,
      flags:
        effect?.addFlags || effect?.removeFlags || effect?.addWorldFlags || effect?.addChoiceFlags
          ? {
              story: effect.addFlags || effect.removeFlags ? { add: effect.addFlags, remove: effect.removeFlags } : undefined,
              worldAdd: effect.addWorldFlags,
              choiceAdd: effect.addChoiceFlags
            }
          : undefined,
      factionReputation: normalizeFactionEffects(effect),
      alignmentShift: effect?.alignment,
      queueEventIds: effect?.queueEventIds,
      playerCultivationProgress: effect?.playerCultivationProgress,
      foundationStability: effect?.foundationStability,
      tamMaPressure: effect?.tamMaPressure,
      discipleLoyaltyDelta: effect?.discipleLoyaltyDelta,
      discipleMoodDelta: effect?.discipleMoodDelta,
      discipleHealthDelta: effect?.discipleHealthDelta,
      recruitDiscipleArchetype: effect?.recruitDiscipleArchetype,
      completeChapter: effect?.completeChapter,
      unlockChapter: effect?.unlockChapter
    }
  };
}

function normalizeContextRules(event: RawRandomEventDefinition): EventContextRules {
  const rules: RandomEventContextRules | undefined = event.contextRules;
  return {
    actor: rules?.actor ?? event.actorRules ?? null,
    buildingIdsAny: rules?.buildingIdsAny,
    factionIdsAny: rules?.factionIdsAny,
    lowResourceIdsAny: toResourceIds(rules?.lowResourceIdsAny)
  };
}

function normalizeRandomEvent(event: RawRandomEventDefinition): EventDefinition {
  const chapterId = event.conditions.chapters?.[0] ?? storyChapterCatalog.chapters[0].id;
  return {
    id: event.id,
    kind: 'random',
    chapterId,
    category: event.category,
    rarity: inferRarity(event.weight),
    weight: event.weight,
    priority: inferPriority(event),
    cadenceDays: inferCadenceDays(event.category),
    tags: event.tags ?? [],
    title: event.title,
    summary: event.textTemplate.body,
    body: event.textTemplate.body,
    trigger: normalizeTrigger(event.conditions),
    contextRules: normalizeContextRules(event),
    choices: event.choices.map((choice) => normalizeChoice(choice, event.effects[choice.id]))
  };
}

function normalizeMajorEvent(event: RawMajorEventDefinition): RuntimeMajorEventDefinition {
  return {
    id: event.id,
    kind: 'major',
    chapterId: event.chapter,
    category: event.category,
    priority: 100,
    title: event.title,
    body: event.text,
    trigger: normalizeTrigger(event.triggerConditions),
    choices: event.choices.map((choice) => normalizeChoice(choice, event.effects[choice.id])),
    onResolveFlags: event.followupFlags.onResolve ?? [],
    choiceFollowupFlags: event.followupFlags.byChoice ?? {}
  };
}

const normalizedRandomEvents = randomEventCatalog.events.map(normalizeRandomEvent);
const normalizedMajorEvents = majorEventCatalog.events.map(normalizeMajorEvent);

export const eventCatalog = {
  version: EVENT_CATALOG_VERSION,
  randomEvents: normalizedRandomEvents,
  majorEvents: normalizedMajorEvents,
  starterEvents: normalizedRandomEvents
} as const;

export function getRealmOrder(realmId: string): number {
  return REALM_ORDER.get(realmId) ?? 0;
}

export function getChapterOrder(chapterId: string): number {
  return CHAPTER_ORDER.get(chapterId) ?? 0;
}

export function getRandomEventById(eventId: string): EventDefinition | undefined {
  return normalizedRandomEvents.find((event) => event.id === eventId);
}

export function getMajorEventById(eventId: string): RuntimeMajorEventDefinition | undefined {
  return normalizedMajorEvents.find((event) => event.id === eventId);
}

export function getEventById(eventId: string): EventDefinition | RuntimeMajorEventDefinition | undefined {
  return getRandomEventById(eventId) ?? getMajorEventById(eventId);
}

export function isMajorEventId(eventId: string): boolean {
  return normalizedMajorEvents.some((event) => event.id === eventId);
}

export function getAllEventIds(): string[] {
  return [...normalizedMajorEvents.map((event) => event.id), ...normalizedRandomEvents.map((event) => event.id)];
}
