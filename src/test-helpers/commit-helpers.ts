import { Committer, myCommitNode, component, UI } from '../framework';

export class TestCommit {
  // Can be used to check the order of commit creation and application.
  value: string;
  children: TestCommit[];

  constructor(value: string) {
    this.value = value;
    this.children = [];
  }
}

export class TestCommitter extends Committer<TestCommit> {
  private data: string;
  private testCommit: TestCommit | null = null;

  constructor(data: string) {
    super();
    this.data = data;
  }

  getTestCommit(): TestCommit {
    return this.testCommit as TestCommit;
  }

  update(newData: string) {
    this.data = newData;
    this.needsCommit();
  }

  commitSelf(lastCommit: TestCommit, newChildren: TestCommit[]): TestCommit {
    if (!lastCommit) {
      return new TestCommit(this.data);
    }
    lastCommit.value = `${lastCommit.value}|${this.data}`;
    return lastCommit;
  }

  diffChildren(newCommit: TestCommit, newChildren: TestCommit[]): void {
    newCommit.value = newCommit.value + '*';
    this.testCommit = newCommit;
    newCommit.children = newChildren;
  }
}

export const committer = component(function committer(
  str: string,
  children: UI,
) {
  const node = myCommitNode(() => new TestCommitter(str));
  node.committer.update(str);
  return children;
});
