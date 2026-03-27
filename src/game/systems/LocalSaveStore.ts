import { createGameState } from '@/game/state/createGameState';
import type { EndingPathId, GameState } from '@/game/state/types';
import { deserializeGameState } from '@/game/state/codec';

const DEFAULT_SAVE_KEY = 'nhat-niem-khai-tong.save';
const DEFAULT_BACKUP_SAVE_KEY = 'nhat-niem-khai-tong.save.backup';
const DEFAULT_META_SAVE_KEY = 'nhat-niem-khai-tong.meta';
const DEFAULT_AUTOSAVE_INTERVAL_MS = 15000;
const COMPLETION_META_VERSION = 1;

export interface SaveSummary {
  hasPrimarySave: boolean;
  hasBackupSave: boolean;
  source: 'primary' | 'backup' | 'none';
  saveVersion: number | null;
  updatedAt: string | null;
  chapterId: string | null;
  day: number | null;
  eventCount: number;
  explorationRuns: number;
  endingCompleted: boolean;
  endingPath: string | null;
}

export interface ReplayModifierDefinition {
  id: string;
  label: string;
  summary: string;
  unlockEndingId: EndingPathId;
}

export interface ReplayMetaState {
  completionMetaVersion: number;
  baseGameCompleted: boolean;
  seenEndingIds: EndingPathId[];
  replayUnlocks: string[];
  selectedReplayModifierId: string | null;
  totalClearCount: number;
  lastCompletedEndingId: EndingPathId | null;
}

const REPLAY_MODIFIERS: ReplayModifierDefinition[] = [
  {
    id: 'legacy_orthodox',
    label: 'Du Am Chinh Dao',
    summary: '+1 Tu Khi Dan, +8 nen tang can co. Tot cho vong giu trat tu va dot pha on dinh hon.',
    unlockEndingId: 'orthodox'
  },
  {
    id: 'legacy_dominion',
    label: 'Uy Son Cuu An',
    summary: '+20 Linh Thach, +1 phong thu tong mon. Tot cho vong mo rong som va giai bai toan tai nguyen.',
    unlockEndingId: 'dominion'
  },
  {
    id: 'legacy_outsider',
    label: 'Di Van Pha Mon',
    summary: '+4 tien do tu hanh, +1 Tan Phien Co Khi. Tot cho vong nghieng ve kham pha va loi di khac.',
    unlockEndingId: 'outsider'
  }
];

function createDefaultReplayMeta(): ReplayMetaState {
  return {
    completionMetaVersion: COMPLETION_META_VERSION,
    baseGameCompleted: false,
    seenEndingIds: [],
    replayUnlocks: [],
    selectedReplayModifierId: null,
    totalClearCount: 0,
    lastCompletedEndingId: null
  };
}

function normalizeReplayMeta(value: unknown): ReplayMetaState {
  const defaults = createDefaultReplayMeta();

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const candidate = value as Partial<ReplayMetaState>;
  const seenEndingIds = Array.isArray(candidate.seenEndingIds)
    ? candidate.seenEndingIds.filter((entry): entry is EndingPathId => entry === 'orthodox' || entry === 'dominion' || entry === 'outsider')
    : [];
  const replayUnlocks = Array.isArray(candidate.replayUnlocks)
    ? candidate.replayUnlocks.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
  const unlocksFromEndings = REPLAY_MODIFIERS
    .filter((modifier) => seenEndingIds.includes(modifier.unlockEndingId))
    .map((modifier) => modifier.id);
  const mergedUnlocks = Array.from(new Set([...replayUnlocks, ...unlocksFromEndings]));
  const selectedReplayModifierId = typeof candidate.selectedReplayModifierId === 'string'
    && mergedUnlocks.includes(candidate.selectedReplayModifierId)
    ? candidate.selectedReplayModifierId
    : mergedUnlocks[0] ?? null;

  return {
    completionMetaVersion: COMPLETION_META_VERSION,
    baseGameCompleted: Boolean(candidate.baseGameCompleted),
    seenEndingIds: Array.from(new Set(seenEndingIds)),
    replayUnlocks: mergedUnlocks,
    selectedReplayModifierId,
    totalClearCount: typeof candidate.totalClearCount === 'number' && Number.isFinite(candidate.totalClearCount)
      ? Math.max(0, Math.floor(candidate.totalClearCount))
      : 0,
    lastCompletedEndingId: seenEndingIds.includes(candidate.lastCompletedEndingId as EndingPathId)
      ? candidate.lastCompletedEndingId as EndingPathId
      : null
  };
}

