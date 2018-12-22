import { run, AnyUI, component, myStateNode } from '../framework';
import { TestCommitter, committer } from '../test-helpers/commit-helpers';
import {
  stateSerializer,
  commitSerializer,
} from '../test-helpers/snapshot-serializers';
import { findDescendantOfType } from '../framework/finders';
import { createRef, manageFrames } from '../test-helpers/build-helpers';

expect.addSnapshotSerializer(stateSerializer);
expect.addSnapshotSerializer(commitSerializer);

const app = (children: AnyUI) => children;

const stateless1 = (children: AnyUI) => children;
const stateless2 = (children: AnyUI) => stateless1(children);
const statelessCommitter = (str: string, children: AnyUI) =>
  stateless1(committer(str, children));

const stateful = component(function stateful(children: AnyUI) {
  const node = myStateNode(0);
  node.state++;
  return stateless2(children);
});

const statefulCommitter = component(function statefulCommitter(
  str: string,
  children: AnyUI,
) {
  const node = myStateNode(0);
  node.state++;
  return stateless2(committer(str, children));
});

test('simple commit', () => {
  const rootNode = run(() => app(committer('1', null)), new TestCommitter('0'));
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot();
});

test('complex commits', () => {
  const complex = () =>
    app([
      committer('1', stateless2(committer('2', null))),
      stateless2([
        committer('3', [stateful(null)]),
        null,
        statefulCommitter('4', [
          stateless1(stateful([statefulCommitter('5', null)])),
          stateful([]),
          committer('6', null),
          stateless2(null),
        ]),
      ]),
      [stateless1(statelessCommitter('7', []))],
    ]);
  const rootNode = run(() => complex(), new TestCommitter('0'));
  expect(rootNode).toMatchSnapshot();
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot();
});

test('simple recommit', () => {
  const root = () => stateless1(statefulCommitter('1', null));
  const rootNode = run(root, new TestCommitter('0'));
  const nextFrame = manageFrames(rootNode);

  expect(rootNode).toMatchSnapshot('before rebuild');
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot('before rebuild');

  rootNode.rebuild();
  nextFrame();
  expect(rootNode).toMatchSnapshot('after rebuild');
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot('after rebuild');
});

test('complex recommit', () => {
  const ref1 = createRef('ref1');
  const ref2 = createRef('ref2');

  const complex = () =>
    app([
      committer('1', stateless2(committer('2', null))),
      ref2(() =>
        stateless2([
          committer('3', [stateful(null)]),
          null,
          statefulCommitter('4', [
            ref1(() => stateless1(stateful([statefulCommitter('5', null)]))),
            stateful([]),
            committer('6', null),
            stateless2(null),
          ]),
        ]),
      ),
      [stateless1(statelessCommitter('7', []))],
    ]);

  const flat = () =>
    app([
      committer('1', null),
      ref2(() => committer('3', [stateful(null)])),
      null,
      statefulCommitter('4', [
        [statefulCommitter('5', null)],
        stateful([]),
        committer('6', null),
        stateless2(null),
      ]),
      statelessCommitter('7', []),
    ]);

  let current = complex;
  const rootNode = run(() => current(), new TestCommitter('0'));
  const nextFrame = manageFrames(rootNode);

  expect(rootNode).toMatchSnapshot('before rebuild');
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot('before rebuild');

  findDescendantOfType(rootNode, ref1).rebuild();
  findDescendantOfType(rootNode, ref2).rebuild();
  nextFrame();
  expect(rootNode).toMatchSnapshot('after partial rebuild');
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot(
    'after partial rebuild',
  );

  current = flat;
  rootNode.rebuild();
  nextFrame();
  expect(rootNode).toMatchSnapshot('after rebuild to flat');
  expect(rootNode.committer.getTestCommit()).toMatchSnapshot(
    'after rebuild to flat',
  );
});
