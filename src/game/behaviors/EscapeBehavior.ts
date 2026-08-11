import { behaviorPresentation, type Behavior } from './Behavior';

export class EscapeBehavior implements Behavior {
  readonly id = 'escape' as const;
  readonly presentation = behaviorPresentation(this.id);
}
