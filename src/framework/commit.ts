import { AppNode, DirtyState, Component, createComponent, UI } from './core';
import { NodeCreator } from './core/components';
import { trackSkips } from '../instrumentation';

type Commit = any;

const commitTracker = trackSkips('commit', 1000);

// A `Node` in the commit tree. It knows how to commit itself during the commit
// phase after the build is complete. In the case of a browser, committing means
// updating html attributes, appending children, applying styles, etc.
export abstract class Committer<D extends Commit = Commit> {
  dirty: DirtyState = DirtyState.SelfAndChildren;
  private lastCommit: D | null = null;

  needsCommit() {
    this.dirty = DirtyState.SelfAndChildren;
  }

  needsToCheckChildCommits() {
    if (this.dirty === DirtyState.Clean) {
      this.dirty = DirtyState.ChildrenOnly;
    }
  }

  commit(node: CommitNode<this, D, any>): D {
    if (this.dirty === DirtyState.SelfAndChildren) {
      commitTracker && commitTracker.hit();
    } else {
      commitTracker && commitTracker.skip();
    }

    if (this.dirty === DirtyState.Clean) {
      return this.lastCommit as D;
    }

    const childCommits = commitChildrenRecursive(node);
    const newCommit =
      this.dirty === DirtyState.ChildrenOnly
        ? (this.lastCommit as D)
        : this.commitSelf(this.lastCommit, childCommits);
    this.diffChildren(newCommit, childCommits);
    this.lastCommit = newCommit;
    this.dirty = DirtyState.Clean;
    return newCommit;
  }

  abstract commitSelf(lastCommit: D | null, newChildren: D[]): D;

  abstract diffChildren(newCommit: D, newChildren: D[]): void;
}

export class NoopCommitter extends Committer<void> {
  commitSelf() {}
  diffChildren() {}
}

export class CommitNode<
  C extends Committer<D>,
  D extends Commit,
  S
> extends AppNode<S> {
  constructor(initialState: S, committer: C) {
    super(initialState);
    this.committer = committer;
  }

  committer: C;

  // needsBuild() {
  //   super.needsBuild();
  //   this.committer.needsCommit();
  // }

  needsChildrenBuild() {
    super.needsChildrenBuild();
    this.committer.needsToCheckChildCommits();
  }

  protected postBuild() {
    super.postBuild();
    this.committer.commit(this);
  }
}

// Commits the children of `node` recursively. As it walks down the tree, it'll
// add children to `arr`.
//
// QUESTION: should we allow commit nodes to throw? e.g. when adding children to
//           an <img>.
function commitChildrenRecursive<T extends Commit>(
  node: AppNode<any> | CommitNode<Committer<T>, T, any>,
  arr: T[] = [],
): T[] {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child != null) {
      if (isCommitNode<T>(child)) {
        // When a child is committable, we commit it recursively and add its
        // commit as a child to the ancestor commit.
        const result = child.committer.commit(child);
        if (!result) {
          throw new Error('Expected commit to return something.');
        }
        arr.push(result);
      } else {
        // Continue recursively in the tree to find more committable nodes.
        commitChildrenRecursive(child, arr);
      }
    }
  }
  return arr;
}

function isCommitNode<T>(
  node: AppNode<any>,
): node is CommitNode<Committer<T>, T, any> {
  return node instanceof CommitNode;
}

export function committer<
  T extends any[],
  C extends Committer,
  D extends Commit,
  S
>(
  name: string,
  initState: () => S,
  createComitter: () => C,
  impl: (node: CommitNode<C, D, S>, ...args: T) => UI,
): Component<T, CommitNode<C, D, S>> {
  const createNode: NodeCreator<T, CommitNode<C, D, S>> = () =>
    new CommitNode(initState(), createComitter());
  return createComponent<T, CommitNode<C, D, S>>(
    name,
    createNode,
    (...args: T) => (node: CommitNode<C, D, S>) => impl(node, ...args),
  );
}
