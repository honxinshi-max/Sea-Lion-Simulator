export type SynthEffect = 'splash' | 'bubble' | 'call' | 'eat' | 'button' | 'crate' | 'birthday';

export const SYNTH_EFFECTS: Record<SynthEffect, { frequency: number; duration: number; type: OscillatorType }> = {
  splash: { frequency: 150, duration: 0.18, type: 'sine' },
  bubble: { frequency: 420, duration: 0.12, type: 'sine' },
  call: { frequency: 230, duration: 0.42, type: 'sawtooth' },
  eat: { frequency: 560, duration: 0.1, type: 'triangle' },
  button: { frequency: 720, duration: 0.08, type: 'square' },
  crate: { frequency: 115, duration: 0.24, type: 'triangle' },
  birthday: { frequency: 880, duration: 0.55, type: 'sine' },
};

export class AudioSystem {
  private muted: boolean;
  private volume: number;
  private context?: AudioContext;

  constructor(settings: { muted: boolean; volume: number }) {
    this.muted = settings.muted;
    this.volume = clampUnit(settings.volume);
  }

  async unlock(): Promise<boolean> {
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) return false;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context ??= new AudioContextClass();
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }

  play(effect: SynthEffect): void {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const definition = SYNTH_EFFECTS[effect];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = definition.type;
    oscillator.frequency.setValueAtTime(definition.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, definition.frequency * 0.65), now + definition.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.volume * 0.2), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + definition.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + definition.duration + 0.02);
  }

  setVolume(value: number): void { this.volume = clampUnit(value); }
  toggleMute(): boolean { this.muted = !this.muted; return this.muted; }
  setMuted(value: boolean): void { this.muted = value; }
  settings(): { muted: boolean; volume: number } { return { muted: this.muted, volume: this.volume }; }
  canPlay(): boolean { return Boolean(this.context && this.context.state === 'running' && !this.muted); }
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
