import { run, component, AnyUI, myStateNode } from '../framework';
import { NoopCommitter } from '../framework/commit';
import { stateSerializer } from '../test-helpers/snapshot-serializers';
import { findDescendantOfType } from '../framework/finders';
import { createRef, manageFrames } from '../test-helpers/build-helpers';

expect.addSnapshotSerializer(stateSerializer);

const app = (children: AnyUI) => children;
const container = component(function container(children: AnyUI) {
  myStateNode(null);
  return children;
});

const stateless1 = (children: AnyUI) => children;
const stateless2 = (children: AnyUI) => stateless1(children);
const stateful = component(function stateful(children: AnyUI) {
  const node = myStateNode(0);
  node.state++;
  return stateless2(children);
});

test('simple build tree', () => {
  const root = run(() => app(container(null)), new NoopCommitter());
  expect(root).toMatchSnapshot();
});

test('nested arrays', () => {
  const ui1 = () => app(container(null));
  const ui2 = () => app([container([[null]])]);

  // The 2 snapshots should be identical.
  expect(run(ui1, new NoopCommitter())).toMatchSnapshot();
  expect(run(ui2, new NoopCommitter())).toMatchSnapshot();
});

test('complex arrays', () => {
  const dup = (children: AnyUI) => [children, children];
  const ui = () => dup(dup([null, dup(null)]));
  const root = run(ui, new NoopCommitter());
  expect(root).toMatchSnapshot();
});

// test.skip('stateless root component', () => {
//   const parent = () => stateful(null);

//   const rootNode = run(parent(), new NoopCommitter());
//   const parentNode = findDescendantOfType(rootNode, stateful);
//   expect(parentNode.state).toBe(1);

//   rootNode.rebuild();
//   expect(parentNode.state).toBe(2);
// });

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
  const nextFrame = manageFrames(root);

  const counterNode = findDescendantOfType(root, counter);
  const doubleCounterNode = findDescendantOfType(root, doubleCounter);

  expect(counterNode.state).toBe(1);
  expect(doubleCounterNode.state).toBe(2);

  // Rebuild from the root.
  root.rebuild();
  nextFrame();
  // App nodes should be preserved.
  expect(findDescendantOfType(root, counter)).toBe(counterNode);
  expect(findDescendantOfType(root, doubleCounter)).toBe(doubleCounterNode);
  // States should've updated.
  expect(counterNode.state).toBe(2);
  expect(doubleCounterNode.state).toBe(4);

  // Rebuild from the counter node.
  counterNode.rebuild();
  nextFrame();
  expect(counterNode.state).toBe(3);
  expect(doubleCounterNode.state).toBe(6);

  // Rebuild from the double counter node.
  doubleCounterNode.rebuild();
  nextFrame();
  expect(counterNode.state).toBe(3);
  expect(doubleCounterNode.state).toBe(8);
});

test('complex state', () => {
  const counter = component(function counter(cb: (x: number) => AnyUI) {
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
  const nextFrame = manageFrames(root);

  const counterNode = findDescendantOfType(root, counter);
  const doubleCountNode = findDescendantOfType(root, doubleCount);

  expect(counterNode.state).toBe(1);
  expect(doubleCountNode.state).toBe(2);

  // Rebuild from the root.
  root.rebuild();
  nextFrame();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);

  // Rebuild from the doubleCount node should keep the same state.
  doubleCountNode.rebuild();
  nextFrame();
  expect(counterNode.state).toBe(2);
  expect(doubleCountNode.state).toBe(4);
});

test('parent vs owner', () => {
  const parent = component(function parent(children: AnyUI) {
    myStateNode(null);
    return [stateful(null), children];
  });

  const rootNode = run(() => app(parent(stateful(null))), new NoopCommitter());
  const nextFrame = manageFrames(rootNode);
  expect(rootNode).toMatchSnapshot();

  // The counter owned by `parent` should be rebuilt, but the one passed in as a
  // child won't.
  findDescendantOfType(rootNode, parent).rebuild();
  nextFrame();
  expect(rootNode).toMatchSnapshot();
});

test('multiple independent rebuilds', () => {
  const ref1 = createRef('ref1');
  const ref2 = createRef('ref2');

  const complex = () =>
    app([
      ref1(() => stateful(stateless1([null]))),
      stateless2(stateful(null)),
      stateful([ref2(() => stateful(stateless2(null))), stateful([])]),
    ]);

  const root = run(complex, new NoopCommitter());
  const nextFrame = manageFrames(root);

  expect(root).toMatchSnapshot('before rebuilds');

  findDescendantOfType(root, ref1).rebuild();
  findDescendantOfType(root, ref2).rebuild();
  nextFrame();
  expect(root).toMatchSnapshot('after rebuilds');
});

test('multiple nested rebuilds', () => {
  const ref1 = createRef('ref1');
  const ref2 = createRef('ref2');

  const complex = () =>
    app([
      stateful(stateless2([])),
      ref1(() =>
        stateful([
          stateless1([null]),
          stateless2(stateful(null)),
          stateful([ref2(() => stateful(stateless2(null))), stateful([])]),
        ]),
      ),
    ]);

  const root = run(complex, new NoopCommitter());
  const nextFrame = manageFrames(root);

  expect(root).toMatchSnapshot('before rebuilds');

  findDescendantOfType(root, ref1).rebuild();
  findDescendantOfType(root, ref2).rebuild();
  nextFrame();
  expect(root).toMatchSnapshot('after rebuilds');
});
