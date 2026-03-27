import {
  buildingCatalog,
  eventCatalog,
  factionCatalog,
  getEventById,
  getMajorEventById,
  getRealmOrder,
  type AlignmentAxis,
  type EventChoice,
  type EventDefinition,
  type EventTrigger,
  type RuntimeMajorEventDefinition
} from '@/game/data';
import type {
  BuildingId,
  EventContextState,
  EventSource,
  GameState,
  QueuedEventState,
  ResourceDeltaState,
  ResourceId
} from '@/game/state/types';
import type { GameStateManager } from '@/game/state/GameStateManager';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
import { DiplomacySystem } from '@/game/systems/DiplomacySystem';
import { EndingSystem } from '@/game/systems/EndingSystem';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';

function sortQueue(queue: QueuedEventState[]): QueuedEventState[] {
  return [...queue].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return left.queuedAtDay - right.queuedAtDay;
  });
}

function pickWeightedEvent(
  events: EventDefinition[],
  getWeight: (event: EventDefinition) => number
): EventDefinition | null {
  const totalWeight = events.reduce((sum, event) => sum + Math.max(0, getWeight(event)), 0);

  if (totalWeight <= 0) {
    return null;
  }

  let cursor = Math.random() * totalWeight;

  for (const event of events) {
    cursor -= Math.max(0, getWeight(event));

    if (cursor <= 0) {
      return event;
    }
  }

  return events.at(-1) ?? null;
}

function applyResourceDelta(target: GameState['resources'], delta?: ResourceDeltaState): void {
  if (!delta) {
    return;
  }

  for (const [resourceId, value] of Object.entries(delta)) {
    if (typeof value !== 'number') {
      continue;
    }

    const key = resourceId as keyof GameState['resources'];
    target[key] = Math.max(0, Math.trunc(target[key] + value));
  }
}

function getAllFlags(snapshot: Readonly<GameState>): string[] {
  return [...snapshot.story.storyFlags, ...snapshot.story.worldFlags, ...snapshot.story.choiceFlags];
}

function clampRelation(value: number): number {
  return Math.max(-100, Math.min(100, Math.trunc(value)));
}

function clampAlignment(value: number): number {
  return Math.max(-10, Math.min(10, Math.trunc(value)));
}

function getSectStrength(snapshot: Readonly<GameState>): 'fragile' | 'stable' | 'rising' | 'dominant' {
  const constructed = Object.values(snapshot.sect.buildings).filter((building) => building.isConstructed).length;
  const score = snapshot.sect.prestige + constructed * 3 + snapshot.disciples.roster.length * 2;

  if (score < 18) {
    return 'fragile';
  }

  if (score < 34) {
    return 'stable';
  }

  if (score < 56) {
    return 'rising';
  }

  return 'dominant';
}

function getConstructedBuildingCount(snapshot: Readonly<GameState>): number {
  return Object.values(snapshot.sect.buildings).filter((building) => building.isConstructed).length;
}

function getBuildingName(buildingId: BuildingId | string | null): string {
  if (!buildingId) {
    return 'noi mon';
  }

  return buildingCatalog.buildings.find((building) => building.id === buildingId)?.name ?? buildingId;
}

function getResourceLabel(resourceId: ResourceId): string {
  const labels: Record<ResourceId, string> = {
    linhThach: 'linh thach',
    linhKhi: 'linh khi',
    duocThao: 'duoc thao',
    khoangThach: 'khoang thach',
    linhMoc: 'linh moc'
  };

  return labels[resourceId];
}

function buildContextSummary(snapshot: Readonly<GameState>, context: EventContextState | null): string | undefined {
  if (!context) {
    return undefined;
  }

  const actor = context.actorDiscipleId
    ? snapshot.disciples.roster.find((disciple) => disciple.id === context.actorDiscipleId)
    : null;
  const faction = context.factionId ? factionCatalog.factions.find((entry) => entry.id === context.factionId) : null;
  const parts: string[] = [];

  if (actor) {
    parts.push(`Nhan vat: ${actor.name}`);
  }

  if (context.targetBuildingId) {
    parts.push(`Cong trinh: ${getBuildingName(context.targetBuildingId)}`);
  }

  if (faction) {
    parts.push(`Phe: ${faction.name}`);
  }

  if (context.resourceId) {
    parts.push(`Tai nguyen: ${getResourceLabel(context.resourceId)}`);
  }

  return parts.join(' | ') || undefined;
}

function isDiplomacyMessageEvent(event: EventDefinition | RuntimeMajorEventDefinition): boolean {
  return event.kind === 'random'
    && (
      event.category === 'faction'
      || event.tags.some((tag) => ['letter', 'warning', 'trade', 'alliance', 'intelligence', 'report', 'pressure'].includes(tag))
    );
}

function resolveRecruitArchetype(snapshot: Readonly<GameState>, archetype: string): string {
  if (archetype !== 'chapter2_formal_candidate') {
    return archetype;
  }

  if (snapshot.sect.prestige >= 18 || snapshot.sect.fortune >= 60) {
    return 'talented_youth';
  }

  if (snapshot.sect.stability >= 55 && snapshot.disciples.roster.length < snapshot.sect.discipleCapacity) {
    return 'ruined_sect_refugee';
  }

  return 'wounded_wanderer';
}

export interface QueueEventInput {
  eventId: string;
  source?: EventSource;
  priority?: number;
  queuedAtDay?: number;
}

export interface EventTransitionResult {
  snapshot: Readonly<GameState>;
  activeEventId: string | null;
}

export interface ResolvedEventResult {
  snapshot: Readonly<GameState>;
  event: EventDefinition | RuntimeMajorEventDefinition;
  choice: EventChoice;
  context: EventContextState | null;
}

