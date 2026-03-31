import Phaser from 'phaser';

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

export class SaveSlotsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.saveSlots);
  }

  create(data?: { returnScene?: string }): void {
    const returnScene = data?.returnScene ?? SCENE_KEYS.mainMenu;
    const saveStore = getSaveStore(this);
    const stateManager = getStateManager(this);
    const slots = saveStore.listSaveSlots();
    const currentSlot = saveStore.getCurrentSlot();

    const shell = new EntryShell(this, {
      title: 'Quản lý Tiến trình',
      subtitle: 'Sao lưu dữ liệu hành trình',
      metaLine: 'Tạo mới, nạp, ghi đè, hoặc xóa từng ô lưu.'
    });
    const panelWidth = shell.contentWidth;

    const frame = new PanelFrame(this, {
      x: shell.contentX,
      y: shell.contentY,
      width: panelWidth,
      height: shell.contentHeight,
      title: 'Danh sách ô lưu',
      subtitle: 'Ba ô lưu để trải nghiệm thử, replay, và dự phòng an toàn.'
    });
    this.add.existing(frame.root);

    const statusText = this.add.text(0, 0, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px',
      wordWrap: { width: panelWidth - 36 }
    });

    const setStatus = (message: string): void => {
      statusText.setText(message);
    };

    const buttonWidth = Math.floor((panelWidth - 76) / 3);
    const slotWidth = panelWidth - 36;
    const slotHeight = 176;
    const slotStep = 180;

    slots.forEach((slot, index) => {
      const slotY = index * slotStep;
      const slotTitle = `Ô ${slot.slot}${slot.slot === currentSlot ? ' • Đang chọn' : ''}`;
      const slotFrame = new PanelFrame(this, {
        x: 0,
        y: slotY,
        width: slotWidth,
        height: slotHeight,
        title: slotTitle
      });
      frame.content.add(slotFrame.root);

      const realmLabel = slot.realmId ? (REALM_LABELS[slot.realmId] ?? slot.realmId.replace(/_/g, ' ')) : 'Phàm Thể';
      const lineOne = slot.hasSave
        ? `${slot.sectName ?? 'Thanh Huyền Môn'} • ${realmLabel} • Ngày ${slot.day ?? 1}`
        : 'Ô trống. Có thể khởi tạo hành trình mới ngay tại đây.';
      const lineTwo = slot.hasSave
        ? `Bản lưu ${slot.saveVersion ?? '?'} • Chơi ${slot.playtimeDays} ngày • ${slot.endingCompleted ? 'Đã hiển thánh' : 'Đang hành trình'}`
        : 'Chưa có dữ liệu nào. Bắt đầu từ Chương 1.';

      slotFrame.content.add(this.add.text(0, 0, lineOne, {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: slotWidth - 36 }
      }));

      slotFrame.content.add(this.add.text(0, 20, lineTwo, {
        color: menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: slotWidth - 36 }
      }));

      const btnY = 48;

      slotFrame.content.add(
        createPrimaryButton(this, {
          width: buttonWidth,
          height: 44,
          label: slot.hasSave ? 'Tải game' : 'Tạo mới',
          detail: slot.hasSave ? 'Mở tiến trình' : 'Bắt đầu mới',
          onClick: () => {
            const nextState = slot.hasSave
              ? saveStore.loadSlot(slot.slot)
              : saveStore.createNewSaveInSlot(slot.slot, `Đã tạo save mới ở ô ${slot.slot}.`);
            stateManager.replace(nextState);
            if (returnScene !== SCENE_KEYS.mainMenu) {
              this.scene.stop(returnScene);
            }
            this.scene.start(SCENE_KEYS.sect);
          }
        }).setPosition(0, btnY)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: buttonWidth,
          height: 44,
          label: 'Ghi đè',
          detail: 'Lưu đè trạng thái',
          onClick: () => {
            saveStore.setCurrentSlot(slot.slot);
            const payload = slot.hasSave ? stateManager.snapshot : createGameState();
            saveStore.saveGame(payload);
            setStatus(`Đã ghi toàn bộ dữ liệu vào ô ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(buttonWidth + 10, btnY)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: buttonWidth,
          height: 44,
          label: 'Xóa ô',
          detail: 'Dọn trống tiến trình',
          onClick: () => {
            if (!slot.hasSave) {
              setStatus(`Ô ${slot.slot} hiện tại đang trống.`);
              return;
            }
            saveStore.clearSlot(slot.slot);
            setStatus(`Đã xóa hoàn toàn ô ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition((buttonWidth + 10) * 2, btnY)
      );
    });

    statusText.setPosition(0, 548);
    frame.content.add(statusText);

    frame.content.add(
      createSecondaryButton(this, {
        width: 156,
        label: 'Quay lại',
        detail: 'Về trình đơn trước',
        onClick: () => {
          if (returnScene === SCENE_KEYS.mainMenu) {
            this.scene.start(returnScene);
            return;
          }

          if (this.scene.isPaused(returnScene)) {
            this.scene.resume(returnScene);
          }

          this.scene.stop();
        }
      }).setPosition(panelWidth - 174, 572)
    );
  }
}
