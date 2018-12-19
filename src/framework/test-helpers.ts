import { Committer } from './commit';

let incrementalCommitValue = 0;

// This function has to be called at the beginning of any test that uses
// jest snapshots with commits.
export function resetCommitValue() {
  incrementalCommitValue = 0;
}

export class TestCommit {
  // Can be used to check the order of commit creation and application.
  value: number;
  children: TestCommit[];

  constructor(value: number) {
    this.value = value;
    this.children = [];
  }
}

export class TestCommitter extends Committer<TestCommit> {
  commitSelf(lastCommit: TestCommit, newChildren: TestCommit[]): TestCommit {
    if (!lastCommit) {
      return new TestCommit(incrementalCommitValue++);
    }
    lastCommit.value = incrementalCommitValue++;
    return lastCommit;
  }

  diffChildren(newCommit: TestCommit, newChildren: TestCommit[]): void {
    newCommit.children = newChildren;
  }
}
