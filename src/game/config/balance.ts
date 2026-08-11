export const BALANCE = {
  physiology: {
    hungerGainPerSecond: 0.08,
    oxygenLossPerSecond: 3.2,
    oxygenRecoveryPerSecond: 18,
    swimEnergyLossPerSecond: 0.22,
    boostEnergyLossPerSecond: 1.1,
    restEnergyGainPerSecond: 1.25,
    landRestMultiplier: 1.3,
    fearRecoveryPerSecond: 0.18,
    curiosityRecoveryPerSecond: 0.05,
    coldWaterTemperatureLossPerSecond: 0.025,
    warmRestTemperatureGainPerSecond: 0.06,
  },
  ai: {
    decisionIntervalMs: 800,
    emergencyOxygen: 18,
    criticalEnergy: 12,
    extremeFear: 78,
    minimumExplorationRate: 0.08,
  },
  memory: {
    capacity: 50,
    decayPerSecond: 0.0008,
    pruneBelow: 0.08,
  },
  world: {
    width: 1600,
    height: 900,
    waterSurfaceY: 215,
    seaFloorY: 790,
  },
} as const;
