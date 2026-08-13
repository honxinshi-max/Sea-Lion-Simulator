import { describe, expect, it } from 'vitest';
import { BirthdaySystem } from '../src/game/systems/BirthdaySystem';

describe('BirthdaySystem', () => {
  it('requires a real error and success before leaving training', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.record({ feature: 'triangle', action: 'slap', success: false, at: 20_000 });
    birthday.record({ feature: 'circle', action: 'slap', success: true, at: 42_000 });
    birthday.step(42_000);
    expect(birthday.snapshot().stage).toBe('reversal');
    expect(birthday.snapshot().memoriesFormed).toBeGreaterThanOrEqual(2);
  });

  it('requires an old-rule error and new-rule success during reversal', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.record({ feature: 'triangle', action: 'slap', success: false, at: 15_000 });
    birthday.record({ feature: 'circle', action: 'slap', success: true, at: 40_000 });
    birthday.step(40_000);
    birthday.record({ feature: 'circle', action: 'slap', success: false, at: 65_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 92_000 });
    birthday.step(92_000);
    expect(birthday.snapshot().stage).toBe('puzzle');
  });

  it('requires approach, push and learned slap before celebration', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.record({ feature: 'triangle', action: 'slap', success: false, at: 15_000 });
    birthday.record({ feature: 'circle', action: 'slap', success: true, at: 40_000 });
    birthday.step(40_000);
    birthday.record({ feature: 'circle', action: 'slap', success: false, at: 60_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 90_000 });
    birthday.step(90_000);
    birthday.record({ feature: 'birthday-box', action: 'approach', success: true, at: 110_000 });
    birthday.record({ feature: 'birthday-box', action: 'push', success: true, at: 130_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 145_000 });
    birthday.step(149_000);
    expect(birthday.snapshot().stage).toBe('puzzle');
    birthday.step(150_000);
    expect(birthday.snapshot().stage).toBe('celebration');
    expect(birthday.snapshot().completed).toBe(true);
  });

  it('treats a successful birthday-box push as proof of approach so the surprise cannot stall', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.record({ feature: 'triangle', action: 'slap', success: false, at: 15_000 });
    birthday.record({ feature: 'circle', action: 'slap', success: true, at: 40_000 });
    birthday.step(40_000);
    birthday.record({ feature: 'circle', action: 'slap', success: false, at: 60_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 90_000 });
    birthday.step(90_000);
    birthday.record({ feature: 'birthday-box', action: 'push', success: true, at: 130_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 145_000 });

    birthday.step(150_000);

    expect(birthday.snapshot().stage).toBe('celebration');
    expect(birthday.snapshot().completed).toBe(true);
  });

  it('raises exploration assistance gradually without instant completion', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.step(75_000);
    expect(birthday.snapshot().assistLevel).toBeGreaterThan(0);
    expect(birthday.snapshot().assistLevel).toBeLessThanOrEqual(1);
    expect(birthday.snapshot().completed).toBe(false);
  });

  it('does not reuse late training attempts as reversal evidence', () => {
    const birthday = new BirthdaySystem();
    birthday.start(0);
    birthday.record({ feature: 'circle', action: 'slap', success: false, at: 50_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: true, at: 60_000 });
    birthday.record({ feature: 'triangle', action: 'slap', success: false, at: 70_000 });
    birthday.record({ feature: 'circle', action: 'slap', success: true, at: 80_000 });
    birthday.step(80_000);
    expect(birthday.snapshot().stage).toBe('reversal');
    birthday.step(130_000);
    expect(birthday.snapshot().stage).toBe('reversal');
  });
});
