import { BALANCE } from './config/balance';

export const WORLD_LAYOUT = {
  width: BALANCE.world.width,
  height: BALANCE.world.height,
  waterSurfaceY: BALANCE.world.waterSurfaceY,
  seaFloorY: BALANCE.world.seaFloorY,
  land: { x: 0, y: 110, width: 335, height: 150 },
  shallow: { x: 330, y: 215, width: 470, height: 390 },
  deep: { x: 800, y: 215, width: 800, height: 575 },
  experimentPlatform: { x: 1_210, y: 280, width: 300, height: 34 },
} as const;

export type BayZone = 'land' | 'surface' | 'shallow' | 'deep' | 'seabed';

export function zoneAt(x: number, y: number): BayZone {
  if (x < 335 && y <= 230) return 'land';
  if (y <= WORLD_LAYOUT.waterSurfaceY + 18) return 'surface';
  if (y >= 760) return 'seabed';
  return x < 800 || y < 450 ? 'shallow' : 'deep';
}

export const PHASER_GAME_CONFIG = {
  width: WORLD_LAYOUT.width,
  height: WORLD_LAYOUT.height,
  backgroundColor: '#082f46',
} as const;
