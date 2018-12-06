import { column } from './layout';
import { gradient } from './colors';
import { gen, Scheduler, stateful, UI, AppNode } from '../../framework';
import { text, div } from '../../html';

function delay(t: number) {
  return new Scheduler(cb => setTimeout(cb, t), token => clearTimeout(token));
}

// TODO[perf]: Provide a global requestAnimationFrame.
function animation() {
  return new Scheduler(requestAnimationFrame, cancelAnimationFrame);
}

const foo = gen('foo', function*() {
  yield text('foo1');
  yield delay(1000);
  yield text('foo2');
  yield delay(1000);
  yield text('foo3');
  yield delay(1000);
  yield text('foo4');
  yield delay(1000);
  return text('foo5');
});

const zoom = gen('zoom', function*(children: UI) {
  const factor = 0.01;
  let direction = 1;
  let scale = 1;
  while (true) {
    yield div(
      {
        style: [`transform:scale(${scale})`, 'transform-origin:0'].join(';'),
      },
      children,
    );
    scale += direction * factor;
    if (scale <= 0.5) {
      direction = 1;
      scale = 0.5;
    } else if (scale >= 2) {
      direction = -1;
      scale = 2;
    }
    yield animation();
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
    yield div(
      {
        style: [
          `transform: rotate(${deg}deg)`,
          'background-color: purple',
          'margin: 8px',
          'width: 100px',
          'height: 100px',
        ].join(';'),
      },
      children,
    );
    yield animation();
  }
});

function center(child: UI) {
  return div(
    {
      style: ['display:flex', 'justify-content:center'].join(';'),
    },
    child,
  );
}

const fast = stateful('fast', (node: AppNode, children: UI) => {
  setTimeout(() => node.rebuild(), 5);
  return children;
});

export function app() {
  return column([
    // foo(),
    center([
      fast(
        rotating([
          gradient.linear(0x00ff00, 0xff0000, false),
          gradient.linear(0xff0000, 0x0000ff, false),
          gradient.linear(0x0000ff, 0x000000, false),
        ]),
      ),
      rotating([
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
