import Phaser from 'phaser';
import { WORLD_LAYOUT } from '../GameConfig';
import { PERSONALITY_PRESETS } from '../config/personality';
import { AudioSystem } from '../systems/AudioSystem';
import { ExperimentSystem, type ExperimentId } from '../systems/ExperimentSystem';
import { SaveSystem, createDefaultSave } from '../systems/SaveSystem';
import { SeededRandom } from '../utils/SeededRandom';
import {
  SimulationSystem,
  type PlayerIntent,
  type SimulationInteractionEvent,
  type SimulationSnapshot,
} from '../systems/SimulationSystem';
import type { GameMode, ObjectType, PersonalityPreset, WorldObjectSnapshot } from '../types';
import { Fish } from '../entities/Fish';
import { InteractiveObject } from '../entities/InteractiveObject';
import { SeaLion } from '../entities/SeaLion';
import { buildHUDModel } from '../ui/HUD';
import { GameHUD } from '../ui/GameHUD';
import { buildIntelligenceModel } from '../ui/IntelligencePanel';
import { IntelligenceOverlay } from '../ui/IntelligenceOverlay';
import { keyboardIntent } from '../ui/InputMap';
import { ResearchPanel } from '../ui/ResearchPanel';
import { TouchControls } from '../ui/TouchControls';

interface BaySceneData {
  continueSave?: boolean;
}

interface KeyMap {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
}

export class BayScene extends Phaser.Scene {
  protected scenario: 'free' | 'experiment' | 'birthday';
  protected simulation!: SimulationSystem;
  protected seaLion!: SeaLion;
  protected audio!: AudioSystem;
  protected mode: GameMode = 'seaLion';
  protected paused = false;
  protected experiment?: ExperimentSystem;
  protected experimentId?: ExperimentId;
  protected latestSnapshot!: SimulationSnapshot;
  private startData: BaySceneData = {};
  private saveSystem!: SaveSystem;
  private currentPreset: PersonalityPreset = 'curious';
  private seaLionName = '小浪';
  private detailedStatus = false;
  private autoEnabled = true;
  private muted = false;
  private reducedMotion = false;
  private keys!: KeyMap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hud!: GameHUD;
  private researchPanel!: ResearchPanel;
  private intelligence!: IntelligenceOverlay;
  private touchControls!: TouchControls;
  private objectViews = new Map<string, InteractiveObject>();
  private fishViews = new Map<string, Fish>();
  private objectSequence = 0;
  private previousSeaLionY = 360;
  private waveGraphics!: Phaser.GameObjects.Graphics;
  private kelpGraphics!: Phaser.GameObjects.Graphics;
  private bubbles: Array<{ node: Phaser.GameObjects.Arc; speed: number; drift: number }> = [];
  private pauseOverlay?: Phaser.GameObjects.Container;
  private toastText?: Phaser.GameObjects.Text;
  private pageHideHandler?: () => void;

  constructor(key = 'BayScene', scenario: 'free' | 'experiment' | 'birthday' = 'free') {
    super(key);
    this.scenario = scenario;
  }

  init(data: BaySceneData): void {
    this.startData = data ?? {};
    this.objectViews.clear();
    this.fishViews.clear();
    this.bubbles = [];
    this.pauseOverlay = undefined;
    this.toastText = undefined;
  }

