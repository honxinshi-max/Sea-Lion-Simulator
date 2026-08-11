import type { InteractionAction, LearnedValue, LearningKey, ObjectType } from '../types';

export interface LearningOptions {
  learningRate: number;
  explorationRate: number;
}

export class LearningSystem {
  private readonly values = new Map<string, LearnedValue>();
  private readonly learningRate: number;
  private explorationRate: number;

  constructor(options: LearningOptions, initial: LearnedValue[] = []) {
    this.learningRate = Math.min(1, Math.max(0.01, options.learningRate));
    this.explorationRate = Math.min(1, Math.max(0, options.explorationRate));
    for (const entry of initial) this.values.set(this.keyOf(entry), { ...entry });
  }

  update(key: LearningKey, reward: number, success: boolean, now: number): LearnedValue {
    const storageKey = this.keyOf(key);
    const previous = this.values.get(storageKey);
    const oldValue = previous?.value ?? 0;
    const boundedReward = Math.min(1, Math.max(-1, reward));
    const next: LearnedValue = {
      ...key,
      key: storageKey,
      value: oldValue + this.learningRate * (boundedReward - oldValue),
      attempts: (previous?.attempts ?? 0) + 1,
      successes: (previous?.successes ?? 0) + (success ? 1 : 0),
      updatedAt: now,
    };
    this.values.set(storageKey, next);
    return { ...next };
  }

  value(key: LearningKey): number {
    return this.values.get(this.keyOf(key))?.value ?? 0;
  }

  selectionProbabilities(options: LearningKey[]): number[] {
    if (options.length === 0) return [];
    const exponentials = options.map((option) => Math.exp(this.value(option) * 2.4));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    const uniform = 1 / options.length;
    return exponentials.map(
      (value) => (1 - this.explorationRate) * (value / total) + this.explorationRate * uniform,
    );
  }

  rank(options: LearningKey[]): LearningKey[] {
    return options.slice().sort((a, b) => this.value(b) - this.value(a));
  }

  snapshot(): LearnedValue[] {
    return [...this.values.values()]
      .map((entry) => ({ ...entry }))
      .sort((a, b) => b.value - a.value || b.updatedAt - a.updatedAt);
  }

  setExplorationRate(value: number): void {
    this.explorationRate = Math.min(1, Math.max(0, value));
  }

  currentExplorationRate(): number {
    return this.explorationRate;
  }

  private keyOf(key: { objectType: ObjectType; feature: string; action: InteractionAction }): string {
    return `${key.objectType}|${key.feature}|${key.action}`;
  }
}
