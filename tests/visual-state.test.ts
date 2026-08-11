import { describe, expect, it } from 'vitest';
import { seaLionScaleFor } from '../src/game/entities/SeaLionVisual';

describe('sea-lion visual state', () => {
  it('uses an absolute action scale that cannot accumulate frame by frame', () => {
    const first = seaLionScaleFor('huntFish', -1, 0);
    const next = seaLionScaleFor('huntFish', -1, 1_000);
    expect(first).toEqual({ x: -1.03, y: 0.97 });
    expect(next).toEqual({ x: -1.03, y: 0.97 });
  });

  it('keeps escape pulsing bounded around the facing direction', () => {
    for (let phase = 0; phase < 20; phase += 1) {
      const scale = seaLionScaleFor('escape', 1, phase);
      expect(scale.x).toBe(1);
      expect(scale.y).toBeGreaterThanOrEqual(0.9);
      expect(scale.y).toBeLessThanOrEqual(0.99);
    }
  });
});
