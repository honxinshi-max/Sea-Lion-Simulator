import Phaser from 'phaser';
import { PHASER_GAME_CONFIG } from './game/GameConfig';
import { BayScene } from './game/scenes/BayScene';
import { BirthdayScene } from './game/scenes/BirthdayScene';
import { BootScene } from './game/scenes/BootScene';
import { ExperimentScene } from './game/scenes/ExperimentScene';
import { MenuScene } from './game/scenes/MenuScene';
import './styles/main.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: PHASER_GAME_CONFIG.width,
  height: PHASER_GAME_CONFIG.height,
  backgroundColor: PHASER_GAME_CONFIG.backgroundColor,
  scene: [BootScene, MenuScene, BayScene, ExperimentScene, BirthdayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: PHASER_GAME_CONFIG.width,
    height: PHASER_GAME_CONFIG.height,
  },
  input: {
    activePointers: 4,
    touch: { capture: true },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  audio: {
    disableWebAudio: false,
    noAudio: true,
  },
});

const canvas = game.canvas;
canvas.setAttribute('tabindex', '0');
canvas.setAttribute('role', 'application');
canvas.setAttribute('aria-describedby', 'game-help');
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

declare global {
  interface Window {
    __SEA_LION_GAME__?: Phaser.Game;
  }
}

window.__SEA_LION_GAME__ = game;
