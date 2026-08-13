import { describe, expect, it } from 'vitest';
import { BirthdaySystem } from '../src/game/systems/BirthdaySystem';
import { SimulationSystem } from '../src/game/systems/SimulationSystem';
import { SeededRandom } from '../src/game/utils/SeededRandom';
import type { WorldObjectSnapshot } from '../src/game/types';

describe('birthday autonomous integration', () => {
  it('finishes the learned birthday sequence across varied random seeds', () => {
    for (const seed of Array.from({ length: 256 }, (_, index) => index + 1)) {
      const result = runBirthday(seed);
      expect(result, `seed ${seed}`).toMatchObject({
        completed: true,
        trainingError: true,
        trainingSuccess: true,
        reversalError: true,
        reversalSuccess: true,
        reachedBox: true,
        pushedBox: true,
        solvedPuzzle: true,
      });
      expect(result.elapsed).toBeGreaterThanOrEqual(150_000);
      expect(result.elapsed).toBeLessThanOrEqual(210_000);
    }
  }, 15_000);

  it('finishes when a push succeeds before any separate approach event', () => {
    expect(runBirthday(14)).toMatchObject({
      completed: true,
      approachedBox: false,
      reachedBox: true,
      pushedBox: true,
      solvedPuzzle: true,
    });
  });
});

function runBirthday(seed: number) {
  const simulation = new SimulationSystem({ random: new SeededRandom(seed) });
  const birthday = new BirthdaySystem();
  birthday.start(0);
  place(simulation, 'research-birthday-triangle', 'button', 'triangle', 665, 380, 0);
  place(simulation, 'research-birthday-circle', 'button', 'circle', 930, 445, 1);
  place(simulation, 'research-birthday-square', 'button', 'square', 1_175, 500, 0);
  let stage = birthday.snapshot().stage;
  let lastAssistNudgeAt = -Infinity;
  let puzzleButtonPlaced = false;
  const observed = {
    trainingError: false,
    trainingSuccess: false,
    reversalError: false,
    reversalSuccess: false,
    approachedBox: false,
    reachedBox: false,
    pushedBox: false,
    solvedPuzzle: false,
  };

  for (let elapsed = 100; elapsed <= 210_000; elapsed += 100) {
    simulation.step(100);
    for (const event of simulation.drainEvents()) {
      birthday.record({ feature: event.feature, action: event.action, success: event.success, at: event.at });
      if (stage === 'training') {
        observed.trainingError ||= event.action === 'slap' && !event.success;
        observed.trainingSuccess ||= event.feature === 'circle' && event.action === 'slap' && event.success;
      } else if (stage === 'reversal') {
        observed.reversalError ||= event.feature === 'circle' && event.action === 'slap' && !event.success;
        observed.reversalSuccess ||= event.feature === 'triangle' && event.action === 'slap' && event.success;
      } else if (stage === 'puzzle') {
        observed.approachedBox ||= event.feature === 'birthday-box' && event.action === 'approach' && event.success;
        observed.reachedBox ||= event.feature === 'birthday-box' &&
          (event.action === 'approach' || event.action === 'push') && event.success;
        observed.pushedBox ||= event.feature === 'birthday-box' && event.action === 'push' && event.success;
        observed.solvedPuzzle ||= event.feature === 'triangle' && event.action === 'slap' && event.success;
        if (observed.pushedBox && !puzzleButtonPlaced) {
          puzzleButtonPlaced = true;
          place(simulation, 'research-birthday-triangle', 'button', 'triangle', 930, 430, 1);
        }
      }
    }
    const birthdaySnapshot = birthday.step(elapsed);
    simulation.setExplorationAssist(0.34 + birthdaySnapshot.assistLevel * 0.56);
    if (birthdaySnapshot.stage !== stage) {
      stage = birthdaySnapshot.stage;
      lastAssistNudgeAt = -Infinity;
      if (stage === 'reversal') {
        for (const object of simulation.snapshot().objects.filter((item) => item.id.startsWith('research-birthday-'))) {
          simulation.placeObject({ ...object, reward: object.feature === 'triangle' ? 1 : 0 });
        }
      } else if (stage === 'puzzle') {
        simulation.removeExperimentObjects();
        place(simulation, 'research-birthday-box', 'birthdayBox', 'birthday-box', 790, 430, 0.32);
      }
    }
    if (elapsed - lastAssistNudgeAt >= 7_000) {
      if (stage === 'training' && birthdaySnapshot.assistLevel > 0.15) {
        moveNear(simulation, observed.trainingError ? 'research-birthday-circle' : 'research-birthday-triangle', 145);
        lastAssistNudgeAt = elapsed;
      } else if (stage === 'reversal' && birthdaySnapshot.assistLevel > 0.1) {
        moveNear(simulation, observed.reversalError ? 'research-birthday-triangle' : 'research-birthday-circle', 130);
        lastAssistNudgeAt = elapsed;
      } else if (stage === 'puzzle' && birthdaySnapshot.assistLevel > 0.15) {
        moveNear(simulation, puzzleButtonPlaced ? 'research-birthday-triangle' : 'research-birthday-box', 125);
        lastAssistNudgeAt = elapsed;
      }
    }
    if (stage === 'training' && birthdaySnapshot.assistLevel > 0.15) {
      simulation.setGuidedExploration(
        observed.trainingError ? 'research-birthday-circle' : 'research-birthday-triangle',
        'slap',
        birthdaySnapshot.assistLevel,
      );
    } else if (stage === 'reversal' && birthdaySnapshot.assistLevel > 0.1) {
      simulation.setGuidedExploration(
        observed.reversalError ? 'research-birthday-triangle' : 'research-birthday-circle',
        'slap',
        birthdaySnapshot.assistLevel,
      );
    } else if (stage === 'puzzle' && birthdaySnapshot.assistLevel > 0.15) {
      simulation.setGuidedExploration(
        puzzleButtonPlaced ? 'research-birthday-triangle' : 'research-birthday-box',
        puzzleButtonPlaced ? 'slap' : observed.reachedBox ? 'push' : 'approach',
        birthdaySnapshot.assistLevel,
      );
    } else simulation.setGuidedExploration(undefined);
    if (birthdaySnapshot.completed) return { ...observed, completed: true, elapsed };
  }
  return { ...observed, completed: false, elapsed: 210_000 };
}

function place(
  simulation: SimulationSystem,
  id: string,
  type: WorldObjectSnapshot['type'],
  feature: string,
  x: number,
  y: number,
  reward: number,
): void {
  simulation.placeObject({ id, type, feature, position: { x, y }, novel: true, reward, risk: 0.04, distance: 0, enabled: true });
}

function moveNear(simulation: SimulationSystem, id: string, offset: number): void {
  const snapshot = simulation.snapshot();
  const object = snapshot.objects.find((item) => item.id === id);
  const direction = snapshot.position.x > 1_200 ? -1 : 1;
  if (object) simulation.placeObject({
    ...object,
    position: {
      x: Math.min(1_500, Math.max(100, snapshot.position.x + direction * Math.min(offset, 105))),
      y: Math.min(760, Math.max(160, snapshot.position.y + 10)),
    },
  });
}
