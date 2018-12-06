import { AppNode } from './core';

export type Component<T extends any[]> = (...args: T) => UI;

// This is the stateful component implementation defined by the user. It takes
// an app node as the first argument. This should be used for components that
// desire to preserve state across multiple renders.
export type StatefulImpl<T extends any[]> = (node: AppNode, ...args: T) => UI;

// The `Render` functions are invisible to the app developer. It's an internal
// mechanism for the framework to be able to inject the app nodes into stateful
// components.
export type Render = {
  (node: AppNode): UI;
  $$type?: ComponentType;
};

// Each component has a type that distinguishes it from others. This type is
// used during rendering to diff the old component tree with the new one.
export type ComponentType = Symbol;

// When a component is invoked, it either returns a single UI or multiple
// UIs (in an array). The framework takes these UIs and renders them on the
// screen.
export type UI = SingleUI | MultiUI;

// Regular components return a `Render` function that the framework will call
// and pass the `AppNode` to. That `Render` is already closing over
// props (i.e. args).
//
// A `null` UI indicates there's nothing to be rendered.
export type SingleUI = Render | null;

export interface MultiUI extends Array<UI> {}

export type VoidCallback = () => void;
export type ScheduleFn<T> = (cb: VoidCallback) => T;
export type UnscheduleFn<T> = (token: T) => void;
