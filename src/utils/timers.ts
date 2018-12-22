import { component, myStateNode, AnyUI } from '../framework';

export const interval = component(function interval(
  ms: number,
  children: AnyUI,
) {
  const node = myStateNode(null);
  setTimeout(() => node.rebuild(), ms);
  return children;
});
