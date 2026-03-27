import { endingCatalog, factionCatalog } from '@/game/data';
import type { EndingDefinition } from '@/game/data';
import type { EndingPathId, GameState } from '@/game/state/types';
import type { GameStateManager } from '@/game/state/GameStateManager';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

function clampUniquePaths(paths: EndingPathId[]): EndingPathId[] {
  return Array.from(new Set(paths));
}

export interface EndingPresentation {
  definition: EndingDefinition;
  chapterLabel: string;
  openingLines: string[];
  summaryLines: string[];
}

export class EndingSystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getUnlockedPaths(snapshot: Readonly<GameState>): EndingPathId[] {
    return snapshot.ending.unlockedPaths.length > 0
      ? snapshot.ending.unlockedPaths
      : this.computeUnlockedPaths(snapshot);
  }

  getChosenOrRecommendedPath(snapshot: Readonly<GameState>): EndingPathId {
    return snapshot.ending.completedPath
      ?? snapshot.ending.chosenPath
      ?? this.getUnlockedPaths(snapshot)[0]
      ?? this.getDominantPath(snapshot);
  }

  refreshEndingUnlocksInDraft(draft: GameState): EndingPathId[] {
    const unlocked = this.computeUnlockedPaths(draft);
    draft.ending.unlockedPaths = unlocked;

    if (draft.ending.completedPath && !draft.ending.unlockedPaths.includes(draft.ending.completedPath)) {
      draft.ending.unlockedPaths.push(draft.ending.completedPath);
      draft.ending.unlockedPaths = clampUniquePaths(draft.ending.unlockedPaths);
    }

    return draft.ending.unlockedPaths;
  }

  chooseEnding(path: EndingPathId): Readonly<GameState> {
    const snapshot = this.stateManager.update((draft) => {
      const unlocked = this.refreshEndingUnlocksInDraft(draft);
      const finalPath = unlocked.includes(path) ? path : this.getDominantPath(draft);
      const definition = this.getDefinition(finalPath);
      const continuationHookIds = definition.continuationHookIds ?? [];

      draft.ending.chosenPath = finalPath;
      draft.ending.completedPath = finalPath;
      draft.ending.completed = true;
      draft.ending.lastSummary = `Da khop base-game ending: ${definition.title}.`;
      draft.ending.summaryFlags = this.buildSummaryFlags(draft, finalPath);
      draft.expansion.completedBaseGame = true;
      draft.expansion.currentArcId = 'base_game_pham_gioi';
      draft.expansion.currentWorldLayerId = 'pham_gioi';
      if (!draft.expansion.completedArcIds.includes('base_game_pham_gioi')) {
        draft.expansion.completedArcIds.push('base_game_pham_gioi');
      }
      if (!draft.expansion.unlockedArcIds.includes('base_game_pham_gioi')) {
        draft.expansion.unlockedArcIds.push('base_game_pham_gioi');
      }
      if (definition.nextArcId && !draft.expansion.unlockedArcIds.includes(definition.nextArcId)) {
        draft.expansion.unlockedArcIds.push(definition.nextArcId);
      }
      draft.expansion.availableContinuationHookIds = Array.from(
        new Set([...draft.expansion.availableContinuationHookIds, ...continuationHookIds])
      );
      draft.expansion.nextArcId = definition.nextArcId ?? draft.expansion.nextArcId;
      draft.expansion.nextWorldLayerId = definition.nextWorldLayerId ?? draft.expansion.nextWorldLayerId;
      draft.expansion.canContinueBeyondEnding = false;
      draft.expansion.lastSummary = `Mach pham gioi da khop theo huong ${definition.title}. Cac hook hau ket da duoc danh dau, nhung chua mo thanh noi dung choi duoc.`;
      draft.ui.activeScreen = 'ending-scene';

      if (!draft.story.storyFlags.includes('base_game_completed')) {
        draft.story.storyFlags.push('base_game_completed');
      }

      if (!draft.story.worldFlags.includes('mortal_arc_completed')) {
        draft.story.worldFlags.push('mortal_arc_completed');
      }

      if (!draft.story.storyFlags.includes(`ending_${finalPath}_completed`)) {
        draft.story.storyFlags.push(`ending_${finalPath}_completed`);
      }
    });

    this.saveSystem.saveGame(snapshot);
    this.saveSystem.recordEndingCompletion(snapshot.ending.completedPath ?? path);
    return snapshot;
  }

  getPresentation(snapshot: Readonly<GameState>, path?: EndingPathId | null): EndingPresentation {
    const finalPath = path ?? this.getChosenOrRecommendedPath(snapshot);
    const definition = this.getDefinition(finalPath);
    const factionLine = this.getFactionLegacyLine(snapshot);

    return {
      definition,
      chapterLabel: snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao'
        ? 'Ket cua pham gioi'
        : 'Ket cuc base game',
      openingLines: [
        definition.summary,
        definition.doctrineSummary
      ],
      summaryLines: [
        `Canh gioi chuong mon: ${snapshot.player.cultivation.currentRealmId}`,
        `Uy danh / Khi van / On dinh: ${snapshot.sect.prestige} / ${snapshot.sect.fortune} / ${snapshot.sect.stability}`,
        `Tong mon de lai: ${definition.sectFateSummary}`,
        `Dao tam chuong mon: ${definition.playerSummary}`,
        `Phe phai dang nho nhat: ${factionLine}`,
        `Mach ve sau: ${snapshot.expansion.nextArcId ?? 'chua danh dau'} | Hook hau ket: ${snapshot.expansion.availableContinuationHookIds.length}`,
        `Dau vet tong ket: ${snapshot.ending.summaryFlags.join(' | ') || 'Khong co ghi chu them'}`,
        `Ve sau: ${definition.futureHint}`
      ]
    };
  }

  private computeUnlockedPaths(snapshot: Readonly<GameState>): EndingPathId[] {
    const flags = new Set([...snapshot.story.storyFlags, ...snapshot.story.worldFlags, ...snapshot.story.choiceFlags]);
    const unlocked: EndingPathId[] = [];

    const orthodoxScore = snapshot.story.pathAlignment.orthodox_alignment;
    const dominionScore = snapshot.story.pathAlignment.dominion_alignment;
    const outsiderScore = snapshot.story.pathAlignment.outsider_alignment;

    if (
      orthodoxScore >= 4
      || flags.has('ending_orthodox_route')
      || flags.has('ending_orthodox_route_hint')
      || flags.has('chapter4_truth_bound_to_limit')
    ) {
      unlocked.push('orthodox');
    }

    if (
      dominionScore >= 4
      || flags.has('ending_dominion_route')
      || flags.has('ending_dominion_route_hint')
      || flags.has('chapter4_defied_outer_slope')
    ) {
      unlocked.push('dominion');
    }

    if (
      outsiderScore >= 4
      || flags.has('ending_outsider_route')
      || flags.has('ending_outsider_route_hint')
      || flags.has('chapter4_forbidden_record_kept')
    ) {
      unlocked.push('outsider');
    }

    if (unlocked.length > 0) {
      return clampUniquePaths(unlocked);
    }

    return [this.getDominantPath(snapshot)];
  }

  private getDominantPath(snapshot: Readonly<GameState>): EndingPathId {
    const entries: Array<[EndingPathId, number]> = [
      ['orthodox', snapshot.story.pathAlignment.orthodox_alignment],
      ['dominion', snapshot.story.pathAlignment.dominion_alignment],
      ['outsider', snapshot.story.pathAlignment.outsider_alignment]
    ];

    return entries.reduce((best, current) => (current[1] > best[1] ? current : best), entries[0])[0];
  }

  private buildSummaryFlags(snapshot: Readonly<GameState>, path: EndingPathId): string[] {
    const flags: string[] = [`dao_lo:${path}`];

    if (snapshot.story.truthProgress >= 70) {
      flags.push('chan_tuong_da_ghep');
    }

    if (snapshot.story.greatCrisisLevel >= 70) {
      flags.push('dai_kiep_da_vuot');
    }

    if (snapshot.story.storyFlags.includes('chapter4_defied_outer_slope')) {
      flags.push('khong_nhan_toi_hau_thu');
    }

    if (snapshot.story.storyFlags.includes('chapter4_order_preserved')) {
      flags.push('giu_lai_trat_tu');
    }

    if (snapshot.story.storyFlags.includes('chapter4_risk_accepted')) {
      flags.push('chap_nhan_mo_duong');
    }

    return flags;
  }

  private getFactionLegacyLine(snapshot: Readonly<GameState>): string {
    const sorted = Object.values(snapshot.diplomacy.factions)
      .slice()
      .sort((left, right) => Math.abs(right.relationScore) - Math.abs(left.relationScore));
    const faction = sorted[0];

    if (!faction) {
      return 'The gian ben ngoai van chua ket luan';
    }

    const name = factionCatalog.factions.find((entry) => entry.id === faction.factionId)?.name ?? faction.factionId;
    return `${name} (${faction.relationStatus})`;
  }

  private getDefinition(path: EndingPathId): EndingDefinition {
    return endingCatalog.endings.find((entry) => entry.id === path) ?? endingCatalog.endings[0];
  }
}
