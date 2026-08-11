import type { InteractionAction, LearnedValue, MemoryEntry, PhysiologyState, WorldObjectSnapshot } from '../types';
import type { LearningSystem } from './LearningSystem';
import type { MemorySystem } from './MemorySystem';
import { applyMeal, clampPhysiology } from './PhysiologySystem';

export interface InteractionInput {
  object: WorldObjectSnapshot;
  action: InteractionAction;
  physiology: PhysiologyState;
  now: number;
  speed: number;
  fishFleeing?: boolean;
  relativeAngle?: number;
}

export interface InteractionResult {
  success: boolean;
  reward: number;
  risk: number;
  chance: number;
  physiology: PhysiologyState;
  learned: LearnedValue;
  memory: MemoryEntry;
  message: string;
}

export class InteractionSystem {
  constructor(
    private readonly memorySystem: MemorySystem,
    private readonly learningSystem: LearningSystem,
    private readonly random: () => number = Math.random,
  ) {
  }

  resolve(input: InteractionInput): InteractionResult {
    const chance = this.successChance(input);
    const success = input.object.enabled && this.random() <= chance;
    const reward = success
      ? input.object.type === 'fish'
        ? 1
        : Math.max(0.12, input.object.reward)
      : input.object.risk > 0.4
        ? -input.object.risk
        : input.action === 'slap'
          ? -0.25
          : input.action === 'hunt'
            ? -0.2
            : -0.12;
    const learned = this.learningSystem.update(
      { objectType: input.object.type, feature: input.object.feature, action: input.action },
      reward,
      success,
      input.now,
    );
    const memoryType = success
      ? input.object.type === 'fish'
        ? 'foodLocation'
        : input.action === 'approach'
          ? 'familiarObject'
          : 'successfulAction'
      : input.object.risk > 0.4
        ? 'dangerLocation'
        : 'failedAction';
    const memory = this.memorySystem.remember({
      objectId: input.object.id,
      objectType: input.object.type,
      feature: input.object.feature,
      position: input.object.position,
      action: input.action,
      success,
      reward,
      risk: input.object.risk,
      now: input.now,
      type: memoryType,
    });
    let physiology = { ...input.physiology };
    if (success && (input.object.type === 'fish' || input.object.reward >= 0.8)) {
      physiology = applyMeal(physiology, input.object.type === 'fish' ? 30 : 22);
    }
    physiology = clampPhysiology({
      ...physiology,
      trust: physiology.trust + (success && input.object.type === 'button' ? 0.8 : 0),
      fear:
        physiology.fear +
        (success && input.action === 'approach' ? -Math.max(2, 7 - input.object.risk * 8) : success ? -0.8 : 1 + input.object.risk * 14),
      curiosity: physiology.curiosity + (success && input.action === 'approach' ? -8 : -0.5),
    });
    return {
      success,
      reward,
      risk: input.object.risk,
      chance,
      physiology,
      learned,
      memory,
      message: `${input.object.feature}：${actionLabel(input.action)}${success ? '成功' : '没有结果'}`,
    };
  }

  private successChance(input: InteractionInput): number {
    const { object, action } = input;
    if (!object.enabled) return 0;
    if (action === 'hunt' && object.type === 'fish') {
      const distance = Math.max(0, object.distance);
      const angle = Math.min(Math.PI, Math.abs(input.relativeAngle ?? Math.PI / 2));
      const raw =
        0.12 +
        Math.max(0, 100 - distance) / 150 +
        Math.min(0.45, Math.max(0, input.speed) / 650) +
        input.physiology.energy / 360 +
        ((Math.PI - angle) / Math.PI) * 0.22 -
        (input.fishFleeing ? 0.2 : 0);
      return Math.min(0.92, Math.max(0.08, raw));
    }
    if (action === 'approach') return object.distance <= 150 && object.risk < 0.6 ? 0.96 : 0.2;
    if (action === 'push') {
      return object.distance <= 115 && (object.type === 'crate' || object.type === 'birthdayBox') ? 0.92 : 0.08;
    }
    if (action === 'slap') {
      if (object.distance > 105 || (object.type !== 'button' && object.type !== 'foodBox')) return 0.08;
      return object.reward > 0 ? 0.96 : 0;
    }
    if (action === 'open') return object.distance <= 100 && object.type === 'foodBox' ? 0.9 : 0.08;
    if (action === 'call') return object.type === 'soundDevice' ? 0.75 : 0.5;
    return 0.1;
  }
}

function actionLabel(action: InteractionAction): string {
  const labels: Record<InteractionAction, string> = {
    approach: '接近',
    push: '推动',
    slap: '拍打',
    open: '打开',
    hunt: '捕猎',
    call: '叫声',
  };
  return labels[action];
}
