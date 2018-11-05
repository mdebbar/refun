import { run, stateful, AppNode, UI } from '../';
import {
  RootTestNode,
  MockCommitNode,
  resetCommitValue,
} from '../test-helpers';

const app = (children: UI) => children;
const committer = stateful('committer', (node: AppNode, children: UI) => {
  if (node.commitNode == null) {
    node.commitNode = new MockCommitNode();
  }
  return children;
});

test('simple commit', () => {
  resetCommitValue();
  const rootCommitNode = new RootTestNode();
  run(app(committer(null)), rootCommitNode);
  expect(rootCommitNode.lastCommit).toMatchSnapshot();
});
