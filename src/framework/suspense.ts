import { UI, stateful, AppNode } from './core';

export function sleep(t: number) {
  return new Suspender(cb => setTimeout(cb, t), token => clearTimeout(token));
}

// TODO[perf]: Provide a global requestAnimationFrame.
export function animationFrame() {
  return new Suspender(requestAnimationFrame, cancelAnimationFrame);
}

type Animated<T extends any[]> = (...args: T) => (passed: number) => UI;
export function animated<T extends any[]>(name: string, cb: Animated<T>) {
  return gen(name, function*(...args: T) {
    const startTime = Date.now();
    const animator = cb(...args);
    while (true) {
      yield animator(Date.now() - startTime);
      yield animationFrame();
    }
  });
}

export type VoidCallback = () => void;
export type ScheduleResumeFn<T> = (cb: VoidCallback) => T;
export type UnscheduleResumeFn<T> = (token: T) => void;

// TODO: explore an API that looks like this:
//       yield animate(div(...));
//       yield delay(div(...));
export class Suspender<T = any> {
  private scheduleResume: ScheduleResumeFn<T>;
  private cancelResume: UnscheduleResumeFn<T>;

  token: T;

  constructor(
    scheduleResume: ScheduleResumeFn<T>,
    cancelResume: UnscheduleResumeFn<T>,
  ) {
    this.scheduleResume = scheduleResume;
    this.cancelResume = cancelResume;
  }

  suspend(onResume: VoidCallback) {
    this.token = (void 0, this.scheduleResume)(onResume);
  }

  cancel() {
    (void 0, this.cancelResume)(this.token);
  }
}

type GenValue = UI | Suspender | PromiseLike<any>;
type GenResult = IterableIterator<GenValue>;

type State = {
  gen: GenResult;
  latest: UI | null;
  suspender: Suspender | null;
  isFirstRender: boolean;
};

// TODO: This is dangerous! If the component is re-invoked with different args,
//       the generator won't be called again.
// TODO: Does it make sense to return something from the yield statements?
export function gen<T extends any[]>(
  name: string,
  impl: (...args: T) => GenResult,
) {
  return stateful(
    name,
    (...args: T) => ({
      gen: impl(...args),
      latest: null,
      suspender: null,
      isFirstRender: true,
    }),
    (node: AppNode<State>, ...args: T) => {
      // TODO: Maybe provide an `onMount` hook?
      if (node.state.isFirstRender) {
        node.state.isFirstRender = false;
        genNext(node);
      }
      // TODO[correctness]: on unmount, cancel any active suspender.
      return node.state.latest;
    },
  );
}

function genNext(node: AppNode<State>) {
  let { value, done } = node.state.gen.next();
  while (!done) {
    if (value instanceof Suspender) {
      (node.state.suspender = value).suspend(postSuspend.bind(null, node));
      break;
    } else if (isPromise<any>(value)) {
      // TODO[correctness]: Handle yielding promises.
      // QUESTION: Maybe we could use the same Suspender interface for promises?
      throw new Error('yielding promises is not implemented yet');
    } else if (value !== undefined) {
      node.state.latest = value;
      // There's intentionally no break here. We want to keep pulling
      // values from the generator until it suspends.
    } else {
      // console.log('nothing!');
    }

    ({ value, done } = node.state.gen.next());
  }
}

function postSuspend(node: AppNode<State>) {
  node.state.suspender = null;
  genNext(node);
  node.rebuild();
}

function isPromise<T>(obj: any | null): obj is PromiseLike<T> {
  return obj ? typeof obj.then === 'function' : false;
}
