import Phaser from 'phaser';

import { getBuildInfoLine } from '@/game/config/buildInfo';
import { getEndingSystem, getFeedbackSystem, getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import type { EndingPathId, GameState } from '@/game/state/types';
import type { EndingPresentation } from '@/game/systems/EndingSystem';
import { createTextButton, drawInsetPanel, drawSceneFrame, menuPalette } from '@/game/ui';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.ending);
  }

  create(data?: { path?: EndingPathId | null }): void {
    const stateManager = getStateManager(this);
    const saveSystem = getSaveStore(this);
    const endingSystem = getEndingSystem(this);
    const snapshot = stateManager.update((draft) => {
      draft.ui.activeScreen = 'ending-scene';
      draft.ui.modalEventId = null;
    });

    saveSystem.saveGame(snapshot);
    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);
    drawInsetPanel(this, { x: 84, y: 78, width: 1112, height: 564, fill: menuPalette.panel, alpha: 0.88 });
    drawInsetPanel(this, { x: 116, y: 126, width: 454, height: 458, fill: menuPalette.panelAlt, alpha: 0.86 });
    drawInsetPanel(this, { x: 602, y: 126, width: 562, height: 458, fill: menuPalette.panelAlt, alpha: 0.86 });

    const finalSnapshot = stateManager.snapshot;
    const selecting = !finalSnapshot.ending.completed;
    const unlockedPaths = endingSystem.getUnlockedPaths(finalSnapshot);
    const presentation = endingSystem.getPresentation(finalSnapshot, data?.path ?? finalSnapshot.ending.completedPath ?? null);

    this.add.text(118, 96, selecting ? 'Nguong Ket Cuoc' : presentation.definition.title, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '38px'
    });

    this.add.text(120, 146, selecting ? 'Thanh Huyen Mon da dung truoc lua chon cuoi cua base game.' : presentation.chapterLabel, {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '18px'
    });

    this.add.text(120, 176, getBuildInfoLine(), {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px'
    });

    if (selecting) {
      this.renderSelection(finalSnapshot, unlockedPaths);
    } else {
      this.renderSummary(finalSnapshot, presentation);
    }

    this.playEndingCue(selecting);
  }

  private renderSelection(snapshot: Readonly<GameState>, unlockedPaths: EndingPathId[]): void {
    const endingSystem = getEndingSystem(this);
    const introLines = [
      'Thanh Huyen Mon da vuot qua nguong Chuong 4. Dai kiep, chan tuong, va nhung lua chon tich luy da du de doi mot loi dap cuoi.',
      'Khong phai moi dao lo deu mo ra trong moi save. Cac huong duoi day la nhung ket cuoc ma tong mon nay da thuc su duyen toi.'
    ];
    const dominant = endingSystem.getChosenOrRecommendedPath(snapshot);

    this.add.text(132, 146, [
      ...introLines,
      '',
      `Dao huong ro nhat hien tai: ${this.getPathLabel(dominant)}`,
      `Dai kiep / Chan tuong: ${snapshot.story.greatCrisisLevel}/100 | ${snapshot.story.truthProgress}/100`,
      '',
      'Hay chot mot loi dap cuoi cho pham gioi nay.'
    ], {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 8,
      wordWrap: { width: 406 }
    });

    unlockedPaths.slice(0, 3).forEach((path, index) => {
      const presentation = endingSystem.getPresentation(snapshot, path);
      createTextButton(this, {
        x: 626,
        y: 168 + index * 126,
        width: 514,
        label: presentation.definition.title,
        detail: `${presentation.definition.summary} | ${presentation.definition.doctrineSummary}`,
        onClick: () => {
          const nextSnapshot = endingSystem.chooseEnding(path);
          this.scene.restart({ path: nextSnapshot.ending.completedPath });
        }
      });
    });

    createTextButton(this, {
      x: 626,
      y: 548,
      width: 248,
      label: 'Ve menu',
      detail: 'Quay lai menu de nghi giu save nguong ket cuoc',
      onClick: () => {
        this.scene.start(SCENE_KEYS.mainMenu);
      }
    });

    createTextButton(this, {
      x: 892,
      y: 548,
      width: 248,
      label: 'Ve Sect',
      detail: 'Xem lai save truoc khi chot ket cuc',
      onClick: () => {
        this.scene.start(SCENE_KEYS.sect);
      }
    });
  }

  private renderSummary(
    snapshot: Readonly<GameState>,
    presentation: EndingPresentation
  ): void {
    const saveSystem = getSaveStore(this);
    const replayMeta = saveSystem.getReplayMeta();
    const replayModifier = saveSystem.getSelectedReplayModifier(replayMeta);

    this.add.text(132, 146, [
      ...presentation.openingLines,
      '',
      `Base-game ending da hoan tat theo huong: ${presentation.definition.routeName}.`,
      'Thanh Huyen Mon da di het cung cua mach truyen pham gioi hien tai.',
      replayModifier
        ? `Du am hanh trinh da mo: ${replayModifier.label}. Ban co the bat dau vong moi voi mot loi ich nho, khong pha vo nhac do som.`
        : 'Khi quay lai menu, ban co the bat dau mot hanh trinh moi va giu lai mot chut ky uc cua ket cuoc nay.',
      snapshot.expansion.nextArcId
        ? `Mach ve sau da duoc danh dau: ${snapshot.expansion.nextArcId}. Ban hien tai chua mo noi dung tiep dien.`
        : 'Khong co mach mo rong nao duoc mo trong ban hien tai.'
    ], {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 8,
      wordWrap: { width: 406 }
    });

    this.add.text(626, 156, presentation.summaryLines.join('\n\n'), {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 8,
      wordWrap: { width: 500 }
    });

    createTextButton(this, {
      x: 626,
      y: 548,
      width: 168,
      label: 'Ve menu',
      detail: 'Quay lai menu chinh',
      onClick: () => {
        this.scene.start(SCENE_KEYS.mainMenu);
      }
    });

    createTextButton(this, {
      x: 814,
      y: 548,
      width: 168,
      label: 'Hanh trinh moi',
      detail: replayModifier ? `Bat dau lai voi ${replayModifier.label}` : 'Bat dau lai tu Chuong 1',
      onClick: () => {
        const nextSnapshot = saveSystem.createReplaySave();
        getStateManager(this).replace(nextSnapshot);
        this.scene.start(SCENE_KEYS.sect);
      }
    });

    createTextButton(this, {
      x: 1002,
      y: 548,
      width: 138,
      label: 'Tiep tuc save',
      detail: 'Tro lai SectScene voi save da hoan tat',
      onClick: () => {
        const nextSnapshot = getStateManager(this).update((draft) => {
          draft.ui.statusMessage = `Da hoan tat ending ${presentation.definition.title}. Ban dang o save sau ket cuoc.`;
          draft.ui.activeScreen = 'sect-scene';
        });
        getSaveStore(this).saveGame(nextSnapshot);
        this.scene.start(SCENE_KEYS.sect);
      }
    });
  }

  private getPathLabel(path: EndingPathId): string {
    switch (path) {
      case 'orthodox':
        return 'Chinh Dao Trung Lap';
      case 'dominion':
        return 'Ba Dao Xung Ton';
      case 'outsider':
        return 'Ngoai Dao Khai Thien';
      default:
        return path;
    }
  }

  private playEndingCue(selecting: boolean): void {
    try {
      const feedback = getFeedbackSystem(this);
      feedback.unlockAudio();
      feedback.play(selecting ? 'chapter' : 'event-major');
    } catch {
      // Ending presentation remains playable without audio.
    }
  }
}
