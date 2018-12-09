import { gen, sleep, UI, run } from '../../framework';
import { text, div, root, style } from '../../html';

function app() {
  return center(foo());
}

const foo = gen('foo', function*() {
  yield text('foo1');
  yield sleep(1000);
  yield text('foo2');
});

function center(child: UI) {
  return style({
    display: 'flex',
    justifyContent: 'center',
  })(div(null, child));
}

run(app(), root(document.body));
