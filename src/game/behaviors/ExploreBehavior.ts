import { behaviorPresentation, type Behavior } from './Behavior';

export class ExploreBehavior implements Behavior {
  readonly id = 'explore' as const;
  readonly presentation = behaviorPresentation(this.id);
}
