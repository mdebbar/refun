import { AppNode } from './build';

export const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');
export const NODE_CREATOR = Symbol('NODE_CREATOR');

export type Component<T extends any[], N extends AppNode<any>> = (
  ...args: T
) => SingleUI<N, T>;

export type ComponentImpl<T extends any[], N extends AppNode<any>> = (
  ...args: T
) => InvokedComponent<N>;

export type InvokedComponent<N extends AppNode<any>> = (node: N) => UI;

export type NodeCreator<T extends any[], N extends AppNode<any>> = (
  ...args: T
) => N;

// When a component is invoked, it either returns a single UI or multiple
// UIs (in an array). The framework takes these UIs and renders them on the
// screen.
//
// A `null` UI indicates there's nothing to be rendered.
export type UI = SingleUI<AppNode<any>> | MultiUI | null;

// Regular components return a `SingleUI` which is a function that the framework
// will call and pass the `AppNode` to. That `SingleUI` is already closing over
// the component args.
export type SingleUI<N extends AppNode<any>, T extends any[] = any[]> = {
  (node: N): UI;
  [COMPONENT_TYPE]: ComponentType;
  [NODE_CREATOR]: NodeCreator<T, N>;
};

export interface MultiUI extends Iterable<UI> {}

export function createComponent<T extends any[], N extends AppNode<any>>(
  name: string,
  createNode: NodeCreator<T, N>,
  impl: ComponentImpl<T, N>,
): Component<T, N> {
  const type = _createComponentType(name);
  return function(...args: T) {
    const invokedComponent: InvokedComponent<N> = impl(...args);
    invokedComponent[COMPONENT_TYPE] = type;
    invokedComponent[NODE_CREATOR] = () => createNode(...args);
    return invokedComponent as SingleUI<N, T>;
  };
}

// Each component has a type that distinguishes it from others. This type is
// used during rendering to diff the old component tree with the new one.
export type ComponentType = Symbol;
function _createComponentType(name: string): ComponentType {
  return Symbol(name);
}

// This is the stateful component implementation defined by the user. It takes
// an app node as the first argument. This should be used for components that
// desire to preserve state across multiple renders.
export type StatefulImpl<S, T extends any[]> = (
  node: AppNode<S>,
  ...args: T
) => UI;
export function stateful<T extends any[], S>(
  name: string,
  initState: (...args: T) => S,
  impl: StatefulImpl<S, T>,
): Component<T, AppNode<S>> {
  return createComponent(
    name,
    (...args) => new AppNode<S>(initState(...args)),
    (...args) => (node: AppNode<S>) => impl(node, ...args),
  );
}
