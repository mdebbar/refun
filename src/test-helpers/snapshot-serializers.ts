import { AppNode } from '../framework';

type any2s = (value: any) => string;
type s2s = (str: string) => string;

export const stateSerializer = {
  test(value: any) {
    return value instanceof AppNode;
  },

  print(value: AppNode<any>, serialize: any2s, indent: s2s) {
    return [
      `%${value.a__name}%`,
      serialize(value.state),
      '[',
      indent(value.children.map(serialize).join(',\n')),
      ']',
    ].join('\n');
  },
};
