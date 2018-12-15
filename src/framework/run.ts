import { namedComponent } from './core/components';
import { UI, myNode } from './core';
import { Committer, CommitNode, Commit } from './commit';
// import { openNodeCreation, closeNodeCreation } from './core/global';

export function run<C extends Committer<D>, D extends Commit>(
  app: UI,
  rootCommitter: C,
) {
  function createNode() {
    return new CommitNode(null, rootCommitter);
  }

  const appWrapper = namedComponent('root', () => {
    myNode(createNode);
    return app;
  });

  const rootUI = appWrapper();
  const rootNode = createNode();

  rootNode.updateUI(rootUI);
  rootNode.immediateRebuild();
  return rootNode;
}
