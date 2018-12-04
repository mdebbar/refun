import { CommitNode, AppNode, stateful, UI, Commit } from '../framework';

interface Attributes {
  [x: string]: string | null;
}

export function root(element: HTMLElement): HtmlRoot {
  return new HtmlRoot(element);
}

class HtmlNode extends CommitNode {
  private tagName: string;
  private attributes: Attributes;
  private prevTagName: string;
  private prevAttributes: Attributes;

  element: Node;

  update(tagName: string, attributes: Attributes) {
    this.prevTagName = this.tagName;
    this.prevAttributes = this.attributes;
    this.tagName = tagName;
    this.attributes = attributes;
  }

  updateElement() {
    if (this.prevTagName != this.tagName) {
      this.element = createElement(this.tagName, this.attributes);
    } else {
      // TODO: Diff attributes. It's necessary because some attributes might
      // have been set to a value earlier and now are ommitted.
      if (this.element instanceof Element)
        applyAttributes(this.element, this.attributes, this.prevAttributes);
    }
  }

  applyCommit(commit: Commit) {
    this.updateElement();
    // TODO[perf]: diff child commits.
    clearDom(this.element);

    for (let i = 0; i < commit.children.length; i++) {
      const child = commit.children[i];
      if (child.node instanceof HtmlNode) {
        if (child.node.element instanceof Text) {
          console.log('appending', child.node.element.textContent);
        }
        // QUESTION: Should we store the `element` on the commit itself?
        this.element.appendChild(child.node.element);
      }
    }
  }
}

class HtmlRoot extends HtmlNode {
  constructor(element: HTMLElement) {
    super();
    this.element = element;
  }

  updateElement() {
    // nothing..
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
    if (node.commitNode == null) {
      node.commitNode = new HtmlNode();
    }
    node.commitNode.update(tagName, attributes);
    return children;
  },
);

class TextNode extends HtmlNode {
  constructor(text: string) {
    super();
    this.text = text;
  }

  text: string;

  applyCommit(commit: Commit) {
    // TODO: don't allow any children.
    this.element = new Text(this.text);
  }
}

// TODO: optimize; allocate TextNodes less aggressively and reuse.
export const text = stateful('text', (node: AppNode, text: string) => {
  node.commitNode = new TextNode(text);
  return null;
});

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

function applyAttributes(
  el: Element,
  attributes: Attributes,
  prevAttributes?: Attributes,
) {
  if (prevAttributes != undefined) {
    for (const name in prevAttributes) {
      if (has.call(prevAttributes, name) && !attributes[name]) {
        // This attribute was set previously but not anymore.
        el.removeAttribute(name);
      }
    }
  }

  for (const name in attributes) {
    if (has.call(attributes, name)) {
      const value = attributes[name];
      if (value != null) {
        el.setAttribute(name, value);
      } else {
        el.removeAttribute(name);
      }
    }
  }
  return el;
}

// Shorthand for creating a div.
export const div = (attributes: Attributes, children: UI) =>
  element('div', attributes, children);
