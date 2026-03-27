import { factionCatalog } from '@/game/data';
import type { FactionDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type {
  FactionAllianceState,
  FactionRelationStatus,
  FactionState,
  GameState,
  ResourceDeltaState
} from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { ResourceSystem } from '@/game/systems/ResourceSystem';

const MAX_INTERACTIONS = 6;

export interface DiplomacyActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface SimpleTradeOffer {
  id: string;
  label: string;
  cost: ResourceDeltaState;
  reward: ResourceDeltaState;
}

function clampRelation(score: number): number {
  return Math.max(-100, Math.min(100, Math.trunc(score)));
}

function includesAnyFlag(flags: string[], patterns: string[]): boolean {
  return patterns.some((pattern) => flags.some((flag) => flag.includes(pattern)));
}

export function getFactionRelationStatus(score: number): FactionRelationStatus {
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

function getAllianceState(
  factionId: string,
  score: number,
  flags: string[]
): FactionAllianceState {
  if (score >= 45) {
    return 'allied';
  }

  if (flags.includes(`alliance_offer_${factionId}`) || flags.includes(`protection_offer_${factionId}`)) {
    return 'offered';
  }

  if (flags.includes(`alliance_pact_${factionId}`)) {
    return 'pact';
  }

  return 'none';
}

function getWarningLevel(score: number, flags: string[]): number {
  if (score <= -40 || includesAnyFlag(flags, ['warning', 'hostile_signal', 'cold_notice'])) {
    return 2;
  }

  if (score <= -15) {
    return 1;
  }

  return 0;
}

function getHostilityLevel(score: number, flags: string[]): number {
  if (score <= -50 || includesAnyFlag(flags, ['raid', 'threat', 'hostile'])) {
    return 2;
  }

  if (score <= -25) {
    return 1;
  }

  return 0;
}

function getKnownFlagsForFaction(snapshot: Readonly<GameState>, factionId: string): string[] {
  const allFlags = [...snapshot.story.storyFlags, ...snapshot.story.worldFlags, ...snapshot.story.choiceFlags];
  return allFlags.filter((flag) => flag.includes(factionId)).slice(-8);
}

function hasTradeAccess(snapshot: Readonly<GameState>, factionId: string, score?: number): boolean {
  if (factionId !== 'xich_luyen_bao') {
    return false;
  }

  const nextScore = score ?? snapshot.story.factionRelations[factionId] ?? 0;
  return nextScore >= 10 || snapshot.story.choiceFlags.includes('xich_luyen_trade_contact_open');
}

function pushInteraction(state: FactionState, day: number, type: string, summary: string): void {
  state.recentInteractions.push({ day, type, summary });
  state.recentInteractions = state.recentInteractions.slice(-MAX_INTERACTIONS);
}

function refreshFactionStateInDraft(
  draft: GameState,
  factionId: string
): void {
  const score = clampRelation(draft.story.factionRelations[factionId] ?? 0);
  const factionState = draft.diplomacy.factions[factionId];

  if (!factionState) {
    return;
  }

  factionState.relationScore = score;
  factionState.relationStatus = getFactionRelationStatus(score);
  factionState.tradeAccess = hasTradeAccess(draft, factionId, score);
  factionState.warningLevel = getWarningLevel(score, getKnownFlagsForFaction(draft, factionId));
  factionState.hostilityLevel = getHostilityLevel(score, getKnownFlagsForFaction(draft, factionId));
  factionState.allianceState = getAllianceState(factionId, score, getKnownFlagsForFaction(draft, factionId));
  factionState.knownFlags = getKnownFlagsForFaction(draft, factionId);
}

export class DiplomacySystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly resourceSystem: ResourceSystem
  ) {}

  getFactionDefinition(factionId: string): FactionDefinition | undefined {
    return factionCatalog.factions.find((faction) => faction.id === factionId);
  }

  getFactionState(factionId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): FactionState | null {
    return snapshot.diplomacy.factions[factionId] ?? null;
  }

  getKnownFactions(): FactionDefinition[] {
    return factionCatalog.factions;
  }

  getTradeOffers(factionId: string): SimpleTradeOffer[] {
    if (factionId !== 'xich_luyen_bao') {
      return [];
    }

    return [
      {
        id: 'buy_herbs',
        label: 'Mua duoc thao',
        cost: { linhThach: -8 },
        reward: { duocThao: 6 }
      },
      {
        id: 'buy_ore',
        label: 'Mua khoang thach',
        cost: { linhThach: -8 },
        reward: { khoangThach: 6 }
      }
    ];
  }

  modifyRelation(factionId: string, amount: number, reason = 'Dieu chinh quan he.'): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      this.applyRelationChangeInDraft(draft, factionId, amount, reason, 'manual');
      draft.ui.statusMessage = reason;
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  checkTradeAccess(factionId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): boolean {
    return this.getFactionState(factionId, snapshot)?.tradeAccess === true;
  }

  checkAllianceState(factionId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): FactionAllianceState {
    return this.getFactionState(factionId, snapshot)?.allianceState ?? 'none';
  }

  recordInteraction(factionId: string, interactionType: string, summary: string): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      this.recordInteractionInDraft(draft, factionId, interactionType, summary);
      draft.ui.statusMessage = summary;
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  syncState(): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      this.syncDiplomacyInDraft(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return snapshot;
  }

  executeTrade(factionId: string, tradeId: string): DiplomacyActionResult {
    const before = this.stateManager.snapshot;
    const offer = this.getTradeOffers(factionId).find((entry) => entry.id === tradeId);

    if (!offer) {
      return { ok: false, message: 'Thuong vu nay chua co.', snapshot: before };
    }

    if (!this.checkTradeAccess(factionId, before)) {
      return { ok: false, message: 'Chua mo duoc duong giao dich voi phe nay.', snapshot: before };
    }

    const combinedCost: ResourceDeltaState = {};
    for (const [resourceId, value] of Object.entries(offer.cost)) {
      if (typeof value === 'number') {
        combinedCost[resourceId as keyof ResourceDeltaState] = value;
      }
    }

    if (!this.resourceSystem.canAfford(combinedCost)) {
      return { ok: false, message: 'Tai nguyen chua du de giao dich.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      for (const [resourceId, value] of Object.entries(offer.cost)) {
        if (typeof value !== 'number') {
          continue;
        }

        draft.resources[resourceId as keyof GameState['resources']] = Math.max(
          0,
          draft.resources[resourceId as keyof GameState['resources']] + Math.trunc(value)
        );
      }

      for (const [resourceId, value] of Object.entries(offer.reward)) {
        if (typeof value !== 'number') {
          continue;
        }

        draft.resources[resourceId as keyof GameState['resources']] = Math.max(
          0,
          draft.resources[resourceId as keyof GameState['resources']] + Math.trunc(value)
        );
      }

      this.applyRelationChangeInDraft(draft, factionId, 1, `Da giao dich voi ${this.getFactionDefinition(factionId)?.name ?? factionId}.`, 'trade');
      draft.diplomacy.lastSummary = `Da giao dich voi ${this.getFactionDefinition(factionId)?.name ?? factionId}: ${offer.label}.`;
      draft.ui.statusMessage = draft.diplomacy.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  sendPoliteResponse(factionId: string): DiplomacyActionResult {
    const snapshot = this.stateManager.update((draft) => {
      this.applyRelationChangeInDraft(
        draft,
        factionId,
        1,
        `Da gui hoi am meo le toi ${this.getFactionDefinition(factionId)?.name ?? factionId}.`,
        'reply'
      );
      draft.diplomacy.lastSummary = draft.ui.statusMessage;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  sendTribute(factionId: string): DiplomacyActionResult {
    const before = this.stateManager.snapshot;

    if (!this.resourceSystem.canAfford({ linhThach: -10 })) {
      return { ok: false, message: 'Linh thach chua du de gui le vat.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.resources.linhThach = Math.max(0, draft.resources.linhThach - 10);
      this.applyRelationChangeInDraft(
        draft,
        factionId,
        3,
        `Da gui le vat toi ${this.getFactionDefinition(factionId)?.name ?? factionId}.`,
        'tribute'
      );
      draft.diplomacy.lastSummary = draft.ui.statusMessage;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  ignoreFaction(factionId: string): DiplomacyActionResult {
    const snapshot = this.stateManager.update((draft) => {
      this.applyRelationChangeInDraft(
        draft,
        factionId,
        -2,
        `Thanh Huyen Mon bo qua thong diep cua ${this.getFactionDefinition(factionId)?.name ?? factionId}.`,
        'ignore'
      );
      draft.diplomacy.lastSummary = draft.ui.statusMessage;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  openPendingMessage(): string | null {
    const snapshot = this.stateManager.snapshot;
    return snapshot.diplomacy.pendingMessageEventIds[0] ?? null;
  }

  syncDiplomacyInDraft(draft: GameState): void {
    for (const faction of factionCatalog.factions) {
      refreshFactionStateInDraft(draft, faction.id);
    }
  }

  recordInteractionInDraft(draft: GameState, factionId: string, interactionType: string, summary: string): void {
    const factionState = draft.diplomacy.factions[factionId];

    if (!factionState) {
      return;
    }

    pushInteraction(factionState, draft.time.day, interactionType, summary);
    draft.diplomacy.lastSummary = summary;
  }

  markPendingMessageInDraft(draft: GameState, eventId: string): void {
    if (!draft.diplomacy.pendingMessageEventIds.includes(eventId)) {
      draft.diplomacy.pendingMessageEventIds.push(eventId);
    }
  }

  clearPendingMessageInDraft(draft: GameState, eventId: string): void {
    draft.diplomacy.pendingMessageEventIds = draft.diplomacy.pendingMessageEventIds.filter((entry) => entry !== eventId);
  }

  applyRelationChangeInDraft(
    draft: GameState,
    factionId: string,
    amount: number,
    reason: string,
    interactionType = 'event'
  ): void {
    draft.story.factionRelations[factionId] = clampRelation((draft.story.factionRelations[factionId] ?? 0) + Math.trunc(amount));
    refreshFactionStateInDraft(draft, factionId);
    this.recordInteractionInDraft(draft, factionId, interactionType, reason);
  }
}
