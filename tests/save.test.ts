import { describe, expect, it } from 'vitest';
import { SaveSystem, createDefaultSave } from '../src/game/systems/SaveSystem';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('SaveSystem', () => {
  it('round trips save data through storage', () => {
    const storage = new MemoryStorage();
    const system = new SaveSystem(storage);
    const save = createDefaultSave(1_000);
    save.seaLion.name = '浪花';
    save.physiology.hunger = 63;
    system.save(save, 2_000);
    const loaded = system.load(3_000);
    expect(loaded.seaLion.name).toBe('浪花');
    expect(loaded.physiology.hunger).toBe(63);
    expect(loaded.savedAt).toBe(2_000);
  });

  it('recovers safely from malformed JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('sea-lion-simulator-save', '{not valid');
    const loaded = new SaveSystem(storage).load(5_000);
    expect(loaded.saveVersion).toBe('1.0');
    expect(loaded.seaLion.name).toBe('小浪');
  });

  it('resets an unsupported save version', () => {
    const storage = new MemoryStorage();
    storage.setItem('sea-lion-simulator-save', JSON.stringify({ saveVersion: '0.7', seaLion: { name: '旧浪' } }));
    expect(new SaveSystem(storage).load(8_000).seaLion.name).toBe('小浪');
  });

  it('sanitizes invalid numbers and keeps all physiology bounded', () => {
    const storage = new MemoryStorage();
    const raw = createDefaultSave();
    raw.physiology.energy = Number.NaN;
    raw.physiology.oxygen = 900;
    raw.settings.volume = -10;
    storage.setItem('sea-lion-simulator-save', JSON.stringify(raw));
    const loaded = new SaveSystem(storage).load();
    expect(loaded.physiology.energy).toBe(86);
    expect(loaded.physiology.oxygen).toBe(100);
    expect(loaded.settings.volume).toBe(0);
  });

  it('resets learning without erasing identity or settings', () => {
    const system = new SaveSystem(new MemoryStorage());
    const save = createDefaultSave();
    save.seaLion.name = '小浪测试';
    save.settings.muted = true;
    save.learning.push({ key: 'button|circle|slap', objectType: 'button', feature: 'circle', action: 'slap', value: 0.8, attempts: 5, successes: 4, updatedAt: 1 });
    save.memories.push({ id: 'm', objectId: 'b', objectType: 'button', feature: 'circle', position: { x: 1, y: 2 }, action: 'slap', success: true, reward: 1, risk: 0, strength: 0.8, createdAt: 1, lastUsedAt: 1, uses: 1, type: 'successfulAction' });
    const reset = system.resetLearning(save);
    expect(reset.learning).toEqual([]);
    expect(reset.memories).toEqual([]);
    expect(reset.seaLion.name).toBe('小浪测试');
    expect(reset.settings.muted).toBe(true);
  });
});
