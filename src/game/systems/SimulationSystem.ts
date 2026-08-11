import { BALANCE } from '../config/balance';
import { PERSONALITY_PRESETS, type Personality } from '../config/personality';
import type { BehaviorId, BehaviorLogEntry, Decision, InteractionAction, LearnedValue, MemoryEntry, PhysiologyState, RandomSource, WorldObjectSnapshot } from '../types';
import { createDefaultPhysiology, updatePhysiology } from './PhysiologySystem';
import { InteractionSystem } from './InteractionSystem';
import { LearningSystem } from './LearningSystem';
import { MemorySystem } from './MemorySystem';
import { PerceptionSystem, distance } from './PerceptionSystem';
import { UtilityAISystem, type UtilityAIContext } from './UtilityAISystem';

export interface PlayerIntent {
  x: number;
  y: number;
  boost: boolean;
  interact: boolean;
  rest: boolean;
}

export interface SimulationSnapshot {
  time: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  physiology: PhysiologyState;
  decision?: Decision;
  objects: WorldObjectSnapshot[];
  fish: WorldObjectSnapshot[];
  memories: ReturnType<import('./MemorySystem').MemorySystem['snapshot']>;
  learning: ReturnType<import('./LearningSystem').LearningSystem['snapshot']>;
  logs: BehaviorLogEntry[];
  metrics: { decisions: number; surfaceBreaths: number; huntAttempts: number; huntSuccesses: number };
}

export interface SimulationOptions {
  random: RandomSource;
  physiology?: PhysiologyState;
  personality?: Personality;
  memories?: MemoryEntry[];
  learning?: LearnedValue[];
}

export interface SimulationInteractionEvent {
  at: number;
  behavior: BehaviorId;
  objectId: string;
  feature: string;
  action: InteractionAction;
  success: boolean;
  reward: number;
  valueBefore: number;
  valueAfter: number;
  message: string;
}

export class SimulationSystem {
  private time = 0;
  private position = { x: 520, y: 360 };
  private velocity = { x: 0, y: 0 };
  private physiology: PhysiologyState;
  private decision?: Decision;
  private objects: WorldObjectSnapshot[];
  private fish: WorldObjectSnapshot[];
  private logs: BehaviorLogEntry[] = [];
  private metrics = { decisions: 0, surfaceBreaths: 0, huntAttempts: 0, huntSuccesses: 0 };
  private playerIntent?: PlayerIntent;
  private readonly random: RandomSource;
  private readonly personality: Personality;
  private readonly memory: MemorySystem;
  private readonly learning: LearningSystem;
  private readonly perception = new PerceptionSystem();
  private readonly ai: UtilityAISystem;
  private readonly interaction: InteractionSystem;
  private interactionEvents: SimulationInteractionEvent[] = [];
  private lastDecisionStart = -1;
  private lastInteractionAt = -10_000;
  private wasAtSurface = false;
  private guidedExploration?: { targetId: string; preferredAction: InteractionAction; strength: number };

  constructor(options: SimulationOptions) {
    this.random = options.random;
    this.personality = options.personality ?? PERSONALITY_PRESETS.curious;
    this.physiology = options.physiology ? { ...options.physiology } : createDefaultPhysiology();
    this.memory = new MemorySystem(options.memories);
    this.learning = new LearningSystem({
      learningRate: this.personality.learningRate,
      explorationRate: this.personality.explorationRate,
    }, options.learning);
    this.ai = new UtilityAISystem(() => this.random.next());
    this.interaction = new InteractionSystem(this.memory, this.learning, () => this.random.next());
    this.objects = [
      this.makeObject('natural-buoy', 'buoy', 'yellow', 720, 250, 0, 0.05),
      this.makeObject('natural-ring', 'ring', 'blue-ring', 1_160, 410, 0, 0.04),
    ];
    this.fish = Array.from({ length: 5 }, (_, index) => this.spawnFish(index));
  }

  step(milliseconds: number): void {
    let remaining = Math.max(0, milliseconds);
    while (remaining > 0) {
      const slice = Math.min(100, remaining);
      this.fixedStep(slice);
      remaining -= slice;
    }
  }

