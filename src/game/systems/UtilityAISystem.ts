import type { Personality } from '../config/personality';
import type { BehaviorId, BehaviorScore, Decision, InteractionAction, ObjectType, PerceptionSnapshot, PhysiologyState } from '../types';
import { BALANCE } from '../config/balance';

export interface UtilityAIContext {
  physiology: PhysiologyState;
  personality: Personality;
  perception: PerceptionSnapshot;
  memoryInfluence: Partial<Record<BehaviorId, number>>;
  learnedReward: Partial<Record<BehaviorId, number>>;
  explorationRate?: number;
  guidance?: {
    targetId: string;
    objectType: ObjectType;
    feature: string;
    distance: number;
    preferredAction: InteractionAction;
    strength: number;
  };
}

export class UtilityAISystem {
  private current?: Decision;

  constructor(private readonly random: () => number = Math.random) {
  }

  scoreCandidates(context: UtilityAIContext): BehaviorScore[] {
    const { physiology: state, perception, personality } = context;
    const fish = perception.nearestFish;
    const novel = perception.nearestNovelObject;
    const familiar = perception.nearestFamiliarObject;
    const interactable = perception.interactableObject ?? novel ?? familiar;
    const guidance = context.guidance;
    const guideFor = (action: InteractionAction) => guidance?.preferredAction === action ? guidance.strength * 90 : 0;
    const memory = (behavior: BehaviorId) => context.memoryInfluence[behavior] ?? 0;
    const learned = (behavior: BehaviorId) => context.learnedReward[behavior] ?? 0;
    const noise = () => (this.random() - 0.5) * 4;
    const scored = (
      behavior: BehaviorId,
      factors: Array<[string, number]>,
      targetId?: string,
    ): BehaviorScore => {
      const named = factors.map(([label, value]) => ({ label, value }));
      named.push({ label: '自然波动', value: noise() });
      return {
        behavior,
        score: named.reduce((sum, factor) => sum + factor.value, 0),
        factors: named,
        ...(targetId ? { targetId } : {}),
      };
    };

    const energyProtection = state.energy <= BALANCE.ai.criticalEnergy ? -70 : 0;
    const danger = perception.dangerSource;
    const emergency = state.oxygen <= BALANCE.ai.emergencyOxygen ? 250 : 0;

    const candidates: BehaviorScore[] = [
      scored('surface', [
        ['缺氧需求', (100 - state.oxygen) * 1.15],
        ['水面距离', Math.max(-12, 18 - perception.surfaceDistance * 0.06)],
        ['氧气紧急保护', emergency],
        ['记忆影响', memory('surface')],
      ]),
      scored('seekFish', [
        ['饥饿需求', state.hunger * 0.68],
        ['鱼群线索', fish ? Math.max(0, 24 - fish.distance * 0.03) : -35],
        ['精力保护', energyProtection * 0.7],
        ['性格活跃', personality.activity * 10],
        ['记忆影响', memory('seekFish')],
      ], fish?.id),
      scored('huntFish', [
        ['饥饿需求', state.hunger * 0.9],
        ['猎物距离', fish ? Math.max(-10, 30 - fish.distance * 0.06) : -55],
        ['当前精力', state.energy * 0.12],
        ['精力保护', energyProtection],
        ['性格活跃', personality.activity * 13],
        ['经验奖励', learned('huntFish') * 28],
        ['记忆影响', memory('huntFish')],
      ], fish?.id),
      scored('rest', [
        ['疲劳需求', (100 - state.energy) * 0.82],
        ['休息位置', perception.isOnLand ? 18 : perception.isAtSurface ? 10 : -14],
        ['性格耐心', personality.patience * 8],
        ['记忆影响', memory('rest')],
      ]),
      scored('goLand', [
        ['疲劳需求', (100 - state.energy) * 0.35],
        ['已在岸上', perception.isOnLand ? -80 : 0],
        ['体温需要', Math.max(0, 48 - state.temperature) * 0.8],
        ['记忆影响', memory('goLand')],
      ]),
      scored('enterWater', [
        ['饥饿需求', perception.isOnLand ? state.hunger * 0.45 : -60],
        ['好奇需求', perception.isOnLand ? state.curiosity * 0.18 : 0],
        ['记忆影响', memory('enterWater')],
      ]),
      scored('explore', [
        ['好奇需求', state.curiosity * 0.65],
        ['好奇性格', personality.curiosityTrait * 26],
        ['陌生刺激', novel ? Math.max(0, 28 - novel.distance * 0.025) : -35],
        ['胆量', personality.boldness * 15],
        ['恐惧抑制', -state.fear * 0.35],
        ['预计风险', -(novel?.risk ?? 0) * (1 - personality.boldness) * 40],
        ['经验奖励', learned('explore') * 24],
        ['记忆影响', memory('explore')],
        ['探索提示', guideFor('approach')],
      ], guidance?.preferredAction === 'approach' ? guidance.targetId : novel?.id),
      scored('push', [
        ['可推动目标', interactable?.type === 'crate' || interactable?.type === 'birthdayBox' ? 34 : -40],
        ['距离', interactable ? Math.max(-12, 20 - interactable.distance * 0.08) : -20],
        ['好奇需求', state.curiosity * 0.22],
        ['经验奖励', learned('push') * 36],
        ['记忆影响', memory('push')],
        ['探索提示', guideFor('push')],
      ], guidance?.preferredAction === 'push' ? guidance.targetId : interactable?.id),
      scored('slap', [
        ['可拍打目标', interactable?.type === 'button' || interactable?.type === 'foodBox' ? 32 : -42],
        ['距离', interactable ? Math.max(-12, 20 - interactable.distance * 0.08) : -20],
        ['好奇需求', state.curiosity * 0.2],
        ['经验奖励', learned('slap') * 42],
        ['记忆影响', memory('slap')],
        ['探索提示', guideFor('slap')],
      ], guidance?.preferredAction === 'slap' ? guidance.targetId : interactable?.id),
      scored('escape', [
        ['恐惧需求', state.fear * 0.95],
        ['危险接近', danger ? Math.max(0, 46 - danger.distance * 0.18) : -34],
        ['危险强度', (danger?.risk ?? 0) * 45],
        ['极端恐惧保护', state.fear >= BALANCE.ai.extremeFear && danger ? 105 : 0],
        ['胆量缓冲', -personality.boldness * 14],
        ['记忆影响', memory('escape')],
      ], danger?.id),
      scored('approachFamiliar', [
        ['熟悉对象', familiar ? Math.max(0, 24 - familiar.distance * 0.04) : -30],
        ['信任', state.trust * 0.25],
        ['社交倾向', personality.sociability * 12],
        ['记忆影响', memory('approachFamiliar')],
      ], familiar?.id),
      scored('call', [
        ['社交倾向', personality.sociability * 18],
        ['信任', state.trust * 0.1],
        ['恐惧叫声', state.fear * 0.08],
        ['行为消耗', -8],
        ['记忆影响', memory('call')],
      ]),
      scored('repeatSuccess', [
        ['成功经验', learned('repeatSuccess') * 48],
        ['好奇需求', state.curiosity * 0.12],
        ['行为成本', -6],
        ['记忆影响', memory('repeatSuccess')],
      ], interactable?.id),
      scored('wander', [
        ['基础巡游', 18],
        ['活跃性格', personality.activity * 14],
        ['好奇需求', state.curiosity * 0.12],
        ['疲劳成本', -(100 - state.energy) * 0.15],
        ['记忆影响', memory('wander')],
      ]),
    ];
    return candidates.sort((a, b) => b.score - a.score);
  }

