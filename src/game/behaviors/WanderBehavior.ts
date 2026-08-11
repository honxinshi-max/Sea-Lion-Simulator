import { behaviorPresentation, type Behavior } from './Behavior';

export class WanderBehavior implements Behavior {
  readonly id = 'wander' as const;
  readonly presentation = behaviorPresentation(this.id);
}
