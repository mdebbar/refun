import { div, style } from '../../html';
import { column, row } from '../../utils/layout';
import { decompose, compose } from '../../utils/colors';

export function linear(
  horizontal: boolean = true,
  count: number,
  ...colorStops: number[]
) {
  const colors = [...genColors(count, ...colorStops)];
  return horizontal
    ? row(colors.map(c => colorStrip(c, true)))
    : column(colors.map(c => colorStrip(c, false)));
}

export function circle(count: number, ...colorStops: number[]) {
  const colors = [...genColors(count, ...colorStops)];
  const thickness = 3;
  return style({
    position: 'relative',
    width: `${getCircleWidth(count, thickness)}px`,
    height: `${getCircleWidth(count, thickness)}px`,
  })(
    div(
      null,
      colors.map((c, i) => colorCircle(c, count - i, count, thickness)),
    ),
  );
}

function* genColors(count: number, ...stops: number[]) {
  let i = 0;
  let prevStop = decompose(stops[0]);
  for (let s = 1; s < stops.length; s++) {
    let currStop = decompose(stops[s]);
    const r = currStop[0] - prevStop[0];
    const g = currStop[1] - prevStop[1];
    const b = currStop[2] - prevStop[2];

    const start = i;
    const end = (s / (stops.length - 1)) * count;
    const delta = end - start;
    while (i < end) {
      yield compose(
        Math.round((r * (i - start)) / delta + prevStop[0]),
        Math.round((g * (i - start)) / delta + prevStop[1]),
        Math.round((b * (i - start)) / delta + prevStop[2]),
      );
      i++;
    }
    prevStop = currStop;
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

function colorCircle(
  color: number,
  radius: number,
  totalRadius: number,
  thickness: number,
) {
  return style({
    width: `${getCircleWidth(radius, thickness)}px`,
    height: `${getCircleWidth(radius, thickness)}px`,
    border: `1px solid ${colorToString(color)}`,
    position: 'absolute',
    top: `${(totalRadius - radius) * thickness}px`,
    left: `${(totalRadius - radius) * thickness}px`,
    borderRadius: '50%',
  })(div(null, null));
}

function getCircleWidth(radius: number, thickness: number) {
  return radius * 2 * thickness;
}
