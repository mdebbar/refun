import {
  Render,
  StatefulImpl,
  UI,
  ComponentType,
  SingleUI,
  Component,
} from './types';
import { findAncestor } from './finders';

export function run(app: UI, rootCommitNode: CommitNode): AppNode {
  const rootRender = () => app;
  const rootNode = new AppNode(null, rootRender);
  rootNode.commitNode = rootCommitNode;

  rootNode.rebuild();
  return rootNode;
}

// TODO[perf]: minimize the commit tree by reusing last commits for nodes
//             that aren't "dirty".
function commit(node: CommittableAppNode): Commit {
  const currentCommit = node.commitNode.startCommit();
  commitChildren(node, currentCommit);
  node.commitNode.applyCommit(currentCommit);
  node.commitNode.lastCommit = currentCommit;
  return currentCommit;
}

// Commits the children of `node` recursively. As it walks down the tree, it'll
// add children to `ancestorCommit`.
//
// QUESTION: should we allow commit nodes to throw? e.g. when adding children to
//           an <img>.
function commitChildren(node: AppNode, ancestorCommit: Commit) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child != null) {
      if (isCommittable(child)) {
        // When a child is committable, we commit it recursively and add its
        // commit as a child to the ancestor commit.
        const childCommit = commit(child);
        ancestorCommit.addChild(childCommit);
      } else {
        // Continue recursively in the tree to find more committable nodes.
        commitChildren(child, ancestorCommit);
      }
    }
  }
}

function build(node: AppNode) {
  // TODO[perf]: Mark the node with a "dirt commit" flag so it gets recommitted.
  const children = node.render(node);

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
    build(child);
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
    // In this case, we should reuse the existing node node.
    node.render = render;
    return node;
  } else {
    return (parent.children[i] = new AppNode(parent, render));
  }
}

function isSameComponentType(r1: Render, r2: Render) {
  // If both are null we shouldn't consider them of equal types.
  return r1.$$type && r2.$$type && r1.$$type == r2.$$type;
}

export class Commit<N extends CommitNode = CommitNode> {
  node: N;
  children: Commit[] = [];

  constructor(node: N) {
    this.node = node;
  }

  // Should return `false` if it doesn't accept the child.
  // QUESTION: Is the concept of accepting children useful?
  addChild(child: Commit): boolean {
    this.children.push(child);
    return true;
  }
}

// A `Node` in the commit tree. It knows how to commit itself during the commit
// phase after the build is complete. In the case of a browser, committing means
// updating html attributes, appending children, applying styles, etc.
export abstract class CommitNode {
  lastCommit: Commit<this>;

  // At this point, the component tree has been fully built and we are ready to
  // commit it. "Committing" could mean different things in different platforms.
  // In web, it probably means create/update DOM element and insert them into
  // the document.
  startCommit() {
    return new Commit(this);
  }

  // Apply the given commit object. The default `Commit` class only provides
  // children. This makes it possible to diff the child commits with children of
  // `this.lastCommit` to figure out what operations to perform.
  abstract applyCommit(commit: Commit<this>): void;
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
    build(this);
    this.recommit();
  }

  // After a rebuild is over, we need to recommit the subtree.
  recommit() {
    const committableAncestor = findAncestor(this, isCommittable);

    if (committableAncestor == null || !isCommittable(committableAncestor)) {
      throw new Error('impossible');
    }
    commit(committableAncestor);
  }
}

type CommittableAppNode<C extends CommitNode = CommitNode> = AppNode<C> & {
  commitNode: C;
};

function isCommittable<C extends CommitNode = CommitNode>(
  node: AppNode<C>,
): node is CommittableAppNode<C> {
  return node.commitNode != null;
}

export function gen<T extends any[]>(
  name: string,
  impl: (...args: T) => IterableIterator<UI>,
): Component<T> {
  return stateful(name, (node: AppNode, ...args: T) => {
    if (node.state == null) {
      node.state = {
        gen: impl(...args),
        latest: null,
      };
    }

    const { gen, latest } = node.state;
    if (latest && latest.done) {
      return latest.value;
    }

    const current = gen.next();
    if (current.done && current.value !== undefined) {
      // Keep the previous value if there was no return from the generator.
      node.state.latest.done = true;
    } else {
      node.state.latest = current;
    }
    return node.state.latest.value;
  });
}

export function stateful<T extends any[]>(
  name: string,
  impl: StatefulImpl<T>,
): Component<T> {
  const type = Symbol(name);
  return function(...args: T) {
    return typed(type, (node: AppNode) => impl(node, ...args));
  };
}

function typed(type: ComponentType, fn: Render): Render {
  (fn as Render).$$type = type;
  return fn as Render;
}
