import Phaser from 'phaser';

const AUDIO_MUTED_STORAGE_KEY = 'nhat-niem-khai-tong.audio-muted';

type FeedbackCue =
  | 'ui-hover'
  | 'ui-confirm'
  | 'ui-open'
  | 'ui-close'
  | 'ui-invalid'
  | 'attack'
  | 'event-open'
  | 'event-major'
  | 'event-resolve'
  | 'cultivation-gain'
  | 'breakthrough-ready'
  | 'breakthrough-success'
  | 'reward'
  | 'rare-reward'
  | 'damage'
  | 'enemy-defeat'
  | 'boss-defeat'
  | 'chapter'
  | 'map-unlock';

interface ToneStep {
  delayMs: number;
  durationMs: number;
  frequency: number;
  volume: number;
  type?: OscillatorType;
}

const CUE_PATTERNS: Record<FeedbackCue, ToneStep[]> = {
  'ui-hover': [{ delayMs: 0, durationMs: 24, frequency: 540, volume: 0.018, type: 'triangle' }],
  'ui-confirm': [
    { delayMs: 0, durationMs: 26, frequency: 420, volume: 0.03, type: 'triangle' },
    { delayMs: 28, durationMs: 40, frequency: 610, volume: 0.022, type: 'sine' }
  ],
  'ui-open': [
    { delayMs: 0, durationMs: 36, frequency: 320, volume: 0.024, type: 'triangle' },
    { delayMs: 38, durationMs: 62, frequency: 470, volume: 0.018, type: 'sine' }
  ],
  'ui-close': [{ delayMs: 0, durationMs: 34, frequency: 280, volume: 0.018, type: 'sine' }],
  'ui-invalid': [
    { delayMs: 0, durationMs: 28, frequency: 220, volume: 0.026, type: 'square' },
    { delayMs: 30, durationMs: 34, frequency: 180, volume: 0.02, type: 'square' }
  ],
  attack: [{ delayMs: 0, durationMs: 30, frequency: 180, volume: 0.028, type: 'sawtooth' }],
  'event-open': [
    { delayMs: 0, durationMs: 42, frequency: 250, volume: 0.022, type: 'triangle' },
    { delayMs: 46, durationMs: 80, frequency: 360, volume: 0.016, type: 'sine' }
  ],
  'event-major': [
    { delayMs: 0, durationMs: 60, frequency: 196, volume: 0.028, type: 'triangle' },
    { delayMs: 68, durationMs: 88, frequency: 294, volume: 0.024, type: 'triangle' },
    { delayMs: 160, durationMs: 96, frequency: 392, volume: 0.018, type: 'sine' }
  ],
  'event-resolve': [
    { delayMs: 0, durationMs: 40, frequency: 392, volume: 0.02, type: 'triangle' },
    { delayMs: 44, durationMs: 52, frequency: 494, volume: 0.018, type: 'sine' }
  ],
  'cultivation-gain': [
    { delayMs: 0, durationMs: 40, frequency: 420, volume: 0.022, type: 'sine' },
    { delayMs: 44, durationMs: 60, frequency: 560, volume: 0.018, type: 'triangle' }
  ],
  'breakthrough-ready': [
    { delayMs: 0, durationMs: 70, frequency: 330, volume: 0.024, type: 'triangle' },
    { delayMs: 80, durationMs: 90, frequency: 494, volume: 0.022, type: 'triangle' }
  ],
  'breakthrough-success': [
    { delayMs: 0, durationMs: 62, frequency: 330, volume: 0.03, type: 'triangle' },
    { delayMs: 68, durationMs: 72, frequency: 494, volume: 0.026, type: 'triangle' },
    { delayMs: 144, durationMs: 102, frequency: 660, volume: 0.024, type: 'sine' }
  ],
  reward: [
    { delayMs: 0, durationMs: 32, frequency: 460, volume: 0.022, type: 'triangle' },
    { delayMs: 36, durationMs: 44, frequency: 620, volume: 0.018, type: 'sine' }
  ],
  'rare-reward': [
    { delayMs: 0, durationMs: 36, frequency: 420, volume: 0.024, type: 'triangle' },
    { delayMs: 40, durationMs: 46, frequency: 560, volume: 0.022, type: 'triangle' },
    { delayMs: 90, durationMs: 86, frequency: 760, volume: 0.018, type: 'sine' }
  ],
  damage: [
    { delayMs: 0, durationMs: 24, frequency: 150, volume: 0.03, type: 'square' },
    { delayMs: 26, durationMs: 42, frequency: 120, volume: 0.02, type: 'square' }
  ],
  'enemy-defeat': [{ delayMs: 0, durationMs: 48, frequency: 250, volume: 0.024, type: 'sawtooth' }],
  'boss-defeat': [
    { delayMs: 0, durationMs: 44, frequency: 220, volume: 0.032, type: 'triangle' },
    { delayMs: 50, durationMs: 74, frequency: 330, volume: 0.028, type: 'triangle' },
    { delayMs: 130, durationMs: 120, frequency: 494, volume: 0.022, type: 'sine' }
  ],
  chapter: [
    { delayMs: 0, durationMs: 54, frequency: 262, volume: 0.03, type: 'triangle' },
    { delayMs: 60, durationMs: 68, frequency: 392, volume: 0.026, type: 'triangle' },
    { delayMs: 136, durationMs: 104, frequency: 523, volume: 0.02, type: 'sine' }
  ],
  'map-unlock': [
    { delayMs: 0, durationMs: 42, frequency: 294, volume: 0.024, type: 'triangle' },
    { delayMs: 46, durationMs: 60, frequency: 440, volume: 0.02, type: 'triangle' },
    { delayMs: 110, durationMs: 86, frequency: 660, volume: 0.018, type: 'sine' }
  ]
};

