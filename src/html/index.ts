import { component, Committer, UI, myCommitNode, CommitUI } from '../framework';
import { trackSkips } from '../instrumentation';

const commitNewTracker = trackSkips('commitNew', 0);
const commitChildTracker = trackSkips('commitChild', 0);

export type Style = Partial<CSSStyleDeclaration>;
export type Attributes = {
  [x: string]: string | null;
};

export type HtmlUI = CommitUI<HTMLElement>;

export function root(element: HTMLElement): HtmlRoot {
  return new HtmlRoot(element);
}

export class HtmlCommitter extends Committer<HTMLElement> {
  private tagName: string;
  private prevTagName: string;

  private attributes: Attributes | null = null;
  private prevAttributes: Attributes | null = null;

  update(tagName: string, attributes: Attributes | null) {
    if (tagName !== this.tagName || attributes !== this.attributes) {
      this.needsCommit();
      this.prevTagName = this.tagName;
      this.prevAttributes = this.attributes;
      this.tagName = tagName;
      this.attributes = attributes;
    } else {
      this.needsToCheckChildCommits();
    }
  }

  initial() {
    commitNewTracker && commitNewTracker.hit();
    return createElement(this.tagName, this.attributes);
  }

  amend(lastCommit: HTMLElement) {
    if (this.tagName !== this.prevTagName) {
      return this.initial();
    }
    commitNewTracker && commitNewTracker.skip();
    return applyAttributes(lastCommit, this.attributes, this.prevAttributes);
  }

  amendChildren(newCommit: HTMLElement, newChildren: HTMLElement[]) {
    this.diffChildren(newCommit, newChildren);
    return newCommit;
  }

  // TODO[perf]: explore smarter ways to diff & reuse children.
  diffChildren(newCommit: HTMLElement, newChildren: HTMLElement[]) {
    const currentChildren = newCommit ? newCommit.childNodes : [];
    const currentLength = currentChildren ? currentChildren.length : 0;
    const commonLength = Math.min(currentLength, newChildren.length);
    let i = 0;
    // Swap children.
    for (; i < commonLength; i++) {
      if (newChildren[i] !== currentChildren[i]) {
        commitChildTracker && commitChildTracker.hit();
        newCommit.replaceChild(newChildren[i], currentChildren[i]);
      } else {
        commitChildTracker && commitChildTracker.skip();
      }
    }
    // Append remaining new children.
    for (; i < newChildren.length; i++) {
      commitChildTracker && commitChildTracker.hit();
      newCommit.appendChild(newChildren[i]);
    }
    // Now remove remaining old children.
    for (; i < currentLength; i++) {
      commitChildTracker && commitChildTracker.hit();
      // TODO[types]: ugh.
      (newCommit.lastChild as HTMLElement).remove();
    }
  }
}

class HtmlRoot extends HtmlCommitter {
  private rootElement: HTMLElement;
  constructor(rootElement: HTMLElement) {
    super();
    this.rootElement = rootElement;
    this.needsCommit();
  }

  initial() {
    return this.rootElement;
  }

  amend() {
    return this.rootElement;
  }

  amendChildren(_: HTMLElement, newChildren: HTMLElement[]) {
    super.diffChildren(this.rootElement, newChildren);
    return this.rootElement;
  }
}

export const element = component(function element(
  tagName: string,
  attributes: Attributes | null,
  children: UI,
) {
  const node = myCommitNode(() => new HtmlCommitter());
  node.committer.update(tagName, attributes);
  return children;
});

class TextNode extends Committer<Text> {
  text: string;

  update(text: string) {
    if (text !== this.text) {
      this.needsCommit();
      this.text = text;
    }
  }

  initial() {
    return new Text(this.text);
  }

  amend(commit: Text) {
    // TODO[dx]: Do we need to check again here? It's already checked in `update()`.
    if (commit.textContent === this.text) {
      return commit;
    }
    return this.initial();
  }

  amendChildren(commit: Text) {
    // This committer doesn't have children.
    return commit;
  }
}

export const text = component(function text(text: string) {
  const node = myCommitNode(() => new TextNode());
  node.committer.update(text);
  return null;
});

class StyleCommitter extends Committer<HTMLElement> {
  prevStyle: Style;
  style: Style;

  update(style: Style) {
    if (style !== this.style) {
      this.needsCommit();
      this.prevStyle = this.style;
      this.style = style;
    } else {
      this.needsToCheckChildCommits();
    }
  }

  initial() {
    return null;
  }

  amend() {
    return null;
  }

  amendChildren(_: HTMLElement, children: HTMLElement[]) {
    if (children.length !== 1) {
      throw new Error(
        `StyleCommitter expects exactly one child, but got ${children.length}`,
      );
    }
    return applyStyle(children[0], this.style, this.prevStyle);
  }
}

type HtmlUI = CommitUI<HtmlCommitter>;
const _style = component(function style(style: Style, el: HtmlUI) {
  const node = myCommitNode(() => new StyleCommitter());
  node.committer.update(style);
  return el;
});
export const style = (style: Style) => (el: HtmlUI) => _style(style, el);

const { hasOwnProperty: has } = Object.prototype;

function createElement(tagName: string, attributes: Attributes | null) {
  const el = document.createElement(tagName);
  applyAttributes(el, attributes, null);
  return el;
}

function applyAttributes(
  el: HTMLElement,
  attributes: Attributes | null,
  prevAttributes: Attributes | null,
): HTMLElement {
  if (prevAttributes) {
    for (const name in prevAttributes) {
      const attr = attributes && attributes[name];
      if (has.call(prevAttributes, name) && !attr) {
        // This attribute was set previously but not anymore.
        el.removeAttribute(name);
      }
    }
  }

  if (attributes) {
    for (const name in attributes) {
      const attr = attributes[name];
      const prevAttr = prevAttributes && prevAttributes[name];
      if (has.call(attributes, name) && attr != prevAttr) {
        if (attr != null) {
          el.setAttribute(name, attr);
        } else {
          el.removeAttribute(name);
        }
      }
    }
  }
  return el;
}

function applyStyle(
  el: HTMLElement,
  styles: Style | null,
  prevStyles: Style | null,
): HTMLElement {
  if (prevStyles) {
    for (const name in prevStyles) {
      const st = styles && styles[name];
      if (has.call(prevStyles, name) && !st) {
        // This style was set previously but not anymore.
        el.style[name] = '';
      }
    }
  }

  if (styles) {
    for (const name in styles) {
      const st = styles[name];
      const prevSt = prevStyles && prevStyles[name];
      if (has.call(styles, name) && st != prevSt) {
        if (st != null) {
          el.style[name] = st;
        } else {
          el.style[name] = '';
        }
      }
    }
  }
  return el;
}

// Shorthand for creating a div.
export const div = (attributes: Attributes | null, children: UI) =>
  element('div', attributes, children);

// Shorthand for creating a span.
export const span = (attributes: Attributes | null, children: UI) =>
  element('span', attributes, children);
