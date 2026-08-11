export interface Personality {
  curiosityTrait: number;
  boldness: number;
  patience: number;
  learningRate: number;
  explorationRate: number;
  sociability: number;
  activity: number;
}

export const PERSONALITY_PRESETS = {
  curious: {
    curiosityTrait: 0.88,
    boldness: 0.58,
    patience: 0.58,
    learningRate: 0.32,
    explorationRate: 0.34,
    sociability: 0.58,
    activity: 0.72,
  },
  cautious: {
    curiosityTrait: 0.54,
    boldness: 0.28,
    patience: 0.76,
    learningRate: 0.26,
    explorationRate: 0.16,
    sociability: 0.46,
    activity: 0.48,
  },
  active: {
    curiosityTrait: 0.72,
    boldness: 0.7,
    patience: 0.38,
    learningRate: 0.28,
    explorationRate: 0.29,
    sociability: 0.64,
    activity: 0.94,
  },
} as const satisfies Record<string, Personality>;
