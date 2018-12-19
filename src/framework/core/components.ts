import { AppNode } from './build';
import { myNode } from './global';

export const COMPONENT_NAME = Symbol('COMPONENT_NAME');
export const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');

export type Component<T extends any[]> = (...args: T) => SingleUI;

export type ComponentImpl<T extends any[]> = (...args: T) => InvokedComponent;

export type InvokedComponent = () => UI;

export type NodeCreator<S, N extends AppNode<S>> = (initialState: S) => N;

// When a component is invoked, it either returns a single UI or multiple
// UIs (in an array). The framework takes these UIs and renders them on the
// screen.
//
// A `null` UI indicates there's nothing to be rendered.
export type UI = SingleUI | MultiUI | null;

// Regular components return a `SingleUI` which is a function that the framework
// will call and pass the `AppNode` to. That `SingleUI` is already closing over
// the component args.
export type SingleUI = {
  (): UI;
  [COMPONENT_NAME]: string;
  [COMPONENT_TYPE]: ComponentType;
};

// TODO[types]: If we use `Iterable<UI>` TypeScript happily accepts a string
// which isn't correct.
// export interface MultiUI extends Iterable<UI> {}
export interface MultiUI extends Array<UI> {}

export function component<T extends any[]>(
  impl: (...args: T) => UI,
): Component<T> {
  return namedComponent(impl.name, impl);
}

export function namedComponent<T extends any[]>(
  name: string,
  impl: (...args: T) => UI,
): Component<T> {
  if (!name) debugger;
  const type = _createComponentTypeFromName(name);
  return function(...args: T) {
    // This wrapper will be called by the framework.
    // TODO: Think about ways to hide this wrapper so the user can never call it
    //       by mistake.
    function wrapper() {
      return impl(...args);
    }
    wrapper[COMPONENT_NAME] = name;
    wrapper[COMPONENT_TYPE] = type;
    return wrapper as SingleUI;
  };
}

type StateGetter<S> = () => S;
type StateProvider<S> = S | StateGetter<S>;

export function myStateNode<S>(initialState: StateProvider<S>): AppNode<S> {
  return myNode(() => {
    const finalState = isStateGetter(initialState)
      ? initialState()
      : initialState;
    return new AppNode(finalState);
  });
}

function isStateGetter<S>(state: StateProvider<S>): state is StateGetter<S> {
  return typeof state === 'function';
}

// Each component has a type that distinguishes it from others. This type is
// used during rendering to diff the old component tree with the new one.
export type ComponentType = Symbol;

function _createComponentTypeFromName(name: string): ComponentType {
  return Symbol(name);
}
