import { style, Style } from '../html';

export function absolute(cssProps: Style) {
  return style({ position: 'absolute', ...cssProps });
}
