import { component } from './core/components';
import { UI, myNode } from './core';
import { Committer, CommitNode } from './commit';

export function run<C extends Committer<any>>(app: () => UI, rootCommitter: C) {
  function createNode() {
    return new CommitNode(null, rootCommitter);
  }

  const appWrapper = component(function root() {
    myNode(createNode);
    return app();
  });

  const rootUI = appWrapper();
  const rootNode = createNode();

  rootNode.a__name = 'root';
  rootNode.updateUI(rootUI);
  rootNode.immediateRebuild();
  return rootNode;
}
