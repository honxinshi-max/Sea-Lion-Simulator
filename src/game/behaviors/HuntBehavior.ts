import { behaviorPresentation, type Behavior } from './Behavior';

export class HuntBehavior implements Behavior {
  readonly id = 'huntFish' as const;
  readonly presentation = behaviorPresentation(this.id);
}
