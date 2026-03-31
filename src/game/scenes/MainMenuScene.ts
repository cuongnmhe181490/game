import Phaser from 'phaser';

import { Icons } from '@/game/config/assets';
import { getBuildInfoLine, PLAYTEST_BUILD_ID } from '@/game/config/buildInfo';
import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createPrimaryButton, createSecondaryButton, EntryShell, PanelFrame, menuPalette } from '@/game/ui';

const REALM_LABELS: Record<string, string> = {
  pham_the: 'Phàm Thể',
  luyen_khi: 'Luyện Khí',
  truc_co: 'Trúc Cơ',
  kim_dan: 'Kim Đan',
  nguyen_anh: 'Nguyên Anh',
  hoa_than: 'Hóa Thần',
  luyen_hu: 'Luyện Hư',
  hop_the: 'Hợp Thể',
  dai_thua: 'Đại Thừa',
  do_kiep: 'Độ Kiếp'
};

const CHAPTER_LABELS: Record<string, string> = {
  chapter_1_du_tan_khai_son: 'Chương 1: Dư Tàn Khai Sơn',
  chapter_2_kien_thiet_tong_mon: 'Chương 2: Kiến Thiết Tông Môn',
  chapter_3_thu_trieu_thao_phat: 'Chương 3: Thú Triều Thảo Phạt',
  chapter_4_van_kiep_tranh_phong: 'Chương 4: Vạn Kiếp Tranh Phong',
  chapter_5_thien_dao_tranh_doat: 'Chương 5: Thiên Đạo Tranh Đoạt'
};

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

    stateManager.update((draft) => {
      draft.ui.activeScreen = 'main-menu';
      draft.ui.modalEventId = null;
    });

    const shell = new EntryShell(this, {
      title: 'Nhất Niệm Khai Tông',
      subtitle: 'Early Access Vertical Slice',
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
      ? 'Xem lại kết cục'
      : hasMeaningfulProgress
        ? 'Tiếp tục'
        : 'Bắt đầu';

    const primaryDetail = hasMeaningfulProgress
      ? endingReached
        ? 'Mở lại kết cục của tiến trình hiện tại'
        : 'Vào lại hành trình đang chơi'
      : hasAnySave
        ? 'Dùng dữ liệu lưu đang có trong ô hiện tại'
        : 'Tạo hành trình đầu tiên';

    let panelY = shell.contentY;

    const journeyFrame = new PanelFrame(this, {
      x: shell.contentX,
      y: panelY,
      width: panelWidth,
      height: canReplay ? 356 : 288,
      title: 'Hành trình',
      subtitle: 'Vào game, bắt đầu mới, hoặc tiếp tục từ ô lưu hiện tại.',
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
        label: 'Game mới',
        detail: canReplay
          ? 'Tạo lại điểm bắt đầu Chương 1, không mượn sức từ Replay'
          : 'Tạo lại điểm bắt đầu Chương 1',
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
          label: 'Hành trình mới',
          detail: replayModifier
            ? `Mang theo ${replayModifier.label}: ${replayModifier.summary}`
            : 'Bắt đầu vòng Replay sau khi đã hoàn thành Base Game',
          onClick: () => {
            const nextSnapshot = saveSystem.createReplaySave();
            stateManager.replace(nextSnapshot);
            this.scene.start(SCENE_KEYS.sect);
          }
        }).setPosition(0, 128)
      );
    }

    const lowerActionY = canReplay ? 192 : 128;
    journeyFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Tải game',
        detail: `${filledSlots}/${slotSummaries.length} ô có dữ liệu`,
        onClick: () => this.scene.start(SCENE_KEYS.saveSlots, { returnScene: SCENE_KEYS.mainMenu })
      }).setPosition(0, lowerActionY)
    );

    journeyFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Cài đặt',
        detail: 'Âm thanh, giao diện, tự động lưu',
        onClick: () => this.scene.start(SCENE_KEYS.settings, { returnScene: SCENE_KEYS.mainMenu })
      }).setPosition(halfButtonWidth + 10, lowerActionY)
    );

    panelY += canReplay ? 372 : 304;

    const summaryFrame = new PanelFrame(this, {
      x: shell.contentX,
      y: panelY,
      width: panelWidth,
      height: 300,
      title: 'Tình trạng lưu',
      subtitle: 'Tóm tắt tiến trình để biết bạn đang ở đoạn nào trước khi vào game.'
    });
    this.add.existing(summaryFrame.root);

    const currentRealmName = currentSlotSummary.realmId
      ? (REALM_LABELS[currentSlotSummary.realmId] ?? currentSlotSummary.realmId.replace(/_/g, ' '))
      : 'Phàm Thể';
    const currentChapterName = currentSlotSummary.chapterId
      ? (CHAPTER_LABELS[currentSlotSummary.chapterId] ?? currentSlotSummary.chapterId.replace(/_/g, ' '))
      : 'Chương 1';

    const summaryLines = [
      `Ô hiện tại: ${currentSlot} | Save: ${saveSummary.source === 'none' ? 'Trống' : saveSummary.source === 'backup' ? 'Dùng dự phòng' : 'Ổn định'}`,
      `Cảnh giới: ${currentRealmName} | Ngày ${currentSlotSummary.day ?? 1}`,
      `Chương: ${currentChapterName}`,
      `Kết cục: ${saveSummary.endingCompleted ? (saveSummary.endingPath ?? 'Đã hoàn thành') : 'Chưa đạt'} | Đã clear: ${replayMeta.totalClearCount}`,
      `Replay: ${replayModifier ? replayModifier.label : 'Chưa mở'}`
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
        label: 'Xuất save',
        detail: 'Tải JSON để làm bản sao lưu tĩnh',
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
      }).setPosition(0, 160)
    );

    summaryFrame.content.add(
      createSecondaryButton(this, {
        width: halfButtonWidth,
        label: 'Xóa run',
        detail: canReplay ? 'Xóa save hiện tại, giữ Replay Meta' : 'Xóa dữ liệu để tạo lại từ đầu',
        onClick: () => {
          saveSystem.clear();
          stateManager.replace(createGameState());
          const nextSnapshot = stateManager.update((draft) => {
            draft.ui.statusMessage = canReplay
              ? 'Đã xóa tiến trình hiện tại. Ending và Replay Meta vẫn giữ nguyên.'
              : 'Đã xóa dữ liệu. Hãy tạo lại Chương 1.';
          });
          saveSystem.saveGame(nextSnapshot);
          this.scene.start(SCENE_KEYS.sect);
        }
      }).setPosition(halfButtonWidth + 10, 160)
    );
  }
}
