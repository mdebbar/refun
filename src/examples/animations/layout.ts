import { UI } from '../../framework';
import { div, style } from '../../html';

export function row(children: UI) {
  return style({ display: 'flex', flexDirection: 'row' })(div(null, children));
}
export function column(children: UI) {
  return style({ display: 'flex', flexDirection: 'column' })(
    div(null, children),
  );
}
