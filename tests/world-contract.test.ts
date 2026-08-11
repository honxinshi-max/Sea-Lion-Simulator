import { describe, expect, it } from 'vitest';
import { WORLD_LAYOUT, zoneAt } from '../src/game/GameConfig';
import { behaviorPresentation } from '../src/game/behaviors/Behavior';

describe('world and behavior visual contracts', () => {
  it('contains surface, shallow, deep, seabed, land and experiment platform zones', () => {
    expect(WORLD_LAYOUT.width).toBe(1_600);
    expect(WORLD_LAYOUT.waterSurfaceY).toBe(215);
    expect(zoneAt(180, 180)).toBe('land');
    expect(zoneAt(480, 300)).toBe('shallow');
    expect(zoneAt(1_200, 620)).toBe('deep');
    expect(zoneAt(900, 800)).toBe('seabed');
    expect(WORLD_LAYOUT.experimentPlatform.x).toBeGreaterThan(1_000);
  });

  it('gives important behaviors distinct visible presentations', () => {
    expect(behaviorPresentation('surface').label).toBe('上浮呼吸');
    expect(behaviorPresentation('huntFish').animation).toBe('lunge');
    expect(behaviorPresentation('rest').animation).toBe('float');
    expect(behaviorPresentation('escape').animation).toBe('startled');
    expect(behaviorPresentation('slap').animation).toBe('flipper-slap');
  });
});
