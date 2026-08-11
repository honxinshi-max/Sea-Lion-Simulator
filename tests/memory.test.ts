import { describe, expect, it } from 'vitest';
import { MemorySystem } from '../src/game/systems/MemorySystem';

const success = (objectId = 'button-1', now = 1_000) => ({
  objectId,
  objectType: 'button' as const,
  feature: 'circle',
  position: { x: 400, y: 420 },
  action: 'slap' as const,
  success: true,
  reward: 0.9,
  risk: 0.05,
  now,
  type: 'successfulAction' as const,
});

describe('MemorySystem', () => {
  it('strengthens and merges repeated successful experience', () => {
    const memory = new MemorySystem();
    const first = memory.remember(success());
    const second = memory.remember(success('button-1', 2_000));
    expect(memory.snapshot()).toHaveLength(1);
    expect(second.strength).toBeGreaterThan(first.strength);
    expect(second.uses).toBe(2);
    expect(second.lastUsedAt).toBe(2_000);
  });

  it('decays memories as simulated time passes', () => {
    const memory = new MemorySystem();
    const before = memory.remember(success()).strength;
    memory.decay(120);
    expect(memory.snapshot()[0]!.strength).toBeLessThan(before);
  });

  it('removes weak memories after enough decay', () => {
    const memory = new MemorySystem();
    memory.remember({ ...success(), success: false, reward: 0, risk: 0, type: 'failedAction' });
    memory.decay(10_000);
    expect(memory.snapshot()).toHaveLength(0);
  });

  it('never grows beyond fifty important memories', () => {
    const memory = new MemorySystem();
    for (let index = 0; index < 65; index += 1) {
      memory.remember({
        ...success(`fish-${index}`, index * 1_000),
        objectType: 'fish',
        feature: 'silver',
        action: 'hunt',
        type: 'foodLocation',
      });
    }
    expect(memory.snapshot()).toHaveLength(50);
    expect(memory.snapshot().some((entry) => entry.objectId === 'fish-64')).toBe(true);
  });

  it('returns relevant feature memories independent of old position', () => {
    const memory = new MemorySystem();
    memory.remember(success());
    const matches = memory.relevant({ objectType: 'button', feature: 'circle', action: 'slap' });
    expect(matches).toHaveLength(1);
    expect(matches[0]!.position).toEqual({ x: 400, y: 420 });
  });
});
