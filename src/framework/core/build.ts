import { SingleUI, MultiUI, AnyUI, TYPE } from './components';
import { trackSkips } from '../../instrumentation';
import { openNodeCreation, closeNodeCreation } from './global';
import { invoke, NAME, isHidden } from './hiding';

const tracker = trackSkips('build', 1000);

type FrameScheduler = (cb: VoidFunction) => void;

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

  get a__name() {
    return this.ui[NAME];
  }

  dirty: DirtyState = DirtyState.Clean;

  parent: AppNode<any> | null = null;

  ui: SingleUI;

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

  scheduleNextFrame: FrameScheduler = requestAnimationFrame;

  // Can only be invoked on the root node.
  private scheduleRebuild() {
    this.assertRoot();
    if (!this.alreadyScheduledRebuild) {
      this.alreadyScheduledRebuild = true;
      (void 0, this.scheduleNextFrame)(() => this.immediateRebuild());
    }
  }

  private assertRoot() {
    if (this.parent != null) {
      throw new Error(
        'scheduleRebuild() should only be called on the root node',
      );
    }
  }

  protected postBuild() {
    this.dirty = DirtyState.Clean;
  }

  updateUI(ui: SingleUI, needsBuild: boolean = true) {
    // TODO[correctness]: We always rebuild from the root. Does this
    // short-circuiting allow us to reach all dirty nodes?
    if (ui !== this.ui) {
      this.ui = ui;
      needsBuild && this.needsBuild();
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

  buildSelf(): AnyUI {
    // TODO: Try the idea of passing the app node to SingleUI.
    openNodeCreation(this);
    const children = invoke(this.ui);
    closeNodeCreation();
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
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child) {
          build(child);
        }
      }
      break;

    case DirtyState.SelfAndChildren:
      tracker && tracker.hit();
      const uiChildren = node.buildSelf();
      buildUIChildren(node, uiChildren);
      break;
  }
  node.dirty = DirtyState.Clean;
}

function buildUIChildren<S>(parent: AppNode<S>, uiChildren: AnyUI) {
  // TODO[perf]: Reuse nodes instead of trimming them away. When a node is
  //             recycled, make sure its state is reset.
  if (uiChildren == null || isSingleUI(uiChildren)) {
    buildChildAtIndex(uiChildren, parent, 0);
    trimChildren(parent, 1);
  } else {
    const count = buildMultiUI(uiChildren, parent, 0);
    trimChildren(parent, count);
  }
}

function buildChildAtIndex(
  ui: SingleUI | null,
  parent: AppNode<any>,
  i: number,
) {
  if (ui == null) {
    parent.children[i] = null;
  } else {
    let node = parent.children[i];
    // TODO[perf]: If (child.ui === ui) skip building the subtree altogether.
    // Concern: Right now, we always rebuild from the root. If we apply the
    // optimization above, can we still reach all dirty nodes?
    if (node && isSameComponentType(node.ui, ui)) {
      // In this case, we should reuse the existing app node.
      // No action required.
      node.updateUI(ui);
      build(node);
    } else {
      openNodeCreation(null);
      const uiChildren = invoke(ui);
      const node = closeNodeCreation();

      node.parent = parent;
      node.updateUI(ui, false);
      parent.children[i] = node;

      buildUIChildren(node, uiChildren);
    }
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
  let it = multiUI[Symbol.iterator]();
  let result;
  // Corresponds to the index of the `parent` child currently being worked on.
  let traversed = 0;
  while (!(result = it.next()).done) {
    const ui = result.value;
    if (ui == null || isSingleUI(ui)) {
      buildChildAtIndex(ui, parent, startAt + traversed);
      traversed++;
    } else {
      // Recursively traverse the nested arrays and keep track of the traversal
      // count.
      traversed += buildMultiUI(ui, parent, startAt + traversed);
    }
  }
  return traversed;
}

function trimChildren(node: AppNode<any>, limit: number) {
  if (node.children.length > limit) {
    node.children.length = limit;
  }
}

function isSameComponentType(ui1: SingleUI, ui2: SingleUI) {
  // If both are null we shouldn't consider them of equal types.
  return ui1[TYPE] && ui2[TYPE] && ui1[TYPE] == ui2[TYPE];
}

function isSingleUI(ui: AnyUI): ui is SingleUI {
  return isHidden(ui);
}
