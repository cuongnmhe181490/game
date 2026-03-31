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
      title: 'Save Slots',
      subtitle: 'Quan ly du lieu hanh trinh',
      metaLine: 'Tao moi, nap, ghi de, hoac xoa tung khe luu.'
    });
    const panelWidth = shell.contentWidth;

    const frame = new PanelFrame(this, {
      x: shell.contentX,
      y: shell.contentY,
      width: panelWidth,
      height: shell.contentHeight,
      title: 'Danh sach khe luu',
      subtitle: 'Ba khe luu de choi thu, replay, va backup.'
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
      const slotY = index * 166;
      const slotFrame = new PanelFrame(this, {
        x: 0,
        y: slotY,
        width: panelWidth - 36,
        height: 152,
        title: `Slot ${slot.slot}${slot.slot === currentSlot ? ' • dang chon' : ''}`,
        subtitle: slot.hasSave
          ? `${slot.sectName ?? 'Thanh Huyen Mon'} • ${slot.realmId ?? 'chua ro canh gioi'} • Ngay ${slot.day ?? 1}`
          : 'Slot trong. Co the tao save moi tu day.'
      });
      frame.content.add(slotFrame.root);

      slotFrame.content.add(this.add.text(
        0,
        0,
        slot.hasSave ? `Save v${slot.saveVersion ?? '?'} • Playtime ${slot.playtimeDays} ngay` : 'Chua co du lieu luu.',
        {
          color: menuPalette.textMuted,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '11px',
          wordWrap: { width: panelWidth - 72 }
        }
      ));

      slotFrame.content.add(this.add.text(
        0,
        18,
        slot.hasSave
          ? `${slot.endingCompleted ? 'Da ve dich' : 'Dang hanh trinh'} • ${slot.updatedAt ?? 'Khong ro thoi diem luu'}`
          : 'Co the bat dau tu Chuong 1.',
        {
          color: menuPalette.accentText,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '11px',
          wordWrap: { width: panelWidth - 72 }
        }
      ));

      slotFrame.content.add(
        createPrimaryButton(this, {
          width: 96,
          label: slot.hasSave ? 'Nap save' : 'Tao moi',
          detail: slot.hasSave ? 'Mo tien trinh' : 'Khoi tao run',
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
        }).setPosition(0, 56)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: 96,
          label: 'Ghi de',
          detail: 'Luu hien tai',
          onClick: () => {
            saveStore.setCurrentSlot(slot.slot);
            const payload = slot.hasSave ? stateManager.snapshot : createGameState();
            saveStore.saveGame(payload);
            setStatus(`Da ghi du lieu vao slot ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(108, 56)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: 96,
          label: 'Xoa slot',
          detail: slot.hasSave ? 'Lam trong slot' : 'Slot dang trong',
          onClick: () => {
            if (!slot.hasSave) {
              setStatus(`Slot ${slot.slot} dang trong.`);
              return;
            }
            saveStore.clearSlot(slot.slot);
            setStatus(`Da xoa slot ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(216, 56)
      );
    });

    statusText.setPosition(0, 514);
    frame.content.add(statusText);

    frame.content.add(
      createSecondaryButton(this, {
        width: 156,
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
      }).setPosition(94, 566)
    );
  }
}
