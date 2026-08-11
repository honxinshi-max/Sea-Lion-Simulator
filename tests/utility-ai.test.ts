import { describe, expect, it } from 'vitest';
import { PERSONALITY_PRESETS } from '../src/game/config/personality';
import { UtilityAISystem, type UtilityAIContext } from '../src/game/systems/UtilityAISystem';
import { createDefaultPhysiology } from '../src/game/systems/PhysiologySystem';

const context = (overrides: Partial<UtilityAIContext> = {}): UtilityAIContext => ({
  physiology: createDefaultPhysiology(),
  personality: PERSONALITY_PRESETS.curious,
  perception: {
    isUnderwater: true,
    isAtSurface: false,
    isOnLand: false,
    surfaceDistance: 160,
    nearestFish: {
      id: 'fish-1',
      position: { x: 600, y: 430 },
      distance: 180,
      fleeing: false,
      relativeAngle: 0.15,
    },
    nearestNovelObject: {
      id: 'button-1',
      type: 'button',
      feature: 'circle',
      position: { x: 720, y: 430 },
      distance: 240,
      novel: true,
      reward: 0,
      risk: 0.1,
      enabled: true,
    },
  },
  memoryInfluence: {},
  learnedReward: {},
  ...overrides,
});

const scoreOf = (ai: UtilityAISystem, value: UtilityAIContext, behavior: string) =>
  ai.scoreCandidates(value).find((candidate) => candidate.behavior === behavior)!;

describe('UtilityAISystem scoring', () => {
  it('forces surfacing above every candidate when oxygen is critically low', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const value = context({ physiology: createDefaultPhysiology({ oxygen: 7, hunger: 100 }) });
    const scores = ai.scoreCandidates(value);
    expect(scores[0]!.behavior).toBe('surface');
    expect(scores[0]!.factors.some((factor) => factor.label === '氧气紧急保护')).toBe(true);
  });

  it('raises hunting utility when hunger is high', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const low = scoreOf(ai, context({ physiology: createDefaultPhysiology({ hunger: 10 }) }), 'huntFish');
    const high = scoreOf(ai, context({ physiology: createDefaultPhysiology({ hunger: 92 }) }), 'huntFish');
    expect(high.score).toBeGreaterThan(low.score + 50);
  });

  it('raises escape utility when fear and danger are high', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const danger = {
      id: 'sound-1', type: 'soundDevice' as const, feature: 'sudden', position: { x: 500, y: 400 },
      distance: 80, novel: true, reward: 0, risk: 0.9, enabled: true,
    };
    const low = scoreOf(ai, context({ physiology: createDefaultPhysiology({ fear: 10 }), perception: { ...context().perception, dangerSource: danger } }), 'escape');
    const high = scoreOf(ai, context({ physiology: createDefaultPhysiology({ fear: 92 }), perception: { ...context().perception, dangerSource: danger } }), 'escape');
    expect(high.score).toBeGreaterThan(low.score + 60);
  });

  it('penalizes chasing and boosting when energy is critically low', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const rested = scoreOf(ai, context({ physiology: createDefaultPhysiology({ energy: 90 }) }), 'huntFish');
    const tired = scoreOf(ai, context({ physiology: createDefaultPhysiology({ energy: 6 }) }), 'huntFish');
    expect(tired.score).toBeLessThan(rested.score - 45);
    expect(tired.factors.some((factor) => factor.label === '精力保护' && factor.value < 0)).toBe(true);
  });

  it('makes a curious sea lion more willing to inspect novelty', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const low = scoreOf(ai, context({ physiology: createDefaultPhysiology({ curiosity: 10 }) }), 'explore');
    const high = scoreOf(ai, context({ physiology: createDefaultPhysiology({ curiosity: 95 }) }), 'explore');
    expect(high.score).toBeGreaterThan(low.score + 45);
  });

  it('keeps named factor totals equal to final scores', () => {
    const ai = new UtilityAISystem(() => 0.5);
    for (const candidate of ai.scoreCandidates(context())) {
      const total = candidate.factors.reduce((sum, factor) => sum + factor.value, 0);
      expect(candidate.score).toBeCloseTo(total, 8);
    }
  });

  it('uses the current exploration probability to sample a viable alternative', () => {
    const ai = new UtilityAISystem(() => 0.99);
    const decision = ai.decide(context({ explorationRate: 1 }), 10_000);
    expect(decision.reason.some((factor) => factor.label === '探索概率触发')).toBe(true);
  });

  it('adds an explainable bonus to a guided exploration action', () => {
    const ai = new UtilityAISystem(() => 0.5);
    const base = scoreOf(ai, context(), 'slap');
    const guided = scoreOf(ai, context({
      guidance: {
        targetId: 'button-1', objectType: 'button', feature: 'circle', distance: 120,
        preferredAction: 'slap', strength: 0.8,
      },
    }), 'slap');
    expect(guided.score).toBeGreaterThan(base.score + 60);
    expect(guided.factors.some((factor) => factor.label === '探索提示')).toBe(true);
  });

  it('can select a guided action without bypassing normal decision output', () => {
    const ai = new UtilityAISystem(() => 0);
    const decision = ai.decide(context({
      explorationRate: 0,
      guidance: {
        targetId: 'button-1', objectType: 'button', feature: 'circle', distance: 120,
        preferredAction: 'slap', strength: 1,
      },
    }), 10_000);
    expect(decision.behavior).toBe('slap');
    expect(decision.reason.some((factor) => factor.label === '探索提示触发')).toBe(true);
  });
});
