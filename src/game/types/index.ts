import type { Personality } from '../config/personality';

export type GameMode = 'seaLion' | 'researcher';
export type ScenarioMode = 'free' | 'experiment' | 'birthday';
export type PersonalityPreset = 'curious' | 'cautious' | 'active';

export interface Vector2Like {
  x: number;
  y: number;
}

export interface PhysiologyState {
  hunger: number;
  energy: number;
  oxygen: number;
  temperature: number;
  fear: number;
  curiosity: number;
  trust: number;
}

export type BehaviorId =
  | 'surface'
  | 'seekFish'
  | 'huntFish'
  | 'rest'
  | 'goLand'
  | 'enterWater'
  | 'explore'
  | 'push'
  | 'slap'
  | 'escape'
  | 'approachFamiliar'
  | 'call'
  | 'wander'
  | 'repeatSuccess';

export type InteractionAction = 'approach' | 'push' | 'slap' | 'open' | 'hunt' | 'call';
export type ObjectType =
  | 'fish'
  | 'buoy'
  | 'button'
  | 'crate'
  | 'foodBox'
  | 'ring'
  | 'obstacle'
  | 'soundDevice'
  | 'birthdayBox';

export interface WorldObjectSnapshot {
  id: string;
  type: ObjectType;
  feature: string;
  position: Vector2Like;
  novel: boolean;
  reward: number;
  risk: number;
  distance: number;
  enabled: boolean;
}

export interface FishSnapshot {
  id: string;
  position: Vector2Like;
  distance: number;
  fleeing: boolean;
  relativeAngle: number;
}

export interface PerceptionSnapshot {
  isUnderwater: boolean;
  isAtSurface: boolean;
  isOnLand: boolean;
  surfaceDistance: number;
  nearestFish?: FishSnapshot;
  nearestNovelObject?: WorldObjectSnapshot;
  nearestFamiliarObject?: WorldObjectSnapshot;
  dangerSource?: WorldObjectSnapshot;
  interactableObject?: WorldObjectSnapshot;
}

export type MemoryType =
  | 'foodLocation'
  | 'successfulAction'
  | 'failedAction'
  | 'dangerLocation'
  | 'familiarObject'
  | 'researcherTrust';

export interface MemoryEntry {
  id: string;
  objectId: string;
  objectType: ObjectType | 'researcher' | 'location';
  feature: string;
  position: Vector2Like;
  action: InteractionAction;
  success: boolean;
  reward: number;
  risk: number;
  strength: number;
  createdAt: number;
  lastUsedAt: number;
  uses: number;
  type: MemoryType;
}

export interface LearningKey {
  objectType: ObjectType;
  feature: string;
  action: InteractionAction;
}

export interface LearnedValue extends LearningKey {
  key: string;
  value: number;
  attempts: number;
  successes: number;
  updatedAt: number;
}

export interface ScoreFactor {
  label: string;
  value: number;
}

export interface BehaviorScore {
  behavior: BehaviorId;
  score: number;
  factors: ScoreFactor[];
  targetId?: string;
}

export interface Decision {
  behavior: BehaviorId;
  targetId?: string;
  startedAt: number;
  lockedUntil: number;
  scores: BehaviorScore[];
  reason: ScoreFactor[];
}

export interface BehaviorLogEntry {
  id: string;
  at: number;
  behavior: BehaviorId;
  message: string;
  result?: 'success' | 'failure' | 'neutral';
}

export interface SettingsState {
  muted: boolean;
  volume: number;
  detailedStatus: boolean;
  reducedMotion: boolean;
}

export interface ExperimentRecord {
  id: 'position' | 'shape' | 'reversal';
  attempts: number;
  successes: number;
  preferredFeature: string;
  recentBehavior: string;
  learningDelta: number;
  completed: boolean;
}

export interface GameSave {
  saveVersion: '1.0';
  savedAt: number;
  seaLion: {
    name: string;
    personalityPreset: PersonalityPreset;
    personality: Personality;
  };
  physiology: PhysiologyState;
  learning: LearnedValue[];
  memories: MemoryEntry[];
  settings: SettingsState;
  birthdayCompleted: boolean;
  experiments: ExperimentRecord[];
}

export interface RandomSource {
  next(): number;
}

export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
