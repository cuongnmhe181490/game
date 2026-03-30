import Phaser from 'phaser';

import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createTextButton, drawInsetPanel, drawSceneFrame, menuPalette } from '@/game/ui';

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

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);
    drawInsetPanel(this, { x: 120, y: 78, width: 1040, height: 564, fill: menuPalette.panel, alpha: 0.92 });

    this.add.text(158, 108, 'Save Slots', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: '34px'
    });
    this.add.text(160, 154, 'Chon slot de tao, nap, ghi de, hoac xoa du lieu. Save cu se tu dong duoc dua vao slot 1 neu can.', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      wordWrap: { width: 920 }
    });

    const statusText = this.add.text(160, 578, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      wordWrap: { width: 900 }
    });

    const setStatus = (message: string): void => {
      statusText.setText(message);
    };

    slots.forEach((slot, index) => {
      const y = 208 + index * 120;
      drawInsetPanel(this, { x: 152, y, width: 976, height: 98, fill: menuPalette.panelAlt, alpha: 0.9 });
      this.add.text(176, y + 18, `Slot ${slot.slot}${slot.slot === currentSlot ? ' • Dang chon' : ''}`, {
        color: menuPalette.textStrong,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold'
      });
      this.add.text(176, y + 46, slot.hasSave
        ? `${slot.sectName ?? 'Thanh Huyen Mon'} • ${slot.realmId ?? 'chua ro canh gioi'} • Ngay ${slot.day ?? 1} • ${slot.endingCompleted ? 'Da ve dich' : 'Dang hanh trinh'}`
        : 'Slot trong. Co the tao save moi tu day.', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '14px',
        wordWrap: { width: 520 }
      });
      this.add.text(176, y + 68, slot.hasSave
        ? `Save v${slot.saveVersion ?? '?'} • Playtime ${slot.playtimeDays} ngay • Cap nhat ${slot.updatedAt ?? 'khong ro'}`
        : 'Chua co du lieu luu.', {
        color: menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        wordWrap: { width: 520 }
      });

      createTextButton(this, {
        x: 780,
        y: y + 28,
        width: 150,
        label: slot.hasSave ? 'Nap save' : 'Tao moi',
        detail: slot.hasSave ? 'Nap slot nay' : 'Bat dau tu Chuong 1',
        onClick: () => {
          const nextState = slot.hasSave
            ? saveStore.loadSlot(slot.slot)
            : saveStore.createNewSaveInSlot(slot.slot, `Da tao save moi o slot ${slot.slot}.`);
          stateManager.replace(nextState);
          if (returnScene !== SCENE_KEYS.mainMenu) {
            this.scene.stop(returnScene);
          }
          this.scene.start(SCENE_KEYS.sect);
        }
      });

      createTextButton(this, {
        x: 952,
        y: y + 28,
        width: 150,
        label: 'Ghi de',
        detail: 'Luu snapshot hien tai',
        onClick: () => {
          saveStore.setCurrentSlot(slot.slot);
          const payload = slot.hasSave ? stateManager.snapshot : createGameState();
          saveStore.saveGame(payload);
          setStatus(`Da ghi du lieu vao slot ${slot.slot}.`);
          this.scene.restart({ returnScene });
        }
      });

      createTextButton(this, {
        x: 866,
        y: y + 72,
        width: 150,
        label: 'Xoa slot',
        detail: slot.hasSave ? 'Xoa save va backup' : 'Khong co du lieu',
        onClick: () => {
          if (!slot.hasSave) {
            setStatus(`Slot ${slot.slot} dang trong.`);
            return;
          }
          saveStore.clearSlot(slot.slot);
          setStatus(`Da xoa slot ${slot.slot}.`);
          this.scene.restart({ returnScene });
        }
      });
    });

    createTextButton(this, {
      x: 240,
      y: 596,
      width: 180,
      label: 'Quay lai',
      detail: 'Ve menu truoc do',
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
    });
  }
}
