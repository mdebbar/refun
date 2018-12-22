import { UI } from '../framework';
import { style, HtmlUI, div } from '../html';

// TODO[types]: Is it possible to enforce this?
export function center(child: HtmlUI) {
  return style({
    display: 'flex',
    justifyContent: 'center',
  })(child);
}

// export function center(children: UI) {
//   return style({
//     display: 'flex',
//     justifyContent: 'center',
//   })(div(null, children));
// }

export function row(children: UI) {
  return style({ display: 'flex', flexDirection: 'row' })(div(null, children));
}
export function column(children: UI) {
  return style({ display: 'flex', flexDirection: 'column' })(
    div(null, children),
  );
}
