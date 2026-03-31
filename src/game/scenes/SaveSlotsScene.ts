import Phaser from 'phaser';

import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createPrimaryButton, createSecondaryButton, EntryShell, PanelFrame, menuPalette } from '@/game/ui';

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

    const buttonWidth = Math.floor((panelWidth - 60) / 3);

    slots.forEach((slot, index) => {
      const slotY = index * 180;
      const slotFrame = new PanelFrame(this, {
        x: 0,
        y: slotY,
        width: panelWidth - 36,
        height: 176,
        title: `Ô ${slot.slot}${slot.slot === currentSlot ? ' • Đang chọn' : ''}`,
        subtitle: slot.hasSave
          ? `${slot.sectName ?? 'Thanh Huyền Môn'} • ${slot.realmId ? slot.realmId.replace(/_/g, ' ') : 'Chưa rõ'} • Ngày ${slot.day ?? 1}`
          : 'Ô trống. Có thể khởi tạo hành trình mới ngay tại đây.'
      });
      frame.content.add(slotFrame.root);

      slotFrame.content.add(this.add.text(
        0,
        0,
        slot.hasSave ? `Bản lưu ${slot.saveVersion ?? '?'} • Chơi ${slot.playtimeDays} ngày` : 'Chưa có dữ liệu nào.',
        {
          color: menuPalette.textMuted,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '11px',
          wordWrap: { width: panelWidth - 72 }
        }
      ));

      slotFrame.content.add(this.add.text(
        0,
        16,
        slot.hasSave
          ? `${slot.endingCompleted ? 'Đã hiển thánh' : 'Đang hành trình'} • ${slot.updatedAt ?? 'Chưa rõ hiện trạng'}`
          : 'Bắt đầu từ Chương 1.',
        {
          color: menuPalette.accentText,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '11px',
          wordWrap: { width: panelWidth - 72 }
        }
      ));

      const btnY = 32;

      slotFrame.content.add(
        createPrimaryButton(this, {
          width: buttonWidth,
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
        }).setPosition(10, btnY)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: buttonWidth,
          label: 'Ghi đè',
          detail: 'Lưu đè trạng thái',
          onClick: () => {
            saveStore.setCurrentSlot(slot.slot);
            const payload = slot.hasSave ? stateManager.snapshot : createGameState();
            saveStore.saveGame(payload);
            setStatus(`Đã ghi toàn bộ dữ liệu vào ô ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(10 + buttonWidth + 8, btnY)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: buttonWidth,
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
        }).setPosition(10 + (buttonWidth + 8) * 2, btnY)
      );
    });

    statusText.setPosition(0, 560);
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
      }).setPosition(panelWidth - 36 - 156 + 18, 552)
    );
  }
}
