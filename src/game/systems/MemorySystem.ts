import type { InteractionAction, MemoryEntry, MemoryType, ObjectType } from '../types';
import { BALANCE } from '../config/balance';

export interface RememberInput {
  objectId: string;
  objectType: ObjectType | 'researcher' | 'location';
  feature: string;
  position: { x: number; y: number };
  action: InteractionAction;
  success: boolean;
  reward: number;
  risk: number;
  now: number;
  type: MemoryType;
}

export class MemorySystem {
  private entries: MemoryEntry[] = [];
  private sequence = 0;

  constructor(initial: MemoryEntry[] = [], private readonly capacity = BALANCE.memory.capacity) {
    this.entries = initial.map((entry) => ({ ...entry, position: { ...entry.position } }));
    this.enforceCapacity();
  }

  remember(input: RememberInput): MemoryEntry {
    const existingIndex = this.entries.findIndex(
      (entry) =>
        entry.objectId === input.objectId &&
        entry.feature === input.feature &&
        entry.action === input.action &&
        entry.success === input.success,
    );
    if (existingIndex >= 0) {
      const existing = this.entries[existingIndex]!;
      const gain = 0.12 + Math.abs(input.reward) * 0.08 + input.risk * 0.05;
      const updated: MemoryEntry = {
        ...existing,
        position: { ...input.position },
        reward: (existing.reward * existing.uses + input.reward) / (existing.uses + 1),
        risk: Math.max(existing.risk, input.risk),
        strength: Math.min(1, existing.strength + gain),
        lastUsedAt: input.now,
        uses: existing.uses + 1,
        type: input.type,
      };
      this.entries[existingIndex] = updated;
      return cloneEntry(updated);
    }

    const base = input.success ? 0.35 : 0.18;
    const entry: MemoryEntry = {
      id: `memory-${input.now}-${this.sequence++}`,
      objectId: input.objectId,
      objectType: input.objectType,
      feature: input.feature,
      position: { ...input.position },
      action: input.action,
      success: input.success,
      reward: input.reward,
      risk: input.risk,
      strength: Math.min(1, base + Math.abs(input.reward) * 0.25 + input.risk * 0.15),
      createdAt: input.now,
      lastUsedAt: input.now,
      uses: 1,
      type: input.type,
    };
    this.entries.push(entry);
    this.enforceCapacity();
    return cloneEntry(entry);
  }

  decay(elapsedSeconds: number): void {
    const elapsed = Math.max(0, elapsedSeconds);
    this.entries = this.entries
      .map((entry) => ({
        ...entry,
        strength: Math.max(
          0,
          entry.strength - (BALANCE.memory.decayPerSecond * elapsed) / (1 + entry.uses * 0.1),
        ),
      }))
      .filter((entry) => entry.strength >= BALANCE.memory.pruneBelow);
  }

  snapshot(): MemoryEntry[] {
    return this.entries
      .slice()
      .sort((a, b) => b.strength - a.strength || b.lastUsedAt - a.lastUsedAt)
      .map(cloneEntry);
  }

  relevant(query: Partial<Pick<MemoryEntry, 'objectType' | 'feature' | 'action'>>): MemoryEntry[] {
    return this.entries
      .filter(
        (entry) =>
          (query.objectType === undefined || entry.objectType === query.objectType) &&
          (query.feature === undefined || entry.feature === query.feature) &&
          (query.action === undefined || entry.action === query.action),
      )
      .sort((a, b) => b.strength - a.strength || b.lastUsedAt - a.lastUsedAt)
      .map(cloneEntry);
  }

  private enforceCapacity(): void {
    if (this.entries.length <= this.capacity) return;
    this.entries = this.entries
      .slice()
      .sort(
        (a, b) =>
          b.strength + b.risk * 0.2 - (a.strength + a.risk * 0.2) ||
          b.lastUsedAt - a.lastUsedAt,
      )
      .slice(0, this.capacity);
  }
}

function cloneEntry(entry: MemoryEntry): MemoryEntry {
  return { ...entry, position: { ...entry.position } };
}
