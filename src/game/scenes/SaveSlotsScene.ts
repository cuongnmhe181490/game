import Phaser from 'phaser';

import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createTextButton, drawSceneFrame, PanelFrame, menuPalette } from '@/game/ui';

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

    const { width, height } = this.scale;
    const shellWidth = Math.min(430, width - 32);
    const shellHeight = Math.min(844, height - 24);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);
    const panelWidth = shellWidth - 32;

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);

    const shell = this.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(shellX + 10, shellY + 10, shellWidth - 20, shellHeight - 20, 28);

    const frame = new PanelFrame(this, {
      x: shellX + 16,
      y: shellY + 24,
      width: panelWidth,
      height: shellHeight - 48,
      title: 'Save slots',
      subtitle: 'Chọn slot để tạo, nạp, ghi đè, hoặc xóa dữ liệu.'
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

    slots.forEach((slot, index) => {
      const slotY = index * 170;
      const slotFrame = new PanelFrame(this, {
        x: 0,
        y: slotY,
        width: panelWidth - 36,
        height: 156,
        title: `Slot ${slot.slot}${slot.slot === currentSlot ? ' • đang chọn' : ''}`,
        subtitle: slot.hasSave
          ? `${slot.sectName ?? 'Thanh Huyền Môn'} • ${slot.realmId ?? 'chưa rõ cảnh giới'} • Ngày ${slot.day ?? 1}`
          : 'Slot trống. Có thể tạo save mới từ đây.'
      });
      frame.content.add(slotFrame.root);

      slotFrame.content.add(this.add.text(0, 0, slot.hasSave
        ? `Save v${slot.saveVersion ?? '?'} • Playtime ${slot.playtimeDays} ngày`
        : 'Chưa có dữ liệu lưu.', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: panelWidth - 72 }
      }));

      slotFrame.content.add(this.add.text(0, 18, slot.hasSave
        ? `${slot.endingCompleted ? 'Đã về đích' : 'Đang hành trình'} • ${slot.updatedAt ?? 'Không rõ thời điểm lưu'}`
        : 'Có thể bắt đầu từ Chương 1.', {
        color: menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: panelWidth - 72 }
      }));

      slotFrame.content.add(createTextButton(this, {
        x: 78,
        y: 74,
        width: 140,
        label: slot.hasSave ? 'Nạp save' : 'Tạo mới',
        detail: slot.hasSave ? 'Mở slot này' : 'Bắt đầu Chương 1',
        onClick: () => {
          const nextState = slot.hasSave
            ? saveStore.loadSlot(slot.slot)
            : saveStore.createNewSaveInSlot(slot.slot, `Đã tạo save mới ở slot ${slot.slot}.`);
          stateManager.replace(nextState);
          if (returnScene !== SCENE_KEYS.mainMenu) {
            this.scene.stop(returnScene);
          }
          this.scene.start(SCENE_KEYS.sect);
        }
      }));

      slotFrame.content.add(createTextButton(this, {
        x: 232,
        y: 74,
        width: 140,
        label: 'Ghi đè',
        detail: 'Lưu snapshot hiện tại',
        onClick: () => {
          saveStore.setCurrentSlot(slot.slot);
          const payload = slot.hasSave ? stateManager.snapshot : createGameState();
          saveStore.saveGame(payload);
          setStatus(`Đã ghi dữ liệu vào slot ${slot.slot}.`);
          this.scene.restart({ returnScene });
        }
      }));

      slotFrame.content.add(createTextButton(this, {
        x: 154,
        y: 118,
        width: 140,
        label: 'Xóa slot',
        detail: slot.hasSave ? 'Xóa save và backup' : 'Slot đang trống',
        onClick: () => {
          if (!slot.hasSave) {
            setStatus(`Slot ${slot.slot} đang trống.`);
            return;
          }
          saveStore.clearSlot(slot.slot);
          setStatus(`Đã xóa slot ${slot.slot}.`);
          this.scene.restart({ returnScene });
        }
      }));
    });

    statusText.setPosition(0, 536);
    frame.content.add(statusText);

    frame.content.add(createTextButton(this, {
      x: 154,
      y: 620,
      width: 156,
      label: 'Quay lại',
      detail: 'Về menu trước đó',
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
    }));
  }
}
