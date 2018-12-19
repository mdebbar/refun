import { run, component, UI, myStateNode } from '../framework';
import { NoopCommitter } from '../framework/commit';
import { stateSerializer } from '../test-helpers/snapshot-serializers';
import { findDescendantOfType } from '../framework/finders';

expect.addSnapshotSerializer(stateSerializer);

const app = (children: UI) => container(children);
const container = component(function container(children: UI) {
  myStateNode(null);
  return children;
});

test('simple build tree', () => {
  const root = run(() => app(null), new NoopCommitter());
  expect(root).toMatchSnapshot();
});

test('nested arrays', () => {
  const ui1 = () => app(null);
  const ui2 = () => app([[null]]);

  // The 2 snapshots should be identical.
  expect(run(ui1, new NoopCommitter())).toMatchSnapshot();
  expect(run(ui2, new NoopCommitter())).toMatchSnapshot();
});

test('complex arrays', () => {
  const dup = (children: UI) => [children, children];
  const ui = () => dup(dup([null, dup(null)]));
  const root = run(ui, new NoopCommitter());
  expect(root).toMatchSnapshot();
});

test.skip('stateless root component', () => {
  const parent = () => child();
  const child = component(function child() {
    const node = myStateNode(0);
    node.state++;
    return null;
  });

  const rootNode = run(parent(), new NoopCommitter());
  const parentNode = findDescendantOfType(rootNode, parent);
  expect(parentNode.state).toBe(1);

  rootNode.rebuild();
  expect(parentNode.state).toBe(2);
});

test('preserves state when rebuilding', () => {
  const app = component(function app() {
    myStateNode(null);
    return counter();
  });

  const counter = component(function counter() {
    const node = myStateNode(0);
    node.state++;
    return doubleCounter();
  });

  const doubleCounter = component(function doubleCounter() {
    const node = myStateNode(0);
    node.state += 2;
    return null;
  });

  const root = run(() => app(), new NoopCommitter());
  root.scheduleNextFrame = cb => cb();

  const counterNode = findDescendantOfType(root, counter);
  const doubleCounterNode = findDescendantOfType(root, doubleCounter);

  expect(counterNode.state).toBe(1);
  expect(doubleCounterNode.state).toBe(2);

  // Rebuild from the root.
  root.rebuild();
  // App nodes should be preserved.
  expect(findDescendantOfType(root, counter)).toBe(counterNode);
  expect(findDescendantOfType(root, doubleCounter)).toBe(doubleCounterNode);
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
  const counter = component(function counter(cb: (x: number) => UI) {
    const node = myStateNode(0);
    node.state++;
    return cb(node.state);
  });

  const doubleCount = component(function doubleCount(count: number) {
    const node = myStateNode(0);
    node.state = count * 2;
    return null;
  });

  const root = run(() => app(counter(doubleCount)), new NoopCommitter());

  const counterNode = findDescendantOfType(root, counter);
  const doubleCountNode = findDescendantOfType(root, doubleCount);

  expect(counterNode.state).toBe(1);
  expect(doubleCountNode.state).toBe(2);

  root.scheduleNextFrame = cb => cb();

  // Rebuild from the root.
  root.rebuild();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);

  // Rebuild from the doubleCount node should keep the same state.
  doubleCountNode.rebuild();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);
});

test('parent vs owner', () => {
  const parent = component(function parent(children: UI) {
    myStateNode(null);
    return [counter(), children];
  });

  const counter = component(function counter() {
    const node = myStateNode(0);
    node.state++;
    return null;
  });

  const rootNode = run(() => app(parent(counter())), new NoopCommitter());
  rootNode.scheduleNextFrame = cb => cb();
  expect(rootNode).toMatchSnapshot();

  // The counter owned by `parent` should be rebuilt, but the one passed in as a
  // child won't.
  findDescendantOfType(rootNode, parent).rebuild();
  expect(rootNode).toMatchSnapshot();
});
