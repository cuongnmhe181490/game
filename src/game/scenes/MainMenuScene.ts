import Phaser from 'phaser';

import { getBuildInfoLine, PLAYTEST_BUILD_ID } from '@/game/config/buildInfo';
import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createTextButton, drawInsetPanel, drawSceneFrame, menuPalette } from '@/game/ui';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.mainMenu);
  }

  create(): void {
    const stateManager = getStateManager(this);
    const saveSystem = getSaveStore(this);
    const saveSummary = saveSystem.getSaveSummary();
    const replayMeta = saveSystem.getReplayMeta();
    const replayModifier = saveSystem.getSelectedReplayModifier(replayMeta);
    const canReplay = replayMeta.baseGameCompleted;
    const snapshot = stateManager.update((draft) => {
      draft.ui.activeScreen = 'main-menu';
      draft.ui.modalEventId = null;
    });

    saveSystem.saveGame(snapshot);

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);
    drawInsetPanel(this, { x: 82, y: 92, width: 520, height: 514, fill: menuPalette.panel, alpha: 0.88 });
    drawInsetPanel(this, { x: 648, y: 92, width: 548, height: 514, fill: menuPalette.panelAlt, alpha: 0.88 });

    this.add.text(112, 114, 'Nhat Niem Khai Tong', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '46px'
    });

    this.add.text(116, 176, 'Release candidate base game', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '20px'
    });

    this.add.text(116, 204, getBuildInfoLine(), {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px'
    });

    this.add.text(116, 236, [
      'Ban bat dau giua tan tich Thanh Huyen Mon, khi tan hoa trong Chinh dien van chua tat.',
      'Ban release-candidate nay dong scope o base game pham gioi: tu mo dau den ba ket cuc hien tai.',
      canReplay
        ? 'Ban da mo duoc Hanh trinh moi. Replay chi giu mot du am nho, khong mang theo toan bo suc manh cua save cu.'
        : 'Neu can mot vong sach, hay xoa save hien tai truoc khi bat dau lai tu Chuong 1.'
    ], {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 8,
      wordWrap: { width: 438 }
    });

    const menuStatusText = this.add.text(680, 520, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      lineSpacing: 6,
      wordWrap: { width: 476 }
    });

    const setMenuStatus = (message: string): void => {
      menuStatusText.setText(message);
    };

    const hasMeaningfulProgress = snapshot.time.day > 1 || snapshot.events.history.length > 0 || snapshot.exploration.totalRuns > 0;
    const hasAnySave = saveSummary.source !== 'none';
    const endingReached = snapshot.ending.completed;
    const primaryLabel = endingReached
      ? 'Xem lai ket cuc'
      : hasMeaningfulProgress
        ? 'Tiep tuc'
        : 'Bat dau';
    const primaryDetail = hasMeaningfulProgress
      ? endingReached
        ? 'Mo lai ket cuc cua save hien tai'
        : 'Vao lai save hien tai'
      : hasAnySave
        ? 'Dung save da tao san'
        : 'Tao save dau tien';
    const primaryY = canReplay ? 338 : 372;
    const gameMoiY = canReplay ? 396 : 438;
    const replayY = 454;
    const resetY = canReplay ? 512 : 504;
    const exportY = canReplay ? 570 : 570;

    createTextButton(this, {
      x: 188,
      y: primaryY,
      width: 320,
      label: primaryLabel,
      detail: primaryDetail,
      onClick: () => {
        setMenuStatus(
          endingReached
            ? 'Dang mo lai ket cuc cua save hien tai.'
            : hasMeaningfulProgress
              ? 'Dang tiep tuc save hien tai.'
              : 'Dang vao diem bat dau cua game.'
        );
        this.scene.start(endingReached ? SCENE_KEYS.ending : SCENE_KEYS.sect);
      }
    });

    createTextButton(this, {
      x: 188,
      y: gameMoiY,
      width: 320,
      label: 'Game moi',
      detail: canReplay
        ? 'Run sach tu Chuong 1, khong mang theo du am replay'
        : 'Tao lai diem bat dau chuong 1',
      onClick: () => {
        saveSystem.clear();
        const nextSnapshot = stateManager.replace(createGameState());
        saveSystem.saveGame(nextSnapshot);
        setMenuStatus('Da tao save moi tu dau Chuong 1.');
        this.scene.start(SCENE_KEYS.sect);
      }
    });

    if (canReplay) {
      createTextButton(this, {
        x: 188,
        y: replayY,
        width: 320,
        label: 'Hanh trinh moi',
        detail: replayModifier
          ? `Mang theo ${replayModifier.label}: ${replayModifier.summary}`
          : 'Bat dau vong moi sau khi da clear base game',
        onClick: () => {
          const nextSnapshot = saveSystem.createReplaySave();
          stateManager.replace(nextSnapshot);
          setMenuStatus(
            replayModifier
              ? `Da tao vong replay moi voi du am ${replayModifier.label}. Chuong 1 van bat dau tu dau.`
              : 'Da tao vong replay moi. Ban van di lai Chuong 1 nhu mot hanh trinh day du.'
          );
          this.scene.start(SCENE_KEYS.sect);
        }
      });
    }

    createTextButton(this, {
      x: 188,
      y: resetY,
      width: 320,
      label: canReplay ? 'Xoa save hien tai' : 'Xoa du lieu save',
      detail: canReplay ? 'Xoa run hien tai, khong dong vao ending da thay' : 'Xoa save va backup roi tao lai',
      onClick: () => {
        saveSystem.clear();
        stateManager.replace(createGameState());
        const nextSnapshot = stateManager.update((draft) => {
          draft.ui.statusMessage = canReplay
            ? 'Da xoa run hien tai. Tien trinh replay van con, nhung Chuong 1 da duoc tao lai sach.'
            : 'Da xoa du lieu save va tao lai diem bat dau Chuong 1.';
        });
        saveSystem.saveGame(nextSnapshot);
        setMenuStatus(
          canReplay
            ? 'Da xoa run hien tai. Cac ending da thay va di vat replay van duoc giu lai.'
            : 'Da xoa save hien tai va tao lai diem bat dau sach.'
        );
        this.scene.start(SCENE_KEYS.sect);
      }
    });

    createTextButton(this, {
      x: 188,
      y: exportY,
      width: 320,
      label: 'Xuat save JSON',
      detail: 'Tai ve save hien tai de luu hoac gui kem bug report',
      onClick: () => {
        const raw = saveSystem.exportCurrentSave();

        if (!raw) {
          setMenuStatus('Chua co save de xuat. Hay bat dau game truoc.');
          return;
        }

        const blob = new Blob([raw], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nhat-niem-khai-tong-${PLAYTEST_BUILD_ID}-save.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        setMenuStatus('Da tai save JSON. Neu gap loi, gui file nay kem mo ta buoc tai hien.');
      }
    });

    this.add.text(678, 118, 'Nen thu trong 15-20 phut dau', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '30px'
    });

    this.add.text(680, 174, [
      '1. Qua 1 ngay de thay tai nguyen, tong ket ngay, va event dau.',
      '2. Chon mot de tu de xem mood, loyalty, va nhiem vu.',
      '3. Mo panel Tu hanh va nhin tien do canh gioi.',
      '4. Dung hoac nang cap mot cong trinh cot loi.',
      '5. Vao Hau Son Coc, cham event spot, va tro ve voi phan thuong.',
      '6. Theo doi Muc tieu chuong de cam nhan Chuong 1 dang tien len.',
      '7. Neu thay khong ro phai lam gi, ghi lai panel hoac nut bam da gay khuc mac.'
    ], {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 10,
      wordWrap: { width: 476 }
    });

    this.add.text(680, 402, [
      `Trang thai save: ${saveSummary.source === 'none' ? 'chua co save' : saveSummary.source === 'backup' ? 'dang dung backup hop le' : 'co save chinh'}`,
      `Save version: v${snapshot.meta.saveVersion}`,
      `Ngay hien tai: ${snapshot.time.day}/${snapshot.time.month}/${snapshot.time.year}`,
      `Chuong hien tai: ${snapshot.story.currentChapterId}`,
      `Ket cuc base game: ${saveSummary.endingCompleted ? saveSummary.endingPath ?? 'da hoan tat' : 'chua dat'}`,
      `Da clear: ${replayMeta.totalClearCount} | Ending da thay: ${replayMeta.seenEndingIds.length === 0 ? 'chua co' : replayMeta.seenEndingIds.join(', ')}`,
      `Du am replay: ${replayModifier ? replayModifier.label : 'chua mo'}`,
      `Arc tiep theo: ${snapshot.expansion.nextArcId ?? 'chua mo'} | Layer tiep theo: ${snapshot.expansion.nextWorldLayerId ?? 'pham_gioi'}`,
      `Su kien da giai: ${snapshot.events.history.length} | Tham hiem da di: ${snapshot.exploration.totalRuns}`,
      'Feedback huu ich nhat: cho nao khong ro phai bam gi, event nao kho hieu, reward nao thay vo nghia, va bug nao lap lai duoc.'
    ], {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '17px',
      lineSpacing: 10,
      wordWrap: { width: 420 }
    });

    setMenuStatus(
      hasAnySave
        ? endingReached
          ? canReplay
            ? 'Save hien tai da khop mot ket cuc. Ban co the xem lai, vao Hanh trinh moi, hoac xoa run hien tai ma van giu tien trinh replay.'
            : 'Save hien tai da khop mot ket cuc base game. Huong mo rong ve sau da duoc danh dau trong state, nhung chua mo thanh noi dung choi duoc.'
          : canReplay
            ? 'Ban dang co save dang choi va da mo replay. Game moi la vong sach, con Hanh trinh moi la vong moi co giu mot du am nho.'
            : 'Co the Tiep tuc, Game moi, hoac Xoa du lieu save de bat dau vong moi.'
        : 'Chua co save truoc do. Bam Bat dau de vao diem bat dau Chuong 1.'
    );
  }
}
