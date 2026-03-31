import Phaser from 'phaser';

import { getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import { createPrimaryButton, createSecondaryButton, drawSceneFrame, PanelFrame, menuPalette } from '@/game/ui';

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
      subtitle: 'Chon slot de tao, nap, ghi de, hoac xoa du lieu.'
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
        title: `Slot ${slot.slot}${slot.slot === currentSlot ? ' • dang chon' : ''}`,
        subtitle: slot.hasSave
          ? `${slot.sectName ?? 'Thanh Huyen Mon'} • ${slot.realmId ?? 'chua ro canh gioi'} • Ngay ${slot.day ?? 1}`
          : 'Slot trong. Co the tao save moi tu day.'
      });
      frame.content.add(slotFrame.root);

      slotFrame.content.add(this.add.text(0, 0,
        slot.hasSave ? `Save v${slot.saveVersion ?? '?'} • Playtime ${slot.playtimeDays} ngay` : 'Chua co du lieu luu.',
        {
          color: menuPalette.textMuted,
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
          fontSize: '11px',
          wordWrap: { width: panelWidth - 72 }
        }
      ));

      slotFrame.content.add(this.add.text(0, 18,
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
          width: 140,
          label: slot.hasSave ? 'Nap save' : 'Tao moi',
          detail: slot.hasSave ? 'Mo slot nay' : 'Bat dau Chuong 1',
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
        }).setPosition(16, 74)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: 140,
          label: 'Ghi de',
          detail: 'Luu snapshot hien tai',
          onClick: () => {
            saveStore.setCurrentSlot(slot.slot);
            const payload = slot.hasSave ? stateManager.snapshot : createGameState();
            saveStore.saveGame(payload);
            setStatus(`Da ghi du lieu vao slot ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(172, 74)
      );

      slotFrame.content.add(
        createSecondaryButton(this, {
          width: 140,
          label: 'Xoa slot',
          detail: slot.hasSave ? 'Xoa save va backup' : 'Slot dang trong',
          onClick: () => {
            if (!slot.hasSave) {
              setStatus(`Slot ${slot.slot} dang trong.`);
              return;
            }
            saveStore.clearSlot(slot.slot);
            setStatus(`Da xoa slot ${slot.slot}.`);
            this.scene.restart({ returnScene });
          }
        }).setPosition(94, 118)
      );
    });

    statusText.setPosition(0, 536);
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
      }).setPosition(94, 620)
    );
  }
}
