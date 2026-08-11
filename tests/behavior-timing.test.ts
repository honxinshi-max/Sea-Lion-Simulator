import { describe, expect, it } from 'vitest';
import { PERSONALITY_PRESETS } from '../src/game/config/personality';
import { UtilityAISystem, type UtilityAIContext } from '../src/game/systems/UtilityAISystem';
import { createDefaultPhysiology } from '../src/game/systems/PhysiologySystem';

const makeContext = (oxygen: number, hunger: number, curiosity: number): UtilityAIContext => ({
  physiology: createDefaultPhysiology({ oxygen, hunger, curiosity, fear: 5, energy: 85 }),
  personality: PERSONALITY_PRESETS.curious,
  perception: {
    isUnderwater: true,
    isAtSurface: false,
    isOnLand: false,
    surfaceDistance: 120,
    nearestFish: { id: 'fish', position: { x: 400, y: 400 }, distance: 80, fleeing: false, relativeAngle: 0 },
    nearestNovelObject: {
      id: 'ring', type: 'ring', feature: 'blue', position: { x: 500, y: 400 }, distance: 90,
      novel: true, reward: 0, risk: 0, enabled: true,
    },
  },
  memoryInfluence: {},
  learnedReward: {},
});

describe('UtilityAISystem decision timing', () => {
  it('keeps a normal decision through its minimum duration', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const first = ai.decide(makeContext(90, 95, 10), 1_000);
    const second = ai.decide(makeContext(90, 10, 100), 1_200);
    expect(second.behavior).toBe(first.behavior);
    expect(second.startedAt).toBe(first.startedAt);
  });

  it('allows critical oxygen to interrupt another behavior', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const first = ai.decide(makeContext(90, 95, 10), 1_000);
    expect(first.behavior).not.toBe('surface');
    const emergency = ai.decide(makeContext(5, 95, 10), 1_100);
    expect(emergency.behavior).toBe('surface');
    expect(emergency.startedAt).toBe(1_100);
  });

  it('reconsiders after the lock and decision cooldown have elapsed', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const first = ai.decide(makeContext(90, 95, 10), 1_000);
    const later = ai.decide(makeContext(90, 5, 100), first.lockedUntil + 1);
    expect(later.startedAt).toBe(first.lockedUntil + 1);
    expect(later.behavior).not.toBe(first.behavior);
  });
});
