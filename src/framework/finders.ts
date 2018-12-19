import { AppNode, Component } from './core';
import { COMPONENT_TYPE } from './core/components';

type Finder = (node: AppNode<any>) => boolean;

export function findAncestor(
  node: AppNode<any>,
  cb: Finder,
): AppNode<any> | null {
  let current: AppNode<any> | null = node;
  while (current != null) {
    if (cb(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function findDescendant(node: AppNode<any>, cb: Finder): AppNode<any> {
  if (cb(node)) {
    return node;
  }

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child != null) {
      const found = findDescendant(child, cb);
      if (found) return found;
    }
  }

  throw new Error('Could not find the requested node');
}

export function findDescendantOfType(
  node: AppNode<any>,
  component: Component<any>,
): AppNode<any> {
  const type = component()[COMPONENT_TYPE];
  return findDescendant(node, n => n.ui[COMPONENT_TYPE] === type);
}
