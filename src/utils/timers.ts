import { component, myStateNode, UI } from '../framework';

export const interval = component(function interval(ms: number, children: UI) {
  const node = myStateNode(null);
  setTimeout(() => node.rebuild(), ms);
  return children;
});
