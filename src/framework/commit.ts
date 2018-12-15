import { AppNode, DirtyState, myNode } from './core';
import { SingleUI } from './core/components';
import { trackSkips } from '../instrumentation';

export type Commit = any;
// TODO[types]: This is useful, please bring it back!
export type CommitUI<C extends Committer> = SingleUI;

const commitTracker = trackSkips('commit', 1000);

// A `Node` in the commit tree. It knows how to commit itself during the commit
// phase after the build is complete. In the case of a browser, committing means
// updating html attributes, appending children, applying styles, etc.
export abstract class Committer<D extends Commit = Commit> {
  dirty: DirtyState = DirtyState.Clean;
  private lastCommit: D | null = null;

  needsCommit() {
    this.dirty = DirtyState.SelfAndChildren;
  }

  needsToCheckChildCommits() {
    if (this.dirty === DirtyState.Clean) {
      this.dirty = DirtyState.ChildrenOnly;
    }
  }

  commit(node: CommitNode<this, any>): D {
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

export class CommitNode<C extends Committer<Commit>, S> extends AppNode<S> {
  constructor(initialState: S, committer: C) {
    super(initialState);
    this.committer = committer;
  }

  committer: C;

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
function commitChildrenRecursive<D extends Commit>(
  node: AppNode<any> | CommitNode<Committer<D>, any>,
  arr: D[] = [],
): D[] {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child != null) {
      if (isCommitNode<D>(child)) {
        // When a child is committable, we commit it recursively and add its
        // commit as a child to the ancestor commit.
        const result = child.committer.commit(child);
        if (!result) {
          throw new Error('Expected commit to return something.');
        }
        arr.push(result);
      } else {
        // Continue recursively in the tree to find more commit nodes.
        commitChildrenRecursive(child, arr);
      }
    }
  }
  return arr;
}

function isCommitNode<D>(
  node: AppNode<any>,
): node is CommitNode<Committer<D>, any> {
  return node instanceof CommitNode;
}

export function myCommitNode<C extends Committer<any>>(
  createCommitter: () => C,
) {
  return myNode(() => new CommitNode(null, createCommitter()));
}
