import { behaviorPresentation, type Behavior } from './Behavior';

export class SurfaceBehavior implements Behavior {
  readonly id = 'surface' as const;
  readonly presentation = behaviorPresentation(this.id);
}
