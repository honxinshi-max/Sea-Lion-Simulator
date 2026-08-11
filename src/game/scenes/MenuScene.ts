import Phaser from 'phaser';
import { BIRTHDAY_CONFIG } from '../config/birthday';
import { PERSONALITY_PRESETS } from '../config/personality';
import { SaveSystem } from '../systems/SaveSystem';
import type { PersonalityPreset } from '../types';
import { createButton, panelBackground } from '../ui/SceneWidgets';

export class MenuScene extends Phaser.Scene {
  private wave?: Phaser.GameObjects.Graphics;
  private menuButtons: Phaser.GameObjects.Container[] = [];
  private selectedIndex = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.input.keyboard?.removeAllListeners();
    this.drawBackground();
    this.add.text(112, 112, '海狮模拟器', {
      color: '#f8f2dd',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '72px',
      fontStyle: '700',
    });
    this.add.text(118, 202, 'SEA LION SIMULATOR · V1.0', {
      color: '#8fc8c9',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      letterSpacing: 4,
    });
    this.add.text(118, 250, '控制小浪生活，也可以退后一步，观察它如何记住结果、\n试错，并在规则改变后重新学习。', {
      color: '#d9e8e2',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '25px',
      lineSpacing: 10,
    });
    const touchDevice = navigator.maxTouchPoints > 0 || window.innerWidth < 1_000;
    const compactTouchLayout = window.innerHeight <= 500;
    const cardHeight = compactTouchLayout ? 580 : touchDevice ? 540 : 524;
    const card = panelBackground(this, 470, cardHeight).setPosition(116, compactTouchLayout ? 310 : 348).setOrigin(0, 0);
    card.setAlpha(0.86);
    const items: Array<[string, () => void, boolean?]> = [
      ['开始自由海湾', () => this.scene.start('BayScene', { continueSave: false }), true],
      ['继续游戏', () => this.scene.start('BayScene', { continueSave: true })],
      ['生日实验', () => this.scene.start('BirthdayScene')],
      ['实验室', () => this.scene.start('ExperimentScene')],
      ['设置', () => this.openSettings()],
      ['游戏说明', () => this.openHelp()],
    ];
    if (!BIRTHDAY_CONFIG.enabled) items.splice(2, 1);
    this.menuButtons = items.map(([label, action, accent], index) => {
      const button = createButton(
        this,
        351,
        (compactTouchLayout ? 340 : 402) + index * (compactTouchLayout ? 102 : touchDevice ? 76 : 70),
        label,
        action,
        { width: 390, height: compactTouchLayout ? 102 : touchDevice ? 70 : undefined, accent },
      );
      button.setDepth(10);
      return button;
    });
    this.updateKeyboardSelection();
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.menuButtons[this.selectedIndex]?.emit('pointerdown'));
    this.input.keyboard?.on('keydown-SPACE', () => this.menuButtons[this.selectedIndex]?.emit('pointerdown'));
    this.input.keyboard?.on('keydown-ONE', () => items[0]?.[1]());
    this.input.keyboard?.on('keydown-TWO', () => items[1]?.[1]());
    this.input.keyboard?.on('keydown-THREE', () => items[2]?.[1]());
    this.input.keyboard?.on('keydown-FOUR', () => items[3]?.[1]());
    this.add.text(1_020, 614, '真实基础上的游戏化模拟', {
      color: '#f4d18b', fontFamily: 'system-ui, sans-serif', fontSize: '21px', fontStyle: '600',
    });
    this.add.text(1_020, 658, '不是“智商值”\n而是需求、感知、记忆与经验共同决定下一步。', {
      color: '#dcebe5', fontFamily: 'system-ui, sans-serif', fontSize: '23px', lineSpacing: 10,
    });
    this.add.text(112, 858, '键盘 · 触控 · 本地存档 · 无需登录', {
      color: '#7fb6b7', fontFamily: 'system-ui, sans-serif', fontSize: '17px',
    });
  }

  update(time: number): void {
    if (!this.wave) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationTime = reducedMotion ? 0 : time;
    this.wave.clear().lineStyle(4, 0xbbe7e2, 0.35);
    for (let x = 0; x < 1_650; x += 48) {
      const y = 486 + Math.sin(x * 0.018 + animationTime * 0.0012) * 8;
      this.wave.lineBetween(x, y, x + 36, y + Math.sin((x + 36) * 0.018 + animationTime * 0.0012) * 2);
    }
  }

  private drawBackground(): void {
    this.cameras.main.setBackgroundColor('#0b3548');
    const background = this.add.graphics();
    background.fillGradientStyle(0x123d4f, 0x123d4f, 0x0b5268, 0x0b5268, 1);
    background.fillRect(0, 0, 1_600, 900);
    background.fillStyle(0x195f72, 1).fillRect(0, 480, 1_600, 420);
    background.fillStyle(0x0a4057, 0.8).fillRect(0, 650, 1_600, 250);
    background.fillStyle(0xe7c894, 0.28).fillTriangle(1_210, 484, 1_520, 484, 1_430, 860);
    background.fillStyle(0x837665, 1).fillEllipse(1_335, 790, 540, 170);
    const seaLion = this.add.graphics().setPosition(1_245, 360).setRotation(-0.08);
    seaLion.fillStyle(0x7b6d61, 1).fillEllipse(0, 0, 260, 100);
    seaLion.fillEllipse(105, -25, 100, 84).fillStyle(0x948275, 1).fillEllipse(150, -13, 55, 36);
    seaLion.fillStyle(0x5e5249, 1).fillTriangle(-115, 0, -185, -45, -155, 16).fillTriangle(-115, 8, -180, 58, -145, 4);
    seaLion.fillCircle(132, -40, 7).fillStyle(0x151d20, 1).fillCircle(134, -41, 3);
    this.wave = this.add.graphics();
  }

  private moveSelection(delta: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + delta, 0, this.menuButtons.length);
    this.updateKeyboardSelection();
  }

  private updateKeyboardSelection(): void {
    this.menuButtons.forEach((button, index) => button.setScale(index === this.selectedIndex ? 1.035 : 1));
  }

  private openSettings(): void {
    const saveSystem = new SaveSystem(window.localStorage);
    const save = saveSystem.load();
    const overlay = this.add.container(800, 450).setDepth(100);
    const bg = panelBackground(this, 760, 700);
    const title = this.add.text(0, -300, '设置', textStyle(32, '#f7d78c', '700')).setOrigin(0.5);
    const nameLabel = this.add.text(-295, -245, `海狮名字：${save.seaLion.name}`, textStyle(20));
    const presetLabel = this.add.text(-295, -185, '', textStyle(20));
    const volumeLabel = this.add.text(-295, 20, '', textStyle(20));
    let preset = save.seaLion.personalityPreset;
    const presets: PersonalityPreset[] = ['curious', 'cautious', 'active'];
    const renderPreset = () => presetLabel.setText(`性格预设：${presetName(preset)}\n${presetDescription(preset)}`);
    renderPreset();
    const previous = createButton(this, -172, -75, '上一个性格', () => { preset = presets[Phaser.Math.Wrap(presets.indexOf(preset) - 1, 0, presets.length)]!; renderPreset(); }, { width: 210, small: true });
    const next = createButton(this, 72, -75, '下一个性格', () => { preset = presets[Phaser.Math.Wrap(presets.indexOf(preset) + 1, 0, presets.length)]!; renderPreset(); }, { width: 210, small: true });
    const volume = createButton(this, -172, 85, '音量 －', () => { save.settings.volume = Math.max(0, save.settings.volume - 0.1); volumeLabel.setText(`当前音量：${Math.round(save.settings.volume * 100)}%`); }, { width: 210, small: true });
    const louder = createButton(this, 72, 85, '音量 ＋', () => { save.settings.volume = Math.min(1, save.settings.volume + 0.1); volumeLabel.setText(`当前音量：${Math.round(save.settings.volume * 100)}%`); }, { width: 210, small: true });
    volumeLabel.setText(`当前音量：${Math.round(save.settings.volume * 100)}%`);
    const reduced = createButton(this, 0, 145, save.settings.reducedMotion ? '减少动态：开' : '减少动态：关', () => {
      save.settings.reducedMotion = !save.settings.reducedMotion;
      (reduced.getAt(1) as Phaser.GameObjects.Text).setText(save.settings.reducedMotion ? '减少动态：开' : '减少动态：关');
    }, { width: 260, small: true });
    const resetLearning = createButton(this, -155, 210, '重置学习', () => this.confirmAction(
      '重置小浪的学习？',
      '记忆、学习价值与实验成绩将被清除；生理状态和设置会保留。',
      () => { saveSystem.save(saveSystem.resetLearning(save)); overlay.destroy(); },
    ), { width: 260, small: true });
    const deleteSave = createButton(this, 155, 210, '删除全部存档', () => this.confirmAction(
      '删除全部存档？',
      '小浪的状态、记忆、学习、设置和生日记录都会恢复默认。',
      () => { saveSystem.clear(); overlay.destroy(); },
    ), { width: 260, small: true });
    const done = createButton(this, 0, 292, '保存设置', () => {
      save.seaLion.personalityPreset = preset;
      save.seaLion.personality = { ...PERSONALITY_PRESETS[preset] };
      saveSystem.save(save);
      overlay.destroy();
    }, { width: 260, accent: true });
    overlay.add([bg, title, nameLabel, presetLabel, previous, next, volumeLabel, volume, louder, reduced, resetLearning, deleteSave, done]);
  }

  private confirmAction(titleText: string, message: string, action: () => void): void {
    const overlay = this.add.container(800, 450).setDepth(300);
    const shade = this.add.rectangle(0, 0, 1_600, 900, 0x031720, 0.72);
    const bg = panelBackground(this, 700, 320);
    const title = this.add.text(0, -96, titleText, textStyle(28, '#f7d78c', '700')).setOrigin(0.5);
    const copy = this.add.text(0, -28, message, textStyle(19)).setOrigin(0.5).setAlign('center').setWordWrapWidth(600);
    const cancel = createButton(this, -145, 100, '取消', () => overlay.destroy(), { width: 240 });
    const confirm = createButton(this, 145, 100, '确认', () => { action(); overlay.destroy(); }, { width: 240, accent: true });
    overlay.add([shade, bg, title, copy, cancel, confirm]);
  }

  private openHelp(): void {
    const overlay = this.add.container(800, 450).setDepth(100);
    const bg = panelBackground(this, 940, 650);
    const title = this.add.text(0, -272, '怎样和小浪一起生活', textStyle(30, '#f7d78c', '700')).setOrigin(0.5);
    const copy = this.add.text(-410, -215,
      '海狮模式\nWASD / 方向键游动 · Shift 加速 · 空格互动 · E 叫声 · R 休息\n\n研究员模式\nTab 切换。放置鱼、按钮、箱子和声音装置；拖动它们改变环境。\n研究员不能直接修改能力，学习只来自小浪自己的行为结果。\n\n观察智能\n点击“智能观察”，或在研究员模式按 D，查看候选行为、主要因素、记忆和学习价值。\n\n提示\n氧气太低时小浪会优先上浮；规则改变后，它会先犯旧经验的错，再逐步重学。',
      textStyle(21)).setLineSpacing(10).setWordWrapWidth(820);
    const close = createButton(this, 0, 265, '我知道了', () => overlay.destroy(), { width: 250, accent: true });
    overlay.add([bg, title, copy, close]);
  }
}

function textStyle(size: number, color = '#edf7f3', fontStyle = '400'): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle };
}

function presetName(preset: PersonalityPreset): string {
  return { curious: '好奇型', cautious: '谨慎型', active: '活跃型' }[preset];
}

function presetDescription(preset: PersonalityPreset): string {
  return {
    curious: '更愿意接近新物体，探索率高，学习较快。',
    cautious: '更看重风险，耐心更强，陌生环境中慢慢靠近。',
    active: '游动和捕猎倾向更高，也更容易消耗精力。',
  }[preset];
}
