import { describe, expect, it } from 'vitest';
import { AudioSystem, SYNTH_EFFECTS } from '../src/game/systems/AudioSystem';

describe('AudioSystem preferences', () => {
  it('defines every required synthesized effect without remote files', () => {
    expect(Object.keys(SYNTH_EFFECTS).sort()).toEqual(['birthday', 'bubble', 'button', 'call', 'crate', 'eat', 'splash']);
    expect(Object.values(SYNTH_EFFECTS).every((effect) => effect.frequency > 0 && effect.duration > 0)).toBe(true);
  });

  it('clamps volume and honors mute before audio is unlocked', () => {
    const audio = new AudioSystem({ muted: false, volume: 0.5 });
    audio.setVolume(4);
    expect(audio.settings()).toEqual({ muted: false, volume: 1 });
    audio.toggleMute();
    expect(audio.settings().muted).toBe(true);
    expect(audio.canPlay()).toBe(false);
  });
});
