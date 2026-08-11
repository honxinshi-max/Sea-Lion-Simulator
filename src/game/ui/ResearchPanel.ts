import Phaser from 'phaser';
import type { ExperimentId } from '../systems/ExperimentSystem';
import type { ExperimentRecord, ObjectType } from '../types';
import { createButton, panelBackground } from './SceneWidgets';

export interface ResearchCallbacks {
  place(type: ObjectType, feature: string): void;
  startExperiment(id: ExperimentId): void;
  resetExperiment(): void;
  swapPositions(): void;
  changeRule(): void;
  exitResearch(): void;
}

export class ResearchPanel extends Phaser.GameObjects.Container {
  private logText!: Phaser.GameObjects.Text;
  private experimentText!: Phaser.GameObjects.Text;
  private collapsed = false;
  private readonly content: Phaser.GameObjects.GameObject[] = [];
  private readonly toolPage: Phaser.GameObjects.GameObject[] = [];
  private readonly experimentPage: Phaser.GameObjects.GameObject[] = [];
  private touchPage: 'tools' | 'experiments' = 'tools';
  private readonly touchLayout: boolean;

  constructor(scene: Phaser.Scene, callbacks: ResearchCallbacks) {
    const touchLayout = window.innerHeight <= 500 || navigator.maxTouchPoints > 0;
    super(scene, touchLayout ? 850 : 1_278, touchLayout ? 92 : 94);
    this.touchLayout = touchLayout;
    scene.add.existing(this);
    if (touchLayout) {
      this.buildTouchLayout(scene, callbacks);
      this.setScrollFactor(0).setDepth(190);
      return;
    }
    const bg = panelBackground(scene, 300, 760).setOrigin(0, 0);
    const title = scene.add.text(18, 14, '研究工具台', textStyle(23, '#f7d78c', '700'));
    const collapse = createButton(scene, 246, 27, '收起', () => this.toggleCollapsed(), { width: 78, small: true });
    this.add([bg, title, collapse]);
    const tools: Array<[string, ObjectType, string]> = [
      ['鱼', 'fish', 'silver'], ['浮球', 'buoy', 'yellow'], ['圆形', 'button', 'circle'],
      ['三角', 'button', 'triangle'], ['方形', 'button', 'square'], ['箱子', 'crate', 'crate'],
      ['食物盒', 'foodBox', 'striped'], ['圆环', 'ring', 'blue-ring'], ['障碍', 'obstacle', 'obstacle'],
      ['声音', 'soundDevice', 'sound'],
    ];
    tools.forEach(([label, type, feature], index) => {
      const button = createButton(
        scene,
        73 + (index % 2) * 142,
        85 + Math.floor(index / 2) * 49,
        `＋ ${label}`,
        () => callbacks.place(type, feature),
        { width: 128, small: true },
      );
      this.content.push(button);
      this.add(button);
    });
    const experimentTitle = scene.add.text(18, 326, '可重复实验', textStyle(18, '#9ed8d4', '700'));
    const position = createButton(scene, 73, 372, '位置记忆', () => callbacks.startExperiment('position'), { width: 128, small: true });
    const shape = createButton(scene, 215, 372, '形状学习', () => callbacks.startExperiment('shape'), { width: 128, small: true });
    const reversal = createButton(scene, 73, 422, '规则改变', () => callbacks.startExperiment('reversal'), { width: 128, small: true });
    const swap = createButton(scene, 215, 422, '交换位置', callbacks.swapPositions, { width: 128, small: true });
    const change = createButton(scene, 73, 472, '改变规则', callbacks.changeRule, { width: 128, small: true });
    const reset = createButton(scene, 215, 472, '重置实验', callbacks.resetExperiment, { width: 128, small: true });
    this.experimentText = scene.add.text(18, 508, '尚未开始实验', textStyle(16)).setWordWrapWidth(264).setLineSpacing(5);
    const logTitle = scene.add.text(18, 610, '最近行为', textStyle(18, '#9ed8d4', '700'));
    this.logText = scene.add.text(18, 642, '等待小浪行动…', textStyle(15)).setWordWrapWidth(264).setLineSpacing(4);
    this.content.push(experimentTitle, position, shape, reversal, swap, change, reset, this.experimentText, logTitle, this.logText);
    this.add(this.content);
    this.setScrollFactor(0).setDepth(190);
  }

  render(record: ExperimentRecord | undefined, logs: string[]): void {
    this.experimentText.setText(record
      ? `尝试 ${record.attempts} · 成功 ${record.successes}\n偏好：${record.preferredFeature}\n最近：${record.recentBehavior}\n学习变化：${signed(record.learningDelta)}\n${record.completed ? '✓ 实验观察完成' : '观察进行中'}`
      : '选择一个实验开始。结果来自小浪自己的尝试。');
    this.logText.setText(logs.length ? logs.slice(-4).reverse().join('\n') : '等待小浪行动…');
  }

