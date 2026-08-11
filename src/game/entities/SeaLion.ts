import Phaser from 'phaser';
import type { BehaviorId, Vector2Like } from '../types';
import { seaLionScaleFor } from './SeaLionVisual';

export class SeaLion extends Phaser.GameObjects.Container {
  private readonly bodyArt: Phaser.GameObjects.Graphics;
  private readonly eye: Phaser.GameObjects.Arc;
  private readonly breath: Phaser.GameObjects.Text;
  private behavior: BehaviorId = 'wander';
  private phase = 0;
  private facing: -1 | 1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.bodyArt = scene.add.graphics();
    this.drawBody();
    this.eye = scene.add.circle(49, -18, 4.2, 0x071a22);
    const eyeGlint = scene.add.circle(50.5, -19.5, 1.2, 0xffffff, 0.9);
    this.breath = scene.add.text(24, -70, '···', {
      color: '#d8fbff',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.add([this.bodyArt, this.eye, eyeGlint, this.breath]);
    this.setSize(160, 86);
    this.setDepth(30);
  }

  updateVisual(position: Vector2Like, velocity: Vector2Like, behavior: BehaviorId, deltaMs: number): void {
    this.setPosition(position.x, position.y);
    this.phase += deltaMs * 0.005;
    if (Math.abs(velocity.x) > 5) this.facing = velocity.x < 0 ? -1 : 1;
    const speed = Math.hypot(velocity.x, velocity.y);
    const angle = speed > 8 ? Math.atan2(velocity.y, Math.abs(velocity.x)) * 0.42 : 0;
    this.rotation = Phaser.Math.Linear(this.rotation, Phaser.Math.Clamp(angle, -0.46, 0.46), 0.12);
    this.y += Math.sin(this.phase) * (behavior === 'rest' ? 2.6 : 1.2);
    this.bodyArt.scaleY = 1 + Math.sin(this.phase * 1.6) * 0.018;
    if (behavior !== this.behavior) this.setBehavior(behavior);
    if (behavior === 'surface') this.breath.setAlpha(0.8 + Math.sin(this.phase * 2) * 0.2);
    else this.breath.setAlpha(0);
    const scale = seaLionScaleFor(behavior, this.facing, this.phase);
    this.setScale(scale.x, scale.y);
  }

  flashInteraction(success: boolean): void {
    this.scene.tweens.add({
      targets: this,
      scaleY: success ? 1.12 : 0.88,
      duration: 110,
      yoyo: true,
      ease: 'Sine.Out',
    });
  }

  private setBehavior(behavior: BehaviorId): void {
    this.behavior = behavior;
    if (behavior === 'slap') this.scene.tweens.add({ targets: this.bodyArt, angle: -8, duration: 90, yoyo: true });
    if (behavior === 'push') this.scene.tweens.add({ targets: this, scaleX: this.scaleX * 1.08, duration: 120, yoyo: true });
    if (behavior === 'call') this.scene.tweens.add({ targets: this, scaleY: 1.08, duration: 130, repeat: 2, yoyo: true });
  }

  private drawBody(): void {
    this.bodyArt.clear();
    this.bodyArt.fillStyle(0x6e6256, 1);
    this.bodyArt.fillEllipse(-10, 2, 126, 58);
    this.bodyArt.fillStyle(0x807267, 1);
    this.bodyArt.fillEllipse(45, -8, 54, 49);
    this.bodyArt.fillStyle(0x95867a, 1);
    this.bodyArt.fillEllipse(68, -3, 31, 22);
    this.bodyArt.fillStyle(0x5a4f47, 1);
    this.bodyArt.fillTriangle(-64, 5, -105, -23, -91, 14);
    this.bodyArt.fillTriangle(-64, 10, -106, 36, -87, 8);
    this.bodyArt.fillStyle(0x5f554c, 1);
    this.bodyArt.fillTriangle(6, 21, -8, 61, 28, 27);
    this.bodyArt.lineStyle(2, 0xd8cbc0, 0.9);
    this.bodyArt.lineBetween(70, -2, 95, -10);
    this.bodyArt.lineBetween(70, 2, 98, 4);
    this.bodyArt.fillStyle(0x2a2421, 1);
    this.bodyArt.fillCircle(82, -3, 4);
  }
}