  decide(context: UtilityAIContext, now: number): Decision {
    const criticalSurface = context.physiology.oxygen <= BALANCE.ai.emergencyOxygen;
    const criticalEscape =
      context.physiology.fear >= BALANCE.ai.extremeFear && Boolean(context.perception.dangerSource);
    const emergencyBehavior: BehaviorId | undefined = criticalSurface
      ? 'surface'
      : criticalEscape
        ? 'escape'
        : undefined;
    if (
      this.current &&
      now < this.current.lockedUntil &&
      (!emergencyBehavior || this.current.behavior === emergencyBehavior)
    ) {
      return this.current;
    }

    const scores = this.scoreCandidates(context);
    const explorationRate = Math.min(1, Math.max(0, context.explorationRate ?? 0));
    const viable = scores.filter((candidate) => candidate.score > 0);
    const guidedBehavior: BehaviorId | undefined = context.guidance?.preferredAction === 'slap'
      ? 'slap'
      : context.guidance?.preferredAction === 'push'
        ? 'push'
        : context.guidance?.preferredAction === 'approach'
          ? 'explore'
          : undefined;
    const guidedCandidate = guidedBehavior ? scores.find((candidate) => candidate.behavior === guidedBehavior) : undefined;
    const guidanceTriggered = !emergencyBehavior && Boolean(guidedCandidate) &&
      this.random() < (context.guidance?.strength ?? 0) * 0.75;
    const exploring = !emergencyBehavior && !guidanceTriggered && viable.length > 1 && this.random() < explorationRate;
    const selected = emergencyBehavior
      ? scores.find((candidate) => candidate.behavior === emergencyBehavior)!
      : guidanceTriggered
        ? guidedCandidate!
      : exploring
        ? viable[Math.min(viable.length - 1, Math.floor(this.random() * viable.length))]!
        : scores[0]!;
    const decision: Decision = {
      behavior: selected.behavior,
      ...(selected.targetId ? { targetId: selected.targetId } : {}),
      startedAt: now,
      lockedUntil: now + minimumDuration(selected.behavior, context.personality),
      scores,
      reason: guidanceTriggered
        ? [...selected.factors, { label: '探索提示触发', value: 0 }]
        : exploring
          ? [...selected.factors, { label: '探索概率触发', value: 0 }]
          : selected.factors,
    };
    this.current = decision;
    return decision;
  }
}

function minimumDuration(behavior: BehaviorId, personality: Personality): number {
  const base: Record<BehaviorId, number> = {
    surface: 1_600,
    seekFish: 2_000,
    huntFish: 2_200,
    rest: 3_200,
    goLand: 2_800,
    enterWater: 1_800,
    explore: 2_100,
    push: 1_400,
    slap: 1_200,
    escape: 1_800,
    approachFamiliar: 1_800,
    call: 1_000,
    wander: 1_600,
    repeatSuccess: 1_500,
  };
  return Math.round(base[behavior] * (0.85 + personality.patience * 0.3));
}
