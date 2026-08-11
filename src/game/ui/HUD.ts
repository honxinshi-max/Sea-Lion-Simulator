import type { BehaviorId, GameMode, PhysiologyState } from '../types';
import { behaviorPresentation } from '../behaviors/Behavior';

export interface HUDStat {
  key: keyof PhysiologyState;
  label: string;
  value: number;
  tone: 'need' | 'resource' | 'neutral';
}

export interface HUDModel {
  name: string;
  modeLabel: string;
  behaviorLabel: string;
  autoLabel: string;
  stats: HUDStat[];
}

const LABELS: Record<keyof PhysiologyState, string> = {
  hunger: '饥饿',
  energy: '精力',
  oxygen: '氧气',
  temperature: '体温',
  fear: '恐惧',
  curiosity: '好奇',
  trust: '信任',
};

export function buildHUDModel(
  name: string,
  physiology: PhysiologyState,
  mode: GameMode,
  behavior: BehaviorId,
  detailed: boolean,
  autoEnabled: boolean,
): HUDModel {
  const keys: Array<keyof PhysiologyState> = detailed
    ? ['hunger', 'energy', 'oxygen', 'temperature', 'fear', 'curiosity', 'trust']
    : ['hunger', 'energy', 'oxygen'];
  return {
    name,
    modeLabel: mode === 'seaLion' ? '海狮控制' : '研究员观察',
    behaviorLabel: behaviorPresentation(behavior).label,
    autoLabel: autoEnabled ? '自动行动：开' : '自动行动：关',
    stats: keys.map((key) => ({
      key,
      label: LABELS[key],
      value: Math.round(physiology[key]),
      tone: key === 'hunger' || key === 'fear' ? 'need' : key === 'energy' || key === 'oxygen' ? 'resource' : 'neutral',
    })),
  };
}
