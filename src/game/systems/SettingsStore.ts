export interface GameSettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiScale: number;
  animationEnabled: boolean;
  particlesEnabled: boolean;
  autoSaveEnabled: boolean;
  tutorialHintsEnabled: boolean;
}

const DEFAULT_SETTINGS_KEY = 'nhat-niem-khai-tong.settings';

export const DEFAULT_GAME_SETTINGS: GameSettingsState = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  uiScale: 1,
  animationEnabled: true,
  particlesEnabled: true,
  autoSaveEnabled: true,
  tutorialHintsEnabled: true
};

export class SettingsStore {
  constructor(private readonly storageKey = DEFAULT_SETTINGS_KEY) {}

  getSettings(): GameSettingsState {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return { ...DEFAULT_GAME_SETTINGS };
      }
      const parsed = JSON.parse(raw) as Partial<GameSettingsState>;
      return {
        masterVolume: this.clamp(parsed.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
        musicVolume: this.clamp(parsed.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
        sfxVolume: this.clamp(parsed.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
        uiScale: this.clamp(parsed.uiScale, DEFAULT_GAME_SETTINGS.uiScale, 0.85, 1.15),
        animationEnabled: parsed.animationEnabled ?? DEFAULT_GAME_SETTINGS.animationEnabled,
        particlesEnabled: parsed.particlesEnabled ?? DEFAULT_GAME_SETTINGS.particlesEnabled,
        autoSaveEnabled: parsed.autoSaveEnabled ?? DEFAULT_GAME_SETTINGS.autoSaveEnabled,
        tutorialHintsEnabled: parsed.tutorialHintsEnabled ?? DEFAULT_GAME_SETTINGS.tutorialHintsEnabled
      };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  saveSettings(partial: Partial<GameSettingsState>): GameSettingsState {
    const merged: GameSettingsState = {
      ...this.getSettings(),
      ...partial
    };
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch {
      // Ignore storage failures and still return merged defaults.
    }
    return merged;
  }

  resetSettings(): GameSettingsState {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(DEFAULT_GAME_SETTINGS));
    } catch {
      // Ignore storage failures in demo slice.
    }
    return { ...DEFAULT_GAME_SETTINGS };
  }

  private clamp(value: number | undefined, fallback: number, min = 0, max = 1): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }
}
