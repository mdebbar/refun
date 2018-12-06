import { ScheduleFn, UnscheduleFn, VoidCallback } from './types';

export class Scheduler<T = any> {
  _schedule: ScheduleFn<T>;
  _unschedule: UnscheduleFn<T>;
  token: T;
  active: boolean = false;

  constructor(schedule: ScheduleFn<T>, unschedule: UnscheduleFn<T>) {
    this._schedule = schedule;
    this._unschedule = unschedule;
  }

  schedule(cb: VoidCallback) {
    this.active = true;
    this.token = (void 0, this._schedule)(cb);
  }

  unschedule() {
    this.active = false;
    (void 0, this._unschedule)(this.token);
  }
}
