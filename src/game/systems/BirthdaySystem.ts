import type { InteractionAction } from '../types';

export type BirthdayStage = 'intro' | 'training' | 'reversal' | 'puzzle' | 'celebration';

export interface BirthdayAttempt {
  feature: string;
  action: InteractionAction;
  success: boolean;
  at: number;
}

export interface BirthdaySnapshot {
  stage: BirthdayStage;
  elapsed: number;
  assistLevel: number;
  memoriesFormed: number;
  completed: boolean;
  instruction: string;
}

export class BirthdaySystem {
  private startedAt = 0;
  private currentStage: BirthdayStage = 'intro';
  private attempts: BirthdayAttempt[] = [];
  private elapsed = 0;
  private assist = 0;
  private stageStartedAt = 0;
  private stageAttemptStartIndex = 0;

  start(now: number): void {
    this.startedAt = now;
    this.currentStage = 'training';
    this.attempts = [];
    this.elapsed = 0;
    this.assist = 0;
    this.stageStartedAt = 0;
    this.stageAttemptStartIndex = 0;
  }

  record(attempt: BirthdayAttempt): void {
    this.attempts.push({ ...attempt });
  }

  step(now: number): BirthdaySnapshot {
    this.elapsed = Math.max(0, now - this.startedAt);
    const stageAttempts = this.attemptsForStage();
    if (this.currentStage === 'training') {
      const wrong = stageAttempts.some((attempt) => attempt.action === 'slap' && !attempt.success);
      const correct = stageAttempts.some((attempt) => attempt.feature === 'circle' && attempt.action === 'slap' && attempt.success);
      if (wrong && correct && this.timeInCurrentStage() >= 40_000) this.enterStage('reversal');
    } else if (this.currentStage === 'reversal') {
      const oldError = stageAttempts.some((attempt) => attempt.feature === 'circle' && attempt.action === 'slap' && !attempt.success);
      const newSuccess = stageAttempts.some((attempt) => attempt.feature === 'triangle' && attempt.action === 'slap' && attempt.success);
      if (oldError && newSuccess && this.timeInCurrentStage() >= 45_000) this.enterStage('puzzle');
    } else if (this.currentStage === 'puzzle') {
      const approached = stageAttempts.some((attempt) => attempt.feature === 'birthday-box' && attempt.action === 'approach' && attempt.success);
      const pushed = stageAttempts.some((attempt) => attempt.feature === 'birthday-box' && attempt.action === 'push' && attempt.success);
      const solved = stageAttempts.some((attempt) => attempt.feature === 'triangle' && attempt.action === 'slap' && attempt.success);
      if (approached && pushed && solved && this.elapsed >= 150_000 && this.timeInCurrentStage() >= 45_000) {
        this.enterStage('celebration');
      }
    }
    const timeInStage = this.timeInCurrentStage();
    const assistDelay = this.currentStage === 'training' ? 55_000 : this.currentStage === 'reversal' ? 35_000 : 30_000;
    this.assist = Math.min(1, Math.max(0, (timeInStage - assistDelay) / 35_000));
    return this.snapshot();
  }

  snapshot(): BirthdaySnapshot {
    return {
      stage: this.currentStage,
      elapsed: this.elapsed,
      assistLevel: this.assist,
      memoriesFormed: this.attempts.length,
      completed: this.currentStage === 'celebration',
      instruction: instructions[this.currentStage],
    };
  }

  private attemptsForStage(): BirthdayAttempt[] {
    return this.attempts.slice(this.stageAttemptStartIndex);
  }

  private timeInCurrentStage(): number {
    return Math.max(0, this.elapsed - this.stageStartedAt);
  }

  private enterStage(stage: BirthdayStage): void {
    this.currentStage = stage;
    this.stageStartedAt = this.elapsed;
    this.stageAttemptStartIndex = this.attempts.length;
  }
}

const instructions: Record<BirthdayStage, string> = {
  intro: '它不会完全听从命令，但它会观察、学习和改变。',
  training: '观察小浪尝试三个按钮：圆形会掉出鱼。',
  reversal: '规则变了：现在三角形按钮才有奖励。',
  puzzle: '让小浪自主接近、推动生日箱，再找到正确按钮。',
  celebration: '爸爸，生日快乐！',
};
