import Phaser from 'phaser';
import type { HUDModel } from './HUD';
import { createButton, panelBackground } from './SceneWidgets';

export interface HUDCallbacks {
  toggleDetails(): void;
  toggleAuto(): void;
  togglePause(): void;
  toggleMute(): void;
  toggleIntelligence(): void;
  save(): void;
  menu(): void;
}

export class GameHUD extends Phaser.GameObjects.Container {
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly modeText: Phaser.GameObjects.Text;
  private readonly behaviorText: Phaser.GameObjects.Text;
  private readonly statTexts: Phaser.GameObjects.Text[] = [];
  private readonly autoButton: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, callbacks: HUDCallbacks) {
    super(scene, 22, 18);
    scene.add.existing(this);
    const background = panelBackground(scene, 590, 164).setOrigin(0, 0);
    this.nameText = scene.add.text(20, 14, '小浪', titleStyle(26));
    this.modeText = scene.add.text(20, 50, '', bodyStyle(17, '#9ed8d4'));
    this.behaviorText = scene.add.text(186, 50, '', bodyStyle(17, '#f7d78c'));
    this.add([background, this.nameText, this.modeText, this.behaviorText]);
    for (let index = 0; index < 7; index += 1) {
      const text = scene.add.text(20 + (index % 4) * 136, 83 + Math.floor(index / 4) * 31, '', bodyStyle(16));
      this.statTexts.push(text);
      this.add(text);
    }
    const details = createButton(scene, 665, 26, '详细状态', callbacks.toggleDetails, { width: 118, small: true });
    this.autoButton = createButton(scene, 795, 26, '自动：开', callbacks.toggleAuto, { width: 120, small: true });
    const intelligence = createButton(scene, 927, 26, '智能观察', callbacks.toggleIntelligence, { width: 126, small: true });
    const save = createButton(scene, 1_059, 26, '保存', callbacks.save, { width: 92, small: true });
    const pause = createButton(scene, 1_159, 26, '暂停', callbacks.togglePause, { width: 92, small: true });
    const mute = createButton(scene, 1_259, 26, '声音', callbacks.toggleMute, { width: 92, small: true });
    const menu = createButton(scene, 1_359, 26, '菜单', callbacks.menu, { width: 92, small: true });
    this.add([details, this.autoButton, intelligence, save, pause, mute, menu]);
    this.setScrollFactor(0).setDepth(200);
  }

  render(model: HUDModel): void {
    this.nameText.setText(model.name);
    this.modeText.setText(model.modeLabel);
    this.behaviorText.setText(`正在：${model.behaviorLabel}`);
    (this.autoButton.getAt(1) as Phaser.GameObjects.Text).setText(model.autoLabel.replace('自动行动：', '自动：'));
    this.statTexts.forEach((text, index) => {
      const stat = model.stats[index];
      text.setVisible(Boolean(stat));
      if (!stat) return;
      const icon = stat.key === 'oxygen' ? '○' : stat.tone === 'need' ? '△' : '●';
      text.setText(`${icon} ${stat.label} ${stat.value}`);
      text.setColor(stat.value < 20 && stat.tone === 'resource' ? '#ffba8a' : stat.value > 78 && stat.tone === 'need' ? '#ffba8a' : '#eef8f5');
    });
  }
}

function titleStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle {
  return { color: '#f8f3df', fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle: '700' };
}

function bodyStyle(size: number, color = '#eef8f5'): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'system-ui, sans-serif', fontSize: `${size}px` };
}
