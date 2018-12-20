import { AppNode, CommitNode } from '../framework';
import { TestCommitter, TestCommit } from './commit-helpers';

type any2s = (value: any) => string;
type s2s = (str: string) => string;

type Children = any[];

function serializeChildren(
  children: Children,
  serialize: any2s,
  indent: s2s,
): string {
  if (children.length === 0) {
    return '[]';
  }
  return ['[', indent(children.map(serialize).join(',\n')), ']'].join('\n');
}

export const stateSerializer = {
  test(value: any) {
    return value instanceof AppNode;
  },

  print(value: AppNode<any>, serialize: any2s, indent: s2s): string {
    const committer =
      value instanceof CommitNode && value.committer instanceof TestCommitter
        ? value.committer
        : null;
    return [
      `%${value.a__name}%`,
      serialize(value.state),
      ...(committer
        ? [`commit value: ${committer.getTestCommit().value}`]
        : []),
      serializeChildren(value.children, serialize, indent),
    ].join('\n');
  },
};

export const commitSerializer = {
  test(value: any) {
    return value instanceof TestCommit;
  },

  print(value: TestCommit, serialize: any2s, indent: s2s): string {
    return (
      `#${value.value} ` + serializeChildren(value.children, serialize, indent)
    );
  },
};
