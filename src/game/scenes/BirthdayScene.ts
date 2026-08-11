import Phaser from 'phaser';
import { BIRTHDAY_CONFIG } from '../config/birthday';
import { BirthdaySystem, type BirthdayStage } from '../systems/BirthdaySystem';
import { SaveSystem } from '../systems/SaveSystem';
import type { SimulationInteractionEvent } from '../systems/SimulationSystem';
import { createButton, panelBackground } from '../ui/SceneWidgets';
import { BayScene } from './BayScene';

export class BirthdayScene extends BayScene {
  private readonly birthday = new BirthdaySystem();
  private stage: BirthdayStage = 'intro';
  private stagePanel?: Phaser.GameObjects.Container;
  private stageText?: Phaser.GameObjects.Text;
  private triangleAssisted = false;
  private circleAssisted = false;
  private puzzleButtonPlaced = false;
  private puzzleApproached = false;
  private trainingErrorSeen = false;
  private reversalOldErrorSeen = false;
  private celebrated = false;
  private lastAssistNudgeAt = -Infinity;

  constructor() {
    super('BirthdayScene', 'birthday');
  }

  create(): void {
    super.create();
    this.paused = true;
    this.setMode('researcher');
    this.openIntroduction();
  }

  protected override processSimulationEvent(event: SimulationInteractionEvent): void {
    super.processSimulationEvent(event);
    this.birthday.record({
      feature: event.feature,
      action: event.action,
      success: event.success,
      at: event.at,
    });
    if (this.stage === 'training' && event.action === 'slap' && !event.success) this.trainingErrorSeen = true;
    if (this.stage === 'reversal' && event.feature === 'circle' && event.action === 'slap' && !event.success) {
      this.reversalOldErrorSeen = true;
    }
    if (this.stage === 'puzzle' && event.feature === 'birthday-box' && event.action === 'push' && event.success && !this.puzzleButtonPlaced) {
      this.puzzleButtonPlaced = true;
      this.placeResearchObject('button', 'triangle', {
        id: 'research-birthday-triangle',
        position: { x: 930, y: 430 },
        reward: 1,
      });
      this.showToast('生日箱移动了，旁边出现一个按钮');
    }
    if (this.stage === 'puzzle' && event.feature === 'birthday-box' && event.action === 'approach' && event.success) {
      this.puzzleApproached = true;
    }
  }

  protected override afterSimulationStep(
    _time: number,
    _delta: number,
    _events: SimulationInteractionEvent[],
  ): void {
    const snapshot = this.birthday.step(this.latestSnapshot.time);
    this.simulation.setExplorationAssist(0.34 + snapshot.assistLevel * 0.56);
    if (snapshot.stage !== this.stage) {
      this.stage = snapshot.stage;
      this.onStageChanged(snapshot.stage);
    }
    this.stageText?.setText(
      `${stageTitle(snapshot.stage)}\n${snapshot.instruction}\n` +
      `用时 ${formatTime(snapshot.elapsed)} · 辅助探索 ${Math.round(snapshot.assistLevel * 100)}%`,
    );
    this.applyGentleAssist(snapshot.assistLevel);
  }

