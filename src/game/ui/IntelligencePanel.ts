import type { BehaviorId, BehaviorScore, LearnedValue, MemoryEntry } from '../types';
import { behaviorPresentation } from '../behaviors/Behavior';

export interface IntelligenceModel {
  title: string;
  candidates: string[];
  selectedFactors: string[];
  memories: string[];
  values: string[];
  explorationText: string;
}

export function buildIntelligenceModel(
  scores: BehaviorScore[],
  selected: BehaviorId,
  memories: MemoryEntry[],
  learned: LearnedValue[],
  explorationRate: number,
): IntelligenceModel {
  const selectedScore = scores.find((score) => score.behavior === selected);
  return {
    title: `当前行为：${behaviorPresentation(selected).label}`,
    candidates: scores.slice(0, 7).map((score) => `${behaviorPresentation(score.behavior).label}  ${score.score.toFixed(1)}`),
    selectedFactors: (selectedScore?.factors ?? []).map((factor) => `${factor.label} ${signed(factor.value)}`),
    memories: memories
      .slice()
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((memory) => `${memory.success ? '成功' : '失败'} · ${featureName(memory.feature)} · ${actionName(memory.action)} · 强度 ${Math.round(memory.strength * 100)}%`),
    values: learned.slice(0, 8).map((value) => `${featureName(value.feature)} × ${actionName(value.action)} = ${value.value.toFixed(2)}（${value.attempts}次）`),
    explorationText: `探索概率 ${Math.round(Math.min(1, Math.max(0, explorationRate)) * 100)}%`,
  };
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}`;
}

function featureName(feature: string): string {
  const names: Record<string, string> = {
    circle: '圆形', triangle: '三角形', square: '方形', silver: '银色小鱼', striped: '条纹箱',
    dotted: '圆点箱', plain: '素色箱', 'blue-ring': '蓝色圆环', 'birthday-box': '生日箱',
  };
  return names[feature] ?? feature;
}

function actionName(action: MemoryEntry['action']): string {
  const names: Record<MemoryEntry['action'], string> = {
    approach: '接近', push: '推动', slap: '拍打', open: '打开', hunt: '捕猎', call: '叫声',
  };
  return names[action];
}
