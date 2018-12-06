export class SkipRate {
  constructor(name: string, printThrottle: number = 0) {
    this._name = name;
    this._printThrottle = printThrottle;
  }

  _name: string;
  _printThrottle: number;
  _total = 0;
  _skip = 0;

  total() {
    this._total++;
    if (this._printThrottle != 0 && this._total % this._printThrottle == 0) {
      const percent = ((100 * this._skip) / this._total).toFixed(2);
      console.log(`${this._name}: skipped ${percent}%`);
    }
  }

  skip() {
    this._skip++;
  }
}
