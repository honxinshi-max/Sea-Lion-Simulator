import { describe, expect, it } from 'vitest';
import { SimulationSystem } from '../src/game/systems/SimulationSystem';
import { SeededRandom } from '../src/game/utils/SeededRandom';

describe('SimulationSystem', () => {
  it('runs ten simulated minutes with bounded state and visible autonomous needs', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(24_824) });
    simulation.step(600_000);
    const snapshot = simulation.snapshot();
    expect(snapshot.time).toBe(600_000);
    expect(Number.isFinite(snapshot.position.x)).toBe(true);
    expect(Number.isFinite(snapshot.position.y)).toBe(true);
    expect(snapshot.position.x).toBeGreaterThanOrEqual(0);
    expect(snapshot.position.x).toBeLessThanOrEqual(1_600);
    expect(snapshot.position.y).toBeGreaterThanOrEqual(120);
    expect(snapshot.position.y).toBeLessThanOrEqual(800);
    expect(Object.values(snapshot.physiology).every((value) => Number.isFinite(value) && value >= 0 && value <= 100)).toBe(true);
    expect(snapshot.memories.length).toBeLessThanOrEqual(50);
    expect(snapshot.logs.length).toBeLessThanOrEqual(100);
    expect(snapshot.metrics.decisions).toBeGreaterThan(20);
    expect(snapshot.metrics.surfaceBreaths).toBeGreaterThan(0);
    expect(snapshot.metrics.huntAttempts).toBeGreaterThan(0);
    expect(snapshot.fish.length).toBeGreaterThan(0);
  });

  it('allows researcher placement and removes only experiment objects', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(9) });
    simulation.placeObject({
      id: 'research-button', type: 'button', feature: 'triangle', position: { x: 900, y: 440 },
      novel: true, reward: 1, risk: 0, distance: 0, enabled: true,
    });
    expect(simulation.snapshot().objects.some((object) => object.id === 'research-button')).toBe(true);
    simulation.removeExperimentObjects();
    expect(simulation.snapshot().objects.some((object) => object.id === 'research-button')).toBe(false);
    expect(simulation.snapshot().fish.length).toBeGreaterThan(0);
  });

  it('accepts player intent without disabling physiological updates', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(12) });
    const oxygen = simulation.snapshot().physiology.oxygen;
    simulation.setPlayerIntent({ x: 1, y: 1, boost: true, interact: false, rest: false });
    simulation.step(5_000);
    const snapshot = simulation.snapshot();
    expect(snapshot.position.x).toBeGreaterThan(520);
    expect(snapshot.physiology.oxygen).toBeLessThan(oxygen);
    expect(snapshot.physiology.energy).toBeLessThan(86);
  });

  it('supports a manual idle state without secretly choosing autonomous actions', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(18) });
    simulation.setPlayerIntent({ x: 0, y: 0, boost: false, interact: false, rest: false });
    simulation.step(5_000);
    expect(simulation.snapshot().metrics.decisions).toBe(0);
    expect(simulation.snapshot().physiology.hunger).toBeGreaterThan(32);
  });

  it('exposes the current player-controlled action for visual feedback', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(21) });
    simulation.setPlayerIntent({ x: 0, y: 0, boost: false, interact: false, rest: true });
    simulation.step(100);
    expect(simulation.snapshot().decision?.behavior).toBe('rest');
    expect(simulation.snapshot().decision?.reason[0]?.label).toBe('玩家控制');
  });

  it('emits structured interaction events for experiments and birthday stages', () => {
    const simulation = new SimulationSystem({ random: new SeededRandom(2) });
    simulation.placeObject({
      id: 'research-circle', type: 'button', feature: 'circle', position: { x: 535, y: 360 },
      novel: true, reward: 1, risk: 0, distance: 0, enabled: true,
    });
    simulation.setPlayerIntent({ x: 0, y: 0, boost: false, interact: true, rest: false });
    simulation.step(100);
    const event = simulation.drainEvents()[0]!;
    expect(event.objectId).toBe('research-circle');
    expect(event.action).toBe('slap');
    expect(event.success).toBe(true);
    expect(event.valueAfter).toBeGreaterThan(event.valueBefore);
    expect(simulation.drainEvents()).toEqual([]);
  });

  it('continues saved learning and memory state', () => {
    const simulation = new SimulationSystem({
      random: new SeededRandom(7),
      learning: [{ key: 'button|circle|slap', objectType: 'button', feature: 'circle', action: 'slap', value: 0.7, attempts: 4, successes: 3, updatedAt: 1 }],
      memories: [{ id: 'm', objectId: 'button', objectType: 'button', feature: 'circle', position: { x: 1, y: 2 }, action: 'slap', success: true, reward: 1, risk: 0, strength: 0.8, createdAt: 1, lastUsedAt: 1, uses: 1, type: 'successfulAction' }],
    });
    expect(simulation.snapshot().learning[0]!.value).toBe(0.7);
    expect(simulation.snapshot().memories[0]!.objectId).toBe('button');
  });
});