export class SaveSystem {
  private autosaveHandle: number | null = null;
  private lastNotice: string | null = null;

  constructor(
    private readonly saveKey = DEFAULT_SAVE_KEY,
    private readonly backupKey = DEFAULT_BACKUP_SAVE_KEY,
    private readonly metaKey = DEFAULT_META_SAVE_KEY
  ) {}

  hasSave(): boolean {
    return this.safeGet(this.saveKey) !== null || this.safeGet(this.backupKey) !== null;
  }

  getSaveSummary(): SaveSummary {
    const primaryRaw = this.safeGet(this.saveKey);
    const backupRaw = this.safeGet(this.backupKey);
    const primary = primaryRaw ? deserializeGameState(primaryRaw) : null;
    const backup = backupRaw ? deserializeGameState(backupRaw) : null;
    const state = primary ?? backup;

    if (!state) {
      return {
        hasPrimarySave: Boolean(primaryRaw),
        hasBackupSave: Boolean(backupRaw),
        source: 'none',
        saveVersion: null,
        updatedAt: null,
        chapterId: null,
        day: null,
        eventCount: 0,
        explorationRuns: 0,
        endingCompleted: false,
        endingPath: null
      };
    }

    return {
      hasPrimarySave: Boolean(primaryRaw),
      hasBackupSave: Boolean(backupRaw),
      source: primary ? 'primary' : 'backup',
      saveVersion: state.meta.saveVersion,
      updatedAt: state.meta.updatedAt,
      chapterId: state.story.currentChapterId,
      day: state.time.day,
      eventCount: state.events.history.length,
      explorationRuns: state.exploration.totalRuns,
      endingCompleted: state.ending.completed,
      endingPath: state.ending.completedPath
    };
  }

  exportCurrentSave(): string | null {
    return this.safeGet(this.saveKey) ?? this.safeGet(this.backupKey);
  }

  getReplayMeta(): ReplayMetaState {
    const raw = this.safeGet(this.metaKey);

    if (!raw) {
      return createDefaultReplayMeta();
    }

    try {
      return normalizeReplayMeta(JSON.parse(raw));
    } catch {
      return createDefaultReplayMeta();
    }
  }

  getUnlockedReplayModifiers(meta = this.getReplayMeta()): ReplayModifierDefinition[] {
    const unlocked = new Set(meta.replayUnlocks);
    return REPLAY_MODIFIERS.filter((modifier) => unlocked.has(modifier.id));
  }

  getSelectedReplayModifier(meta = this.getReplayMeta()): ReplayModifierDefinition | null {
    const unlocked = this.getUnlockedReplayModifiers(meta);

    if (unlocked.length === 0) {
      return null;
    }

    return unlocked.find((modifier) => modifier.id === meta.selectedReplayModifierId) ?? unlocked[0] ?? null;
  }

  cycleReplayModifier(): ReplayMetaState {
    const meta = this.getReplayMeta();
    const unlocked = this.getUnlockedReplayModifiers(meta);

    if (unlocked.length <= 1) {
      return meta;
    }

    const currentIndex = unlocked.findIndex((modifier) => modifier.id === meta.selectedReplayModifierId);
    const nextModifier = unlocked[(currentIndex + 1 + unlocked.length) % unlocked.length];
    const nextMeta: ReplayMetaState = {
      ...meta,
      selectedReplayModifierId: nextModifier.id
    };

    this.saveReplayMeta(nextMeta);
    this.lastNotice = `Da doi du am hanh trinh sang ${nextModifier.label}.`;
    return nextMeta;
  }

