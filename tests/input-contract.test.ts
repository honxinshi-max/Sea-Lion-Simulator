import { describe, expect, it } from 'vitest';
import { actionForKey, keyboardIntent, touchVector } from '../src/game/ui/InputMap';

describe('input contracts', () => {
  it('maps WASD and arrows to normalized movement', () => {
    expect(keyboardIntent({ w: true, d: true }, 80)).toEqual({ x: 1, y: -1, boost: false, interact: false, rest: false });
    expect(keyboardIntent({ arrowDown: true, arrowLeft: true }, 80)).toEqual({ x: -1, y: 1, boost: false, interact: false, rest: false });
  });

  it('maps boost, interaction and rest while protecting critical energy', () => {
    expect(keyboardIntent({ shift: true, space: true, r: true }, 80)).toMatchObject({ boost: true, interact: true, rest: true });
    expect(keyboardIntent({ shift: true }, 5).boost).toBe(false);
  });

  it('maps named shortcut actions', () => {
    expect(actionForKey('Tab')).toBe('toggleMode');
    expect(actionForKey('d')).toBe('intelligence');
    expect(actionForKey('m')).toBe('mute');
    expect(actionForKey('p')).toBe('pause');
    expect(actionForKey('e')).toBe('call');
    expect(actionForKey('1')).toBe('experimentPosition');
    expect(actionForKey('2')).toBe('experimentShape');
    expect(actionForKey('3')).toBe('experimentReversal');
  });

  it('normalizes touch displacement and applies a dead zone', () => {
    expect(touchVector(3, 4, 12)).toEqual({ x: 0, y: 0 });
    const vector = touchVector(60, -80, 10);
    expect(vector.x).toBeCloseTo(0.6, 5);
    expect(vector.y).toBeCloseTo(-0.8, 5);
  });
});
