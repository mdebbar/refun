import { UI } from '../../framework';
import { div } from '../../html';

export function row(children: UI) {
  return div({ style: 'display:flex;flex-direction:row' }, children);
}
export function column(children: UI) {
  return div({ style: 'display:flex;flex-direction:column' }, children);
}
