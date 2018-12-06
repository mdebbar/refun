import { AppNode } from './core';

type Finder = (node: AppNode) => boolean;

export function findAncestor(node: AppNode, cb: Finder): AppNode | null {
  let current: AppNode | null = node;
  while (current != null) {
    if (cb(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function findDescendant(root: AppNode, cb: Finder): AppNode | null {
  if (cb(root)) {
    return root;
  }
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child != null) {
      const found = findDescendant(child, cb);
      if (found) return found;
    }
  }
  return null;
}

export function findDescendantByName(root: AppNode, name: string): AppNode {
  const node = findDescendant(root, node => {
    const t = node.render.$$type;
    return !!t && t.toString() === `Symbol(${name})`;
  });
  expect(node).not.toBeNull();
  // TODO[types]: At this point, we know `node` isn't null.
  return node as AppNode;
}
