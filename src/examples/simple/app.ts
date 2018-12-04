import { column } from './layout';
import { gradient } from './colors';
import { gen, UI, stateful, AppNode } from '../../framework';
import { text } from '../../html';

const foo = gen('foo', function*(): IterableIterator<UI> {
  yield text('foo1');
  yield text('foo2');
  yield text('foo3');
  yield text('foo4');
  // return text('foo5');
});

const bar = stateful('bar', (node: AppNode) => {
  setTimeout(() => node.rebuild(), 2000);
  return foo();
});

export function app() {
  return column([
    bar(),
    gradient.circle(0xffff00, 0x0000ff),
    gradient.linear(0xffffff, 0x00ff00, false),
    gradient.linear(0x00ff00, 0xff0000, false),
    gradient.linear(0xff0000, 0x0000ff, false),
    gradient.linear(0x0000ff, 0x000000, false),
    gradient.linear(0x000000, 0xffffff, false),
  ]);
}
