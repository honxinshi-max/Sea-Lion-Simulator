import type { BehaviorId } from '../types';

export function seaLionScaleFor(
  behavior: BehaviorId,
  facing: -1 | 1,
  phase: number,
): { x: number; y: number } {
  if (behavior === 'huntFish') return { x: facing * 1.03, y: 0.97 };
  if (behavior === 'escape') return { x: facing, y: 0.94 + Math.sin(phase * 4) * 0.04 };
  return { x: facing, y: 1 };
}
