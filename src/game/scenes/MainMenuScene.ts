import Phaser from 'phaser';

import { Icons } from '@/game/config/assets';
import { getBuildInfoLine, PLAYTEST_BUILD_ID } from '@/game/config/buildInfo';
import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createPrimaryButton, createSecondaryButton, EntryShell, PanelFrame, menuPalette } from '@/game/ui';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.mainMenu);
  }

  create(): void {
    const stateManager = getStateManager(this);
    const saveSystem = getSaveStore(this);
    const currentSlot = saveSystem.getCurrentSlot();
    const saveSummary = saveSystem.getSaveSummary();
    const currentSlotSummary = saveSystem.getSlotSummary(currentSlot);
    const slotSummaries = saveSystem.listSaveSlots();
    const replayMeta = saveSystem.getReplayMeta();
    const replayModifier = saveSystem.getSelectedReplayModifier(replayMeta);
    const canReplay = replayMeta.baseGameCompleted;
    const snapshot = stateManager.update((draft) => {
      draft.ui.activeScreen = 'main-menu';
      draft.ui.modalEventId = null;
    });

    const shell = new EntryShell(this, {
      title: 'Nhat Niem Khai Tong',
      subtitle: 'Early Access vertical slice',
      metaLine: getBuildInfoLine(),
      iconKey: Icons.ui.sectCrest
    });
    const panelWidth = shell.contentWidth;
    const halfButtonWidth = Math.floor((panelWidth - 46) / 2);
    const filledSlots = slotSummaries.filter((slot) => slot.hasSave).length;
    const hasMeaningfulProgress = currentSlotSummary.hasSave && (
      (currentSlotSummary.day ?? 1) > 1 ||
      saveSummary.eventCount > 0 ||
      saveSummary.explorationRuns > 0
    );
    const hasAnySave = saveSummary.source !== 'none';
    const endingReached = saveSummary.endingCompleted;
    const primaryLabel = endingReached
      ? 'Xem lai ket cuc'
      : hasMeaningfulProgress
        ? 'Tiep tuc'
        : 'Bat dau';
    const primaryDetail = hasMeaningfulProgress
      ? endingReached
        ? 'Mo lai ket cuc cua save hien tai'
        : 'Vao lai run dang choi'
      : hasAnySave
        ? 'Dung save dang co trong slot hien tai'
        : 'Tao hanh trinh dau tien';

    let panelY = shell.contentY;

    const journeyFrame = new PanelFrame(this, {
      x: shell.contentX,
      y: panelY,
      width: panelWidth,
      height: canReplay ? 332 : 252,
      title: 'Hanh trinh',
      subtitle: 'Vao game, bat dau run moi, hoac tiep tuc tu save slot hien co.',
      iconKey: Icons.ui.sectCrest
    });
    this.add.existing(journeyFrame.root);

    journeyFrame.content.add(
      createPrimaryButton(this, {
        width: panelWidth - 36,
        label: primaryLabel,
        detail: primaryDetail,
        onClick: () => {
          this.scene.start(endingReached ? SCENE_KEYS.ending : SCENE_KEYS.sect);
        }
      }).setPosition(0, 0)
    );

    journeyFrame.content.add(
      createSecondaryButton(this, {
        width: panelWidth - 36,
        label: 'Game moi',
        detail: canReplay
          ? 'Run sach tu Chuong 1, khong mang theo du am replay'
          : 'Tao lai diem bat dau Chuong 1',
        onClick: () => {
          saveSystem.clear();
          const nextSnapshot = stateManager.replace(createGameState());
          saveSystem.saveGame(nextSnapshot);
          this.scene.start(SCENE_KEYS.sect);
        }
      }).setPosition(0, 64)
    );

    if (canReplay) {
      journeyFrame.content.add(
        createSecondaryButton(this, {
          width: panelWidth - 36,
          label: 'Hanh trinh moi',
          detail: replayModifier
            ? `Mang theo ${replayModifier.label}: ${replayModifier.summary}`
            : 'Bat dau vong replay moi sau khi da clear base game',
          onClick: () => {
            const nextSnapshot = saveSystem.createReplaySave();
            stateManager.replace(nextSnapshot);
            this.scene.start(SCENE_KEYS.sect);
          }
        }).setPosition(0, 128)
      );
    }

    const lowerActionY = canReplay ? 196 : 128;
    journeyFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Load Game',
        detail: `${filledSlots}/${slotSummaries.length} slot co du lieu`,
        onClick: () => this.scene.start(SCENE_KEYS.saveSlots, { returnScene: SCENE_KEYS.mainMenu })
      }).setPosition(0, lowerActionY)
    );

    journeyFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Settings',
        detail: 'Am thanh, giao dien, auto-save',
        onClick: () => this.scene.start(SCENE_KEYS.settings, { returnScene: SCENE_KEYS.mainMenu })
      }).setPosition(halfButtonWidth + 10, lowerActionY)
    );

    panelY += canReplay ? 348 : 268;

    const summaryFrame = new PanelFrame(this, {
      x: shell.contentX,
      y: panelY,
      width: panelWidth,
      height: 276,
      title: 'Tinh trang save',
      subtitle: 'Tom tat ngan de biet minh dang tiep tuc gi truoc khi vao game.'
    });
    this.add.existing(summaryFrame.root);

    const summaryLines = [
      `Slot hien tai: ${currentSlot} | Save: ${saveSummary.source === 'none' ? 'chua co' : saveSummary.source === 'backup' ? 'dang dung backup' : 'on dinh'}`,
      `Canh gioi: ${currentSlotSummary.realmId ?? 'pham_the'} | Ngay ${currentSlotSummary.day ?? 1}/1/1`,
      `Chuong: ${currentSlotSummary.chapterId ?? 'chapter_1_du_tan_khai_son'}`,
      `Ket cuc: ${saveSummary.endingCompleted ? saveSummary.endingPath ?? 'da hoan tat' : 'chua dat'} | Da clear: ${replayMeta.totalClearCount}`,
      `Replay: ${replayModifier ? replayModifier.label : 'chua mo'}`
    ];

    summaryLines.forEach((line, index) => {
      summaryFrame.content.add(this.add.text(0, index * 20, line, {
        color: index === 0 ? menuPalette.textStrong : menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        lineSpacing: 2,
        wordWrap: { width: panelWidth - 36 }
      }));
    });

    summaryFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Xuat save',
        detail: 'Tai JSON de backup hoac gui bug report',
        onClick: () => {
          const raw = saveSystem.exportCurrentSave();
          if (!raw) {
            return;
          }

          const blob = new Blob([raw], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `nhat-niem-khai-tong-${PLAYTEST_BUILD_ID}-save.json`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      }).setPosition(0, 150)
    );

    summaryFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Xoa run',
        detail: canReplay ? 'Xoa save hien tai, giu tien trinh replay' : 'Xoa save va tao lai diem dau',
        onClick: () => {
          saveSystem.clear();
          stateManager.replace(createGameState());
          const nextSnapshot = stateManager.update((draft) => {
            draft.ui.statusMessage = canReplay
              ? 'Da xoa run hien tai. Ending da thay va replay meta van con.'
              : 'Da xoa du lieu save hien tai va tao lai Chuong 1.';
          });
          saveSystem.saveGame(nextSnapshot);
          this.scene.start(SCENE_KEYS.sect);
        }
      }).setPosition(halfButtonWidth + 10, 150)
    );
  }
}
