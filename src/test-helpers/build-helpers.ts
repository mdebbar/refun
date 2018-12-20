import { AppNode, myStateNode, UI, namedComponent } from '../framework';

export function createRef(name: string) {
  return namedComponent(name, (children: () => UI) => {
    myStateNode(null);
    return children();
  });
}

export function manageFrames(rootNode: AppNode<any>): VoidFunction {
  let _cb: VoidFunction | null = null;
  rootNode.scheduleNextFrame = cb => {
    _cb = cb;
  };

  return function nextFrame() {
    if (_cb == null) {
      throw new Error('There was no scheduled rebuild');
    }
    _cb();
    _cb = null;
  };
}
