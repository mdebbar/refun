export { stateful, createComponent } from './components';
export { AppNode, DirtyState } from './build';

// Necessary to re-export types :/
import { UI, Component } from './components';
import { AppNode } from './build';
export type UI = UI;
export type Component<T extends any[], N extends AppNode<any>> = Component<
  T,
  N
>;
