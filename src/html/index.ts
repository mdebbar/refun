import { component, Committer, UI, myCommitNode, CommitUI } from '../framework';
import { trackSkips } from '../instrumentation';

const commitNewTracker = trackSkips('commitNew', 0);
const commitChildTracker = trackSkips('commitChild', 0);

export type Style = Partial<CSSStyleDeclaration>;
export type Attributes = {
  [x: string]: string | null;
};

export function root(element: HTMLElement): HtmlRoot {
  return new HtmlRoot(element);
}

export class HtmlNode extends Committer<HTMLElement> {
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

  commitSelf(lastCommit: HTMLElement | null): HTMLElement {
    if (!lastCommit || this.tagName !== this.prevTagName) {
      commitNewTracker && commitNewTracker.hit();
      return createElement(this.tagName, this.attributes);
    } else {
      commitNewTracker && commitNewTracker.skip();
    }
    applyAttributes(lastCommit, this.attributes, this.prevAttributes);
    return lastCommit;
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

class HtmlRoot extends HtmlNode {
  rootElement: HTMLElement;
  constructor(rootElement: HTMLElement) {
    super();
    this.rootElement = rootElement;
    this.needsCommit();
  }

  commitSelf(): HTMLElement {
    return this.rootElement;
  }

  diffChildren(newCommit: HTMLElement, newChildren: HTMLElement[]) {
    super.diffChildren(this.rootElement, newChildren);
  }
}

export const element = component(function element(
  tagName: string,
  attributes: Attributes | null,
  children: UI,
) {
  const node = myCommitNode(() => new HtmlNode());
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

  commitSelf(lastCommit: Text | null): Text {
    if (lastCommit && lastCommit.textContent === this.text) {
      return lastCommit;
    }
    return new Text(this.text);
  }

  diffChildren() {
    // This committer doesn't have children.
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

  commitSelf(lastCommit: HTMLElement | null, newChildren: HTMLElement[]) {
    const child = newChildren[0];
    const prevStyle = lastCommit === child ? this.prevStyle : null;
    return applyStyle(child, this.style, prevStyle);
  }

  diffChildren() {}
}

type HtmlUI = CommitUI<HtmlNode>;
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
