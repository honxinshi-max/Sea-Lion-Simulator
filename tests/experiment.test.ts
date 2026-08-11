import { describe, expect, it } from 'vitest';
import { ExperimentSystem } from '../src/game/systems/ExperimentSystem';

describe('ExperimentSystem', () => {
  it('ignores unrelated bay interactions when scoring an experiment', () => {
    const experiment = new ExperimentSystem();
    experiment.start('shape', 'circle');
    experiment.record({ feature: 'yellow', action: 'approach', success: true, reward: 0.1, valueBefore: 0, valueAfter: 0.03 });
    expect(experiment.snapshot().attempts).toBe(0);
    expect(experiment.history()).toEqual([]);
  });

  it('derives shape-learning results from recorded sea-lion actions', () => {
    const experiment = new ExperimentSystem();
    experiment.start('shape', 'circle');
    experiment.record({ feature: 'triangle', action: 'slap', success: false, reward: -0.2, valueBefore: 0, valueAfter: -0.06 });
    experiment.record({ feature: 'circle', action: 'slap', success: true, reward: 1, valueBefore: 0, valueAfter: 0.3 });
    const snapshot = experiment.snapshot();
    expect(snapshot.attempts).toBe(2);
    expect(snapshot.successes).toBe(1);
    expect(snapshot.preferredFeature).toBe('circle');
    expect(snapshot.recentBehavior).toContain('circle');
    expect(snapshot.completed).toBe(false);
  });

  it('swaps box positions without changing learned feature identities', () => {
    const experiment = new ExperimentSystem();
    experiment.start('position', 'striped');
    experiment.setPositions({ striped: 300, dotted: 650, plain: 1_000 });
    experiment.swapPositions('striped', 'plain');
    expect(experiment.positions()).toEqual({ striped: 1_000, dotted: 650, plain: 300 });
    expect(experiment.rewardedFeature()).toBe('striped');
  });

  it('completes shape learning only after repeated observed success', () => {
    const experiment = new ExperimentSystem();
    experiment.start('shape', 'circle');
    const attempts = [
      ['triangle', false, -0.2, -0.06],
      ['square', false, -0.2, -0.06],
      ['circle', true, 1, 0.3],
      ['circle', true, 1, 0.51],
      ['circle', true, 1, 0.657],
    ] as const;
    for (const [feature, success, reward, valueAfter] of attempts) {
      experiment.record({ feature, action: 'slap', success, reward, valueBefore: 0, valueAfter });
    }
    expect(experiment.snapshot().completed).toBe(true);
  });

  it('tracks old-rule errors and new-rule success during reversal', () => {
    const experiment = new ExperimentSystem();
    experiment.start('reversal', 'circle');
    experiment.record({ feature: 'circle', action: 'slap', success: true, reward: 1, valueBefore: 0.5, valueAfter: 0.65 });
    experiment.changeRule('triangle');
    experiment.record({ feature: 'circle', action: 'slap', success: false, reward: -0.5, valueBefore: 0.65, valueAfter: 0.3 });
    experiment.record({ feature: 'square', action: 'slap', success: false, reward: -0.2, valueBefore: 0, valueAfter: -0.06 });
    experiment.record({ feature: 'triangle', action: 'slap', success: true, reward: 1, valueBefore: 0, valueAfter: 0.3 });
    experiment.record({ feature: 'triangle', action: 'slap', success: true, reward: 1, valueBefore: 0.3, valueAfter: 0.51 });
    const snapshot = experiment.snapshot();
    expect(snapshot.preferredFeature).toBe('triangle');
    expect(snapshot.completed).toBe(true);
    expect(experiment.history().some((entry) => entry.phase === 'afterChange' && entry.feature === 'circle' && !entry.success)).toBe(true);
  });
});