  create(): void {
    this.drawBay();
    this.saveSystem = new SaveSystem(window.localStorage);
    const stored = this.saveSystem.load();
    const continueSave = Boolean(this.startData.continueSave) && this.scenario === 'free';
    this.currentPreset = stored.seaLion.personalityPreset;
    this.seaLionName = stored.seaLion.name;
    this.detailedStatus = stored.settings.detailedStatus;
    this.muted = stored.settings.muted;
    this.reducedMotion = stored.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.audio = new AudioSystem(stored.settings);
    this.simulation = new SimulationSystem({
      random: new SeededRandom(Math.floor(Date.now() % 2_147_483_647)),
      personality: { ...PERSONALITY_PRESETS[this.currentPreset] },
      physiology: continueSave ? stored.physiology : undefined,
      memories: continueSave || this.scenario === 'experiment' ? stored.memories : undefined,
      learning: continueSave || this.scenario === 'experiment' ? stored.learning : undefined,
    });
    this.latestSnapshot = this.simulation.snapshot();
    this.seaLion = new SeaLion(this, this.latestSnapshot.position.x, this.latestSnapshot.position.y);
    this.createInput();
    this.hud = new GameHUD(this, {
      toggleDetails: () => { this.detailedStatus = !this.detailedStatus; },
      toggleAuto: () => { this.autoEnabled = !this.autoEnabled; this.showToast(this.autoEnabled ? '自动行动已开启' : '自动行动已关闭'); },
      togglePause: () => this.togglePause(),
      toggleMute: () => this.toggleMute(),
      toggleIntelligence: () => this.toggleIntelligence(),
      save: () => this.saveCurrent(),
      menu: () => { this.saveCurrent(false); this.scene.start('MenuScene'); },
    });
    this.researchPanel = new ResearchPanel(this, {
      place: (type, feature) => this.placeResearchObject(type, feature),
      startExperiment: (id) => this.startExperiment(id),
      resetExperiment: () => this.resetExperiment(),
      swapPositions: () => this.swapExperimentPositions(),
      changeRule: () => this.changeExperimentRule(),
      exitResearch: () => this.setMode('seaLion'),
    });
    this.intelligence = new IntelligenceOverlay(this, () => this.intelligence.setVisible(false));
    this.touchControls = new TouchControls(this, () => this.toggleMode(), () => this.call());
    this.setMode(this.scenario === 'experiment' ? 'researcher' : 'seaLion');
    this.syncEntities(this.latestSnapshot, 0);
    this.pageHideHandler = () => this.saveCurrent(false);
    window.addEventListener('pagehide', this.pageHideHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.pageHideHandler) window.removeEventListener('pagehide', this.pageHideHandler);
    });
    this.input.once('pointerdown', () => void this.audio.unlock());
    this.showToast(this.scenario === 'experiment' ? '研究员模式：选择实验或布置物体' : '欢迎来到自由海湾');
  }

  update(time: number, delta: number): void {
    this.animateEnvironment(time, delta);
    if (this.paused) return;
    const intent = this.readIntent();
    if (this.mode === 'seaLion') {
      const active = Math.abs(intent.x) > 0.02 || Math.abs(intent.y) > 0.02 || intent.interact || intent.rest;
      this.simulation.setPlayerIntent(active || !this.autoEnabled ? intent : undefined);
    } else this.simulation.setPlayerIntent(undefined);
    this.simulation.step(Math.min(100, delta));
    const events = this.simulation.drainEvents();
    events.forEach((event) => this.processSimulationEvent(event));
    this.latestSnapshot = this.simulation.snapshot();
    if ((this.previousSeaLionY - WORLD_LAYOUT.waterSurfaceY) * (this.latestSnapshot.position.y - WORLD_LAYOUT.waterSurfaceY) < 0) {
      this.makeSplash(this.latestSnapshot.position.x, WORLD_LAYOUT.waterSurfaceY);
      this.audio.play('splash');
    }
    this.previousSeaLionY = this.latestSnapshot.position.y;
    this.syncEntities(this.latestSnapshot, this.reducedMotion ? 0 : delta);
    this.renderUI();
    this.afterSimulationStep(time, delta, events);
  }

  protected afterSimulationStep(
    _time: number,
    _delta: number,
    _events: SimulationInteractionEvent[],
  ): void {}

  protected processSimulationEvent(event: SimulationInteractionEvent): void {
    this.seaLion.flashInteraction(event.success);
    this.objectViews.get(event.objectId)?.pulse(event.success);
    if (event.action === 'hunt' && event.success) this.audio.play('eat');
    else if (event.action === 'slap') this.audio.play('button');
    else if (event.action === 'push') this.audio.play('crate');
    if (this.experiment) {
      this.experiment.record({
        feature: event.feature,
        action: event.action,
        success: event.success,
        reward: event.reward,
        valueBefore: event.valueBefore,
        valueAfter: event.valueAfter,
      });
    }
  }

  protected placeResearchObject(type: ObjectType, feature: string, override: Partial<WorldObjectSnapshot> = {}): WorldObjectSnapshot {
    const id = override.id ?? `research-${type}-${this.objectSequence++}`;
    const object: WorldObjectSnapshot = {
      id,
      type,
      feature,
      position: override.position ? { ...override.position } : { x: 1_080 + (this.objectSequence % 4) * 95, y: type === 'buoy' ? 260 : 445 },
      novel: true,
      reward: override.reward ?? (type === 'fish' || type === 'foodBox' ? 1 : 0),
      risk: override.risk ?? (type === 'soundDevice' ? 0.72 : 0.04),
      distance: 0,
      enabled: override.enabled ?? true,
    };
    this.simulation.placeObject(object);
    this.syncEntities(this.simulation.snapshot(), 0);
    return object;
  }

  protected startExperiment(id: ExperimentId): void {
    this.simulation.removeExperimentObjects();
    this.experimentId = id;
    this.experiment = new ExperimentSystem();
    const correct = id === 'position' ? 'striped' : 'circle';
    this.experiment.start(id, correct);
    if (id === 'position') {
      const features = ['striped', 'dotted', 'plain'];
      features.forEach((feature, index) => this.placeResearchObject('foodBox', feature, {
        id: `experiment-box-${feature}`,
        position: { x: 760 + index * 230, y: 470 },
        reward: feature === 'striped' ? 1 : 0,
      }));
      this.experiment.setPositions({ striped: 760, dotted: 990, plain: 1_220 });
    } else {
      const features = ['triangle', 'circle', 'square'];
      features.forEach((feature, index) => this.placeResearchObject('button', feature, {
        id: `experiment-button-${feature}`,
        position: { x: 720 + index * 240, y: 455 },
        reward: feature === 'circle' ? 1 : 0,
      }));
    }
    this.setMode('researcher');
    this.showToast({ position: '位置记忆实验已开始', shape: '形状学习实验已开始', reversal: '规则改变实验：先学习圆形' }[id]);
  }

  protected resetExperiment(): void {
    if (!this.experimentId) {
      this.simulation.removeExperimentObjects();
      this.showToast('已清空实验物体');
      return;
    }
    this.startExperiment(this.experimentId);
  }

  protected swapExperimentPositions(): void {
    if (!this.experiment) return this.showToast('请先开始一个实验');
    const snapshot = this.simulation.snapshot();
    const candidates = snapshot.objects.filter((object) => object.id.startsWith('experiment-'));
    if (candidates.length < 2) return;
    const first = candidates[0]!;
    const last = candidates.at(-1)!;
    const firstPosition = { ...first.position };
    this.simulation.placeObject({ ...first, position: { ...last.position } });
    this.simulation.placeObject({ ...last, position: firstPosition });
    this.experiment.swapPositions(first.feature, last.feature);
    this.showToast('装置位置已交换，物体特征没有改变');
  }

  protected changeExperimentRule(): void {
    if (this.experimentId !== 'reversal' || !this.experiment) return this.showToast('请先开始“规则改变”实验');
    const snapshot = this.simulation.snapshot();
    for (const object of snapshot.objects.filter((item) => item.id.startsWith('experiment-button-'))) {
      this.simulation.placeObject({ ...object, reward: object.feature === 'triangle' ? 1 : 0 });
    }
    this.experiment.changeRule('triangle');
    this.showToast('规则改变：三角形按钮现在有奖励');
  }

  protected setMode(mode: GameMode): void {
    this.mode = mode;
    this.researchPanel?.setVisible(mode === 'researcher');
    this.touchControls?.setSeaLionMode(mode === 'seaLion');
    for (const view of this.objectViews.values()) this.configureDraggable(view);
    this.showToast(mode === 'seaLion' ? '海狮模式：你可以直接控制小浪' : '研究员模式：小浪继续自主行动');
  }

  protected toggleMode(): void {
    this.setMode(this.mode === 'seaLion' ? 'researcher' : 'seaLion');
  }

  protected showToast(message: string): void {
    this.toastText?.destroy();
    this.toastText = this.add.text(800, 825, message, {
      color: '#f8f3df',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: '600',
      backgroundColor: 'rgba(5, 35, 47, .88)',
      padding: { x: 16, y: 9 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(350);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2_400, duration: 500, onComplete: () => this.toastText?.destroy() });
  }

  private createInput(): void {
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', shift: 'SHIFT', space: 'SPACE', r: 'R' }) as KeyMap;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-TAB', (event: KeyboardEvent) => { event.preventDefault(); this.toggleMode(); });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-M', () => this.toggleMute());
    this.input.keyboard.on('keydown-I', () => this.toggleIntelligence());
    this.input.keyboard.on('keydown-D', () => { if (this.mode === 'researcher') this.toggleIntelligence(); });
    this.input.keyboard.on('keydown-E', () => this.call());
    this.input.keyboard.on('keydown-ONE', () => { if (this.mode === 'researcher') this.startExperiment('position'); });
    this.input.keyboard.on('keydown-TWO', () => { if (this.mode === 'researcher') this.startExperiment('shape'); });
    this.input.keyboard.on('keydown-THREE', () => { if (this.mode === 'researcher') this.startExperiment('reversal'); });
  }

  private readIntent(): PlayerIntent {
    const keyIntent = keyboardIntent({
      w: this.keys?.w.isDown,
      a: this.keys?.a.isDown,
      s: this.keys?.s.isDown,
      d: this.keys?.d.isDown,
      arrowUp: this.cursors?.up.isDown,
      arrowDown: this.cursors?.down.isDown,
      arrowLeft: this.cursors?.left.isDown,
      arrowRight: this.cursors?.right.isDown,
      shift: this.keys?.shift.isDown,
      space: Phaser.Input.Keyboard.JustDown(this.keys?.space),
      r: this.keys?.r.isDown,
    }, this.latestSnapshot.physiology.energy);
    const touch = this.touchControls?.consumeIntent() ?? { x: 0, y: 0, boost: false, interact: false, rest: false };
    return {
      x: Phaser.Math.Clamp(keyIntent.x + touch.x, -1, 1),
      y: Phaser.Math.Clamp(keyIntent.y + touch.y, -1, 1),
      boost: keyIntent.boost || touch.boost,
      interact: keyIntent.interact || touch.interact,
      rest: keyIntent.rest || touch.rest,
    };
  }

  private renderUI(): void {
    const behavior = this.latestSnapshot.decision?.behavior ?? (this.mode === 'seaLion' ? 'wander' : 'explore');
    this.hud.render(buildHUDModel(this.seaLionName, this.latestSnapshot.physiology, this.mode, behavior, this.detailedStatus, this.autoEnabled));
    const experimentRecord = this.experiment?.snapshot();
    this.researchPanel.render(experimentRecord, this.latestSnapshot.logs.map((log) => log.message));
    if (this.intelligence.visible) {
      this.intelligence.render(buildIntelligenceModel(
        this.latestSnapshot.decision?.scores ?? [],
        behavior,
        this.latestSnapshot.memories,
        this.latestSnapshot.learning,
        PERSONALITY_PRESETS[this.currentPreset].explorationRate,
      ));
    }
  }

  private syncEntities(snapshot: SimulationSnapshot, delta: number): void {
    const behavior = snapshot.decision?.behavior ?? 'wander';
    this.seaLion.updateVisual(snapshot.position, snapshot.velocity, behavior, delta);
    const fishIds = new Set(snapshot.fish.map((fish) => fish.id));
    for (const [id, view] of this.fishViews) if (!fishIds.has(id)) { view.destroy(); this.fishViews.delete(id); }
    for (const fish of snapshot.fish) {
      let view = this.fishViews.get(fish.id);
      if (!view) { view = new Fish(this, fish.id, fish.position.x, fish.position.y); this.fishViews.set(fish.id, view); }
      view.updateVisual(fish.position, snapshot.position.x, delta);
    }
    const objectIds = new Set(snapshot.objects.map((object) => object.id));
    for (const [id, view] of this.objectViews) if (!objectIds.has(id)) { view.destroy(); this.objectViews.delete(id); }
    for (const object of snapshot.objects) {
      let view = this.objectViews.get(object.id);
      if (!view) {
        view = new InteractiveObject(this, object.id, object);
        this.objectViews.set(object.id, view);
        this.configureDraggable(view);
      }
      view.updateSnapshot(object);
    }
  }

  private configureDraggable(view: InteractiveObject): void {
    view.setResearchDraggable(this.mode === 'researcher', (x, y) => {
      if (this.mode !== 'researcher') return;
      const object = this.simulation.snapshot().objects.find((item) => item.id === view.objectId);
      if (object) this.simulation.placeObject({ ...object, position: { x, y } });
    });
  }

  private toggleIntelligence(): void {
    this.intelligence.setVisible(!this.intelligence.visible);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.container(800, 450).setDepth(500).setScrollFactor(0);
      const bg = this.add.rectangle(0, 0, 1_600, 900, 0x041c28, 0.64);
      const text = this.add.text(0, 0, '已暂停\n按 P 或点击暂停继续', {
        color: '#f7e7b5', fontFamily: 'system-ui, sans-serif', fontSize: '34px', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5);
      this.pauseOverlay.add([bg, text]);
    } else { this.pauseOverlay?.destroy(); this.pauseOverlay = undefined; }
  }

  private toggleMute(): void {
    this.muted = this.audio.toggleMute();
    this.showToast(this.muted ? '声音已关闭' : '声音已开启');
  }

  private call(): void {
    void this.audio.unlock().then(() => this.audio.play('call'));
    const call = this.add.text(this.seaLion.x + 45, this.seaLion.y - 70, 'OORR—', {
      color: '#f7e7b5', fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: '700',
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: call, y: call.y - 40, alpha: 0, duration: 900, onComplete: () => call.destroy() });
  }

  private saveCurrent(showFeedback = true): void {
    if (!this.latestSnapshot) return;
    const previous = this.saveSystem.load();
    const save = createDefaultSave();
    save.seaLion = {
      name: this.seaLionName,
      personalityPreset: this.currentPreset,
      personality: { ...PERSONALITY_PRESETS[this.currentPreset] },
    };
    save.physiology = { ...this.latestSnapshot.physiology };
    save.learning = this.latestSnapshot.learning.map((value) => ({ ...value }));
    save.memories = this.latestSnapshot.memories.map((memory) => ({ ...memory, position: { ...memory.position } }));
    save.settings = { ...previous.settings, ...this.audio.settings(), detailedStatus: this.detailedStatus };
    save.birthdayCompleted = previous.birthdayCompleted;
    save.experiments = this.experiment ? [this.experiment.snapshot()] : previous.experiments;
    this.saveSystem.save(save);
    if (showFeedback) this.showToast('已保存小浪的状态、记忆与学习');
  }

  private drawBay(): void {
    this.cameras.main.setBackgroundColor('#133e4f');
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x8bc5c5, 0x8bc5c5, 0xd8dfc0, 0xd8dfc0, 1).fillRect(0, 0, 1_600, 215);
    graphics.fillStyle(0x2a8291, 1).fillRect(0, 215, 1_600, 240);
    graphics.fillStyle(0x176277, 1).fillRect(0, 455, 1_600, 210);
    graphics.fillStyle(0x0b445c, 1).fillRect(0, 665, 1_600, 235);
    graphics.fillStyle(0xeed9a1, 0.09).fillTriangle(380, 215, 590, 215, 490, 760);
    graphics.fillTriangle(820, 215, 1_010, 215, 890, 790);
    graphics.fillTriangle(1_280, 215, 1_430, 215, 1_350, 770);
    graphics.fillStyle(0x766f5f, 1).fillEllipse(700, 845, 1_900, 190);
    graphics.fillStyle(0x8c816b, 1).fillEllipse(210, 220, 520, 220);
    graphics.fillEllipse(92, 150, 350, 210);
    graphics.fillStyle(0x667064, 1).fillEllipse(1_410, 780, 360, 150);
    graphics.fillEllipse(1_230, 815, 260, 110);
    graphics.fillStyle(0xb88f58, 1).fillRoundedRect(1_205, 282, 310, 28, 10);
    graphics.fillStyle(0x71563e, 1).fillRect(1_240, 308, 22, 90).fillRect(1_458, 308, 22, 90);
    this.add.text(1_265, 244, '实验平台', { color: '#eff6e9', fontFamily: 'system-ui, sans-serif', fontSize: '18px' });
    this.add.text(46, 112, '礁石休息区', { color: '#f4ead0', fontFamily: 'system-ui, sans-serif', fontSize: '18px' });
    this.add.text(500, 244, '浅水区', { color: '#d8f1e9', fontFamily: 'system-ui, sans-serif', fontSize: '16px' }).setAlpha(0.8);
    this.add.text(1_000, 535, '深水区', { color: '#b7d9dc', fontFamily: 'system-ui, sans-serif', fontSize: '16px' }).setAlpha(0.72);
    this.waveGraphics = this.add.graphics().setDepth(12);
    this.kelpGraphics = this.add.graphics().setDepth(13);
    for (let index = 0; index < 24; index += 1) {
      const node = this.add.circle(390 + Math.random() * 1_070, 260 + Math.random() * 500, 2 + Math.random() * 4, 0xc7f2ef, 0.35).setDepth(15);
      this.bubbles.push({ node, speed: 12 + Math.random() * 28, drift: Math.random() * 6 });
    }
  }

  private animateEnvironment(time: number, delta: number): void {
    const animationTime = this.reducedMotion ? 0 : time;
    const animationDelta = this.reducedMotion ? 0 : delta;
    this.waveGraphics.clear().lineStyle(3, 0xd3f1e9, 0.58);
    for (let x = 310; x < 1_600; x += 46) {
      const y = WORLD_LAYOUT.waterSurfaceY + Math.sin(x * 0.025 + animationTime * 0.002) * 4;
      this.waveGraphics.lineBetween(x, y, x + 34, y + Math.sin((x + 34) * 0.025 + animationTime * 0.002) * 1.5);
    }
    this.kelpGraphics.clear().lineStyle(9, 0x3b7a63, 0.82);
    [410, 520, 865, 1_080, 1_330].forEach((x, index) => {
      const sway = Math.sin(animationTime * 0.0012 + index) * 18;
      this.kelpGraphics.beginPath().moveTo(x, 805).lineTo(x + sway * 0.3, 740).lineTo(x + sway, 675).strokePath();
    });
    for (const bubble of this.bubbles) {
      bubble.node.y -= bubble.speed * animationDelta / 1_000;
      bubble.node.x += Math.sin(animationTime * 0.002 + bubble.drift) * (this.reducedMotion ? 0 : 0.18);
      if (bubble.node.y < 225) bubble.node.y = 760;
    }
  }

  private makeSplash(x: number, y: number): void {
    const count = this.reducedMotion ? 3 : 10;
    for (let index = 0; index < count; index += 1) {
      const drop = this.add.circle(x, y, 3 + Math.random() * 4, 0xc9f3ec, 0.75).setDepth(70);
      const angle = Phaser.Math.FloatBetween(-2.7, -0.44);
      const distance = Phaser.Math.Between(30, 90);
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 460 + index * 24,
        ease: 'Quad.Out',
        onComplete: () => drop.destroy(),
      });
    }
  }
}
