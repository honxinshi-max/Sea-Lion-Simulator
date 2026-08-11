import type { PlayerIntent } from '../systems/SimulationSystem';

export interface KeyboardState {
  w?: boolean;
  a?: boolean;
  s?: boolean;
  d?: boolean;
  arrowUp?: boolean;
  arrowDown?: boolean;
  arrowLeft?: boolean;
  arrowRight?: boolean;
  shift?: boolean;
  space?: boolean;
  r?: boolean;
}

export type ShortcutAction =
  | 'toggleMode'
  | 'intelligence'
  | 'mute'
  | 'pause'
  | 'call'
  | 'experimentPosition'
  | 'experimentShape'
  | 'experimentReversal';

export function keyboardIntent(keys: KeyboardState, energy: number): PlayerIntent {
  return {
    x: (keys.d || keys.arrowRight ? 1 : 0) - (keys.a || keys.arrowLeft ? 1 : 0),
    y: (keys.s || keys.arrowDown ? 1 : 0) - (keys.w || keys.arrowUp ? 1 : 0),
    boost: Boolean(keys.shift && energy > 12),
    interact: Boolean(keys.space),
    rest: Boolean(keys.r),
  };
}

export function actionForKey(key: string): ShortcutAction | undefined {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  const mapping: Record<string, ShortcutAction> = {
    Tab: 'toggleMode',
    d: 'intelligence',
    m: 'mute',
    p: 'pause',
    e: 'call',
    '1': 'experimentPosition',
    '2': 'experimentShape',
    '3': 'experimentReversal',
  };
  return mapping[normalized];
}

export function touchVector(dx: number, dy: number, deadZone = 10): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length < deadZone) return { x: 0, y: 0 };
  const divisor = Math.max(1, length);
  return { x: dx / divisor, y: dy / divisor };
}