const CUE_COOLDOWNS_MS: Partial<Record<FeedbackCue, number>> = {
  'ui-hover': 90,
  attack: 70,
  'enemy-defeat': 70,
  reward: 90
};

type BrowserAudioContext = typeof AudioContext;

function getAudioContextConstructor(): BrowserAudioContext | null {
  const scopedWindow = window as {
    webkitAudioContext?: BrowserAudioContext;
  };

  return globalThis.AudioContext ?? scopedWindow.webkitAudioContext ?? null;
}

export class FeedbackSystem {
  private audioContext: AudioContext | null = null;
  private unlocked = false;
  private muted = false;
  private masterVolume = 0.8;
  private sfxVolume = 0.8;
  private readonly lastPlayedAt = new Map<FeedbackCue, number>();

  constructor(private readonly mutedStorageKey = AUDIO_MUTED_STORAGE_KEY) {
    this.muted = this.readMutedPreference();
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    this.writeMutedPreference(this.muted);
    return this.muted;
  }

  setVolumePreferences(masterVolume: number, sfxVolume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
  }

  unlockAudio(): void {
    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume()
        .then(() => {
          this.unlocked = context.state === 'running';
        })
        .catch(() => {
          this.unlocked = false;
        });
      return;
    }

    this.unlocked = context.state === 'running';
  }

  play(cue: FeedbackCue): void {
    if (this.muted) {
      return;
    }

    const context = this.getAudioContext();

    if (!context || !this.unlocked || context.state !== 'running') {
      return;
    }

    const now = performance.now();
    const cooldown = CUE_COOLDOWNS_MS[cue] ?? 0;
    const lastPlayedAt = this.lastPlayedAt.get(cue) ?? 0;

    if (cooldown > 0 && now - lastPlayedAt < cooldown) {
      return;
    }

    this.lastPlayedAt.set(cue, now);

    for (const step of CUE_PATTERNS[cue]) {
      this.scheduleTone(context, step);
    }
  }

  pulse(target: Phaser.GameObjects.Container | Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle, scene: Phaser.Scene, amount = 0.02, duration = 120): void {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({
      targets: target,
      scaleX: 1 + amount,
      scaleY: 1 + amount,
      duration,
      ease: 'Quad.Out',
      yoyo: true
    });
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const ContextConstructor = getAudioContextConstructor();

    if (!ContextConstructor) {
      return null;
    }

    try {
      this.audioContext = new ContextConstructor();
      this.unlocked = this.audioContext.state === 'running';
      return this.audioContext;
    } catch {
      this.audioContext = null;
      return null;
    }
  }

  private scheduleTone(context: AudioContext, step: ToneStep): void {
    const startAt = context.currentTime + step.delayMs / 1000;
    const endAt = startAt + step.durationMs / 1000;
    const gain = context.createGain();
    const oscillator = context.createOscillator();

    oscillator.type = step.type ?? 'sine';
    oscillator.frequency.setValueAtTime(step.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    const finalVolume = Math.max(0.0001, step.volume * this.masterVolume * this.sfxVolume);
    gain.gain.linearRampToValueAtTime(finalVolume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.015);
  }

  private readMutedPreference(): boolean {
    try {
      return window.localStorage.getItem(this.mutedStorageKey) === '1';
    } catch {
      return false;
    }
  }

  private writeMutedPreference(muted: boolean): void {
    try {
      window.localStorage.setItem(this.mutedStorageKey, muted ? '1' : '0');
    } catch {
      // Ignore preference persistence failures in the demo slice.
    }
  }
}
