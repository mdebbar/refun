type Fun<T extends any[] = any[], R = any> = (...args: T) => R;

const HIDDEN = Symbol('HIDDEN');
export const NAME = Symbol('NAME');
export interface HiddenFun<F extends Fun> extends Array<void> {
  [NAME]: string;
  [HIDDEN]: F;
}

export function hide<F extends Fun>(name: string, fun: F): HiddenFun<F> {
  // TODO[perf]: use `defineProperty`.
  return Object.assign([], { [NAME]: name, [HIDDEN]: fun });
}

export function isHidden<F extends Fun>(fun: any): fun is F {
  return typeof fun[HIDDEN] === 'function';
}

export function invoke<F extends Fun>(hiddenFun: HiddenFun<F>): ReturnType<F> {
  return hiddenFun[HIDDEN]();
}
