import { DEBUG } from './debug';

export function trackSkips(name: string, throttle: number): SkipTracker | null {
  return DEBUG ? new SkipTracker(name, throttle) : null;
}

class SkipTracker {
  constructor(name: string, printThrottle: number) {
    this._name = name;
    this._printThrottle = printThrottle;
  }

  _name: string;
  _printThrottle: number;
  _hits = 0;
  _skips = 0;

  reset() {
    this._hits = 0;
    this._skips = 0;
  }

  hit() {
    this._hits++;
    this.maybePrint();
  }

  skip() {
    this._skips++;
    this.maybePrint();
  }

  private maybePrint() {
    const total = this._skips + this._hits;
    if (this._printThrottle != 0 && total % this._printThrottle == 0) {
      const percent = ((100 * this._skips) / total).toFixed(2);
      console.log(`${this._name}: skipped ${percent}%`);
    }
  }
}
