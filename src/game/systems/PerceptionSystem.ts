import { BALANCE } from '../config/balance';
import type { FishSnapshot, MemoryEntry, PerceptionSnapshot, Vector2Like, WorldObjectSnapshot } from '../types';

export class PerceptionSystem {
  sense(
    position: Vector2Like,
    objects: WorldObjectSnapshot[],
    fishObjects: WorldObjectSnapshot[],
    memories: MemoryEntry[],
  ): PerceptionSnapshot {
    const knownIds = new Set(
      memories
        .filter((memory) => memory.type === 'familiarObject' || memory.type === 'successfulAction')
        .map((memory) => memory.objectId),
    );
    const sensedObjects = objects
      .filter((object) => object.enabled)
      .map((object) => ({
        ...object,
        position: { ...object.position },
        distance: distance(position, object.position),
        novel: !knownIds.has(object.id),
      }))
      .sort((a, b) => a.distance - b.distance);
    const nearestFishObject = fishObjects
      .filter((fish) => fish.enabled)
      .map((fish) => ({ ...fish, distance: distance(position, fish.position) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const nearestFish: FishSnapshot | undefined = nearestFishObject
      ? {
          id: nearestFishObject.id,
          position: { ...nearestFishObject.position },
          distance: nearestFishObject.distance,
          fleeing: nearestFishObject.distance < 170,
          relativeAngle: 0,
        }
      : undefined;
    const nearestNovelObject = sensedObjects.find((object) => object.novel);
    const nearestFamiliarObject = sensedObjects.find((object) => !object.novel);
    const dangerSource = sensedObjects.find((object) => object.risk >= 0.4 && object.distance < 360);
    const interactableObject = sensedObjects.find((object) => object.distance < 180);
    const isOnLand = position.x < 330 && position.y <= BALANCE.world.waterSurfaceY + 4;
    const isAtSurface = !isOnLand && Math.abs(position.y - BALANCE.world.waterSurfaceY) <= 18;
    return {
      isUnderwater: position.y > BALANCE.world.waterSurfaceY + 18,
      isAtSurface,
      isOnLand,
      surfaceDistance: Math.max(0, position.y - BALANCE.world.waterSurfaceY),
      ...(nearestFish ? { nearestFish } : {}),
      ...(nearestNovelObject ? { nearestNovelObject } : {}),
      ...(nearestFamiliarObject ? { nearestFamiliarObject } : {}),
      ...(dangerSource ? { dangerSource } : {}),
      ...(interactableObject ? { interactableObject } : {}),
    };
  }
}

export function distance(first: Vector2Like, second: Vector2Like): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}
