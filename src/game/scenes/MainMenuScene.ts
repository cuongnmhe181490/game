import Phaser from 'phaser';

import { Icons } from '@/game/config/assets';
import { getBuildInfoLine, PLAYTEST_BUILD_ID } from '@/game/config/buildInfo';
import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createPrimaryButton, createSecondaryButton, drawSceneFrame, PanelFrame, menuPalette } from '@/game/ui';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.mainMenu);
  }

  create(): void {
    const stateManager = getStateManager(this);
    const saveSystem = getSaveStore(this);
    const saveSummary = saveSystem.getSaveSummary();
    const slotSummaries = saveSystem.listSaveSlots();
    const replayMeta = saveSystem.getReplayMeta();
    const replayModifier = saveSystem.getSelectedReplayModifier(replayMeta);
    const canReplay = replayMeta.baseGameCompleted;
    const snapshot = stateManager.update((draft) => {
      draft.ui.activeScreen = 'main-menu';
      draft.ui.modalEventId = null;
    });

    saveSystem.saveGame(snapshot);

    const { width, height } = this.scale;
    const shellWidth = Math.min(430, width - 32);
    const shellHeight = Math.min(844, height - 24);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);
    const panelWidth = shellWidth - 32;
    const filledSlots = slotSummaries.filter((slot) => slot.hasSave).length;
    const hasMeaningfulProgress = snapshot.time.day > 1 || snapshot.events.history.length > 0 || snapshot.exploration.totalRuns > 0;
    const hasAnySave = saveSummary.source !== 'none';
    const endingReached = snapshot.ending.completed;

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);

    const shell = this.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(shellX + 10, shellY + 10, shellWidth - 20, shellHeight - 20, 28);

    const crest = this.add.image(shellX + shellWidth / 2, shellY + 54, Icons.ui.sectCrest)
      .setDisplaySize(52, 52)
      .setAlpha(this.textures.exists(Icons.ui.sectCrest) ? 0.92 : 0);

    this.add.text(shellX + shellWidth / 2, shellY + 100, 'Nhất Niệm Khai Tông', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '34px'
    }).setOrigin(0.5);

    this.add.text(shellX + shellWidth / 2, shellY + 136, 'Early Access vertical slice', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px'
    }).setOrigin(0.5);

    this.add.text(shellX + shellWidth / 2, shellY + 160, getBuildInfoLine(), {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px'
    }).setOrigin(0.5);

    const primaryLabel = endingReached
      ? 'Xem lại kết cục'
      : hasMeaningfulProgress
        ? 'Tiếp tục'
        : 'Bắt đầu';
    const primaryDetail = hasMeaningfulProgress
      ? endingReached
        ? 'Mở lại kết cục của save hiện tại'
        : 'Vào lại run đang chơi'
      : hasAnySave
        ? 'Dùng save đang có trong slot hiện tại'
        : 'Tạo hành trình đầu tiên';

    let panelY = shellY + 192;

    const journeyFrame = new PanelFrame(this, {
      x: shellX + 16,
      y: panelY,
      width: panelWidth,
      height: canReplay ? 274 : 218,
      title: 'Hành trình',
      subtitle: 'Vào game, bắt đầu run mới, hoặc tiếp tục từ save slot hiện có.',
      iconKey: Icons.ui.sectCrest
    });
    this.add.existing(journeyFrame.root);

    const startAction = createPrimaryButton(this, {
      width: panelWidth - 36,
      label: primaryLabel,
      detail: primaryDetail,
      onClick: () => {
        this.scene.start(endingReached ? SCENE_KEYS.ending : SCENE_KEYS.sect);
      }
    }).setPosition(0, 0);

    const newGameAction = createSecondaryButton(this, {
      width: panelWidth - 36,
      label: 'Game mới',
      detail: canReplay
        ? 'Run sạch từ Chương 1, không mang theo dư âm replay'
        : 'Tạo lại điểm bắt đầu chương 1',
      onClick: () => {
        saveSystem.clear();
        const nextSnapshot = stateManager.replace(createGameState());
        saveSystem.saveGame(nextSnapshot);
        this.scene.start(SCENE_KEYS.sect);
      }
    }).setPosition(0, 64);

    journeyFrame.content.add([startAction, newGameAction]);

    if (canReplay) {
      const replayAction = createSecondaryButton(this, {
        width: panelWidth - 36,
        label: 'Hành trình mới',
        detail: replayModifier
          ? `Mang theo ${replayModifier.label}: ${replayModifier.summary}`
          : 'Bắt đầu vòng replay mới sau khi đã clear base game',
        onClick: () => {
          const nextSnapshot = saveSystem.createReplaySave();
          stateManager.replace(nextSnapshot);
          this.scene.start(SCENE_KEYS.sect);
        }
      }).setPosition(0, 128);
      journeyFrame.content.add(replayAction);
    }

    const loadY = canReplay ? 192 : 128;
    const settingsY = canReplay ? 192 : 128;
    const loadButton = createSecondaryButton(this, {
      width: Math.floor((panelWidth - 46) / 2),
      label: 'Load Game',
      detail: `${filledSlots}/${slotSummaries.length} slot có dữ liệu`,
      onClick: () => this.scene.start(SCENE_KEYS.saveSlots, { returnScene: SCENE_KEYS.mainMenu })
    }).setPosition(0, loadY);

    const settingsButton = createSecondaryButton(this, {
      width: Math.floor((panelWidth - 46) / 2),
      label: 'Settings',
      detail: 'Âm thanh, giao diện, auto-save',
      onClick: () => this.scene.start(SCENE_KEYS.settings, { returnScene: SCENE_KEYS.mainMenu })
    }).setPosition(Math.floor((panelWidth - 46) / 2) + 10, settingsY);

    journeyFrame.content.add([loadButton, settingsButton]);

    panelY += canReplay ? 290 : 234;

    const summaryFrame = new PanelFrame(this, {
      x: shellX + 16,
      y: panelY,
      width: panelWidth,
      height: 188,
      title: 'Tình trạng save',
      subtitle: 'Tóm tắt ngắn để biết mình đang tiếp tục gì trước khi vào game.'
    });
    this.add.existing(summaryFrame.root);

    const summaryLines = [
      `Slot hiện tại: ${saveSystem.getCurrentSlot()} | Save: ${saveSummary.source === 'none' ? 'chưa có' : saveSummary.source === 'backup' ? 'đang dùng backup' : 'ổn định'}`,
      `Cảnh giới: ${snapshot.player.cultivation.currentRealmId} | Ngày ${snapshot.time.day}/${snapshot.time.month}/${snapshot.time.year}`,
      `Chương: ${snapshot.story.currentChapterId}`,
      `Kết cục: ${saveSummary.endingCompleted ? saveSummary.endingPath ?? 'đã hoàn tất' : 'chưa đạt'} | Đã clear: ${replayMeta.totalClearCount}`,
      `Replay: ${replayModifier ? replayModifier.label : 'chưa mở'}`
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

    const exportButton = createSecondaryButton(this, {
      width: Math.floor((panelWidth - 46) / 2),
      label: 'Xuất save',
      detail: 'Tải JSON để backup hoặc gửi bug report',
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
    }).setPosition(0, 112);

    const resetButton = createSecondaryButton(this, {
      width: Math.floor((panelWidth - 46) / 2),
      label: 'Xóa run',
      detail: canReplay ? 'Xóa save hiện tại, giữ tiến trình replay' : 'Xóa save và tạo lại điểm đầu',
      onClick: () => {
        saveSystem.clear();
        stateManager.replace(createGameState());
        const nextSnapshot = stateManager.update((draft) => {
          draft.ui.statusMessage = canReplay
            ? 'Đã xóa run hiện tại. Ending đã thấy và replay meta vẫn còn.'
            : 'Đã xóa dữ liệu save hiện tại và tạo lại Chương 1.';
        });
        saveSystem.saveGame(nextSnapshot);
        this.scene.start(SCENE_KEYS.sect);
      }
    }).setPosition(Math.floor((panelWidth - 46) / 2) + 10, 112);

    summaryFrame.content.add([exportButton, resetButton]);

    panelY += 204;

    const creditsFrame = new PanelFrame(this, {
      x: shellX + 16,
      y: panelY,
      width: panelWidth,
      height: 120,
      title: 'Credits',
      subtitle: 'Phần chính đã là shell mới. Một số panel sâu vẫn còn dùng UI legacy bên trong.'
    });
    this.add.existing(creditsFrame.root);

    creditsFrame.content.add(this.add.text(0, 0, [
      'Phaser 3 + TypeScript + Vite',
      'Early Access đang ưu tiên vertical slice và readability.',
      'Nếu thấy flow nào vẫn đổ về UI cũ, đó là phần cần thay tiếp sau menu và shell chính.'
    ], {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    }));
  }
}
