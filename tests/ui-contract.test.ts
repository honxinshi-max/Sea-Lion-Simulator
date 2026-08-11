import { describe, expect, it } from 'vitest';
import { buildHUDModel } from '../src/game/ui/HUD';
import { buildIntelligenceModel } from '../src/game/ui/IntelligencePanel';
import { createDefaultPhysiology } from '../src/game/systems/PhysiologySystem';
import type { BehaviorScore, LearnedValue, MemoryEntry } from '../src/game/types';

describe('UI view models', () => {
  it('shows only hunger, energy and oxygen until details expand', () => {
    const compact = buildHUDModel('小浪', createDefaultPhysiology(), 'seaLion', 'surface', false, true);
    expect(compact.stats.map((stat) => stat.key)).toEqual(['hunger', 'energy', 'oxygen']);
    const detailed = buildHUDModel('小浪', createDefaultPhysiology(), 'researcher', 'explore', true, true);
    expect(detailed.stats.map((stat) => stat.key)).toEqual(['hunger', 'energy', 'oxygen', 'temperature', 'fear', 'curiosity', 'trust']);
    expect(detailed.modeLabel).toBe('研究员观察');
  });

  it('limits intelligence output to five recent memories and exposes learned values', () => {
    const scores: BehaviorScore[] = [
      { behavior: 'surface', score: 106, factors: [{ label: '氧气低', value: 82 }, { label: '水面距离', value: 24 }] },
    ];
    const memories = Array.from({ length: 7 }, (_, index): MemoryEntry => ({
      id: `m-${index}`, objectId: 'button', objectType: 'button', feature: 'circle', position: { x: 1, y: 2 },
      action: 'slap', success: true, reward: 1, risk: 0, strength: 0.8, createdAt: index, lastUsedAt: index,
      uses: 1, type: 'successfulAction',
    }));
    const learned: LearnedValue[] = [{
      key: 'button|circle|slap', objectType: 'button', feature: 'circle', action: 'slap',
      value: 0.7, attempts: 4, successes: 3, updatedAt: 10,
    }];
    const model = buildIntelligenceModel(scores, 'surface', memories, learned, 0.24);
    expect(model.memories).toHaveLength(5);
    expect(model.values[0]).toContain('圆形');
    expect(model.explorationText).toBe('探索概率 24%');
    expect(model.selectedFactors[0]).toContain('+82');
  });
});