  placeObject(object: WorldObjectSnapshot): void {
    const copy = { ...object, position: { ...object.position } };
    const collection = copy.type === 'fish' ? this.fish : this.objects;
    const index = collection.findIndex((existing) => existing.id === copy.id);
    if (index >= 0) collection[index] = copy;
    else collection.push(copy);
  }

  removeExperimentObjects(): void {
    this.objects = this.objects.filter(
      (object) => !object.id.startsWith('research-') && !object.id.startsWith('experiment-'),
    );
    this.fish = this.fish.filter(
      (fish) => !fish.id.startsWith('research-') && !fish.id.startsWith('experiment-'),
    );
  }

  setExplorationAssist(value: number): void {
    this.learning.setExplorationRate(Math.min(1, Math.max(this.personality.explorationRate, value)));
  }

  setGuidedExploration(targetId: string | undefined, preferredAction: InteractionAction = 'approach', strength = 0): void {
    this.guidedExploration = targetId
      ? { targetId, preferredAction, strength: Math.min(1, Math.max(0, strength)) }
      : undefined;
  }

  setPlayerIntent(intent: PlayerIntent | undefined): void {
    this.playerIntent = intent ? { ...intent } : undefined;
  }

  drainEvents(): SimulationInteractionEvent[] {
    const drained = this.interactionEvents.map((event) => ({ ...event }));
    this.interactionEvents = [];
    return drained;
  }

  snapshot(): SimulationSnapshot {
    return {
      time: this.time,
      position: { ...this.position },
      velocity: { ...this.velocity },
      physiology: { ...this.physiology },
      ...(this.decision ? { decision: structuredClone(this.decision) } : {}),
      objects: this.objects.map(cloneObject),
      fish: this.fish.map(cloneObject),
      memories: this.memory.snapshot(),
      learning: this.learning.snapshot(),
      logs: this.logs.map((entry) => ({ ...entry })),
      metrics: { ...this.metrics },
    };
  }

  private fixedStep(milliseconds: number): void {
    const dt = milliseconds / 1_000;
    this.time += milliseconds;
    this.updateFish(dt);
    const sensed = this.perception.sense(this.position, this.objects, this.fish, this.memory.snapshot());
    let moving = false;
    let boosting = false;
    let resting = false;

    if (this.playerIntent) {
      const playerBehavior = this.playerBehavior(this.playerIntent, sensed);
      const playerFactor = { label: '玩家控制', value: 1 };
      this.decision = {
        behavior: playerBehavior,
        startedAt: this.time,
        lockedUntil: this.time,
        scores: [{ behavior: playerBehavior, score: 1, factors: [playerFactor] }],
        reason: [playerFactor],
      };
      const length = Math.max(1, Math.hypot(this.playerIntent.x, this.playerIntent.y));
      const speed = this.playerIntent.boost && this.physiology.energy > BALANCE.ai.criticalEnergy ? 310 : 175;
      this.velocity.x = (this.playerIntent.x / length) * speed;
      this.velocity.y = (this.playerIntent.y / length) * speed;
      moving = !this.playerIntent.rest && (Math.abs(this.playerIntent.x) > 0.02 || Math.abs(this.playerIntent.y) > 0.02);
      boosting = this.playerIntent.boost && moving;
      resting = this.playerIntent.rest;
      if (moving) this.integrate(dt);
      else this.velocity = { x: 0, y: 0 };
      if (this.playerIntent.interact && this.time - this.lastInteractionAt > 500) {
        this.tryPlayerInteraction(sensed, speed);
        this.playerIntent.interact = false;
      }
    } else {
      const context = this.aiContext(sensed);
      this.decision = this.ai.decide(context, this.time);
      if (this.decision.startedAt !== this.lastDecisionStart) {
        this.lastDecisionStart = this.decision.startedAt;
        this.metrics.decisions += 1;
        this.log(this.decision.behavior, `选择：${behaviorName(this.decision.behavior)}`);
      }
      const motion = this.applyAutonomousBehavior(this.decision, sensed, dt);
      moving = motion.moving;
      boosting = motion.boosting;
      resting = motion.resting;
    }

    const afterSense = this.perception.sense(this.position, this.objects, this.fish, this.memory.snapshot());
    this.physiology = updatePhysiology(
      this.physiology,
      {
        underwater: afterSense.isUnderwater,
        atSurface: afterSense.isAtSurface,
        onLand: afterSense.isOnLand,
        moving,
        boosting,
        resting,
      },
      dt,
    );
    if (afterSense.isAtSurface && !this.wasAtSurface) {
      this.metrics.surfaceBreaths += 1;
      this.log('surface', '浮到水面换气', 'success');
    }
    this.wasAtSurface = afterSense.isAtSurface;
    this.memory.decay(dt);
  }

