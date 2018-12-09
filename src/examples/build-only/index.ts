import { run } from '../../framework/run';
import { stateful, UI, NoopCommitter } from '../../framework';

const app = stateful(
  'app',
  () => 0,
  node => {
    node.state++;
    return container([incrementer(node.state), incrementer(node.state), null]);
  },
);

function container(children: UI) {
  return children;
}

const incrementer = stateful(
  'incrementer',
  (incrementBy: number) => 0,
  (node, incrementBy: number) => {
    node.state += incrementBy;
    return null;
  },
);

const node = run(app(), new NoopCommitter());
node.needsBuild();
node.immediateRebuild();
console.log(node);
