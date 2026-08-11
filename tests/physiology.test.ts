import { describe, expect, it } from 'vitest';
import {
  applyMeal,
  createDefaultPhysiology,
  updatePhysiology,
} from '../src/game/systems/PhysiologySystem';

describe('PhysiologySystem', () => {
  it('depletes oxygen while underwater', () => {
    const start = createDefaultPhysiology({ oxygen: 80 });
    const next = updatePhysiology(start, { underwater: true, atSurface: false, onLand: false, moving: true, boosting: false, resting: false }, 5);
    expect(next.oxygen).toBeLessThan(80);
    expect(next.oxygen).toBeCloseTo(64, 4);
  });

  it('recovers oxygen at the surface', () => {
    const start = createDefaultPhysiology({ oxygen: 20 });
    const next = updatePhysiology(start, { underwater: false, atSurface: true, onLand: false, moving: false, boosting: false, resting: false }, 2);
    expect(next.oxygen).toBeCloseTo(56, 4);
  });

  it('reduces hunger after eating', () => {
    expect(applyMeal(createDefaultPhysiology({ hunger: 80 }), 35).hunger).toBe(45);
  });

  it('restores more energy while resting on land', () => {
    const start = createDefaultPhysiology({ energy: 30 });
    const water = updatePhysiology(start, { underwater: false, atSurface: true, onLand: false, moving: false, boosting: false, resting: true }, 4);
    const land = updatePhysiology(start, { underwater: false, atSurface: false, onLand: true, moving: false, boosting: false, resting: true }, 4);
    expect(water.energy).toBeGreaterThan(30);
    expect(land.energy).toBeGreaterThan(water.energy);
  });

  it('changes states smoothly rather than jumping to a target', () => {
    const start = createDefaultPhysiology({ fear: 90, curiosity: 10 });
    const next = updatePhysiology(start, { underwater: false, atSurface: true, onLand: false, moving: false, boosting: false, resting: true }, 0.25);
    expect(next.fear).toBeLessThan(90);
    expect(next.fear).toBeGreaterThan(89);
    expect(next.curiosity).toBeGreaterThan(10);
    expect(next.curiosity).toBeLessThan(11);
  });

  it('clamps every physiology field to 0 through 100', () => {
    const start = createDefaultPhysiology({
      hunger: 999,
      energy: -20,
      oxygen: 999,
      temperature: -20,
      fear: 999,
      curiosity: -20,
      trust: 999,
    });
    expect(Object.values(start).every((value) => value >= 0 && value <= 100)).toBe(true);

    const next = updatePhysiology(start, { underwater: true, atSurface: false, onLand: false, moving: true, boosting: true, resting: false }, 10_000);
    expect(Object.values(next).every((value) => value >= 0 && value <= 100)).toBe(true);
  });
});
