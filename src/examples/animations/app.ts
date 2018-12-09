import { column } from './layout';
import { gradient } from './colors';
import {
  gen,
  sleep,
  animationFrame,
  stateful,
  UI,
  animated,
} from '../../framework';
import { text, div, span, style } from '../../html';

const foo = gen('foo', function*() {
  let i = 0;
  while (true) {
    yield text(`foo${i}`);
    yield sleep(1000);
    i++;
  }
});

const zoom = gen('zoom', function*(children: UI) {
  const factor = 0.01;
  let direction = 1;
  let scale = 1;
  while (true) {
    yield style({
      transform: `scale(${scale})`,
      transformOrigin: '0',
    })(div(null, children));

    scale += direction * factor;
    if (scale <= 0.5) {
      direction = 1;
      scale = 0.5;
    } else if (scale >= 2) {
      direction = -1;
      scale = 2;
    }
    yield animationFrame();
  }
});

const rotating = gen('rotating', function*(children: UI) {
  const speedFactor = 10;
  const start = Date.now();
  while (true) {
    const delta = Date.now() - start;
    const deg = Math.ceil((delta / speedFactor) % 360);
    // TODO: explore an API that looks like this:
    //       yield animate(div(...));
    //       yield delay(div(...));
    yield style({
      transform: `rotate(${deg}deg)`,
      backgroundColor: 'purple',
      margin: '8px',
      width: '100px',
      height: '100px',
    })(div(null, children));
    yield animationFrame();
  }
});

let count = 0;
const rotating2 = animated('rotating2', (children: UI) => passed => {
  const speedFactor = 15;
  const deg = Math.ceil((passed / speedFactor) % 360);
  const el = count % 100 < 50 ? div : span;
  count++;
  return style({
    transform: `rotate(${deg}deg)`,
    backgroundColor: 'purple',
    margin: '8px',
    width: '100px',
    height: '100px',
  })(el(null, children));
});

function center(child: UI) {
  return style({
    display: 'flex',
    justifyContent: 'center',
  })(div(null, child));
}

const fast = stateful(
  'fast',
  (children: UI) => {},
  (node, children: UI) => {
    setTimeout(() => node.rebuild(), 5);
    return children;
  },
);

export function app() {
  return column([
    foo(),
    center([
      fast(
        rotating([
          foo(),
          gradient.linear(0x00ff00, 0xff0000, false),
          gradient.linear(0xff0000, 0x0000ff, false),
          gradient.linear(0x0000ff, 0x000000, false),
        ]),
      ),
      rotating2([
        gradient.linear(0x00ff00, 0xff0000, false),
        gradient.linear(0xff0000, 0x0000ff, false),
        gradient.linear(0x0000ff, 0x000000, false),
      ]),
    ]),
    zoom(gradient.circle(0xffff00, 0x0000ff)),
    // gradient.linear(0xffffff, 0x00ff00, false),
    // gradient.linear(0x00ff00, 0xff0000, false),
    // gradient.linear(0xff0000, 0x0000ff, false),
    // gradient.linear(0x0000ff, 0x000000, false),
    // gradient.linear(0x000000, 0xffffff, false),
  ]);
}
