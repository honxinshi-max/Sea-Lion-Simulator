import { describe, expect, it } from 'vitest';
import { InteractionSystem } from '../src/game/systems/InteractionSystem';
import { LearningSystem } from '../src/game/systems/LearningSystem';
import { MemorySystem } from '../src/game/systems/MemorySystem';
import { createDefaultPhysiology } from '../src/game/systems/PhysiologySystem';
import type { WorldObjectSnapshot } from '../src/game/types';

const circleButton = (reward: number): WorldObjectSnapshot => ({
  id: 'button-circle',
  type: 'button',
  feature: 'circle',
  position: { x: 600, y: 420 },
  novel: true,
  reward,
  risk: 0,
  distance: 40,
  enabled: true,
});

describe('InteractionSystem', () => {
  it('turns a rewarded slap into learning, memory, food and trust', () => {
    const memory = new MemorySystem();
    const learning = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    const interaction = new InteractionSystem(memory, learning, () => 0.1);
    const result = interaction.resolve({
      object: circleButton(1),
      action: 'slap',
      physiology: createDefaultPhysiology({ hunger: 80, trust: 40 }),
      now: 1_000,
      speed: 120,
    });
    expect(result.success).toBe(true);
    expect(result.physiology.hunger).toBeLessThan(80);
    expect(result.physiology.trust).toBeGreaterThan(40);
    expect(result.learned.value).toBeGreaterThan(0);
    expect(memory.snapshot()[0]!.type).toBe('successfulAction');
  });

  it('reduces an old button value when the same action stops rewarding', () => {
    const memory = new MemorySystem();
    const learning = new LearningSystem({ learningRate: 0.35, explorationRate: 0.2 });
    const interaction = new InteractionSystem(memory, learning, () => 0.2);
    interaction.resolve({ object: circleButton(1), action: 'slap', physiology: createDefaultPhysiology(), now: 1_000, speed: 80 });
    const before = learning.value({ objectType: 'button', feature: 'circle', action: 'slap' });
    const failed = interaction.resolve({ object: circleButton(0), action: 'slap', physiology: createDefaultPhysiology(), now: 2_000, speed: 80 });
    expect(failed.success).toBe(false);
    expect(failed.learned.value).toBeLessThan(before);
    expect(memory.snapshot().some((entry) => entry.type === 'failedAction')).toBe(true);
  });

  it('makes safe exploration familiar and lowers fear gradually', () => {
    const memory = new MemorySystem();
    const interaction = new InteractionSystem(memory, new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 }), () => 0.5);
    const result = interaction.resolve({
      object: { ...circleButton(0), id: 'ring', type: 'ring', feature: 'blue-ring', risk: 0.05 },
      action: 'approach',
      physiology: createDefaultPhysiology({ fear: 50, curiosity: 90 }),
      now: 1_000,
      speed: 30,
    });
    expect(result.success).toBe(true);
    expect(result.physiology.fear).toBeLessThan(50);
    expect(memory.snapshot()[0]!.type).toBe('familiarObject');
  });

  it('uses distance, energy, speed, fleeing and approach angle for hunting chance', () => {
    const favorable = new InteractionSystem(
      new MemorySystem(),
      new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 }),
      () => 0.2,
    ).resolve({
      object: { ...circleButton(1), id: 'fish', type: 'fish', feature: 'silver', distance: 22 },
      action: 'hunt',
      physiology: createDefaultPhysiology({ energy: 90, hunger: 85 }),
      now: 1_000,
      speed: 290,
      fishFleeing: false,
      relativeAngle: 0.08,
    });
    const unfavorable = new InteractionSystem(
      new MemorySystem(),
      new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 }),
      () => 0.8,
    ).resolve({
      object: { ...circleButton(1), id: 'fish', type: 'fish', feature: 'silver', distance: 90 },
      action: 'hunt',
      physiology: createDefaultPhysiology({ energy: 20, hunger: 85 }),
      now: 1_000,
      speed: 80,
      fishFleeing: true,
      relativeAngle: 2.5,
    });
    expect(favorable.success).toBe(true);
    expect(favorable.chance).toBeGreaterThan(unfavorable.chance);
    expect(unfavorable.success).toBe(false);
  });
});
