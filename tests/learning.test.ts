import { describe, expect, it } from 'vitest';
import { LearningSystem } from '../src/game/systems/LearningSystem';

const circle = { objectType: 'button' as const, feature: 'circle', action: 'slap' as const };
const triangle = { objectType: 'button' as const, feature: 'triangle', action: 'slap' as const };

describe('LearningSystem', () => {
  it('raises a behavior value after reward', () => {
    const learning = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    expect(learning.update(circle, 1, true, 1_000).value).toBeCloseTo(0.3, 6);
  });

  it('lowers an established value after no result', () => {
    const learning = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    learning.update(circle, 1, true, 1_000);
    const failed = learning.update(circle, -0.25, false, 2_000);
    expect(failed.value).toBeLessThan(0.3);
    expect(failed.attempts).toBe(2);
  });

  it('makes repeated success more likely to be selected', () => {
    const learning = new LearningSystem({ learningRate: 0.25, explorationRate: 0.2 });
    const before = learning.selectionProbabilities([circle, triangle]);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      learning.update(circle, 1, true, 1_000 + attempt);
    }
    const after = learning.selectionProbabilities([circle, triangle]);
    expect(after[0]!).toBeGreaterThan(before[0]!);
    expect(after[0]!).toBeGreaterThan(after[1]!);
  });

  it('transfers learned feature value when object position changes', () => {
    const learning = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    learning.update(circle, 1, true, 1_000);
    expect(learning.value({ ...circle })).toBeCloseTo(0.3, 6);
  });

  it('relearns after the rewarded rule changes', () => {
    const learning = new LearningSystem({ learningRate: 0.35, explorationRate: 0.25 });
    for (let attempt = 0; attempt < 4; attempt += 1) learning.update(circle, 1, true, attempt);
    expect(learning.value(circle)).toBeGreaterThan(learning.value(triangle));
    for (let attempt = 0; attempt < 7; attempt += 1) {
      learning.update(circle, -0.5, false, 10 + attempt);
      learning.update(triangle, 1, true, 20 + attempt);
    }
    expect(learning.value(triangle)).toBeGreaterThan(learning.value(circle));
    expect(learning.rank([circle, triangle])[0]!.feature).toBe('triangle');
  });

  it('restores learned values for saving and continuing', () => {
    const first = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    first.update(circle, 1, true, 1_000);
    const restored = new LearningSystem(
      { learningRate: 0.3, explorationRate: 0.2 },
      first.snapshot(),
    );
    expect(restored.value(circle)).toBeCloseTo(0.3, 6);
    expect(restored.snapshot()[0]!.attempts).toBe(1);
  });

  it('reports a bounded adjustable exploration probability', () => {
    const learning = new LearningSystem({ learningRate: 0.3, explorationRate: 0.2 });
    learning.setExplorationRate(2);
    expect(learning.currentExplorationRate()).toBe(1);
    learning.setExplorationRate(-1);
    expect(learning.currentExplorationRate()).toBe(0);
  });
});
