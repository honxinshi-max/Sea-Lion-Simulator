import Phaser from 'phaser';
import type { WorldObjectSnapshot } from '../types';

export class InteractiveObject extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private dragging = false;

  constructor(scene: Phaser.Scene, readonly objectId: string, snapshot: WorldObjectSnapshot) {
    super(scene, snapshot.position.x, snapshot.position.y);
    scene.add.existing(this);
    this.art = scene.add.graphics();
    this.caption = scene.add.text(0, -48, labelFor(snapshot), {
      color: '#f5fbf7',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: '600',
      backgroundColor: 'rgba(7, 38, 51, .72)',
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5);
    this.add([this.art, this.caption]);
    this.setSize(86, 86).setDepth(22);
    this.redraw(snapshot);
  }

  updateSnapshot(snapshot: WorldObjectSnapshot): void {
    if (!this.dragging) this.setPosition(snapshot.position.x, snapshot.position.y);
    this.caption.setText(labelFor(snapshot));
    this.redraw(snapshot);
  }

  setResearchDraggable(enabled: boolean, onMove: (x: number, y: number) => void): void {
    this.removeAllListeners('dragstart');
    this.removeAllListeners('drag');
    this.removeAllListeners('dragend');
    if (enabled) {
      this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 90, 90), Phaser.Geom.Rectangle.Contains);
      this.scene.input.setDraggable(this);
      this.on('dragstart', () => { this.dragging = true; });
      this.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        this.setPosition(dragX, dragY);
        onMove(dragX, dragY);
      });
      this.on('dragend', () => { this.dragging = false; });
    } else {
      this.dragging = false;
      this.disableInteractive();
    }
  }

  pulse(success: boolean): void {
    this.scene.tweens.add({ targets: this, scale: success ? 1.18 : 0.86, duration: 120, yoyo: true });
  }

  private redraw(snapshot: WorldObjectSnapshot): void {
    const graphics = this.art;
    graphics.clear();
    const rewardColor = snapshot.reward > 0 ? 0xf4c15d : 0x69aeb8;
    if (snapshot.type === 'button') {
      graphics.fillStyle(0x315767, 1).fillRoundedRect(-38, 12, 76, 18, 8);
      graphics.fillStyle(rewardColor, 1);
      if (snapshot.feature === 'circle') graphics.fillCircle(0, 0, 25);
      else if (snapshot.feature === 'triangle') graphics.fillTriangle(0, -28, -28, 24, 28, 24);
      else graphics.fillRoundedRect(-24, -24, 48, 48, 7);
    } else if (snapshot.type === 'crate' || snapshot.type === 'birthdayBox') {
      graphics.fillStyle(snapshot.type === 'birthdayBox' ? 0x7b3f6b : 0x8a6541, 1).fillRoundedRect(-36, -32, 72, 64, 8);
      graphics.lineStyle(4, snapshot.type === 'birthdayBox' ? 0xf4c15d : 0xc09665, 1).strokeRoundedRect(-36, -32, 72, 64, 8);
      graphics.lineBetween(-32, -26, 32, 26).lineBetween(32, -26, -32, 26);
    } else if (snapshot.type === 'foodBox') {
      graphics.fillStyle(0x886648, 1).fillRoundedRect(-35, -27, 70, 54, 7);
      graphics.lineStyle(6, rewardColor, 1).lineBetween(-34, -26, 34, -26);
    } else if (snapshot.type === 'ring') {
      graphics.lineStyle(12, 0xf1a85b, 1).strokeCircle(0, 0, 31);
    } else if (snapshot.type === 'buoy') {
      graphics.fillStyle(0xf0b35d, 1).fillCircle(0, 0, 24);
      graphics.lineStyle(4, 0xf7e4b6, 1).lineBetween(0, 22, 0, 52);
    } else if (snapshot.type === 'obstacle') {
      graphics.fillStyle(0x5c6d6e, 1).fillRoundedRect(-14, -45, 28, 90, 8);
      graphics.lineStyle(4, 0xb0c1b9, 0.8).lineBetween(-12, -25, 12, -8).lineBetween(-12, 8, 12, 25);
    } else if (snapshot.type === 'soundDevice') {
      graphics.fillStyle(0x315767, 1).fillRoundedRect(-30, -26, 60, 52, 10);
      graphics.lineStyle(4, 0xf4c15d, 1).strokeCircle(-4, 0, 12).arc(10, 0, 24, -0.7, 0.7);
    }
  }
}

function labelFor(object: WorldObjectSnapshot): string {
  const features: Record<string, string> = {
    circle: '圆形按钮', triangle: '三角按钮', square: '方形按钮', striped: '条纹食物箱',
    dotted: '圆点食物箱', plain: '素色食物箱', yellow: '浮球', 'blue-ring': '漂浮圆环',
    crate: '可推动箱', sound: '声音装置', obstacle: '障碍', 'birthday-box': '生日箱',
  };
  return `${features[object.feature] ?? object.feature}${object.reward > 0 ? ' · 有奖励' : ''}`;
}