  recordEndingCompletion(path: EndingPathId): ReplayMetaState {
    const current = this.getReplayMeta();
    const unlockIds = REPLAY_MODIFIERS.filter((modifier) => modifier.unlockEndingId === path).map((modifier) => modifier.id);
    const nextMeta = normalizeReplayMeta({
      ...current,
      baseGameCompleted: true,
      seenEndingIds: [...current.seenEndingIds, path],
      replayUnlocks: [...current.replayUnlocks, ...unlockIds],
      totalClearCount: current.totalClearCount + 1,
      lastCompletedEndingId: path,
      selectedReplayModifierId: unlockIds[0] ?? current.selectedReplayModifierId ?? null
    });

    this.saveReplayMeta(nextMeta);
    return nextMeta;
  }

  createReplaySave(statusMessage?: string): GameState {
    const meta = this.getReplayMeta();
    const replayModifier = this.getSelectedReplayModifier(meta);
    const nextSave = createGameState({
      replayModifierId: replayModifier?.id ?? null,
      replaySeenEndingIds: meta.seenEndingIds
    });

    nextSave.ui.statusMessage = statusMessage ?? (
      replayModifier
        ? `Hanh trinh moi bat dau. Du am dang mang theo: ${replayModifier.label}.`
        : 'Hanh trinh moi bat dau. Ban co the di mot vong moi ma khong mang theo them suc manh nao.'
    );

    this.saveGame(nextSave);
    return nextSave;
  }

  createNewSave(statusMessage?: string): GameState {
    const nextSave = createGameState();
    if (statusMessage) {
      nextSave.ui.statusMessage = statusMessage;
    }
    this.saveGame(nextSave);
    return nextSave;
  }

  loadSave(): GameState {
    const raw = this.safeGet(this.saveKey);

    if (!raw) {
      return this.createNewSave('Bat dau son mon moi. Hay doc huong dan ngan roi qua mot ngay dau tien.');
    }

    const parsed = deserializeGameState(raw);

    if (parsed) {
      this.lastNotice = null;
      return parsed;
    }

    const backup = this.safeGet(this.backupKey);
    if (backup) {
      const restored = deserializeGameState(backup);

      if (restored) {
        restored.ui.statusMessage = 'Save chinh gap loi. Da khoi phuc tu ban du phong gan nhat.';
        this.lastNotice = restored.ui.statusMessage;
        return restored;
      }
    }

    return this.createNewSave('Save cu khong doc duoc. Da tao save moi an toan.');
  }

  saveGame(state: Readonly<GameState>, isAutosave = false): void {
    const payload: GameState = structuredClone(state);

    if (isAutosave) {
      payload.meta.lastAutosaveAt = new Date().toISOString();
      payload.meta.updatedAt = payload.meta.lastAutosaveAt;
    }

    const serialized = JSON.stringify(payload);
    const previous = this.safeGet(this.saveKey);

    if (previous) {
      this.safeSet(this.backupKey, previous);
    }

    this.safeSet(this.saveKey, serialized);
  }

  startAutosave(getSnapshot: () => Readonly<GameState>, intervalMs = DEFAULT_AUTOSAVE_INTERVAL_MS): void {
    this.stopAutosave();
    this.autosaveHandle = window.setInterval(() => {
      this.saveGame(getSnapshot(), true);
    }, intervalMs);
  }

  stopAutosave(): void {
    if (this.autosaveHandle !== null) {
      window.clearInterval(this.autosaveHandle);
      this.autosaveHandle = null;
    }
  }

  clear(): void {
    this.stopAutosave();
    this.safeRemove(this.saveKey);
    this.safeRemove(this.backupKey);
    this.lastNotice = 'Da xoa save hien tai va ban du phong. Tien trinh replay da mo van duoc giu lai.';
  }

  load(): GameState {
    return this.loadSave();
  }

  save(state: Readonly<GameState>): void {
    this.saveGame(state);
  }

  consumeLastNotice(): string | null {
    const notice = this.lastNotice;
    this.lastNotice = null;
    return notice;
  }

  private saveReplayMeta(meta: ReplayMetaState): void {
    this.safeSet(this.metaKey, JSON.stringify(normalizeReplayMeta(meta)));
  }

  private safeGet(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      this.lastNotice = 'Khong the ghi save vao localStorage tren trinh duyet nay.';
    }
  }

  private safeRemove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures in the demo slice.
    }
  }
}

export class LocalSaveStore extends SaveSystem {}
