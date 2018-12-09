import {
  SingleUI,
  MultiUI,
  UI,
  COMPONENT_TYPE,
  NODE_CREATOR,
} from './components';
import { trackSkips } from '../../instrumentation';

const tracker = trackSkips('build', 1000);

// Closure Compiler doesn't like TS enums, so we have to use a class with static
// fields to emulate an enum.
export class DirtyState {
  static Clean = 0;
  static ChildrenOnly = 1;
  static SelfAndChildren = 2;
}

// Light-weight tree that maintains the full structure of the rendered component
// tree.
export class AppNode<S> {
  constructor(initialState: S) {
    this.state = initialState;
  }
  dirty: DirtyState = DirtyState.SelfAndChildren;

  parent: AppNode<any> | null = null;

  ui: SingleUI<this>;

  // Some children could be null when their corresponding UI materializes
  // to null. This guarantees that all state is blown away correctly.
  children: Array<AppNode<any> | null> = [];

  state: S;

  // Rebuild the sub-tree under this node.
  // TODO: This should accept a callback for updating state (ala React setState).
  // TODO: Make `rebuild` invalid during a build.
  rebuild() {
    this.needsBuild();
    const rootNode = this.markParentChainAsDirty();
    rootNode.scheduleRebuild();
  }

  // Can only be invoked on the root node.
  // Does the same thing as `rebuild` except it doesn't wait for animation frame.
  immediateRebuild() {
    this.assertRoot();
    this.alreadyScheduledRebuild = false;
    build(this);
    this.postBuild();
  }

  alreadyScheduledRebuild = false;

  // Can only be invoked on the root node.
  private scheduleRebuild() {
    this.assertRoot();
    if (!this.alreadyScheduledRebuild) {
      this.alreadyScheduledRebuild = true;
      requestAnimationFrame(() => this.immediateRebuild());
    }
  }

  private assertRoot() {
    if (this.parent != null) {
      throw new Error(
        'scheduleRebuild() should only be called on the root node',
      );
    }
  }

  protected postBuild() { }

  updateUI(ui: SingleUI<this>) {
    if (ui !== this.ui) {
      this.ui = ui;
      this.needsBuild();
    }
  }

  needsBuild() {
    this.dirty = DirtyState.SelfAndChildren;
  }

  needsChildrenBuild() {
    if (this.dirty == DirtyState.Clean) {
      this.dirty = DirtyState.ChildrenOnly;
    }
  }

  buildSelf(): UI {
    const children = this.ui(this);
    this.dirty = DirtyState.Clean;
    return children;
  }

  // Marks all nodes in the parent chain as dirty and returns the root app node.
  markParentChainAsDirty(): AppNode<any> {
    // TODO[perf]: Maybe stop climbing as soon as we find a node that has a
    //             non-Clean dirty state.
    let node: AppNode<any> = this;
    while (node.parent) {
      node = node.parent;
      node.needsChildrenBuild();
    }
    return node;
  }
}

// Builds the tree starting at `node`.
// NOTE: Respects the dirty status of the `node`.
function build<S>(node: AppNode<S>) {
  switch (node.dirty) {
    case DirtyState.Clean:
      // If the node is clean, skip the whole subtree.
      tracker && tracker.skip();
      break;

    case DirtyState.ChildrenOnly:
      tracker && tracker.skip();
      visitChildren(node, build);
      break;

    case DirtyState.SelfAndChildren:
      tracker && tracker.hit();
      const uiChildren = node.buildSelf();

      // TODO[perf]: Reuse nodes instead of trimming them away. When a node is
      //             recycled, make sure its state is reset.
      if (isMultiUI(uiChildren)) {
        const count = buildMultiUI(uiChildren, node, 0);
        trimChildren(node, count);
      } else {
        forceBuildChildAtIndex(uiChildren, node, 0);
        trimChildren(node, 1);
      }
      break;
  }
}

// Visits all non-null children of `node`.
function visitChildren<S>(
  node: AppNode<S>,
  visitor: (child: AppNode<any>) => void,
) {
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) {
      visitor(child);
    }
  }
}

function isMultiUI(ui: UI): ui is MultiUI {
  return ui ? Symbol.iterator in ui : false;
}

function forceBuildChildAtIndex(
  ui: SingleUI<AppNode<any>> | null,
  parent: AppNode<any>,
  i: number,
) {
  if (ui == null) {
    parent.children[i] = null;
  } else {
    // const child = getChildNodeForUI(ui, parent, i);
    let child = parent.children[i];
    // TODO[perf]: If (child.ui === ui) skip building the subtree altogether.
    // Concern: Right now, we always rebuild from the root. If we apply the
    // optimization above, can we still reach all dirty nodes?
    if (child && isSameComponentType(child.ui, ui)) {
      // In this case, we should reuse the existing app node.
      // No action required.
    } else {
      child = parent.children[i] = ui[NODE_CREATOR]();
      child.parent = parent;
    }
    child.updateUI(ui);
    build(child);
  }
}

// Returns how many items it traversed, recursively.
// Because the ui array could be deeply nested, we need to flatten it. But
// doing that on every rebuild is costly. So this function does the same thing
// without the actual flattening.
//
// Because this function could be called recursively while traversing nested
// arrays, we need to tell it which child of `parent` it should start at.
// TODO: handle keys.
function buildMultiUI(
  multiUI: MultiUI,
  parent: AppNode<any>,
  startAt: number,
): number {
  let traversed = 0;
  let it = multiUI[Symbol.iterator]();
  let result;
  let i = 0;
  while (!(result = it.next()).done) {
    const ui = result.value;
    if (isMultiUI(ui)) {
      // Recursively traverse the nested arrays and keep track of the traversal
      // count.
      traversed += buildMultiUI(ui, parent, startAt + traversed);
    } else {
      forceBuildChildAtIndex(ui, parent, startAt + i);
      traversed++;
    }
    i++;
  }
  return traversed;
}

function trimChildren(node: AppNode<any>, limit: number) {
  if (node.children.length > limit) {
    node.children.length = limit;
  }
}

function isSameComponentType(ui1: SingleUI<any>, ui2: SingleUI<any>) {
  // If both are null we shouldn't consider them of equal types.
  return (
    ui1[COMPONENT_TYPE] &&
    ui2[COMPONENT_TYPE] &&
    ui1[COMPONENT_TYPE] == ui2[COMPONENT_TYPE]
  );
}
