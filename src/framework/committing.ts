import { DirtyState } from './basic';
import { CommittableAppNode, AppNode, isCommittable } from './building';

export function commit(node: CommittableAppNode): any {
  if (node.commitNode.dirtyState !== DirtyState.Clean) {
    const children: any[] = [];
    commitChildren(node, children);
    node.commitNode.lastCommit = node.commitNode.commitWithChildren(children);
    node.commitNode.dirtyState = DirtyState.Clean;
  }
  return node.commitNode.lastCommit;
}

// Commits the children of `node` recursively. As it walks down the tree, it'll
// add children to `ancestorCommit`.
//
// QUESTION: should we allow commit nodes to throw? e.g. when adding children to
//           an <img>.
function commitChildren(node: AppNode, arr: any[]) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child != null) {
      if (isCommittable(child)) {
        // When a child is committable, we commit it recursively and add its
        // commit as a child to the ancestor commit.
        arr.push(commit(child));
      } else {
        // Continue recursively in the tree to find more committable nodes.
        commitChildren(child, arr);
      }
    }
  }
}

// A `Node` in the commit tree. It knows how to commit itself during the commit
// phase after the build is complete. In the case of a browser, committing means
// updating html attributes, appending children, applying styles, etc.
export abstract class CommitNode<T = any> {
  dirtyState: DirtyState = DirtyState.SelfAndChildren;

  lastCommit: T;

  abstract getChildrenOfCommit(commit: T): T[];

  protected markAsDirty() {
    this.dirtyState = DirtyState.SelfAndChildren;
  }

  // Generally, this method shouldn't be overriden. Instead, override `commit`,
  // `appendChild`, `replaceChildAt`, `removeChildAt` and `trimChildren`.
  commitWithChildren(children: T[]): T {
    const commit =
      this.dirtyState === DirtyState.SelfAndChildren
        ? this.commit(this.lastCommit)
        : this.lastCommit;

    // This is an ugly HACK! Get rid of it when you find a better approach.
    const lastChildren =
      this.lastCommit && this.getChildrenOfCommit(this.lastCommit);

    // Diff children.
    const lastLength = lastChildren ? lastChildren.length : 0;
    for (let i = 0; i < children.length; i++) {
      if (i >= lastLength) {
        this.appendChild(commit, children[i]);
      } else if (children[i] !== lastChildren[i]) {
        // TODO[perf]: explore smarter ways to reuse children.
        this.replaceChildAt(commit, children[i], i);
      }
    }
    if (lastLength > children.length) {
      this.trimChildren(commit, lastChildren.length - children.length);
    }
    return commit;
  }

  abstract commit(lastCommit: T | null): T;

  abstract appendChild(commit: T, child: T): void;

  abstract replaceChildAt(commit: T, newChild: T, i: number): void;

  abstract removeChildAt(commit: T, i: number): void;

  abstract trimChildren(commit: T, count: number): void;
}