export class EventRuntimeSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly discipleSystem: DiscipleSystem,
    private readonly diplomacySystem: DiplomacySystem,
    private readonly sectIdentitySystem: SectIdentitySystem,
    private readonly endingSystem: EndingSystem
  ) {}

  queueEvent(input: QueueEventInput): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      const eventId = input.eventId.trim();
      const definition = getEventById(eventId);

      if (!eventId || !definition) {
        return;
      }

      if (draft.events.activeEventId === eventId || draft.events.queue.some((entry) => entry.eventId === eventId)) {
        return;
      }

      draft.events.queue = sortQueue([
        ...draft.events.queue,
        {
          eventId,
          source: input.source ?? 'system',
          queuedAtDay: input.queuedAtDay ?? draft.time.day,
          priority: input.priority ?? definition.priority
        }
      ]);
      draft.events.phase = draft.events.activeEventId ? 'presented' : 'queued';

      if (definition && isDiplomacyMessageEvent(definition)) {
        this.diplomacySystem.markPendingMessageInDraft(draft, eventId);
      }
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  queueRandomEligibleEvent(source: EventSource = 'time'): Readonly<GameState> | null {
    const snapshot = this.stateManager.snapshot;

    if (snapshot.ending.completed) {
      return null;
    }

    const excludedIds = new Set<string>([
      snapshot.events.activeEventId ?? '',
      ...snapshot.events.queue.map((entry) => entry.eventId)
    ]);
    const candidates = eventCatalog.randomEvents.filter((event) => {
      if (excludedIds.has(event.id)) {
        return false;
      }

      if (!this.matchesCadence(snapshot, event)) {
        return false;
      }

      return this.isEventEligible(snapshot, event.trigger, event.id) && this.canResolveRequiredActor(snapshot, event);
    });
    const selected = pickWeightedEvent(candidates, (event) => this.getAdjustedWeight(snapshot, event));

    if (!selected) {
      return null;
    }

    return this.queueEvent({
      eventId: selected.id,
      source,
      priority: selected.priority,
      queuedAtDay: snapshot.time.day
    });
  }

  queueMajorEligibleEvent(source: EventSource = 'story'): Readonly<GameState> | null {
    const snapshot = this.stateManager.snapshot;

    if (snapshot.ending.completed) {
      return null;
    }

    const queuedIds = new Set(snapshot.events.queue.map((entry) => entry.eventId));
    const followupEventId = snapshot.events.pendingFollowupEventIds.find((eventId) => Boolean(getMajorEventById(eventId)));

    if (followupEventId && !queuedIds.has(followupEventId) && snapshot.events.activeEventId !== followupEventId) {
      return this.queueEvent({
        eventId: followupEventId,
        source,
        priority: 100,
        queuedAtDay: snapshot.time.day
      });
    }

    const candidate = eventCatalog.majorEvents.find((event) => {
      if (snapshot.story.resolvedMajorEventIds.includes(event.id)) {
        return false;
      }

      if (queuedIds.has(event.id) || snapshot.events.activeEventId === event.id) {
        return false;
      }

      if (event.chapterId !== snapshot.story.currentChapterId) {
        return false;
      }

      return this.isEventEligible(snapshot, event.trigger, event.id);
    });

    if (!candidate) {
      return null;
    }

    return this.queueEvent({
      eventId: candidate.id,
      source,
      priority: candidate.priority,
      queuedAtDay: snapshot.time.day
    });
  }

  presentNextEligibleEvent(source: EventSource = 'time'): EventTransitionResult | null {
    const snapshot = this.stateManager.snapshot;

    if (!snapshot.events.activeEventId && snapshot.events.queue.length === 0) {
      this.queueMajorEligibleEvent(source === 'time' ? 'story' : source);
      this.queueRandomEligibleEvent(source);
    }

    return this.promoteNextEvent();
  }

  presentPendingDiplomacyMessage(): EventTransitionResult | null {
    const snapshot = this.stateManager.snapshot;
    const pendingEventId = snapshot.diplomacy.pendingMessageEventIds[0];

    if (!pendingEventId) {
      return null;
    }

    const updated = this.stateManager.update((draft) => {
      if (draft.events.activeEventId === pendingEventId) {
        draft.events.phase = 'presented';
        draft.ui.modalEventId = pendingEventId;
        return;
      }

      const queueIndex = draft.events.queue.findIndex((entry) => entry.eventId === pendingEventId);

      if (queueIndex >= 0) {
        const [entry] = draft.events.queue.splice(queueIndex, 1);
        draft.events.queue = sortQueue([entry, ...draft.events.queue]);
      }
    });

    this.saveSystem.saveGame(updated);
    return this.promoteNextEvent();
  }

  promoteNextEvent(): EventTransitionResult | null {
    let nextEventId: string | null = null;

    const snapshot = this.stateManager.update((draft) => {
      if (draft.events.activeEventId) {
        nextEventId = draft.events.activeEventId;
        draft.events.phase = 'presented';
        draft.ui.modalEventId = draft.events.activeEventId;
        return;
      }

      const nextQueuedEvent = draft.events.queue.shift();

      if (!nextQueuedEvent) {
        draft.events.phase = 'idle';
        draft.ui.modalEventId = null;
        draft.events.activeContext = null;
        return;
      }

      const definition = getEventById(nextQueuedEvent.eventId);
      const context = definition && definition.kind === 'random' ? this.resolveContext(draft, definition) : null;

      draft.events.activeEventId = nextQueuedEvent.eventId;
      draft.events.activeEventType = definition?.kind ?? null;
      draft.events.activeContext = context;
      draft.events.phase = 'presented';
      draft.ui.modalEventId = nextQueuedEvent.eventId;
      if (nextQueuedEvent.eventId === 'major.chapter1.first_major_threat') {
        if (!draft.story.storyFlags.includes('first_major_threat_seen')) {
          draft.story.storyFlags.push('first_major_threat_seen');
        }
      }
      nextEventId = nextQueuedEvent.eventId;
    });

    this.saveSystem.saveGame(snapshot);

    if (!nextEventId) {
      return null;
    }

    return {
      snapshot,
      activeEventId: nextEventId
    };
  }

  resolveActiveChoice(choiceId: string): ResolvedEventResult | null {
    const currentSnapshot = this.stateManager.snapshot;
    const eventId = currentSnapshot.events.activeEventId;

    if (!eventId) {
      return null;
    }

    const event = getEventById(eventId);
    const choice = event?.choices.find((entry) => entry.id === choiceId);

    if (!event || !choice) {
      return null;
    }

    const activeContext = currentSnapshot.events.activeContext;
    let recruitMessage: string | null = null;
    const snapshot = this.stateManager.update((draft) => {
      applyResourceDelta(draft.resources, choice.effects.resources);

      if (typeof choice.effects.sectPrestige === 'number') {
        draft.sect.prestige = Math.max(0, draft.sect.prestige + Math.trunc(choice.effects.sectPrestige));
      }

      if (typeof choice.effects.sectFortune === 'number') {
        draft.sect.fortune = Math.max(0, Math.min(100, draft.sect.fortune + Math.trunc(choice.effects.sectFortune)));
      }

      if (typeof choice.effects.sectStability === 'number') {
        draft.sect.stability = Math.max(0, Math.min(100, draft.sect.stability + Math.trunc(choice.effects.sectStability)));
      }

      if (typeof choice.effects.greatCrisisDelta === 'number') {
        draft.story.greatCrisisLevel = Math.max(
          0,
          Math.min(100, draft.story.greatCrisisLevel + Math.trunc(choice.effects.greatCrisisDelta))
        );
      }

      if (typeof choice.effects.truthProgress === 'number') {
        draft.story.truthProgress = Math.max(
          0,
          Math.min(100, draft.story.truthProgress + Math.trunc(choice.effects.truthProgress))
        );
      }

      if (typeof choice.effects.playerCultivationProgress === 'number') {
        draft.player.cultivation.cultivationProgress = Math.max(
          0,
          draft.player.cultivation.cultivationProgress + Math.trunc(choice.effects.playerCultivationProgress)
        );
      }

      if (typeof choice.effects.foundationStability === 'number') {
        draft.player.cultivation.foundationStability = Math.max(
          0,
          Math.min(100, draft.player.cultivation.foundationStability + Math.trunc(choice.effects.foundationStability))
        );
      }

      if (typeof choice.effects.tamMaPressure === 'number') {
        draft.player.cultivation.tamMaPressure = Math.max(
          0,
          Math.min(100, draft.player.cultivation.tamMaPressure + Math.trunc(choice.effects.tamMaPressure))
        );
      }

      if (activeContext?.actorDiscipleId && typeof choice.effects.discipleLoyaltyDelta === 'number') {
        const actor = draft.disciples.roster.find((disciple) => disciple.id === activeContext.actorDiscipleId);

        if (actor) {
          actor.loyalty = Math.max(0, Math.min(100, actor.loyalty + Math.trunc(choice.effects.discipleLoyaltyDelta)));
        }
      }

      if (activeContext?.actorDiscipleId && typeof choice.effects.discipleMoodDelta === 'number') {
        const actor = draft.disciples.roster.find((disciple) => disciple.id === activeContext.actorDiscipleId);

        if (actor) {
          actor.mood = Math.max(0, Math.min(100, actor.mood + Math.trunc(choice.effects.discipleMoodDelta)));
        }
      }

      if (activeContext?.actorDiscipleId && typeof choice.effects.discipleHealthDelta === 'number') {
        const actor = draft.disciples.roster.find((disciple) => disciple.id === activeContext.actorDiscipleId);

        if (actor) {
          actor.health = Math.max(0, Math.min(100, actor.health + Math.trunc(choice.effects.discipleHealthDelta)));
        }
      }

      if (choice.effects.flags?.story?.add) {
        for (const flag of choice.effects.flags.story.add) {
          if (!draft.story.storyFlags.includes(flag)) {
            draft.story.storyFlags.push(flag);
          }
        }
      }

      if (choice.effects.flags?.story?.remove) {
        draft.story.storyFlags = draft.story.storyFlags.filter((flag) => !choice.effects.flags?.story?.remove?.includes(flag));
      }

      if (choice.effects.flags?.worldAdd) {
        for (const flag of choice.effects.flags.worldAdd) {
          if (!draft.story.worldFlags.includes(flag)) {
            draft.story.worldFlags.push(flag);
          }
        }
      }

      if (choice.effects.flags?.choiceAdd) {
        for (const flag of choice.effects.flags.choiceAdd) {
          if (!draft.story.choiceFlags.includes(flag)) {
            draft.story.choiceFlags.push(flag);
          }
        }
      }

      if (choice.effects.factionReputation) {
        for (const entry of choice.effects.factionReputation) {
          this.diplomacySystem.applyRelationChangeInDraft(
            draft,
            entry.factionId,
            entry.delta,
            `${event.title}: ${choice.outcome}`,
            'event'
          );
          const nextValue = draft.story.factionRelations[entry.factionId] ?? 0;

          const hostileFlag = `faction_${entry.factionId}_hostile`;
          const friendlyFlag = `faction_${entry.factionId}_friendly`;
          draft.story.worldFlags = draft.story.worldFlags.filter((flag) => flag !== hostileFlag && flag !== friendlyFlag);

          if (nextValue <= -20) {
            draft.story.worldFlags.push(hostileFlag);
          } else if (nextValue >= 20) {
            draft.story.worldFlags.push(friendlyFlag);
          }
        }
      }

      if (choice.effects.alignmentShift) {
        for (const [axis, delta] of Object.entries(choice.effects.alignmentShift)) {
          if (typeof delta !== 'number') {
            continue;
          }

          const key = axis as AlignmentAxis;
          draft.story.pathAlignment[key] = clampAlignment((draft.story.pathAlignment[key] ?? 0) + delta);
        }
      }

      if (
        activeContext?.factionId
        && !choice.effects.factionReputation?.some((entry) => entry.factionId === activeContext.factionId)
        && event.kind === 'random'
        && event.category === 'faction'
      ) {
        this.diplomacySystem.recordInteractionInDraft(draft, activeContext.factionId, 'letter', `${event.title}: ${choice.outcome}`);
      }

      if (choice.effects.queueEventIds?.length) {
        for (const followupId of choice.effects.queueEventIds) {
          if (!draft.events.pendingFollowupEventIds.includes(followupId)) {
            draft.events.pendingFollowupEventIds.push(followupId);
          }
        }
      }

      if (choice.effects.completeChapter) {
        draft.story.chapterProgress[choice.effects.completeChapter as keyof typeof draft.story.chapterProgress] = 'completed';
      }

      if (choice.effects.unlockChapter) {
        draft.story.chapterProgress[choice.effects.unlockChapter as keyof typeof draft.story.chapterProgress] = 'active';
        if (draft.story.currentChapterId === event.chapterId) {
          draft.story.currentChapterId = choice.effects.unlockChapter as typeof draft.story.currentChapterId;
          draft.sect.chapterId = choice.effects.unlockChapter as typeof draft.sect.chapterId;
        }
      }

      if (choice.effects.recruitDiscipleArchetype && draft.disciples.roster.length < draft.sect.discipleCapacity) {
        const recruitArchetype = resolveRecruitArchetype(draft, choice.effects.recruitDiscipleArchetype);
        const recruit = this.discipleSystem.createRecruitProfile(draft, recruitArchetype);
        draft.disciples.roster.push(recruit);
        recruitMessage = `${recruit.name} gia nhập Thanh Huyền Môn.`;

        if (!draft.story.storyFlags.includes('first_disciple_recruited')) {
          draft.story.storyFlags.push('first_disciple_recruited');
        }

        const recruitFlag = `recruit_${recruitArchetype}_accepted`;
        if (!draft.story.worldFlags.includes(recruitFlag)) {
          draft.story.worldFlags.push(recruitFlag);
        }
      }

      if (event.kind === 'major') {
        for (const flag of event.onResolveFlags) {
          if (!draft.story.storyFlags.includes(flag)) {
            draft.story.storyFlags.push(flag);
          }
        }

        for (const flag of event.choiceFollowupFlags[choice.id] ?? []) {
          if (!draft.story.storyFlags.includes(flag)) {
            draft.story.storyFlags.push(flag);
          }
        }

        if (!draft.story.resolvedMajorEventIds.includes(event.id)) {
          draft.story.resolvedMajorEventIds.push(event.id);
        }

        this.applyMajorProgression(draft, event.id);
      }

      if (!draft.story.seenEventIds.includes(event.id)) {
        draft.story.seenEventIds.push(event.id);
      }

      draft.events.history.push({
        eventId: event.id,
        eventType: event.kind,
        title: event.title,
        resolvedOnDay: draft.time.day,
        choiceId: choice.id,
        contextSummary: buildContextSummary(draft, activeContext)
      });
      draft.events.cooldowns[event.id] = draft.time.day;
      draft.events.pendingFollowupEventIds = draft.events.pendingFollowupEventIds.filter((queuedId) => queuedId !== event.id);
      this.diplomacySystem.clearPendingMessageInDraft(draft, event.id);
      draft.events.activeEventId = null;
      draft.events.activeEventType = null;
      draft.events.activeContext = null;
      draft.events.lastResolvedEventId = event.id;
      draft.events.lastResolvedEventType = event.kind;
      draft.events.phase = draft.events.queue.length > 0 ? 'queued' : 'idle';
      draft.ui.modalEventId = null;
      this.discipleSystem.refreshDisciplesInDraft(draft);
      this.diplomacySystem.syncDiplomacyInDraft(draft);
      this.sectIdentitySystem.refreshSectIdentityInDraft(draft);
      draft.ui.statusMessage = recruitMessage ? `${choice.outcome} ${recruitMessage}` : choice.outcome;
    });

    this.saveSystem.saveGame(snapshot);

    return {
      snapshot,
      event,
      choice,
      context: activeContext
    };
  }

  getRenderedBody(snapshot: Readonly<GameState>, eventId: string): string {
    const event = getEventById(eventId);

    if (!event) {
      return '';
    }

    if (event.kind === 'major') {
      return event.body;
    }

    return this.renderTemplate(snapshot, event.body, snapshot.events.activeContext);
  }

  getRenderedContextLines(snapshot: Readonly<GameState>): string[] {
    const context = snapshot.events.activeContext;

    if (!context) {
      return [];
    }

    const lines: string[] = [];
    const actor = context.actorDiscipleId
      ? snapshot.disciples.roster.find((disciple) => disciple.id === context.actorDiscipleId)
      : null;
    const building = context.targetBuildingId ? snapshot.sect.buildings[context.targetBuildingId] : null;
    const faction = context.factionId ? factionCatalog.factions.find((entry) => entry.id === context.factionId) : null;

    if (actor) {
      lines.push(`De tu lien quan: ${actor.name} | ${actor.temperament} | tam tinh ${actor.mood} | trung thanh ${actor.loyalty}`);
    }

    if (building) {
      lines.push(`Cong trinh lien quan: ${getBuildingName(building.buildingId)} | cap ${building.level}`);
    }

    if (faction) {
      lines.push(`Phe lien quan: ${faction.name} | quan he ${snapshot.story.factionRelations[faction.id] ?? 0}`);
    }

    if (context.resourceId) {
      lines.push(`Tai nguyen noi bat: ${getResourceLabel(context.resourceId)} = ${snapshot.resources[context.resourceId]}`);
    }

    return lines;
  }

  private getAdjustedWeight(snapshot: Readonly<GameState>, event: EventDefinition): number {
    let weight = event.weight;
    const sectModifiers = this.sectIdentitySystem.getCombinedModifiers(snapshot);
    const factionId = event.contextRules.factionIdsAny?.[0] ?? event.tags.find((tag) => factionCatalog.factions.some((faction) => faction.id === tag));
    const isChapterOne = snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son';
    const isChapterTwo = snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the';
    const isChapterThree = snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien';
    const isChapterFour = snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao';

    if (isChapterOne) {
      if (event.category === 'survival' || event.category === 'resource' || event.category === 'sect_internal' || event.category === 'omen') {
        weight += 4;
      }

      if (event.category === 'disciple') {
        weight += 2;
      }

      if (event.category === 'opportunity' && event.tags.includes('recruitment')) {
        weight += 2;
      }

      if (event.category === 'faction') {
        weight -= 6;
      }

      if (event.category === 'opportunity' && !event.tags.includes('recruitment') && !event.tags.includes('refuge')) {
        weight -= 3;
      }
    }

    if (isChapterTwo) {
      if (event.category === 'sect_internal' || event.category === 'disciple') {
        weight += 3;
      }

      if (event.category === 'faction' || event.category === 'opportunity') {
        weight += 2;
      }

      if (event.category === 'survival') {
        weight -= 2;
      }

      if (event.tags.includes('recruitment') || event.tags.includes('discipline') || event.tags.includes('trade')) {
        weight += 2;
      }

      if (event.tags.includes('refuge') || event.tags.includes('food_pressure')) {
        weight -= 1;
      }
    }

    if (isChapterThree) {
      if (event.category === 'faction' || event.category === 'omen' || event.category === 'opportunity') {
        weight += 3;
      }

      if (event.category === 'disciple') {
        weight += 2;
      }

      if (event.category === 'survival') {
        weight -= 4;
      }

      if (event.tags.some((tag) => ['truth', 'inheritance', 'pressure', 'ambition', 'bi_canh'].includes(tag))) {
        weight += 3;
      }
    }

    if (isChapterFour) {
      if (event.category === 'omen' || event.category === 'faction' || event.category === 'disciple' || event.category === 'sect_internal') {
        weight += 4;
      }

      if (event.category === 'survival' || event.category === 'resource') {
        weight -= 5;
      }

      if (event.tags.some((tag) => ['crisis', 'truth', 'doctrine', 'sacrifice', 'final_arc', 'judgment'].includes(tag))) {
        weight += 4;
      }

      if (snapshot.story.greatCrisisLevel >= 40 && (event.category === 'omen' || event.category === 'faction')) {
        weight += 2;
      }
    }

    if (snapshot.sect.stability <= 35 && (event.category === 'disciple' || event.category === 'sect_internal')) {
      weight += 2;
    }

    if (snapshot.sect.fortune >= 65 && (event.category === 'opportunity' || event.category === 'omen' || event.category === 'cultivation')) {
      weight += 2;
    }

    if (snapshot.sect.prestige >= 18 && (event.category === 'faction' || event.category === 'opportunity' || event.tags.includes('recruitment'))) {
      weight += 2;
    }

    if (event.category === 'disciple' || event.category === 'sect_internal') {
      weight += sectModifiers.disciplineWeight ?? 0;
      weight += sectModifiers.recruitmentWeight ?? 0;
    }

    if (event.category === 'faction') {
      weight += sectModifiers.diplomacyWeight ?? 0;
    }

    if (event.category !== 'faction' || !factionId) {
      return Math.max(1, weight);
    }

    const diplomacyState = snapshot.diplomacy.factions[factionId];
    const relationScore = diplomacyState?.relationScore ?? snapshot.story.factionRelations[factionId] ?? 0;

    if (event.tags.includes('trade')) {
      weight += relationScore >= 10 ? 4 : -2;
    }

    if (event.tags.includes('pressure') || event.tags.includes('warning')) {
      weight += relationScore <= -10 ? 4 : 0;
    }

    if (event.tags.includes('black_market')) {
      weight += snapshot.resources.duocThao < 16 ? 2 : 0;
      weight += relationScore >= -5 ? 1 : 0;
    }

    if (event.tags.includes('ascension')) {
      weight += relationScore >= 5 ? 1 : 0;
    }

    if (diplomacyState?.hostilityLevel === 2) {
      weight += event.tags.includes('pressure') || event.tags.includes('warning') ? 2 : 0;
    }

    if (diplomacyState?.tradeAccess && event.tags.includes('trade')) {
      weight += 2;
    }

    return Math.max(1, weight);
  }

  private matchesCadence(snapshot: Readonly<GameState>, event: EventDefinition): boolean {
    const lastResolvedDay = snapshot.events.cooldowns[event.id];
    const isEarlyChapterOne = snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son' && snapshot.time.day <= 4;

    if (typeof lastResolvedDay === 'number' && snapshot.time.day - lastResolvedDay < event.cadenceDays) {
      return false;
    }

    if (isEarlyChapterOne && event.category === 'faction') {
      return false;
    }

    if (event.cadenceDays > 1 && snapshot.time.day % event.cadenceDays !== 0) {
      return false;
    }

    return true;
  }

  private isEventEligible(snapshot: Readonly<GameState>, trigger: EventTrigger, eventId: string): boolean {
    const day = snapshot.time.day;
    const prestige = snapshot.sect.prestige;
    const flags = getAllFlags(snapshot);
    const playerRealmOrder = getRealmOrder(snapshot.player.cultivation.currentRealmId);
    const constructedBuildings = getConstructedBuildingCount(snapshot);
    const event = getEventById(eventId);

    if (
      snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son'
      && event?.kind === 'random'
      && event.category === 'faction'
      && !flags.includes('first_exploration_victory')
    ) {
      return false;
    }

    if (
      snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son'
      && event?.kind === 'random'
      && event.category === 'opportunity'
      && !event.tags.includes('recruitment')
      && !flags.includes('first_building_restored')
    ) {
      return false;
    }

    if (trigger.chapterIds && !trigger.chapterIds.includes(snapshot.story.currentChapterId)) {
      return false;
    }

    if (typeof trigger.minDay === 'number' && day < trigger.minDay) {
      return false;
    }

    if (typeof trigger.maxDay === 'number' && day > trigger.maxDay) {
      return false;
    }

    if (typeof trigger.minSectPrestige === 'number' && prestige < trigger.minSectPrestige) {
      return false;
    }

    if (typeof trigger.maxSectPrestige === 'number' && prestige > trigger.maxSectPrestige) {
      return false;
    }

    if (typeof trigger.minSectStability === 'number' && snapshot.sect.stability < trigger.minSectStability) {
      return false;
    }

    if (typeof trigger.minPlayerRealmOrder === 'number' && playerRealmOrder < trigger.minPlayerRealmOrder) {
      return false;
    }

    if (typeof trigger.maxPlayerRealmOrder === 'number' && playerRealmOrder > trigger.maxPlayerRealmOrder) {
      return false;
    }

    if (typeof trigger.minConstructedBuildings === 'number' && constructedBuildings < trigger.minConstructedBuildings) {
      return false;
    }

    if (trigger.requiredFlags?.some((flag) => !flags.includes(flag))) {
      return false;
    }

    if (trigger.forbiddenFlags?.some((flag) => flags.includes(flag))) {
      return false;
    }

    if (trigger.resourceBelow) {
      for (const [resourceId, limit] of Object.entries(trigger.resourceBelow)) {
        const key = resourceId as keyof GameState['resources'];

        if (snapshot.resources[key] >= (limit ?? 0)) {
          return false;
        }
      }
    }

    if (trigger.resourceAbove) {
      for (const [resourceId, limit] of Object.entries(trigger.resourceAbove)) {
        const key = resourceId as keyof GameState['resources'];

        if (snapshot.resources[key] <= (limit ?? 0)) {
          return false;
        }
      }
    }

    if (trigger.strengthBuckets && !trigger.strengthBuckets.includes(getSectStrength(snapshot))) {
      return false;
    }

    if (trigger.requiredBuildings?.some((buildingId) => !snapshot.sect.buildings[buildingId as BuildingId]?.isConstructed)) {
      return false;
    }

    if (trigger.requiredFactionRelations) {
      for (const [factionId, minimum] of Object.entries(trigger.requiredFactionRelations)) {
        if ((snapshot.story.factionRelations[factionId] ?? 0) < minimum) {
          return false;
        }
      }
    }

    if (trigger.requiredDiscipleTraitPresence?.length) {
      const allTraitIds = snapshot.disciples.roster.flatMap((disciple) => disciple.traitIds);

      if (trigger.requiredDiscipleTraitPresence.some((traitId) => !allTraitIds.includes(traitId))) {
        return false;
      }
    }

    if (typeof trigger.requiredDiscipleCount === 'number' && snapshot.disciples.roster.length < trigger.requiredDiscipleCount) {
      return false;
    }

    if (typeof trigger.requiredDiscipleMoodBelow === 'number') {
      const moodLimit = trigger.requiredDiscipleMoodBelow;
      const hasLowMood = snapshot.disciples.roster.some((disciple) => disciple.mood <= moodLimit);

      if (!hasLowMood) {
        return false;
      }
    }

    if (typeof trigger.requiredDiscipleLoyaltyBelow === 'number') {
      const loyaltyLimit = trigger.requiredDiscipleLoyaltyBelow;
      const hasLowLoyalty = snapshot.disciples.roster.some((disciple) => disciple.loyalty <= loyaltyLimit);

      if (!hasLowLoyalty) {
        return false;
      }
    }

    if (trigger.requiredDiscipleRiskFlagsAny?.length) {
      const hasRisk = snapshot.disciples.roster.some((disciple) =>
        trigger.requiredDiscipleRiskFlagsAny?.some((flag) => disciple.riskFlags.includes(flag))
      );

      if (!hasRisk) {
        return false;
      }
    }

    if (trigger.requiredDiscipleStatusAny?.length) {
      const hasStatus = snapshot.disciples.roster.some((disciple) => trigger.requiredDiscipleStatusAny?.includes(disciple.status));

      if (!hasStatus) {
        return false;
      }
    }

    if (trigger.requiredTasks?.length) {
      const tasks = snapshot.disciples.roster.map((disciple) => disciple.currentTask);

      if (trigger.requiredTasks.some((task) => !tasks.includes(task as never))) {
        return false;
      }
    }

    if (typeof trigger.cooldownDays === 'number') {
      const lastResolvedDay = snapshot.events.cooldowns[eventId];

      if (typeof lastResolvedDay === 'number' && day - lastResolvedDay < trigger.cooldownDays) {
        return false;
      }
    }

    return true;
  }

  private resolveContext(snapshot: Readonly<GameState>, event: EventDefinition): EventContextState | null {
    const actor = event.contextRules.actor ? this.selectActor(snapshot, event.contextRules.actor) : null;
    const targetBuildingId = this.selectBuilding(snapshot, event);
    const factionId = this.selectFaction(snapshot, event);
    const resourceId = this.selectResourceContext(snapshot, event);

    if (!actor && !targetBuildingId && !factionId && !resourceId) {
      return null;
    }

    return {
      actorDiscipleId: actor?.id ?? null,
      targetBuildingId,
      factionId,
      resourceId
    };
  }

  private canResolveRequiredActor(snapshot: Readonly<GameState>, event: EventDefinition): boolean {
    if (!event.contextRules.actor) {
      return true;
    }

    return Boolean(this.selectActor(snapshot, event.contextRules.actor));
  }

  private selectActor(snapshot: Readonly<GameState>, actorRule: NonNullable<EventDefinition['contextRules']['actor']>) {
    const candidates = snapshot.disciples.roster.filter((disciple) => {
      if (actorRule.requiredTraitIdsAny?.length && !actorRule.requiredTraitIdsAny.some((traitId) => disciple.traitIds.includes(traitId))) {
        return false;
      }

      if (actorRule.requiredRiskFlagsAny?.length && !actorRule.requiredRiskFlagsAny.some((flag) => disciple.riskFlags.includes(flag))) {
        return false;
      }

      if (actorRule.requiredStatusAny?.length && !actorRule.requiredStatusAny.includes(disciple.status)) {
        return false;
      }

      if (typeof actorRule.maxMood === 'number' && disciple.mood > actorRule.maxMood) {
        return false;
      }

      if (typeof actorRule.maxLoyalty === 'number' && disciple.loyalty > actorRule.maxLoyalty) {
        return false;
      }

      if (typeof actorRule.minComprehension === 'number' && disciple.comprehension < actorRule.minComprehension) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    const preferred = actorRule.preferredTraitIdsAny?.length
      ? candidates.filter((disciple) => actorRule.preferredTraitIdsAny?.some((traitId) => disciple.traitIds.includes(traitId)))
      : [];

    return preferred[0] ?? candidates[0] ?? null;
  }

  private selectBuilding(snapshot: Readonly<GameState>, event: EventDefinition): BuildingId | null {
    const buildingIds = event.contextRules.buildingIdsAny;

    if (!buildingIds?.length) {
      return null;
    }

    return (buildingIds.find((buildingId) => snapshot.sect.buildings[buildingId as BuildingId]?.isConstructed) ?? null) as BuildingId | null;
  }

  private selectFaction(snapshot: Readonly<GameState>, event: EventDefinition): string | null {
    const taggedFactionIds = event.tags.filter((tag) => factionCatalog.factions.some((entry) => entry.id === tag));
    const factionIds = event.contextRules.factionIdsAny?.length ? event.contextRules.factionIdsAny : taggedFactionIds;

    if (!factionIds?.length) {
      return null;
    }

    return [...factionIds].sort((left, right) => (snapshot.story.factionRelations[left] ?? 0) - (snapshot.story.factionRelations[right] ?? 0))[0] ?? null;
  }

  private selectResourceContext(snapshot: Readonly<GameState>, event: EventDefinition): ResourceId | null {
    const resourceIds = event.contextRules.lowResourceIdsAny;

    if (!resourceIds?.length) {
      return null;
    }

    return [...resourceIds].sort((left, right) => snapshot.resources[left] - snapshot.resources[right])[0] ?? null;
  }

  private renderTemplate(snapshot: Readonly<GameState>, template: string, context: EventContextState | null): string {
    const actor = context?.actorDiscipleId
      ? snapshot.disciples.roster.find((disciple) => disciple.id === context.actorDiscipleId)
      : null;
    const factionName = context?.factionId
      ? factionCatalog.factions.find((entry) => entry.id === context.factionId)?.name ?? context.factionId
      : 'ngoai gioi';

    return template
      .replaceAll('{discipleName}', actor?.name ?? 'mot de tu')
      .replaceAll('{buildingName}', getBuildingName(context?.targetBuildingId ?? null))
      .replaceAll('{factionName}', factionName)
      .replaceAll('{resourceLabel}', context?.resourceId ? getResourceLabel(context.resourceId) : 'tai nguyen');
  }

  private seedAlignmentFromFlags(draft: GameState): void {
    const flags = new Set([...draft.story.storyFlags, ...draft.story.worldFlags, ...draft.story.choiceFlags]);

    if (Object.values(draft.story.pathAlignment).some((value) => value !== 0)) {
      return;
    }

    if (flags.has('orthodox_overture') || flags.has('chapter2_merit_register') || flags.has('truth_rejected_as_method')) {
      draft.story.pathAlignment.orthodox_alignment += 2;
    }

    if (flags.has('hardline_posture') || flags.has('chapter2_ration_discipline') || flags.has('counter_scouting_used')) {
      draft.story.pathAlignment.dominion_alignment += 2;
    }

    if (flags.has('odd_manual_supervised') || flags.has('forbidden_path_studied') || flags.has('cuu_tieu_hint_taken')) {
      draft.story.pathAlignment.outsider_alignment += 2;
    }

    for (const axis of Object.keys(draft.story.pathAlignment) as Array<AlignmentAxis>) {
      draft.story.pathAlignment[axis] = clampAlignment(draft.story.pathAlignment[axis]);
    }
  }

  private applyMajorProgression(draft: GameState, eventId: string): void {
    switch (eventId) {
      case 'major.chapter1.claim_the_ruins':
        draft.story.chapterProgress.chapter_1_du_tan_khai_son = 'active';
        if (!draft.story.storyFlags.includes('sect_ruins_surveyed')) {
          draft.story.storyFlags.push('sect_ruins_surveyed');
        }
        break;
      case 'major.chapter1.flame_not_extinguished':
        draft.story.chapterProgress.chapter_1_du_tan_khai_son = 'completed';
        draft.story.chapterProgress.chapter_2_tong_mon_lap_the = 'active';
        draft.story.currentChapterId = 'chapter_2_tong_mon_lap_the';
        draft.sect.chapterId = 'chapter_2_tong_mon_lap_the';
        if (!draft.story.storyFlags.includes('chapter1_completed')) {
          draft.story.storyFlags.push('chapter1_completed');
        }
        if (!draft.story.storyFlags.includes('chapter_1_complete')) {
          draft.story.storyFlags.push('chapter_1_complete');
        }
        if (!draft.story.storyFlags.includes('chapter_1_completed')) {
          draft.story.storyFlags.push('chapter_1_completed');
        }
        break;
      case 'major.chapter2.raise_the_banner':
        draft.story.chapterProgress.chapter_1_du_tan_khai_son = 'completed';
        draft.story.chapterProgress.chapter_2_tong_mon_lap_the = 'active';
        draft.story.currentChapterId = 'chapter_2_tong_mon_lap_the';
        draft.sect.chapterId = 'chapter_2_tong_mon_lap_the';
        if (!draft.story.storyFlags.includes('chapter2_started')) {
          draft.story.storyFlags.push('chapter2_started');
        }
        if (!draft.story.storyFlags.includes('chapter_2_started')) {
          draft.story.storyFlags.push('chapter_2_started');
        }
        break;
      case 'major.chapter2.small_sect_stands':
        draft.story.chapterProgress.chapter_2_tong_mon_lap_the = 'completed';
        draft.story.chapterProgress.chapter_3_kinh_chieu_cuu_thien = 'active';
        draft.story.currentChapterId = 'chapter_3_kinh_chieu_cuu_thien';
        draft.sect.chapterId = 'chapter_3_kinh_chieu_cuu_thien';
        if (!draft.story.storyFlags.includes('chapter2_completed')) {
          draft.story.storyFlags.push('chapter2_completed');
        }
        if (!draft.story.storyFlags.includes('chapter_2_complete')) {
          draft.story.storyFlags.push('chapter_2_complete');
        }
        if (!draft.story.storyFlags.includes('chapter_2_completed')) {
          draft.story.storyFlags.push('chapter_2_completed');
        }
        break;
      case 'major.chapter3.archive_of_the_cracked_sky':
        draft.story.chapterProgress.chapter_2_tong_mon_lap_the = 'completed';
        draft.story.chapterProgress.chapter_3_kinh_chieu_cuu_thien = 'active';
        draft.story.currentChapterId = 'chapter_3_kinh_chieu_cuu_thien';
        draft.sect.chapterId = 'chapter_3_kinh_chieu_cuu_thien';
        if (!draft.story.storyFlags.includes('chapter_2_completed')) {
          draft.story.storyFlags.push('chapter_2_completed');
        }
        break;
      case 'major.chapter3.small_sect_under_heaven':
        draft.story.chapterProgress.chapter_3_kinh_chieu_cuu_thien = 'completed';
        draft.story.chapterProgress.chapter_4_nhat_niem_dinh_dao = 'active';
        draft.story.currentChapterId = 'chapter_4_nhat_niem_dinh_dao';
        draft.sect.chapterId = 'chapter_4_nhat_niem_dinh_dao';
        if (!draft.story.storyFlags.includes('chapter_3_completed')) {
          draft.story.storyFlags.push('chapter_3_completed');
        }
        if (!draft.story.storyFlags.includes('chapter_3_complete')) {
          draft.story.storyFlags.push('chapter_3_complete');
        }
        if (!draft.story.storyFlags.includes('chapter3_completed')) {
          draft.story.storyFlags.push('chapter3_completed');
        }
        break;
      case 'major.chapter4.heaven_asks_at_the_ruined_peak':
        draft.story.chapterProgress.chapter_3_kinh_chieu_cuu_thien = 'completed';
        draft.story.chapterProgress.chapter_4_nhat_niem_dinh_dao = 'active';
        draft.story.currentChapterId = 'chapter_4_nhat_niem_dinh_dao';
        draft.sect.chapterId = 'chapter_4_nhat_niem_dinh_dao';
        draft.story.greatCrisisLevel = Math.max(draft.story.greatCrisisLevel, 25);
        this.seedAlignmentFromFlags(draft);
        if (!draft.story.storyFlags.includes('chapter4_started')) {
          draft.story.storyFlags.push('chapter4_started');
        }
        if (!draft.story.storyFlags.includes('chapter_4_started')) {
          draft.story.storyFlags.push('chapter_4_started');
        }
        break;
      case 'major.chapter4.threshold_of_the_three_paths':
        draft.story.chapterProgress.chapter_4_nhat_niem_dinh_dao = 'completed';
        draft.story.greatCrisisLevel = Math.max(draft.story.greatCrisisLevel, 70);
        draft.story.truthProgress = Math.max(draft.story.truthProgress, 70);
        this.endingSystem.refreshEndingUnlocksInDraft(draft);
        if (!draft.story.storyFlags.includes('chapter4_completed')) {
          draft.story.storyFlags.push('chapter4_completed');
        }
        if (!draft.story.storyFlags.includes('chapter_4_complete')) {
          draft.story.storyFlags.push('chapter_4_complete');
        }
        if (!draft.story.storyFlags.includes('chapter_4_completed')) {
          draft.story.storyFlags.push('chapter_4_completed');
        }
        break;
      default:
        break;
    }

    if (eventId === 'major.chapter1.mirror_first_resonance' && !draft.story.storyFlags.includes('linh_kinh_awakened')) {
      draft.story.storyFlags.push('linh_kinh_awakened');
    }

    if (eventId === 'major.chapter1.mirror_first_resonance' && !draft.story.storyFlags.includes('linh_kinh_glimpse_seen')) {
      draft.story.storyFlags.push('linh_kinh_glimpse_seen');
    }

    if (eventId === 'major.chapter1.first_major_threat' && !draft.story.storyFlags.includes('first_major_threat_survived')) {
      draft.story.storyFlags.push('first_major_threat_survived');
    }
  }
}