  private toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.content.forEach((item) => (item as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(!this.collapsed));
    const background = this.getAt(0) as Phaser.GameObjects.Rectangle;
    const width = this.touchLayout ? 720 : 300;
    const height = this.touchLayout ? 750 : 760;
    background.setSize(width, this.collapsed ? 76 : height).setDisplaySize(width, this.collapsed ? 76 : height);
    if (!this.collapsed && this.touchLayout) this.applyTouchPageVisibility();
  }

  private buildTouchLayout(scene: Phaser.Scene, callbacks: ResearchCallbacks): void {
    const bg = panelBackground(scene, 720, 750).setOrigin(0, 0);
    const title = scene.add.text(22, 20, '研究工具台', textStyle(28, '#f7d78c', '700'));
    const collapse = createButton(scene, 600, 52, '返回海狮', callbacks.exitResearch, { width: 210, height: 104, small: true });
    const toolsTab = createButton(scene, 180, 125, '放置物体', () => { this.touchPage = 'tools'; this.applyTouchPageVisibility(); }, { width: 320, height: 104, accent: true });
    const experimentsTab = createButton(scene, 540, 125, '实验与记录', () => { this.touchPage = 'experiments'; this.applyTouchPageVisibility(); }, { width: 320, height: 104 });
    this.add([bg, title, collapse, toolsTab, experimentsTab]);
    this.content.push(toolsTab, experimentsTab);

    const tools: Array<[string, ObjectType, string]> = [
      ['鱼', 'fish', 'silver'], ['浮球', 'buoy', 'yellow'], ['圆形按钮', 'button', 'circle'],
      ['三角按钮', 'button', 'triangle'], ['方形按钮', 'button', 'square'], ['箱子', 'crate', 'crate'],
      ['食物盒', 'foodBox', 'striped'], ['圆环', 'ring', 'blue-ring'], ['障碍', 'obstacle', 'obstacle'],
      ['声音装置', 'soundDevice', 'sound'],
    ];
    tools.forEach(([label, type, feature], index) => {
      const button = createButton(
        scene,
        180 + (index % 2) * 360,
        235 + Math.floor(index / 2) * 110,
        `＋ ${label}`,
        () => callbacks.place(type, feature),
        { width: 320, height: 104, small: true },
      );
      this.toolPage.push(button);
      this.content.push(button);
      this.add(button);
    });

    const actions: Array<[string, () => void]> = [
      ['位置记忆', () => callbacks.startExperiment('position')],
      ['形状学习', () => callbacks.startExperiment('shape')],
      ['规则改变', () => callbacks.startExperiment('reversal')],
      ['交换位置', callbacks.swapPositions],
      ['改变规则', callbacks.changeRule],
      ['重置实验', callbacks.resetExperiment],
    ];
    actions.forEach(([label, action], index) => {
      const button = createButton(
        scene,
        180 + (index % 2) * 360,
        235 + Math.floor(index / 2) * 110,
        label,
        action,
        { width: 320, height: 104, small: true },
      );
      this.experimentPage.push(button);
      this.content.push(button);
      this.add(button);
    });
    this.experimentText = scene.add.text(28, 525, '尚未开始实验', textStyle(19)).setWordWrapWidth(655).setLineSpacing(5);
    this.logText = scene.add.text(28, 640, '等待小浪行动…', textStyle(17)).setWordWrapWidth(655).setLineSpacing(4);
    this.experimentPage.push(this.experimentText, this.logText);
    this.content.push(this.experimentText, this.logText);
    this.add([this.experimentText, this.logText]);
    this.applyTouchPageVisibility();

    const allButtons = [collapse, toolsTab, experimentsTab, ...this.toolPage, ...this.experimentPage]
      .filter((item): item is Phaser.GameObjects.Container => item instanceof Phaser.GameObjects.Container);
    allButtons.forEach((button) => button.disableInteractive());
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 720, 750), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (_pointer: Phaser.Input.Pointer, localX: number, localY: number) => {
      if (localY <= 104 && localX >= 480) {
        callbacks.exitResearch();
        return;
      }
      if (localY >= 72 && localY <= 178) {
        this.touchPage = localX < 360 ? 'tools' : 'experiments';
        this.applyTouchPageVisibility();
        return;
      }
      if (localY < 183 || localY > 727) return;
      const column = localX < 360 ? 0 : 1;
      const row = Math.floor((localY - 183) / 110);
      const index = row * 2 + column;
      if (this.touchPage === 'tools') {
        const tool = tools[index];
        if (tool) callbacks.place(tool[1], tool[2]);
      } else actions[index]?.[1]();
    });
  }

  private applyTouchPageVisibility(): void {
    if (!this.touchLayout || this.collapsed) return;
    this.setPageVisible(this.toolPage, this.touchPage === 'tools');
    this.setPageVisible(this.experimentPage, this.touchPage === 'experiments');
  }

  private setPageVisible(items: Phaser.GameObjects.GameObject[], visible: boolean): void {
    items.forEach((item) => {
      (item as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(visible);
    });
  }
}

function textStyle(size: number, color = '#eef8f5', fontStyle = '400'): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle };
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}
