import { behaviorPresentation, type Behavior } from './Behavior';

export class RestBehavior implements Behavior {
  readonly id = 'rest' as const;
  readonly presentation = behaviorPresentation(this.id);
}
