import Phaser from 'phaser';
import type { Vector2Like } from '../types';

export class Fish extends Phaser.GameObjects.Container {
  private readonly tail: Phaser.GameObjects.Triangle;
  private phase = 0;

  constructor(scene: Phaser.Scene, readonly fishId: string, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    const body = scene.add.ellipse(0, 0, 38, 18, 0xbddad7).setStrokeStyle(2, 0x5e8e96, 0.8);
    this.tail = scene.add.triangle(-23, 0, 0, 0, -16, -11, -16, 11, 0x8ebdc0);
    const eye = scene.add.circle(11, -3, 2.4, 0x163743);
    this.add([this.tail, body, eye]);
    this.setDepth(18);
  }

  updateVisual(position: Vector2Like, seaLionX: number, deltaMs: number): void {
    const previousX = this.x;
    this.setPosition(position.x, position.y);
    this.phase += deltaMs * 0.012;
    const direction = position.x - previousX;
    if (Math.abs(direction) > 0.2) this.scaleX = direction < 0 ? -1 : 1;
    this.tail.scaleY = 0.75 + Math.abs(Math.sin(this.phase)) * 0.55;
    const nearby = Math.abs(position.x - seaLionX) < 180;
    this.setAlpha(nearby ? 1 : 0.88);
  }
}
