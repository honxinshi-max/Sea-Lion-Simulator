import { behaviorPresentation, type Behavior } from './Behavior';

export class InteractBehavior implements Behavior {
  readonly id = 'slap' as const;
  readonly presentation = behaviorPresentation(this.id);
}
