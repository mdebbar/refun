import { linear, circle } from './gradient';
import {
  component,
  UI,
  myStateNode,
  animating,
  CommitUI,
} from '../../framework';
import { text, div, span, style, HtmlNode } from '../../html';
import { easeInOutQuad, EasingFn } from '../../utils/easing';
import { center, row } from '../../utils/layout';
import { rotating } from '../../utils/animations';
import { absolute } from '../../utils/positions';

const counter = component(function counter() {
  const node = myStateNode(0);
  node.state++;
  return span(null, text(String(node.state)));
});

const scaling = animating(function scaling(
  factor: number,
  speed: number,
  easing: EasingFn,
  children: UI,
) {
  return passed => {
    const t2 = ((speed * passed) / 1000) % 2;
    const t = t2 < 1 ? t2 : 2 - t2;
    const scale = (easing(t) * factor).toFixed(2);
    return style({
      transform: `scale(${scale})`,
    })(div(null, children));
  };
});

function lineup(count: number, item: UI) {
  const children = [];
  for (let i = 0; i < count; i++) {
    children.push(
      style({ alignSelf: 'center' })(rotating(1, easeInOutQuad, item)),
    );
  }
  return style({ justifyContent: 'space-around', height: '100%' })(
    row(children),
  );
}

function corners(child: CommitUI<HtmlNode>) {
  return [
    absolute({
      top: '0',
      left: '0',
      width: '100px',
      transformOrigin: 'top left',
    })(child),
    absolute({
      top: '0',
      right: '0',
      width: '100px',
      transformOrigin: 'top right',
    })(child),
    absolute({
      bottom: '0',
      right: '0',
      width: '100px',
      transformOrigin: 'bottom right',
    })(child),
    absolute({
      bottom: '0',
      left: '0',
      width: '100px',
      transformOrigin: 'bottom left',
    })(child),
  ];
}

export function app() {
  return [
    // corners(circle(20, 0xffff00, 0x0000ff)),
    corners(scaling(2, 1, easeInOutQuad, circle(20, 0xffff00, 0x0000ff))),
    lineup(10, [
      center(counter()),
      style({ width: '50px' })(
        linear(false, 50, 0xffffff, 0x00ff00, 0xff0000, 0x0000ff, 0x000000),
      ),
    ]),
  ];
}
