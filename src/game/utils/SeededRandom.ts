import type { RandomSource } from '../types';

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (Math.imul(1_664_525, this.state) + 1_013_904_223) >>> 0;
    return this.state / 4_294_967_296;
  }
}
