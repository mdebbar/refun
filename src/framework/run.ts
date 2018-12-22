import { component } from './core/components';
import { AnyUI, myNode } from './core';
import { Committer, CommitNode } from './commit';

export function run<C extends Committer<any>>(
  app: () => AnyUI,
  rootCommitter: C,
) {
  function createNode() {
    return new CommitNode(null, rootCommitter);
  }

  const appWrapper = component(function root() {
    myNode(createNode);
    return app();
  });

  const rootUI = appWrapper();
  const rootNode = createNode();

  rootNode.updateUI(rootUI);
  rootNode.immediateRebuild();
  return rootNode;
}
