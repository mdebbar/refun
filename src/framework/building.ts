import { DirtyState } from './basic';
import { commit, CommitNode } from './committing';
import { Render, SingleUI, UI } from './types';
import { SkipRate } from '../instrumentation';

const rate = new SkipRate('build', 0);

// Builds the tree starting at `node` while respecting the `dirtyState` flag.
function build(node: AppNode) {
  switch (node.dirtyState) {
    case DirtyState.Clean:
      // If the node is clean, skip the whole subtree.
      rate.total();
      rate.skip();
      break;

    case DirtyState.ChildrenOnly:
      rate.total();
      rate.skip();
      buildChildren(node);
      break;

    case DirtyState.SelfAndChildren:
      forceBuild(node);
      break;
  }
}

function buildChildren(node: AppNode) {
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) {
      build(child);
    }
  }
}

function forceBuild(node: AppNode) {
  rate.total();
  const children = node.render(node);
  node.dirtyState = DirtyState.Clean;

  // TODO[perf]: Reuse nodes instead of throwing them away. When a node is
  //             recycled, its state needs to be reset.
  if (Array.isArray(children)) {
    const count = buildMultiUI(children, node, 0);
    if (node.children.length > count) {
      node.children.length = count;
    }
  } else {
    buildUIAtIndex(children, node, 0);
    if (node.children.length > 1) {
      node.children.length = 1;
    }
  }
}

function buildUIAtIndex(ui: SingleUI, parent: AppNode, i: number) {
  if (ui == null) {
    parent.children[i] = null;
  } else {
    const child = prepareChildNode(ui, parent, i);
    forceBuild(child);
  }
}

// Returns how many items it traversed, recursively.
// Because the ui array could be deeply nested, we need to flatten it. But
// doing that on every rebuild is costly. So this function does the same thing
// without the actual flattening.
//
// Because this function could be called recursively while traversing the
// AppNode's children, we need to tell it which child it should start at.
// TODO: handle keys.
function buildMultiUI(multiUI: UI[], parent: AppNode, startAt: number): number {
  let traversed = 0;
  for (let i = 0; i < multiUI.length; i++) {
    const r = multiUI[i];
    if (Array.isArray(r)) {
      // Recursively traverse the nested arrays and keep track of the traversal
      // count.
      traversed += buildMultiUI(r, parent, startAt + traversed);
    } else {
      buildUIAtIndex(r, parent, startAt + i);
      traversed++;
    }
  }
  return traversed;
}

function prepareChildNode(render: Render, parent: AppNode, i: number): AppNode {
  const node = parent.children[i];
  // TODO[perf]: If (node.render === render)
  //             skip building the subtree altogether.
  //             Does this optimization work for generators that need to be
  //             invoked multiple times?
  if (node && isSameComponentType(node.render, render)) {
    // In this case, we should reuse the existing app node.
    node.render = render;
    if (node.commitNode) {
      node.commitNode.dirtyState = DirtyState.SelfAndChildren;
    }
    return node;
  }
  return (parent.children[i] = new AppNode(parent, render));
}

function isSameComponentType(r1: Render, r2: Render) {
  // If both are null we shouldn't consider them of equal types.
  return r1.$$type && r2.$$type && r1.$$type == r2.$$type;
}

// Light-weight tree that maintains the full structure of the rendered component
// tree.
/*

CommitTree        AppTree
    o     <---       o
   / \             /   \
      o   <---    o     o
 / \             / \   / \
o         <---  o   o o   o

*/
export class AppNode<C extends CommitNode = CommitNode> {
  constructor(parent: AppNode | null, render: Render) {
    this.parent = parent;
    this.render = render;
  }

  dirtyState: DirtyState = DirtyState.SelfAndChildren;

  parent: AppNode | null;

  // Some children could be null when their corresponding UI materializes
  // to null. This guarantees that all state is blown away correctly.
  children: (AppNode | null)[] = [];

  // Commit nodes are only required when the component wants to have custom
  // commit logic (e.g. html elements).
  commitNode: C | null = null;

  state: any = null;

  render: Render;

  // Rebuild the sub-tree under this node.
  // TODO: This should accept a callback for updating state (ala React setState).
  // TODO: Make `rebuild` invalid during a build.
  rebuild() {
    this.markAsDirty();
    const rootNode = this.markParentChainAsDirty();
    rootNode.scheduleRebuild();
  }

  alreadyScheduledRebuild = false;

  // Should only be called on the root node.
  scheduleRebuild() {
    if (this.parent != null) {
      throw new Error(
        'scheduleRebuild() should only be called on the root node',
      );
    }
    if (!this.alreadyScheduledRebuild) {
      this.alreadyScheduledRebuild = true;
      requestAnimationFrame(() => {
        this.alreadyScheduledRebuild = false;
        build(this);
        // TODO[types]: This is the root node which is always committable.
        commit(this as CommittableAppNode);
      });
    }
  }

  protected markAsDirty() {
    this.dirtyState = DirtyState.SelfAndChildren;
    if (this.commitNode) {
      this.commitNode.dirtyState = DirtyState.SelfAndChildren;
    }
  }

  // Marks all nodes in the parent chain as dirty and returns the root app node.
  protected markParentChainAsDirty(): AppNode {
    // TODO[perf]: Maybe stop climbing as soon as we find a node that has a
    //             non-Clean dirty state.
    let node: AppNode = this;
    while (node.parent) {
      node = node.parent;
      if (node.dirtyState == DirtyState.Clean) {
        node.dirtyState = DirtyState.ChildrenOnly;
      }
      if (node.commitNode && node.commitNode.dirtyState == DirtyState.Clean) {
        node.commitNode.dirtyState = DirtyState.ChildrenOnly;
      }
    }
    return node;
  }
}

export type CommittableAppNode<C extends CommitNode = CommitNode> = AppNode<
  C
> & {
  commitNode: C;
};

export function isCommittable<C extends CommitNode = CommitNode>(
  node: AppNode<C>,
): node is CommittableAppNode<C> {
  return node.commitNode != null;
}
