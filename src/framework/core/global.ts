import { AppNode } from './build';

let isNodeCreationOpen = false;
let suppliedAppNode: AppNode<any> | null = null;
let currentAppNode: AppNode<any> | null = null;

export function myNode<N extends AppNode<any>>(createNode: () => N): N {
  if (currentAppNode != null) {
    throw new Error('Should not request a node more than once');
  }
  if (!isNodeCreationOpen) {
    throw new Error('Only stateful components can request a node');
  }
  if (suppliedAppNode == null) {
    currentAppNode = createNode();
  } else {
    currentAppNode = suppliedAppNode;
  }
  suppliedAppNode = null;
  return currentAppNode as N;
}

export function openNodeCreation<S>(node: AppNode<S> | null) {
  if (isNodeCreationOpen) {
    throw new Error('Something wrong in the framework probably...');
  }
  isNodeCreationOpen = true;
  suppliedAppNode = node;
}

export function closeNodeCreation(): AppNode<any> {
  const node = currentAppNode;
  if (node == null) {
    throw new Error("Stateful component didn't request its node");
  }
  isNodeCreationOpen = false;
  suppliedAppNode = null;
  currentAppNode = null;
  return node;
}
