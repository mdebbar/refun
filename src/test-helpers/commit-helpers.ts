import { Committer, myCommitNode, component, AnyUI } from '../framework';

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

  initial() {
    return new TestCommit(this.data);
  }

  amend(commit: TestCommit) {
    commit.value = `${commit.value}|${this.data}`;
    return commit;
  }

  amendChildren(commit: TestCommit, children: TestCommit[]) {
    this.testCommit = commit;
    commit.value += '*';
    commit.children = children;
    return commit;
  }
}

export const committer = component(function committer(
  str: string,
  children: AnyUI,
) {
  const node = myCommitNode(() => new TestCommitter(str));
  node.committer.update(str);
  return children;
});
