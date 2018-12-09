import { div, style } from '../../html';
import { column, row } from './layout';

type RGB = [number, number, number];

export const gradient = {
  linear: (from: number, to: number, horizontal: boolean = true) => {
    const colors = [...genColors(from, to, 50)];
    return horizontal
      ? row(colors.map(c => colorStrip(c, true)))
      : column(colors.map(c => colorStrip(c, false)));
  },

  circle: (from: number, to: number) => {
    const count = 50;
    const colors = [...genColors(from, to, count)];
    return style({ position: 'relative' })(
      div(null, colors.map((c, i) => colorCircle(c, count - i, count))),
    );
  },
};

function decompose(color: number): RGB {
  return [(color & 0xff0000) >> 16, (color & 0x00ff00) >> 8, color & 0x0000ff];
}

function compose(...color: RGB): number {
  return (color[0] << 16) + (color[1] << 8) + color[2];
}

function* genColors(from: number, to: number, count: number = 100) {
  const rgbFrom = decompose(from);
  const rgbTo = decompose(to);
  const rDelta = rgbTo[0] - rgbFrom[0];
  const gDelta = rgbTo[1] - rgbFrom[1];
  const bDelta = rgbTo[2] - rgbFrom[2];
  for (let i = 0; i < count; i++) {
    const color = compose(
      Math.round((rDelta * i) / count + rgbFrom[0]),
      Math.round((gDelta * i) / count + rgbFrom[1]),
      Math.round((bDelta * i) / count + rgbFrom[2]),
    );
    yield color;
  }
}

function colorToString(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function colorStrip(color: number, horizontal: boolean) {
  return style({
    background: colorToString(color),
    height: horizontal ? '100%' : '2px',
    width: horizontal ? '2px' : '100%',
  })(div(null, null));
}

function colorCircle(color: number, radius: number, totalRadius: number) {
  const thickness = 3;
  return style({
    width: `${radius * 2 * thickness}px`,
    height: `${radius * 2 * thickness}px`,
    border: `1px solid ${colorToString(color)}`,
    position: 'absolute',
    top: `${(totalRadius - radius) * thickness}px`,
    left: `${(totalRadius - radius) * thickness}px`,
    borderRadius: '50%',
  })(div(null, null));
}
