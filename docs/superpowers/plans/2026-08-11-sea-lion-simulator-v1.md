# 《海狮模拟器》V1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable, testable, static Sea Lion Simulator V1.0 with shared physiology, Utility AI, memory, learning, experiments, birthday flow, touch input, save data, and GitHub Pages deployment.

**Architecture:** A deterministic, Phaser-free TypeScript simulation core owns all behavioral truth. Phaser scenes and entities render and enact that state, while each game mode supplies a scenario contract rather than duplicating intelligence. Procedural assets and synthesized audio keep the repository self-contained.

**Tech Stack:** Vite, TypeScript, Phaser 3, HTML5 Canvas, CSS, Web Audio API, localStorage, Vitest, GitHub Actions.

## Global Constraints

- Static-only runtime with no backend, account, remote assets, CDN, commercial media, LLM, or neural-network training.
- `npm install`, `npm run dev`, `npm run build`, and `npm test` must succeed.
- Save schema is version `1.0`; malformed or unsupported saves must recover safely.
- All physiology values stay in `[0, 100]`; decisions have minimum duration, cooldown, interrupt, and completion contracts.
- Birthday, experiments, and free bay use the same core systems.
- No bulk deletion commands; adjacent projects remain untouched.

---

### Task 1: Project shell and deterministic contracts

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/game/types/index.ts`, `src/game/config/balance.ts`, `src/game/config/personality.ts`, `src/game/config/birthday.ts`, `src/styles/main.css`
- Test: `tests/project-shell.test.ts`

**Interfaces:**
- Produces: `PhysiologyState`, `Personality`, `BehaviorId`, `PerceptionSnapshot`, `MemoryEntry`, `LearnedValue`, `GameSave`, `clamp`, `BALANCE`, `PERSONALITY_PRESETS`, `BIRTHDAY_CONFIG`.

- [ ] Write `project-shell.test.ts` with literal assertions for default state bounds, three behavior-changing personality presets, birthday copy, and save version.
- [ ] Run `npm test -- tests/project-shell.test.ts` and verify the missing contracts fail.
- [ ] Add the minimal Vite/Vitest shell and typed contracts; use `base: './'` for Pages-safe assets.
- [ ] Run the focused test and then `npm run build`.

### Task 2: Physiology core

**Files:**
- Create: `src/game/systems/PhysiologySystem.ts`
- Test: `tests/physiology.test.ts`

**Interfaces:**
- Consumes: `PhysiologyState`, `BALANCE`.
- Produces: `createDefaultPhysiology(): PhysiologyState`, `updatePhysiology(state, context, dtSeconds): PhysiologyState`, `applyMeal(state, amount)`, `applyRest(state, seconds, onLand)`.

- [ ] Write separate failing tests for underwater oxygen loss, surface recovery, meal hunger reduction, rest energy recovery, smooth changes, and clamping every state.
- [ ] Run the focused test and verify each behavior fails for the intended missing branch.
- [ ] Implement immutable physiology transitions with per-second rates and final clamping.
- [ ] Run `npm test -- tests/physiology.test.ts` and refactor only after green.

### Task 3: Memory and learning cores

**Files:**
- Create: `src/game/systems/MemorySystem.ts`, `src/game/systems/LearningSystem.ts`
- Test: `tests/memory.test.ts`, `tests/learning.test.ts`

**Interfaces:**
- Produces: `MemorySystem.remember/use/decay/relevant/snapshot`, `LearningSystem.update/value/rank/choose/reset/serialize`.
- Learning key: `{ objectType, feature, action }`; position is supplied only as a context multiplier.

- [ ] Write failing memory tests for repeated success strengthening, elapsed-time decay, weak cleanup, merging and the 50-entry cap.
- [ ] Implement the minimal bounded memory store and run the memory suite green.
- [ ] Write failing learning tests for reward increase, no-reward decrease, repeated-success selection probability, feature transfer across position, and relearning after rule change.
- [ ] Implement incremental value learning plus injected random exploration and run both suites green.

### Task 4: Utility AI, perception and behavior contracts

**Files:**
- Create: `src/game/systems/PerceptionSystem.ts`, `src/game/systems/UtilityAISystem.ts`, `src/game/behaviors/Behavior.ts`, `src/game/behaviors/SurfaceBehavior.ts`, `src/game/behaviors/HuntBehavior.ts`, `src/game/behaviors/RestBehavior.ts`, `src/game/behaviors/ExploreBehavior.ts`, `src/game/behaviors/EscapeBehavior.ts`, `src/game/behaviors/InteractBehavior.ts`, `src/game/behaviors/WanderBehavior.ts`
- Test: `tests/utility-ai.test.ts`, `tests/behavior-timing.test.ts`

**Interfaces:**
- Produces: `scoreCandidates(context): BehaviorScore[]`, `decide(context, now): Decision`, `BehaviorController` with `minimumDurationMs`, `cooldownMs`, `canInterrupt`, `isComplete`, and `steer`.

- [ ] Write failing score tests for forced low-oxygen surfacing, high-hunger hunt preference, high-fear escape, low-energy pursuit penalty, curiosity toward unknown objects, and named score factors.
- [ ] Implement deterministic scoring and verify the suite.
- [ ] Write failing timing tests proving decisions persist until minimum duration, emergency interrupts work, and cooldown prevents frame-by-frame switching.
- [ ] Implement the decision state machine and behavior steering contracts; run all core tests.

### Task 5: Save and experiment systems

**Files:**
- Create: `src/game/systems/SaveSystem.ts`, `src/game/systems/ExperimentSystem.ts`, `src/game/systems/InteractionSystem.ts`
- Test: `tests/save.test.ts`, `tests/experiment.test.ts`

**Interfaces:**
- Produces: `SaveSystem.save/load/clear/resetLearning`, `ExperimentSystem.start/record/swapPositions/changeRule/snapshot`, `InteractionSystem.resolve` returning reward, risk, memory and learning events.

- [ ] Write failing in-memory storage tests for round-trip save, malformed JSON recovery, unsupported version reset, numeric sanitization and learning-only reset.
- [ ] Implement safe parse/validation and verify tests.
- [ ] Write failing experiment tests showing results derive from recorded actions, positions can swap without changing feature keys, and rule changes reduce the old value while increasing the new one.
- [ ] Implement interaction-to-experiment event flow and verify all tests.

### Task 6: Stable headless simulation

**Files:**
- Create: `src/game/systems/SimulationSystem.ts`, `src/game/utils/SeededRandom.ts`
- Test: `tests/simulation.test.ts`

**Interfaces:**
- Produces: `SimulationSystem.step(dtMs)`, `snapshot()`, `placeObject()`, `removeExperimentObjects()`, `setPlayerIntent()`.

- [ ] Write a failing seeded 10-minute simulation test that advances physiological, AI, memory and learning state, checks finite coordinates and bounded collections, and observes low-oxygen surfacing plus hunting.
- [ ] Implement the headless orchestrator with fixed-step updates and event logs.
- [ ] Run the simulation test, then the complete core suite.

### Task 7: Procedural world, entities and playable controls

**Files:**
- Create: `src/game/GameConfig.ts`, `src/game/scenes/BootScene.ts`, `src/game/scenes/MenuScene.ts`, `src/game/scenes/BayScene.ts`, `src/game/entities/SeaLion.ts`, `src/game/entities/Fish.ts`, `src/game/entities/InteractiveObject.ts`, `src/game/ui/TouchControls.ts`
- Test: `tests/world-contract.test.ts`, `tests/input-contract.test.ts`

**Interfaces:**
- Boot generates all textures; Bay owns Phaser bodies and syncs events to `SimulationSystem`; SeaLion exposes `applyIntent`, `playAction`, `isAtSurface`, `isOnLand`; Fish exposes flee/flock state.

- [ ] Write failing pure contract tests for world water/land zones, action-to-animation mapping, keyboard mapping and touch intent mapping.
- [ ] Implement config and input mappings, then run focused tests.
- [ ] Create procedural textures, layered bay, fish flock, collision zones, water entry splash, sea-lion movement, diving, surface breathing, land transition, rest and interactions.
- [ ] Run build and start a local smoke preview before continuing.

### Task 8: HUD, research tools and intelligence panel

**Files:**
- Create: `src/game/ui/HUD.ts`, `src/game/ui/ResearchPanel.ts`, `src/game/ui/IntelligencePanel.ts`, `src/game/systems/AudioSystem.ts`
- Test: `tests/ui-contract.test.ts`, `tests/audio.test.ts`

**Interfaces:**
- HUD exposes mode/action/state and buttons; research tools emit typed placement/experiment commands; intelligence panel renders latest scores, factors, memories and values; audio unlocks only after user gesture.

- [ ] Write failing view-model tests for default/detailed state visibility, research-only controls, five-memory limit, learned value rows, current exploration rate, mute and volume persistence.
- [ ] Implement UI view models and run focused tests.
- [ ] Bind Phaser panels, drag-and-drop placement, D/Tab/P/M shortcuts, touch buttons, behavior log and synthesized sound effects.
- [ ] Run full tests and build.

### Task 9: Three experiments and birthday mode

**Files:**
- Create: `src/game/scenes/ExperimentScene.ts`, `src/game/scenes/BirthdayScene.ts`, `src/game/systems/BirthdaySystem.ts`
- Test: `tests/birthday.test.ts`, extend `tests/experiment.test.ts`

**Interfaces:**
- Produces: `BirthdaySystem.step/record/snapshot` with stage goals and gradual assist; scenes configure objects and listen to shared simulation events.

- [ ] Write failing experiment completion tests for position memory, shape learning and rule reversal without direct action injection.
- [ ] Implement scene setup and completion metrics; run experiment tests.
- [ ] Write failing birthday tests for required error/success memories, ordered approach/push/slap completion, bounded 150–210s assist curve and no instant completion.
- [ ] Implement birthday stage orchestration and shared-AI assist; run birthday and full suites.

### Task 10: Menu, persistence and deployable documentation

**Files:**
- Modify: `src/game/scenes/MenuScene.ts`, `src/main.ts`, `src/styles/main.css`
- Create: `.github/workflows/deploy.yml`, `README.md`, `docs/role-positioning-card.yaml`, `docs/assets-and-sources.md`
- Test: `tests/project-shell.test.ts`

**Interfaces:**
- Menu routes to free bay, birthday, laboratory, settings, help and continue; app saves on explicit request, scene exit and page hide.

- [ ] Extend the shell test for all menu routes, configurable birthday text, Pages-relative base and required README sections; watch it fail.
- [ ] Implement menu/settings/help/save dialogs, personality selection and safe destructive confirmations.
- [ ] Add Pages Actions workflow and complete Chinese README commands, controls, customization, limits and structure.
- [ ] Run all tests and production build.

### Task 11: Visual acceptance and release proof

**Files:**
- Create: `docs/taste_audit.md`, `docs/polish_verification_manifest.md`
- Modify: source and tests only for defects found during acceptance.

**Interfaces:**
- Produces release evidence for desktop, phone landscape, keyboard, touch-sized controls, reduced motion, console, overflow and emitted assets.

- [ ] Run the local production preview and inspect 1440×900 and 844×390 with the in-app Browser.
- [ ] Verify menu → free bay → movement/dive/surface → researcher → object interaction → intelligence panel, plus keyboard focus and reduced-motion behavior.
- [ ] For every defect, first add the narrowest failing regression test when behavior is enforceable, then fix and rerun.
- [ ] Run `npm test`, `npm run build`, TypeScript checks, the 10-minute simulation and a production-resource smoke check from fresh output.
- [ ] Score WPS-100, record hard gates, limitations and exact deployment steps; do not claim completion unless all fresh evidence supports it.
