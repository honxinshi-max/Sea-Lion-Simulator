import Phaser from 'phaser';
import type { IntelligenceModel } from './IntelligencePanel';
import { createButton, panelBackground } from './SceneWidgets';

export class IntelligenceOverlay extends Phaser.GameObjects.Container {
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly candidatesText: Phaser.GameObjects.Text;
  private readonly factorsText: Phaser.GameObjects.Text;
  private readonly memoriesText: Phaser.GameObjects.Text;
  private readonly valuesText: Phaser.GameObjects.Text;
  private readonly explorationText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 278, 120);
    scene.add.existing(this);
    const bg = panelBackground(scene, 1_020, 650).setOrigin(0, 0);
    this.titleText = scene.add.text(28, 20, '智能观察', style(26, '#f7d78c', '700'));
    const close = createButton(scene, 945, 32, '关闭', onClose, { width: 104, small: true });
    this.candidatesText = scene.add.text(28, 86, '', style(17)).setLineSpacing(7);
    this.factorsText = scene.add.text(350, 86, '', style(17)).setLineSpacing(7);
    this.memoriesText = scene.add.text(28, 340, '', style(16)).setLineSpacing(6).setWordWrapWidth(450);
    this.valuesText = scene.add.text(520, 340, '', style(16)).setLineSpacing(6).setWordWrapWidth(450);
    this.explorationText = scene.add.text(350, 285, '', style(18, '#9ed8d4', '700'));
    this.add([bg, this.titleText, close, this.candidatesText, this.factorsText, this.memoriesText, this.valuesText, this.explorationText]);
    this.setScrollFactor(0).setDepth(400).setVisible(false);
  }

  render(model: IntelligenceModel): void {
    this.titleText.setText(model.title);
    this.candidatesText.setText(`候选行为\n\n${model.candidates.join('\n')}`);
    this.factorsText.setText(`主要因素\n\n${model.selectedFactors.join('\n') || '暂无'}`);
    this.memoriesText.setText(`最近 5 条记忆\n\n${model.memories.join('\n') || '还没有形成记忆'}`);
    this.valuesText.setText(`已学习的对象—动作价值\n\n${model.values.join('\n') || '尚未学习'}`);
    this.explorationText.setText(model.explorationText);
  }
}

function style(size: number, color = '#eef8f5', fontStyle = '400'): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle };
}
