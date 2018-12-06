import { AppNode } from './building';
import { CommitNode } from './committing';
import { Scheduler } from './scheduling';
import { UI, Component, StatefulImpl, ComponentType, Render } from './types';

export function run(app: UI, rootCommitNode: CommitNode): AppNode {
  const rootRender = () => app;
  const rootNode = new AppNode(null, rootRender);
  rootNode.commitNode = rootCommitNode;

  rootNode.rebuild();
  return rootNode;
}

type GenResult = IterableIterator<UI | Scheduler | PromiseLike<any>>;

export function gen<T extends any[]>(
  name: string,
  impl: (...args: T) => GenResult,
): Component<T> {
  return stateful(name, (node: AppNode, ...args: T) => {
    if (node.state == null) {
      // Initialize state.
      node.state = {
        gen: impl(...args),
        latest: null,
        scheduler: null,
      };
      next();
    }

    return node.state.latest;

    function next() {
      while (true) {
        const { value, done } = node.state.gen.next();
        if (done) {
          if (value !== undefined) {
            node.state.latest = value;
          }
          break;
        } else if (typeof value.then === 'function') {
          // TODO: Handle yielding promises.
          // QUESTION: Maybe we could use the same Scheduler interface for promises?
        } else if (value instanceof Scheduler) {
          // TODO: Can we replace this with promises? The only concern is that
          //       promises are not cancellable.
          if (node.state.scheduler && node.state.scheduler.active) {
            node.state.scheduler.unschedule();
          }
          // TODO[correctness]: Unschedule on unmount.
          (node.state.scheduler = value).schedule(() => {
            node.state.scheduler = null;
            next();
            node.rebuild();
          });
          break;
        } else {
          node.state.latest = value;
        }
      }
    }
  });
}

export function stateful<T extends any[]>(
  name: string,
  impl: StatefulImpl<T>,
): Component<T> {
  const type = Symbol(name);
  return function(...args: T) {
    return typed(type, (node: AppNode) => impl(node, ...args));
  };
}

function typed(type: ComponentType, fn: Render): Render {
  fn.$$type = type;
  return fn;
}
