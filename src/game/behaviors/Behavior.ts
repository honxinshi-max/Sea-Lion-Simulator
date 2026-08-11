import type { BehaviorId } from '../types';

export type BehaviorAnimation =
  | 'rise'
  | 'cruise'
  | 'lunge'
  | 'float'
  | 'haul-out'
  | 'slide'
  | 'inspect'
  | 'nose-push'
  | 'flipper-slap'
  | 'startled'
  | 'approach'
  | 'call'
  | 'repeat';

export interface BehaviorPresentation {
  label: string;
  animation: BehaviorAnimation;
  minimumDurationMs: number;
}

const PRESENTATIONS: Record<BehaviorId, BehaviorPresentation> = {
  surface: { label: '上浮呼吸', animation: 'rise', minimumDurationMs: 1_600 },
  seekFish: { label: '寻找鱼群', animation: 'cruise', minimumDurationMs: 2_000 },
  huntFish: { label: '追逐小鱼', animation: 'lunge', minimumDurationMs: 2_200 },
  rest: { label: '漂浮休息', animation: 'float', minimumDurationMs: 3_200 },
  goLand: { label: '爬上礁石', animation: 'haul-out', minimumDurationMs: 2_800 },
  enterWater: { label: '滑入水中', animation: 'slide', minimumDurationMs: 1_800 },
  explore: { label: '观察陌生物', animation: 'inspect', minimumDurationMs: 2_100 },
  push: { label: '用鼻子推动', animation: 'nose-push', minimumDurationMs: 1_400 },
  slap: { label: '用前鳍拍打', animation: 'flipper-slap', minimumDurationMs: 1_200 },
  escape: { label: '受惊逃离', animation: 'startled', minimumDurationMs: 1_800 },
  approachFamiliar: { label: '靠近熟悉物', animation: 'approach', minimumDurationMs: 1_800 },
  call: { label: '发出叫声', animation: 'call', minimumDurationMs: 1_000 },
  wander: { label: '自由巡游', animation: 'cruise', minimumDurationMs: 1_600 },
  repeatSuccess: { label: '重复成功动作', animation: 'repeat', minimumDurationMs: 1_500 },
};

export function behaviorPresentation(behavior: BehaviorId): BehaviorPresentation {
  return PRESENTATIONS[behavior];
}

export interface Behavior {
  readonly id: BehaviorId;
  readonly presentation: BehaviorPresentation;
}