  private openIntroduction(): void {
    const overlay = this.add.container(800, 450).setDepth(600).setScrollFactor(0);
    const bg = panelBackground(this, 900, 570);
    const eyebrow = this.add.text(0, -216, '生日实验 · 大约 3 分钟', style(19, '#9ed8d4', '700')).setOrigin(0.5);
    const title = this.add.text(0, -140, '先认识小浪', style(42, '#f7d78c', '700')).setOrigin(0.5);
    const statement = this.add.text(0, -35, '“它不会完全听从命令，\n但它会观察、学习和改变。”', {
      ...style(30, '#f8f2dd', '600'), align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    const note = this.add.text(0, 92, '接下来的错误、成功和改规则都由同一套自主行为与学习系统产生。', style(19, '#cfe4dd')).setOrigin(0.5);
    const begin = () => this.startBirthdayExperience(overlay);
    const start = createButton(this, 0, 205, '开始观察', begin, { width: 290, accent: true });
    this.input.keyboard?.once('keydown-ENTER', begin);
    this.input.keyboard?.once('keydown-SPACE', begin);
    overlay.add([bg, eyebrow, title, statement, note, start]);
  }

  private startBirthdayExperience(overlay: Phaser.GameObjects.Container): void {
    if (!this.paused) return;
    overlay.destroy();
    this.paused = false;
    this.birthday.start(this.latestSnapshot.time);
    this.stage = 'training';
    this.setupTraining();
    this.createStagePanel();
  }

  private createStagePanel(): void {
    this.stagePanel = this.add.container(610, 96).setDepth(180).setScrollFactor(0);
    const bg = panelBackground(this, 640, 112).setOrigin(0, 0);
    this.stageText = this.add.text(18, 12, '', style(17)).setLineSpacing(4).setWordWrapWidth(600);
    this.stagePanel.add([bg, this.stageText]);
  }

  private setupTraining(): void {
    this.simulation.removeExperimentObjects();
    this.placeResearchObject('button', 'triangle', {
      id: 'research-birthday-triangle', position: { x: 665, y: 380 }, reward: 0,
    });
    this.placeResearchObject('button', 'circle', {
      id: 'research-birthday-circle', position: { x: 930, y: 445 }, reward: 1,
    });
    this.placeResearchObject('button', 'square', {
      id: 'research-birthday-square', position: { x: 1_175, y: 500 }, reward: 0,
    });
    this.showToast('训练开始：圆形按钮会掉出鱼');
  }

  private onStageChanged(stage: BirthdayStage): void {
    this.lastAssistNudgeAt = -Infinity;
    if (stage === 'reversal') {
      this.reversalOldErrorSeen = false;
      for (const object of this.latestSnapshot.objects.filter((item) => item.id.startsWith('research-birthday-'))) {
        this.simulation.placeObject({ ...object, reward: object.feature === 'triangle' ? 1 : 0 });
      }
      this.showToast('规则改变：三角形按钮现在有奖励');
    } else if (stage === 'puzzle') {
      this.simulation.removeExperimentObjects();
      this.placeResearchObject('birthdayBox', 'birthday-box', {
        id: 'research-birthday-box', position: { x: 790, y: 430 }, reward: 0.32,
      });
      this.puzzleButtonPlaced = false;
      this.puzzleApproached = false;
      this.showToast('生日箱出现了：小浪需要接近、推动，再寻找按钮');
    } else if (stage === 'celebration') this.celebrate();
  }

  private applyGentleAssist(assist: number): void {
    if (this.stage === 'training' && assist > 0.15) {
      this.simulation.setGuidedExploration(
        this.trainingErrorSeen ? 'research-birthday-circle' : 'research-birthday-triangle',
        'slap',
        assist,
      );
    } else if (this.stage === 'reversal' && assist > 0.1) {
      this.simulation.setGuidedExploration(
        this.reversalOldErrorSeen ? 'research-birthday-triangle' : 'research-birthday-circle',
        'slap',
        assist,
      );
    } else if (this.stage === 'puzzle' && assist > 0.15) {
      const targetId = this.puzzleButtonPlaced ? 'research-birthday-triangle' : 'research-birthday-box';
      const action = this.puzzleButtonPlaced ? 'slap' : this.puzzleApproached ? 'push' : 'approach';
      this.simulation.setGuidedExploration(targetId, action, assist);
    } else this.simulation.setGuidedExploration(undefined);
    if (this.latestSnapshot.time - this.lastAssistNudgeAt < 7_000) return;
    if (this.stage === 'training' && assist > 0.15) {
      this.nudgeNearSeaLion(this.trainingErrorSeen ? 'research-birthday-circle' : 'research-birthday-triangle', 145);
      this.lastAssistNudgeAt = this.latestSnapshot.time;
      if (!this.circleAssisted) {
        this.circleAssisted = true;
        this.showToast('水流把圆形按钮带近了一些');
      }
    } else if (this.stage === 'reversal' && assist > 0.1) {
      this.nudgeNearSeaLion(this.reversalOldErrorSeen ? 'research-birthday-triangle' : 'research-birthday-circle', 130);
      this.lastAssistNudgeAt = this.latestSnapshot.time;
      if (!this.triangleAssisted) {
        this.triangleAssisted = true;
        this.showToast('探索提示增强，但小浪仍要自己尝试');
      }
    } else if (this.stage === 'puzzle' && assist > 0.15) {
      this.nudgeNearSeaLion(this.puzzleButtonPlaced ? 'research-birthday-triangle' : 'research-birthday-box', 125);
      this.lastAssistNudgeAt = this.latestSnapshot.time;
    }
  }

  private nudgeNearSeaLion(id: string, offset: number): void {
    const object = this.latestSnapshot.objects.find((item) => item.id === id);
    if (!object) return;
    const direction = this.latestSnapshot.position.x > 1_200 ? -1 : 1;
    this.simulation.placeObject({
      ...object,
      position: {
        x: Phaser.Math.Clamp(this.latestSnapshot.position.x + direction * Math.min(offset, 105), 100, 1_500),
        y: Phaser.Math.Clamp(this.latestSnapshot.position.y + 10, 160, 760),
      },
    });
  }

  private celebrate(): void {
    if (this.celebrated) return;
    this.celebrated = true;
    this.audio.play('birthday');
    const saveSystem = new SaveSystem(window.localStorage);
    const save = saveSystem.load();
    save.birthdayCompleted = true;
    saveSystem.save(save);
    for (let index = 0; index < 48; index += 1) {
      const bubble = this.add.circle(
        this.latestSnapshot.position.x + Phaser.Math.Between(-110, 110),
        this.latestSnapshot.position.y + Phaser.Math.Between(-20, 80),
        Phaser.Math.Between(3, 8),
        index % 3 === 0 ? 0xf3c360 : 0xc5f1e7,
        0.82,
      ).setDepth(280);
      this.tweens.add({
        targets: bubble,
        x: bubble.x + Phaser.Math.Between(-120, 120),
        y: bubble.y - Phaser.Math.Between(180, 430),
        alpha: 0,
        duration: Phaser.Math.Between(1_200, 2_200),
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => bubble.destroy(),
      });
    }
    const sign = this.add.container(this.latestSnapshot.position.x + 20, this.latestSnapshot.position.y - 115).setDepth(300);
    const signBg = this.add.rectangle(0, 0, 340, 84, 0xf2d07d, 1).setStrokeStyle(4, 0x6c4a3c, 1);
    const signText = this.add.text(0, 0, `${BIRTHDAY_CONFIG.addressee}，生日快乐！`, style(25, '#4a342e', '700')).setOrigin(0.5);
    sign.add([signBg, signText]);
    this.tweens.add({ targets: sign, y: sign.y - 55, duration: 900, ease: 'Back.Out' });
    const overlay = this.add.container(800, 450).setDepth(700).setScrollFactor(0).setAlpha(0);
    const bg = panelBackground(this, 980, 610);
    const title = this.add.text(0, -205, `${BIRTHDAY_CONFIG.addressee}，生日快乐！`, style(44, '#f7d78c', '700')).setOrigin(0.5);
    const message = this.add.text(0, -55, BIRTHDAY_CONFIG.message, {
      ...style(29, '#f8f2dd', '600'), align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);
    const date = this.add.text(0, 105, `${BIRTHDAY_CONFIG.date}\n${BIRTHDAY_CONFIG.creator}`, {
      ...style(18, '#9ed8d4'), align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);
    const menu = createButton(this, 0, 225, '回到主菜单', () => this.scene.start('MenuScene'), { width: 270, accent: true });
    overlay.add([bg, title, message, date, menu]);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 900, delay: 1_200 });
  }
}

function style(size: number, color = '#eef8f5', fontStyle = '400'): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle };
}

function stageTitle(stage: BirthdayStage): string {
  return {
    intro: '第一阶段 · 认识海狮',
    training: '第二阶段 · 一次简单训练',
    reversal: '第三阶段 · 规则改变',
    puzzle: '第四阶段 · 自主解决生日机关',
    celebration: '生日机关已打开',
  }[stage];
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
