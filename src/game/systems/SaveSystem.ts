import { PERSONALITY_PRESETS } from '../config/personality';
import type { GameSave, LearnedValue, MemoryEntry, PersonalityPreset } from '../types';
import { clamp } from '../types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = 'sea-lion-simulator-save';

export function createDefaultSave(now = Date.now()): GameSave {
  return {
    saveVersion: '1.0',
    savedAt: now,
    seaLion: {
      name: '小浪',
      personalityPreset: 'curious',
      personality: { ...PERSONALITY_PRESETS.curious },
    },
    physiology: {
      hunger: 32,
      energy: 86,
      oxygen: 100,
      temperature: 50,
      fear: 12,
      curiosity: 72,
      trust: 42,
    },
    learning: [],
    memories: [],
    settings: {
      muted: false,
      volume: 0.62,
      detailedStatus: false,
      reducedMotion: false,
    },
    birthdayCompleted: false,
    experiments: [],
  };
}

export class SaveSystem {
  constructor(
    private readonly storage: StorageLike,
    private readonly key = SAVE_KEY,
  ) {}

  save(value: GameSave, now = Date.now()): GameSave {
    const safe = sanitizeSave({ ...value, savedAt: now }, now);
    this.storage.setItem(this.key, JSON.stringify(safe));
    return safe;
  }

  load(now = Date.now()): GameSave {
    const raw = this.storage.getItem(this.key);
    if (!raw) return createDefaultSave(now);
    try {
      return sanitizeSave(JSON.parse(raw) as unknown, now);
    } catch {
      return createDefaultSave(now);
    }
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }

  resetLearning(value: GameSave): GameSave {
    return {
      ...value,
      seaLion: { ...value.seaLion, personality: { ...value.seaLion.personality } },
      physiology: { ...value.physiology },
      settings: { ...value.settings },
      learning: [],
      memories: [],
      experiments: [],
    };
  }
}

function sanitizeSave(raw: unknown, now: number): GameSave {
  const fallback = createDefaultSave(now);
  if (!isRecord(raw) || raw.saveVersion !== '1.0') return fallback;
  const seaLion = isRecord(raw.seaLion) ? raw.seaLion : {};
  const physiology = isRecord(raw.physiology) ? raw.physiology : {};
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const preset = isPersonalityPreset(seaLion.personalityPreset)
    ? seaLion.personalityPreset
    : fallback.seaLion.personalityPreset;
  const personality = isRecord(seaLion.personality) ? seaLion.personality : {};
  const basePersonality = PERSONALITY_PRESETS[preset];
  return {
    saveVersion: '1.0',
    savedAt: finiteOr(raw.savedAt, now),
    seaLion: {
      name: typeof seaLion.name === 'string' && seaLion.name.trim() ? seaLion.name.slice(0, 20) : fallback.seaLion.name,
      personalityPreset: preset,
      personality: {
        curiosityTrait: unitOr(personality.curiosityTrait, basePersonality.curiosityTrait),
        boldness: unitOr(personality.boldness, basePersonality.boldness),
        patience: unitOr(personality.patience, basePersonality.patience),
        learningRate: unitOr(personality.learningRate, basePersonality.learningRate),
        explorationRate: unitOr(personality.explorationRate, basePersonality.explorationRate),
        sociability: unitOr(personality.sociability, basePersonality.sociability),
        activity: unitOr(personality.activity, basePersonality.activity),
      },
    },
    physiology: {
      hunger: stateOr(physiology.hunger, fallback.physiology.hunger),
      energy: stateOr(physiology.energy, fallback.physiology.energy),
      oxygen: stateOr(physiology.oxygen, fallback.physiology.oxygen),
      temperature: stateOr(physiology.temperature, fallback.physiology.temperature),
      fear: stateOr(physiology.fear, fallback.physiology.fear),
      curiosity: stateOr(physiology.curiosity, fallback.physiology.curiosity),
      trust: stateOr(physiology.trust, fallback.physiology.trust),
    },
    learning: sanitizeLearning(raw.learning),
    memories: sanitizeMemories(raw.memories),
    settings: {
      muted: typeof settings.muted === 'boolean' ? settings.muted : fallback.settings.muted,
      volume: unitOr(settings.volume, fallback.settings.volume),
      detailedStatus: typeof settings.detailedStatus === 'boolean' ? settings.detailedStatus : false,
      reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : false,
    },
    birthdayCompleted: typeof raw.birthdayCompleted === 'boolean' ? raw.birthdayCompleted : false,
    experiments: Array.isArray(raw.experiments) ? raw.experiments.slice(0, 12) as GameSave['experiments'] : [],
  };
}

function sanitizeLearning(value: unknown): LearnedValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isLearnedValue).slice(0, 100).map((entry) => ({ ...entry }));
}

function sanitizeMemories(value: unknown): MemoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isMemoryEntry).slice(0, 50).map((entry) => ({ ...entry, position: { ...entry.position } }));
}

function isLearnedValue(value: unknown): value is LearnedValue {
  return isRecord(value) && typeof value.key === 'string' && typeof value.feature === 'string' &&
    typeof value.action === 'string' && typeof value.objectType === 'string' &&
    Number.isFinite(value.value) && Number.isFinite(value.attempts) && Number.isFinite(value.successes) && Number.isFinite(value.updatedAt);
}

function isMemoryEntry(value: unknown): value is MemoryEntry {
  return isRecord(value) && typeof value.id === 'string' && typeof value.objectId === 'string' &&
    typeof value.objectType === 'string' && typeof value.feature === 'string' &&
    isRecord(value.position) && Number.isFinite(value.position.x) && Number.isFinite(value.position.y) &&
    typeof value.action === 'string' && typeof value.success === 'boolean' && Number.isFinite(value.strength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stateOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value) : fallback;
}

function unitOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function isPersonalityPreset(value: unknown): value is PersonalityPreset {
  return value === 'curious' || value === 'cautious' || value === 'active';
}
