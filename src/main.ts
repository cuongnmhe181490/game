import Phaser from 'phaser';

import './style.css';

import { createGameConfig } from '@/game/config/gameConfig';
import { GameStateManager } from '@/game/state/GameStateManager';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

const root = document.querySelector<HTMLDivElement>('#app');
const bootShell = document.querySelector<HTMLDivElement>('#app-shell');

function hideBootShell(): void {
  bootShell?.setAttribute('hidden', 'true');
}

function renderBootError(message: string, detail?: string): void {
  if (!root) {
    document.body.innerHTML = `
      <section class="boot-error" role="alert" aria-live="assertive">
        <h1>Khong the mo son mon</h1>
        <p>${message}</p>
        <p class="boot-error-detail">${detail ?? 'DOM root khong hop le cho ban build hien tai.'}</p>
      </section>
    `;
    return;
  }

  hideBootShell();
  root.innerHTML = `
    <section class="boot-error" role="alert" aria-live="assertive">
      <h1>Khong the mo son mon</h1>
      <p>${message}</p>
      <p class="boot-error-detail">${detail ?? 'Hay tai lai trang. Neu loi lap lai, hay xoa save hien tai trong trinh duyet hoac bao lai kem build label.'}</p>
    </section>
  `;
}

try {
  if (!root) {
    throw new Error('Missing #app root element.');
  }

  const saveSystem = new SaveSystem();
  const bootState = saveSystem.loadSave();
  const loadNotice = saveSystem.consumeLastNotice();

  if (loadNotice) {
    bootState.ui.statusMessage = loadNotice;
  }

  const stateManager = new GameStateManager(bootState);

  saveSystem.saveGame(stateManager.snapshot);
  saveSystem.startAutosave(() => stateManager.snapshot);

  const game = new Phaser.Game(createGameConfig(root, stateManager, saveSystem));
  hideBootShell();

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      saveSystem.stopAutosave();
      game.destroy(true);
    });
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : 'Loi khoi dong khong xac dinh.';
  renderBootError(
    'Ban build van tai duoc, nhung game gap loi trong luc khoi dong.',
    detail
  );
}
