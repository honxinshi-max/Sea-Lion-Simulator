import { describe, expect, it } from 'vitest';
import { BIRTHDAY_CONFIG } from '../src/game/config/birthday';
import { PERSONALITY_PRESETS } from '../src/game/config/personality';
import { createDefaultSave } from '../src/game/systems/SaveSystem';

describe('project contracts', () => {
  it('ships the editable birthday message and date', () => {
    expect(BIRTHDAY_CONFIG.addressee).toBe('爸爸');
    expect(BIRTHDAY_CONFIG.date).toBe('2026-08-24');
    expect(BIRTHDAY_CONFIG.message).toContain('不只是寻找答案');
  });

  it('provides three presets that materially differ', () => {
    expect(Object.keys(PERSONALITY_PRESETS)).toEqual(['curious', 'cautious', 'active']);
    expect(PERSONALITY_PRESETS.curious.explorationRate).toBeGreaterThan(
      PERSONALITY_PRESETS.cautious.explorationRate,
    );
    expect(PERSONALITY_PRESETS.active.activity).toBeGreaterThan(
      PERSONALITY_PRESETS.cautious.activity,
    );
    expect(PERSONALITY_PRESETS.cautious.boldness).toBeLessThan(
      PERSONALITY_PRESETS.curious.boldness,
    );
  });

  it('starts saves at schema version 1.0 with bounded physiology', () => {
    const save = createDefaultSave();
    expect(save.saveVersion).toBe('1.0');
    expect(save.seaLion.name).toBe('小浪');
    expect(Object.values(save.physiology).every((value) => value >= 0 && value <= 100)).toBe(true);
  });
});