  private playerBehavior(
    intent: PlayerIntent,
    sensed: ReturnType<PerceptionSystem['sense']>,
  ): BehaviorId {
    if (intent.rest) return 'rest';
    if (intent.interact && sensed.nearestFish && sensed.nearestFish.distance <= 65) return 'huntFish';
    if (intent.interact && sensed.interactableObject) {
      if (sensed.interactableObject.type === 'button' || sensed.interactableObject.type === 'foodBox') return 'slap';
      if (sensed.interactableObject.type === 'crate' || sensed.interactableObject.type === 'birthdayBox') return 'push';
      return 'explore';
    }
    if (intent.y < -0.25) return 'surface';
    return 'wander';
  }

  private aiContext(perception: ReturnType<PerceptionSystem['sense']>): UtilityAIContext {
    const nearest = perception.interactableObject ?? perception.nearestNovelObject;
    const learnedReward: Partial<Record<BehaviorId, number>> = {
      huntFish: this.learning.value({ objectType: 'fish', feature: 'silver', action: 'hunt' }),
      explore: nearest ? this.learning.value({ objectType: nearest.type, feature: nearest.feature, action: 'approach' }) : 0,
      push: nearest ? this.learning.value({ objectType: nearest.type, feature: nearest.feature, action: 'push' }) : 0,
      slap: nearest ? this.learning.value({ objectType: nearest.type, feature: nearest.feature, action: 'slap' }) : 0,
    };
    const successful = this.memory.snapshot().filter((entry) => entry.success);
    const guidedObject = this.guidedExploration
      ? this.objects.find((object) => object.id === this.guidedExploration!.targetId)
      : undefined;
    learnedReward.repeatSuccess = Math.max(0, ...successful.map((entry) => entry.reward * entry.strength));
    return {
      physiology: this.physiology,
      personality: this.personality,
      perception,
      learnedReward,
      memoryInfluence: {
        huntFish: this.memory.relevant({ objectType: 'fish', action: 'hunt' }).reduce((sum, item) => sum + (item.success ? 1 : -1) * item.strength * 16, 0),
        explore: successful.filter((item) => item.type === 'familiarObject').reduce((sum, item) => sum + item.strength * 4, 0),
        escape: this.memory.snapshot().filter((item) => item.type === 'dangerLocation').reduce((sum, item) => sum + item.strength * item.risk * 24, 0),
      },
      explorationRate: this.learning.currentExplorationRate(),
      ...(guidedObject && this.guidedExploration ? {
        guidance: {
          targetId: guidedObject.id,
          objectType: guidedObject.type,
          feature: guidedObject.feature,
          distance: distance(this.position, guidedObject.position),
          preferredAction: this.guidedExploration.preferredAction,
          strength: this.guidedExploration.strength,
        },
      } : {}),
    };
  }

