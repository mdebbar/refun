import { column } from './layout';
import { gradient } from './colors';

export function app() {
  return column([
    gradient.circle(0xffff00, 0x0000ff),
    gradient.linear(0xffffff, 0x00ff00, false),
    gradient.linear(0x00ff00, 0xff0000, false),
    gradient.linear(0xff0000, 0x0000ff, false),
    gradient.linear(0x0000ff, 0x000000, false),
    gradient.linear(0x000000, 0xffffff, false),
  ]);
}
