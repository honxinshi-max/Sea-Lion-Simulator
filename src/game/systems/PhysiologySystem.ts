import type { PhysiologyState } from '../types';
import { clamp } from '../types';
import { BALANCE } from '../config/balance';

export interface PhysiologyContext {
  underwater: boolean;
  atSurface: boolean;
  onLand: boolean;
  moving: boolean;
  boosting: boolean;
  resting: boolean;
}

export function createDefaultPhysiology(overrides: Partial<PhysiologyState> = {}): PhysiologyState {
  const state: PhysiologyState = {
    hunger: 32,
    energy: 86,
    oxygen: 100,
    temperature: 50,
    fear: 12,
    curiosity: 72,
    trust: 42,
    ...overrides,
  };
  return clampPhysiology(state);
}

export function updatePhysiology(
  state: PhysiologyState,
  context: PhysiologyContext,
  dtSeconds: number,
): PhysiologyState {
  const dt = Math.max(0, dtSeconds);
  const rates = BALANCE.physiology;
  const oxygenDelta = context.underwater
    ? -rates.oxygenLossPerSecond * dt
    : context.atSurface || context.onLand
      ? rates.oxygenRecoveryPerSecond * dt
      : 0;
  const movingCost = context.moving ? rates.swimEnergyLossPerSecond * dt : 0;
  const boostCost = context.boosting ? rates.boostEnergyLossPerSecond * dt : 0;
  const restGain = context.resting
    ? rates.restEnergyGainPerSecond * dt * (context.onLand ? rates.landRestMultiplier : 1)
    : 0;
  const temperatureDelta = context.underwater
    ? -rates.coldWaterTemperatureLossPerSecond * dt
    : context.resting
      ? rates.warmRestTemperatureGainPerSecond * dt
      : 0;

  return clampPhysiology({
    hunger: state.hunger + rates.hungerGainPerSecond * dt,
    energy: state.energy - movingCost - boostCost + restGain,
    oxygen: state.oxygen + oxygenDelta,
    temperature: state.temperature + temperatureDelta,
    fear: state.fear - rates.fearRecoveryPerSecond * dt,
    curiosity: state.curiosity + rates.curiosityRecoveryPerSecond * dt,
    trust: state.trust,
  });
}

export function applyMeal(state: PhysiologyState, amount: number): PhysiologyState {
  return clampPhysiology({ ...state, hunger: state.hunger - Math.max(0, amount) });
}

export function clampPhysiology(state: PhysiologyState): PhysiologyState {
  return {
    hunger: clamp(state.hunger),
    energy: clamp(state.energy),
    oxygen: clamp(state.oxygen),
    temperature: clamp(state.temperature),
    fear: clamp(state.fear),
    curiosity: clamp(state.curiosity),
    trust: clamp(state.trust),
  };
}