  private applyAutonomousBehavior(
    decision: Decision,
    sensed: ReturnType<PerceptionSystem['sense']>,
    dt: number,
  ): { moving: boolean; boosting: boolean; resting: boolean } {
    const behavior = decision.behavior;
    const focusedObject = decision.targetId
      ? this.objects.find((object) => object.id === decision.targetId)
      : undefined;
    const focusedSnapshot = focusedObject
      ? { ...focusedObject, position: { ...focusedObject.position }, distance: distance(this.position, focusedObject.position) }
      : undefined;
    let target: { x: number; y: number } | undefined;
    let speed = 145;
    let boosting = false;
    if (behavior === 'surface') target = { x: this.position.x, y: BALANCE.world.waterSurfaceY };
    else if (behavior === 'huntFish' || behavior === 'seekFish') {
      target = sensed.nearestFish?.position;
      speed = behavior === 'huntFish' && this.physiology.energy > BALANCE.ai.criticalEnergy ? 270 : 175;
      boosting = speed > 200;
    } else if (behavior === 'goLand') target = { x: 245, y: 190 };
    else if (behavior === 'enterWater') target = { x: 430, y: 320 };
    else if (behavior === 'escape' && sensed.dangerSource) {
      target = {
        x: this.position.x + (this.position.x - sensed.dangerSource.position.x),
        y: this.position.y + (this.position.y - sensed.dangerSource.position.y),
      };
      speed = 260;
      boosting = true;
    } else if (behavior === 'explore') target = focusedSnapshot?.position ?? sensed.nearestNovelObject?.position;
    else if (behavior === 'approachFamiliar') target = sensed.nearestFamiliarObject?.position;
    else if (behavior === 'push' || behavior === 'slap' || behavior === 'repeatSuccess') {
      target = focusedSnapshot?.position ?? sensed.interactableObject?.position ?? sensed.nearestNovelObject?.position;
    } else if (behavior === 'wander') {
      target = {
        x: 800 + Math.sin(this.time / 4_300) * 520,
        y: 400 + Math.sin(this.time / 2_700) * 170,
      };
    }

    const resting = behavior === 'rest';
    if (target) this.moveToward(target, speed, dt);
    else this.velocity = { x: 0, y: 0 };

    if ((behavior === 'huntFish' || behavior === 'seekFish') && sensed.nearestFish && sensed.nearestFish.distance <= 44) {
      this.tryHunt(sensed.nearestFish.id, sensed.nearestFish.fleeing);
    } else if (
      (behavior === 'explore' || behavior === 'push' || behavior === 'slap' || behavior === 'repeatSuccess') &&
      (focusedSnapshot ?? sensed.interactableObject) &&
      (focusedSnapshot ?? sensed.interactableObject)!.distance <= 92 &&
      this.time - this.lastInteractionAt > 1_000
    ) {
      const action = behavior === 'push' ? 'push' : behavior === 'slap' || behavior === 'repeatSuccess' ? 'slap' : 'approach';
      this.resolveInteraction(behavior, (focusedSnapshot ?? sensed.interactableObject)!, action, speed);
    }
    return { moving: Boolean(target), boosting, resting };
  }

  private tryHunt(fishId: string, fleeing: boolean): void {
    if (this.time - this.lastInteractionAt <= 850) return;
    const fish = this.fish.find((item) => item.id === fishId);
    if (!fish) return;
    const fishSnapshot = { ...fish, distance: distance(this.position, fish.position) };
    const result = this.resolveInteraction(
      'huntFish',
      fishSnapshot,
      'hunt',
      Math.hypot(this.velocity.x, this.velocity.y),
      fleeing,
      0.12,
    );
    this.metrics.huntAttempts += 1;
    if (result.success) {
      this.metrics.huntSuccesses += 1;
      const index = this.fish.indexOf(fish);
      this.fish[index] = this.spawnFish(Number(fish.id.split('-').at(-1) ?? index));
    }
  }

  private tryPlayerInteraction(
    sensed: ReturnType<PerceptionSystem['sense']>,
    speed: number,
  ): void {
    const fish = sensed.nearestFish && sensed.nearestFish.distance <= 65
      ? this.fish.find((item) => item.id === sensed.nearestFish!.id)
      : undefined;
    if (fish) {
      this.tryHunt(fish.id, sensed.nearestFish?.fleeing ?? false);
      return;
    }
    const object = sensed.interactableObject;
    if (!object || object.distance > 115) return;
    const action: InteractionAction =
      object.type === 'button' || object.type === 'foodBox'
        ? 'slap'
        : object.type === 'crate' || object.type === 'birthdayBox'
          ? 'push'
          : 'approach';
    const behavior: BehaviorId = action === 'slap' ? 'slap' : action === 'push' ? 'push' : 'explore';
    this.resolveInteraction(behavior, object, action, speed);
  }

