import type { ExperimentRecord, InteractionAction } from '../types';

export type ExperimentId = 'position' | 'shape' | 'reversal';

export interface ExperimentAttempt {
  feature: string;
  action: InteractionAction;
  success: boolean;
  reward: number;
  valueBefore: number;
  valueAfter: number;
  phase?: 'beforeChange' | 'afterChange';
}

export class ExperimentSystem {
  private activeId: ExperimentId = 'shape';
  private correctFeature = 'circle';
  private changed = false;
  private attempts: ExperimentAttempt[] = [];
  private objectPositions: Record<string, number> = {};

  start(id: ExperimentId, rewardedFeature: string): void {
    this.activeId = id;
    this.correctFeature = rewardedFeature;
    this.changed = false;
    this.attempts = [];
    this.objectPositions = {};
  }

  record(attempt: ExperimentAttempt): void {
    const allowedFeatures = this.activeId === 'position'
      ? ['striped', 'dotted', 'plain']
      : ['circle', 'triangle', 'square'];
    const allowedAction = this.activeId === 'position'
      ? attempt.action === 'slap' || attempt.action === 'open'
      : attempt.action === 'slap';
    if (!allowedFeatures.includes(attempt.feature) || !allowedAction) return;
    this.attempts.push({ ...attempt, phase: this.changed ? 'afterChange' : 'beforeChange' });
  }

  setPositions(positions: Record<string, number>): void {
    this.objectPositions = { ...positions };
  }

  swapPositions(first: string, second: string): void {
    const firstPosition = this.objectPositions[first];
    const secondPosition = this.objectPositions[second];
    if (firstPosition === undefined || secondPosition === undefined) return;
    this.objectPositions[first] = secondPosition;
    this.objectPositions[second] = firstPosition;
  }

  positions(): Record<string, number> {
    return { ...this.objectPositions };
  }

  rewardedFeature(): string {
    return this.correctFeature;
  }

  changeRule(feature: string): void {
    this.correctFeature = feature;
    this.changed = true;
  }

  history(): ExperimentAttempt[] {
    return this.attempts.map((attempt) => ({ ...attempt }));
  }

  snapshot(): ExperimentRecord {
    const recent = this.attempts.at(-1);
    const latestValues = new Map<string, number>();
    for (const attempt of this.attempts) latestValues.set(attempt.feature, attempt.valueAfter);
    const preferredFeature = [...latestValues.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '无';
    const successes = this.attempts.filter((attempt) => attempt.success).length;
    return {
      id: this.activeId,
      attempts: this.attempts.length,
      successes,
      preferredFeature,
      recentBehavior: recent
        ? `${actionName(recent.action)} ${recent.feature} → ${recent.success ? '成功' : '无结果'}`
        : '尚未尝试',
      learningDelta: recent ? recent.valueAfter - recent.valueBefore : 0,
      completed: this.isCompleted(preferredFeature),
    };
  }

  private isCompleted(preferredFeature: string): boolean {
    if (this.activeId === 'shape') {
      return this.attempts.length >= 5 &&
        this.attempts.filter((attempt) => attempt.feature === this.correctFeature && attempt.success).length >= 3 &&
        preferredFeature === this.correctFeature;
    }
    if (this.activeId === 'position') {
      return this.attempts.length >= 3 &&
        this.attempts.some((attempt) => attempt.feature === this.correctFeature && attempt.success);
    }
    const afterChange = this.attempts.filter((attempt) => attempt.phase === 'afterChange');
    return this.changed && afterChange.length >= 4 &&
      afterChange.filter((attempt) => attempt.feature === this.correctFeature && attempt.success).length >= 2 &&
      afterChange.some((attempt) => attempt.feature !== this.correctFeature && !attempt.success) &&
      preferredFeature === this.correctFeature;
  }
}

function actionName(action: InteractionAction): string {
  const names: Record<InteractionAction, string> = {
    approach: '接近',
    push: '推动',
    slap: '拍打',
    open: '打开',
    hunt: '捕猎',
    call: '叫声',
  };
  return names[action];
}
