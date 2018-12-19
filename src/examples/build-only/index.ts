import { run } from '../../framework/run';
import { component, UI, NoopCommitter, myStateNode } from '../../framework';

const app = component(function app() {
  const node = myStateNode(0);
  node.state++;
  return container([incrementer(node.state), incrementer(node.state), null]);
});

function container(children: UI) {
  return children;
}

const incrementer = component(function incrementer(incrementBy: number) {
  const node = myStateNode(0);
  node.state += incrementBy;
  return null;
});

const node = run(() => app(), new NoopCommitter());
node.needsBuild();
node.immediateRebuild();
console.log(node);
