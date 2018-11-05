import { CommitNode, Commit } from './core';

let incrementalCommitValue = 0;

// This function has to be called at the beginning of any test that uses
// jest snapshots with commits.
export function resetCommitValue() {
  incrementalCommitValue = 0;
}

export class TestCommit<N extends CommitNode> extends Commit<N> {
  // Can be used to check the order of commit creation and application.
  $started: number;
  $applied: number;

  constructor(node: N) {
    super(node);
    this.$started = incrementalCommitValue++;
  }

  didApply() {
    this.$applied = incrementalCommitValue++;
  }

  addChild(commit: Commit): boolean {
    return super.addChild(commit);
  }
}

export class MockCommitNode extends CommitNode {
  startCommit(): TestCommit<this> {
    return new TestCommit(this);
  }

  applyCommit(commit: TestCommit<this>) {
    commit.didApply();
  }
}

// export class TrackedCommitNode extends CommitNode {
//   appliedCommits: Commit<this>[];

//   constructor() {
//     super();
//     this.appliedCommits = [];
//   }

//   startCommit(): TestCommit<this> {
//     return new TestCommit(this);
//   }
//   applyCommit(commit: TestCommit<this>) {
//     this.appliedCommits.push(commit);
//     commit.didApply();
//   }
// }

export class RootTestNode extends MockCommitNode {}
