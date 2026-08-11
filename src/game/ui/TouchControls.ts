import Phaser from 'phaser';
import type { PlayerIntent } from '../systems/SimulationSystem';
import { touchVector } from './InputMap';
import { createButton } from './SceneWidgets';

export class TouchControls extends Phaser.GameObjects.Container {
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly base: Phaser.GameObjects.Arc;
  private activePointer?: number;
  private vector = { x: 0, y: 0 };
  private boost = false;
  private interact = false;
  private rest = false;
  private readonly touchDevice: boolean;

  constructor(scene: Phaser.Scene, onMode: () => void, onCall: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.base = scene.add.circle(124, 760, 72, 0x082a38, 0.46).setStrokeStyle(3, 0xb8e1d9, 0.72);
    this.knob = scene.add.circle(124, 760, 30, 0xf4d28a, 0.76);
    this.base.setInteractive(new Phaser.Geom.Circle(72, 72, 82), Phaser.Geom.Circle.Contains);
    this.base.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.activePointer = pointer.id; this.updateStick(pointer.x, pointer.y); });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.activePointer && pointer.isDown) this.updateStick(pointer.x, pointer.y);
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.activePointer) {
        this.activePointer = undefined;
        this.vector = { x: 0, y: 0 };
        this.knob.setPosition(124, 760);
      }
    });
    const interact = createButton(scene, 1_465, 720, '互动', () => { this.interact = true; }, { width: 210, height: 108 });
    const boost = createButton(scene, 1_310, 810, '加速', () => {}, { width: 190, height: 104 });
    boost.on('pointerdown', () => { this.boost = true; });
    boost.on('pointerup', () => { this.boost = false; });
    boost.on('pointerout', () => { this.boost = false; });
    const call = createButton(scene, 1_310, 690, '叫声', onCall, { width: 190, height: 104 });
    const rest = createButton(scene, 1_465, 840, '休息', () => { this.rest = !this.rest; }, { width: 210, height: 104 });
    const mode = createButton(scene, 1_465, 590, '切换模式', onMode, { width: 230, height: 104 });
    this.add([this.base, this.knob, interact, boost, call, rest, mode]);
    this.touchDevice = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || window.innerWidth < 1_000);
    this.setVisible(this.touchDevice).setScrollFactor(0).setDepth(250);
  }

  setSeaLionMode(active: boolean): void {
    this.setVisible(this.touchDevice && active);
  }

  consumeIntent(): PlayerIntent {
    const result = { x: this.vector.x, y: this.vector.y, boost: this.boost, interact: this.interact, rest: this.rest };
    this.interact = false;
    return result;
  }

  private updateStick(x: number, y: number): void {
    const dx = x - 124;
    const dy = y - 760;
    this.vector = touchVector(dx, dy, 8);
    const radius = Math.min(54, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    this.knob.setPosition(124 + Math.cos(angle) * radius, 760 + Math.sin(angle) * radius);
  }
}
