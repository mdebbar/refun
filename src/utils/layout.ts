import { CommitUI, UI } from '../framework';
import { style, HtmlNode, div } from '../html';

// TODO[types]: Is it possible to enforce this?
export function center(child: CommitUI<HtmlNode>) {
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
