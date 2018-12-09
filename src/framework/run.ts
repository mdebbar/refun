import { NODE_CREATOR } from './core/components';
import { UI, createComponent } from './core';
import { Committer, CommitNode } from './commit';

export function run<C extends Committer>(app: UI, rootCommitter: C) {
  const rootComponent = createComponent(
    'root',
    () => new CommitNode<C, any, void>(void 0, rootCommitter),
    () => () => app,
  );
  const rootUI = rootComponent();
  const rootNode = rootUI[NODE_CREATOR]();
  rootNode.ui = rootUI;

  rootNode.needsBuild();
  rootNode.immediateRebuild();
  return rootNode;
}
