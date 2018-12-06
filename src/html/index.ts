import { CommitNode, AppNode, stateful, UI } from '../framework';
import { SkipRate } from '../instrumentation';

interface Attributes {
  [x: string]: string | null;
}

export function root(element: HTMLElement): HtmlRoot {
  return new HtmlRoot(element);
}

class HtmlNode extends CommitNode<Element> {
  private tagName: string;
  private prevTagName: string;

  private attributes: Attributes;
  private prevAttributes: Attributes;

  update(tagName: string, attributes: Attributes) {
    this.markAsDirty();
    this.prevTagName = this.tagName;
    this.prevAttributes = this.attributes;
    this.tagName = tagName;
    this.attributes = attributes;
  }

  getChildrenOfCommit(commit: Element): Element[] {
    // TODO[types]: Necessary evil.
    return (commit.childNodes as any) as Element[];
  }

  commit(lastCommit: Element): Element {
    if (!lastCommit || this.tagName !== this.prevTagName) {
      return createElement(this.tagName, this.attributes);
    }
    return applyAttributes(lastCommit, this.attributes, this.prevAttributes);
  }

  appendChild(commit: Element, child: Element) {
    commit.appendChild(child);
  }

  replaceChildAt(commit: Element, newChild: Element, i: number) {
    commit.replaceChild(newChild, commit.childNodes[i]);
  }

  removeChildAt(commit: Element, i: number) {
    commit.childNodes[i].remove();
  }

  trimChildren(commit: Element, count: number) {
    for (let i = 0; i < count; i++) {
      // TODO[types]: We know this can't be null.
      (commit.lastChild as ChildNode).remove();
    }
  }
}

class HtmlRoot extends HtmlNode {
  rootElement: Element;
  constructor(rootElement: Element) {
    super();
    this.rootElement = rootElement;
  }

  commit(lastCommit: Element) {
    if (lastCommit == null) {
      // We are doing the initial commit, let's clear the content.
      clearDom(this.rootElement);
    }
    return this.rootElement;
  }
}

export const element = stateful(
  'element',
  (
    node: AppNode<HtmlNode>,
    tagName: string,
    attributes: Attributes,
    children: UI,
  ) => {
    node.commitNode = node.commitNode || new HtmlNode();
    node.commitNode.update(tagName, attributes);
    return children;
  },
);

const noChildrenError = 'Text nodes cannot have children.';
class TextNode<T extends Text> extends CommitNode<T> {
  text: string;

  constructor() {
    super();
  }

  update(text: string) {
    this.markAsDirty();
    this.text = text;
  }

  getChildrenOfCommit() {
    return [];
  }

  commit(lastCommit: Text | null): Text {
    if (lastCommit && lastCommit.textContent === this.text) {
      return lastCommit;
    }
    return new Text(this.text);
  }

  appendChild() {
    throw new Error(noChildrenError);
  }

  replaceChildAt() {
    throw new Error(noChildrenError);
  }

  removeChildAt() {
    throw new Error(noChildrenError);
  }

  trimChildren() {
    throw new Error(noChildrenError);
  }
}

export const text = stateful(
  'text',
  (node: AppNode<TextNode>, text: string) => {
    node.commitNode = node.commitNode || new TextNode();
    node.commitNode.update(text);
    return null;
  },
);

const { hasOwnProperty: has } = Object.prototype;

function clearDom(node: Node) {
  while (node.lastChild != null) {
    node.lastChild.remove();
  }
}

function createElement(tagName: string, attributes: Attributes) {
  const el = document.createElement(tagName);
  applyAttributes(el, attributes);
  return el;
}

const rate = new SkipRate('setAttr', 0);

// TODO[perf]: Styles should be an object instead of a string attribute.
function applyAttributes(
  el: Element,
  attributes: Attributes,
  prevAttributes?: Attributes,
): Element {
  prevAttributes = prevAttributes || {};
  for (const name in prevAttributes) {
    if (has.call(prevAttributes, name) && !attributes[name]) {
      // This attribute was set previously but not anymore.
      el.removeAttribute(name);
    }
  }

  for (const name in attributes) {
    if (
      has.call(attributes, name) &&
      attributes[name] != prevAttributes[name]
    ) {
      const value = attributes[name];
      if (value != null) {
        el.setAttribute(name, value);
      } else {
        el.removeAttribute(name);
      }
    }

    if (has.call(attributes, name)) {
      rate.total();
      if (attributes[name] == prevAttributes[name]) {
        rate.skip();
      }
    }
  }
  return el;
}

// Shorthand for creating a div.
export const div = (attributes: Attributes, children: UI) =>
  element('div', attributes, children);