  private resolveInteraction(
    behavior: BehaviorId,
    object: WorldObjectSnapshot,
    action: InteractionAction,
    speed: number,
    fishFleeing?: boolean,
    relativeAngle?: number,
  ): ReturnType<InteractionSystem['resolve']> {
    const key = { objectType: object.type, feature: object.feature, action };
    const valueBefore = this.learning.value(key);
    const result = this.interaction.resolve({
      object,
      action,
      physiology: this.physiology,
      now: this.time,
      speed,
      ...(fishFleeing === undefined ? {} : { fishFleeing }),
      ...(relativeAngle === undefined ? {} : { relativeAngle }),
    });
    this.physiology = result.physiology;
    this.lastInteractionAt = this.time;
    this.log(behavior, result.message, result.success ? 'success' : 'failure');
    this.interactionEvents.push({
      at: this.time,
      behavior,
      objectId: object.id,
      feature: object.feature,
      action,
      success: result.success,
      reward: result.reward,
      valueBefore,
      valueAfter: result.learned.value,
      message: result.message,
    });
    if (this.interactionEvents.length > 50) this.interactionEvents.splice(0, this.interactionEvents.length - 50);
    return result;
  }

  private moveToward(target: { x: number; y: number }, speed: number, dt: number): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.velocity = { x: (dx / length) * speed, y: (dy / length) * speed };
    if (length <= speed * dt) {
      this.position = { x: target.x, y: target.y };
      this.velocity = { x: 0, y: 0 };
    } else this.integrate(dt);
  }

  private integrate(dt: number): void {
    this.position.x = Math.min(1_520, Math.max(80, this.position.x + this.velocity.x * dt));
    this.position.y = Math.min(790, Math.max(130, this.position.y + this.velocity.y * dt));
  }

  private updateFish(dt: number): void {
    for (const fish of this.fish) {
      const awayX = fish.position.x - this.position.x;
      const awayY = fish.position.y - this.position.y;
      const near = Math.hypot(awayX, awayY) < 170;
      const drift = near ? 72 : 18;
      const length = Math.max(1, Math.hypot(awayX, awayY));
      fish.position.x += ((near ? awayX / length : Math.sin(this.time / 1_900 + fish.position.y)) * drift) * dt;
      fish.position.y += ((near ? awayY / length : Math.cos(this.time / 2_300 + fish.position.x)) * drift * 0.45) * dt;
      fish.position.x = Math.min(1_470, Math.max(430, fish.position.x));
      fish.position.y = Math.min(720, Math.max(300, fish.position.y));
    }
  }

  private spawnFish(index: number): WorldObjectSnapshot {
    return this.makeObject(
      `fish-${index}`,
      'fish',
      'silver',
      650 + this.random.next() * 720,
      330 + this.random.next() * 330,
      1,
      0,
    );
  }

  private makeObject(
    id: string,
    type: WorldObjectSnapshot['type'],
    feature: string,
    x: number,
    y: number,
    reward: number,
    risk: number,
  ): WorldObjectSnapshot {
    return { id, type, feature, position: { x, y }, novel: true, reward, risk, distance: 0, enabled: true };
  }

  private log(behavior: BehaviorId, message: string, result?: 'success' | 'failure' | 'neutral'): void {
    this.logs.push({ id: `log-${this.time}-${this.logs.length}`, at: this.time, behavior, message, ...(result ? { result } : {}) });
    if (this.logs.length > 100) this.logs.splice(0, this.logs.length - 100);
  }
}

function cloneObject(object: WorldObjectSnapshot): WorldObjectSnapshot {
  return { ...object, position: { ...object.position } };
}

function behaviorName(behavior: BehaviorId): string {
  const names: Record<BehaviorId, string> = {
    surface: '上浮呼吸',
    seekFish: '寻找鱼群',
    huntFish: '追逐小鱼',
    rest: '休息',
    goLand: '前往岸边',
    enterWater: '滑入水中',
    explore: '探索陌生物',
    push: '推动物体',
    slap: '拍打物体',
    escape: '躲避危险',
    approachFamiliar: '靠近熟悉物',
    call: '发出叫声',
    wander: '自由巡游',
    repeatSuccess: '重复成功动作',
  };
  return names[behavior];
}
