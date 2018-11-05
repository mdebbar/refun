import { run, stateful, AppNode, UI, findDescendantByName } from '../';
import { RootTestNode, resetCommitValue } from '../test-helpers';

const app = (children: UI) => container(children);
const container = stateful('tester', (_: AppNode, children: UI) => children);

test('simple build tree', () => {
  const root = run(app(null), new RootTestNode());
  expect(root).toMatchSnapshot();
});

test('nested arrays', () => {
  resetCommitValue();
  const ui1 = app(null);
  expect(run(ui1, new RootTestNode())).toMatchSnapshot();

  resetCommitValue();
  const ui2 = app([[null]]);
  // This snapshot should be identical to the one above.
  expect(run(ui2, new RootTestNode())).toMatchSnapshot();
});

test('complex arrays', () => {
  resetCommitValue();
  const dup = (children: UI) => [children, children];
  const ui = dup(dup([null, dup(null)]));
  const root = run(ui, new RootTestNode());
  expect(root).toMatchSnapshot();
});

test('preserves state when rebuilding', () => {
  resetCommitValue();
  const counter = stateful('counter', (node: AppNode) => {
    if (node.state == null) {
      node.state = 0;
    }
    node.state++;
    return doubleCounter();
  });

  const doubleCounter = stateful('doubleCounter', (node: AppNode) => {
    if (node.state == null) {
      node.state = 0;
    }
    node.state += 2;
    return null;
  });

  const root = run(app(counter()), new RootTestNode());

  const counterNode = findDescendantByName(root, 'counter');
  const doubleCounterNode = findDescendantByName(root, 'doubleCounter');

  expect(counterNode.state).toBe(1);
  expect(doubleCounterNode.state).toBe(2);

  // Rebuild from the root.
  root.rebuild();
  // App nodes should be preserved.
  expect(findDescendantByName(root, 'counter')).toBe(counterNode);
  expect(findDescendantByName(root, 'doubleCounter')).toBe(doubleCounterNode);
  // States should've updated.
  expect(counterNode.state).toBe(2);
  expect(doubleCounterNode.state).toBe(4);

  // Rebuild from the counter node.
  counterNode.rebuild();
  expect(counterNode.state).toBe(3);
  expect(doubleCounterNode.state).toBe(6);

  // Rebuild from the double counter node.
  doubleCounterNode.rebuild();
  expect(counterNode.state).toBe(3);
  expect(doubleCounterNode.state).toBe(8);
});

test('complex state', () => {
  resetCommitValue();
  const counter = stateful(
    'counter',
    (node: AppNode, cb: (x: number) => UI) => {
      if (node.state == null) {
        node.state = 0;
      }
      node.state++;
      return cb(node.state);
    },
  );

  const doubleCount = stateful('doubleCount', (_: AppNode, count: number) => {
    _.state = count * 2;
    return null;
  });

  const root = run(app(counter(doubleCount)), new RootTestNode());

  const counterNode = findDescendantByName(root, 'counter');
  const doubleCountNode = findDescendantByName(root, 'doubleCount');

  expect(counterNode.state).toBe(1);
  expect(doubleCountNode.state).toBe(2);

  // Rebuild from the root.
  root.rebuild();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);

  // Rebuild from the doubleCount node should keep the same state.
  doubleCountNode.rebuild();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);
});
