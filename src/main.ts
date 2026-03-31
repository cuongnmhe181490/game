import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
const bootShell = document.querySelector<HTMLDivElement>('#app-shell');

let startupResolved = false;

function hideBootShell(): void {
  bootShell?.setAttribute('hidden', 'true');
}

function renderBootError(message: string, detail?: string): void {
  if (startupResolved) {
    return;
  }

  startupResolved = true;

  if (!root) {
    document.body.innerHTML = `
      <section class="boot-error" role="alert" aria-live="assertive">
        <h1>Không thể mở sơn môn</h1>
        <p>${message}</p>
        <p class="boot-error-detail">${detail ?? 'DOM root không hợp lệ cho bản build hiện tại.'}</p>
      </section>
    `;
    return;
  }

  hideBootShell();
  root.innerHTML = `
    <section class="boot-error" role="alert" aria-live="assertive">
      <h1>Không thể mở sơn môn</h1>
      <p>${message}</p>
      <p class="boot-error-detail">${detail ?? 'Hãy tải lại trang. Nếu lỗi lặp lại, hãy xóa save hiện tại trong trình duyệt hoặc báo lại kèm build label.'}</p>
    </section>
  `;
}

function resolveBootSuccess(): void {
  if (startupResolved) {
    return;
  }

  startupResolved = true;
  hideBootShell();
  window.removeEventListener('error', handleStartupError);
  window.removeEventListener('unhandledrejection', handleStartupRejection);
}

function getErrorDetail(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === 'string') {
    return reason;
  }

  return 'Lỗi khởi động không xác định.';
}

function handleStartupError(event: ErrorEvent): void {
  if (startupResolved) {
    return;
  }

  renderBootError('Game gặp lỗi khi tải bundle client.', getErrorDetail(event.error ?? event.message));
}

function handleStartupRejection(event: PromiseRejectionEvent): void {
  if (startupResolved) {
    return;
  }

  renderBootError('Game gặp lỗi khi khởi động promise đầu vào.', getErrorDetail(event.reason));
}

window.addEventListener('error', handleStartupError);
window.addEventListener('unhandledrejection', handleStartupRejection);

async function bootstrap(): Promise<void> {
  try {
    if (!root) {
      throw new Error('Missing #app root element.');
    }

    const [{ default: Phaser }, { createGameConfig }, { GameStateManager }, { SaveSystem }] = await Promise.all([
      import('phaser'),
      import('@/game/config/gameConfig'),
      import('@/game/state/GameStateManager'),
      import('@/game/systems/LocalSaveStore')
    ]);

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

    if (import.meta.env.DEV) {
      (window as typeof window & { __NNKT_GAME__?: Phaser.Game }).__NNKT_GAME__ = game;
    }

    resolveBootSuccess();

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        saveSystem.stopAutosave();
        game.destroy(true);
      });
    }
  } catch (error) {
    renderBootError(
      'Bản build vẫn tải được, nhưng game gặp lỗi trong lúc khởi động.',
      getErrorDetail(error)
    );
  }
}

void bootstrap();
