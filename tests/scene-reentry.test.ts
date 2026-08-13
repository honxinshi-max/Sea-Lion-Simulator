import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scene: class Scene {},
    GameObjects: { Container: class Container {} },
  },
}));

import { BirthdayScene } from '../src/game/scenes/BirthdayScene';

interface ReentryRuntime {
  objectViews: Map<string, unknown>;
  fishViews: Map<string, unknown>;
  bubbles: unknown[];
  stage: string;
  triangleAssisted: boolean;
  circleAssisted: boolean;
  puzzleButtonPlaced: boolean;
  puzzleApproached: boolean;
  trainingErrorSeen: boolean;
  reversalOldErrorSeen: boolean;
  celebrated: boolean;
  lastAssistNudgeAt: number;
}

describe('birthday scene re-entry', () => {
  it('drops destroyed Phaser view references before recreating the scene', () => {
    const scene = new BirthdayScene();
    const runtime = scene as unknown as ReentryRuntime;
    runtime.objectViews.set('destroyed-object', {});
    runtime.fishViews.set('destroyed-fish', {});
    runtime.bubbles.push({});

    scene.init({});

    expect(runtime.objectViews.size).toBe(0);
    expect(runtime.fishViews.size).toBe(0);
    expect(runtime.bubbles).toHaveLength(0);
  });

  it('resets the final surprise guard and stage evidence for every new run', () => {
    const scene = new BirthdayScene();
    const runtime = scene as unknown as ReentryRuntime;
    runtime.stage = 'celebration';
    runtime.triangleAssisted = true;
    runtime.circleAssisted = true;
    runtime.puzzleButtonPlaced = true;
    runtime.puzzleApproached = true;
    runtime.trainingErrorSeen = true;
    runtime.reversalOldErrorSeen = true;
    runtime.celebrated = true;
    runtime.lastAssistNudgeAt = 123_000;

    scene.init({});

    expect(runtime).toMatchObject({
      stage: 'intro',
      triangleAssisted: false,
      circleAssisted: false,
      puzzleButtonPlaced: false,
      puzzleApproached: false,
      trainingErrorSeen: false,
      reversalOldErrorSeen: false,
      celebrated: false,
      lastAssistNudgeAt: -Infinity,
    });
  });
});
