import test from 'node:test';
import assert from 'node:assert/strict';
import { createBSOD } from '../src/ui/bsod.js';
import { fakeClock } from './helpers/fake-clock.mjs';

function createMockDOM() {
  class MockNode {
    constructor(tagName = 'DIV') {
      this.tagName = tagName.toUpperCase();
      this.id = '';
      this.className = '';
      this.hidden = false;
      this.inert = false;
      this.tabIndex = 0;
      this.dataset = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.children = [];
      this.parentNode = null;
      this._text = '';
    }

    setAttribute(name, val) {
      const str = String(val);
      this.attributes.set(name, str);
      if (name === 'id') this.id = str;
      if (name === 'class') this.className = str;
      if (name === 'hidden') this.hidden = true;
      if (name.startsWith('data-')) {
        const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = str;
      }
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === 'hidden') this.hidden = false;
      if (name === 'id') this.id = '';
      if (name === 'class') this.className = '';
      if (name.startsWith('data-')) {
        const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        delete this.dataset[camel];
      }
    }

    addEventListener(type, fn, options = {}) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      const set = this.listeners.get(type);
      set.add(fn);
      if (options.signal) {
        options.signal.addEventListener('abort', () => set.delete(fn));
      }
    }

    removeEventListener(type, fn) {
      this.listeners.get(type)?.delete(fn);
    }

    dispatchEvent(event) {
      event.target = this;
      const set = this.listeners.get(event.type);
      if (set) {
        for (const fn of Array.from(set)) {
          fn.call(this, event);
        }
      }
      return !event.defaultPrevented;
    }

    append(...nodes) {
      for (const node of nodes) {
        node.parentNode = this;
        this.children.push(node);
      }
    }

    remove() {
      if (this.parentNode) {
        const idx = this.parentNode.children.indexOf(this);
        if (idx !== -1) this.parentNode.children.splice(idx, 1);
        this.parentNode = null;
      }
    }

    focus() {}

    get isConnected() {
      let curr = this;
      while (curr) {
        if (curr === root) return true;
        curr = curr.parentNode;
      }
      return false;
    }

    get textContent() {
      if (this.children.length === 0) return this._text;
      return this.children.map(c => c.textContent).join('');
    }

    set textContent(val) {
      this._text = String(val);
      this.children = [];
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
      const results = [];
      function match(node) {
        if (selector.startsWith('#')) {
          if (node.id === selector.slice(1)) results.push(node);
        } else if (selector.startsWith('.')) {
          const cls = selector.slice(1);
          if (node.className && node.className.split(/\s+/).includes(cls)) results.push(node);
        } else if (selector.startsWith('[data-')) {
          const matchAttr = selector.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/);
          if (matchAttr) {
            const [, attr, val] = matchAttr;
            if (val !== undefined) {
              if (node.getAttribute(attr) === val) results.push(node);
            } else if (node.hasAttribute(attr)) {
              results.push(node);
            }
          }
        } else if (node.tagName === selector.toUpperCase()) {
          results.push(node);
        }
        for (const child of node.children) match(child);
      }
      for (const child of this.children) match(child);
      return results;
    }

    set innerHTML(html) {
      this.children = [];
      const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
      const stack = [this];

      for (const token of tokens) {
        if (token.startsWith('</')) {
          if (stack.length > 1) stack.pop();
        } else if (token.startsWith('<')) {
          const selfClosing = token.endsWith('/>') || token.startsWith('<rect') || token.startsWith('<circle') || token.startsWith('<path');
          const tagMatch = token.match(/<([a-zA-Z0-9_-]+)/);
          if (!tagMatch) continue;
          const tag = tagMatch[1];
          const node = new MockNode(tag);

          const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
          attrRegex.lastIndex = tagMatch[0].length;
          let attrMatch;
          while ((attrMatch = attrRegex.exec(token)) !== null) {
            const name = attrMatch[1];
            const value = attrMatch[2] ?? '';
            if (name !== '/' && !name.endsWith('>')) {
              node.setAttribute(name, value);
            }
          }

          stack.at(-1).append(node);
          if (!selfClosing) stack.push(node);
        } else {
          const text = token.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          if (text) {
            const textNode = new MockNode('#text');
            textNode._text = text;
            stack.at(-1).append(textNode);
          }
        }
      }
    }
  }

  const root = new MockNode('BODY');
  const windowListeners = new Map();

  const mockWindow = {
    addEventListener(type, fn, options = {}) {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      const set = windowListeners.get(type);
      set.add(fn);
      if (options.signal) {
        options.signal.addEventListener('abort', () => set.delete(fn));
      }
    },
    removeEventListener(type, fn) {
      windowListeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      const set = windowListeners.get(event.type);
      if (set) {
        for (const fn of Array.from(set)) {
          fn.call(mockWindow, event);
        }
      }
      return !event.defaultPrevented;
    },
  };

  const mockDocument = {
    body: root,
    activeElement: root,
    createElement(tagName) {
      return new MockNode(tagName);
    },
  };

  return { root, mockWindow, mockDocument };
}

function runWithDOM(fn) {
  const { root, mockWindow, mockDocument } = createMockDOM();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;
  try {
    return fn({ root, mockWindow, mockDocument });
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
}

test('createBSOD initial state and idempotent mount', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({ timers: time.timers });

    assert.equal(bsod.isShowing(), false);
    bsod.mount(root);
    assert.equal(bsod.isShowing(), false);
    assert.ok(bsod.element);
    assert.equal(bsod.element.getAttribute('role'), 'alertdialog');
    assert.equal(bsod.element.getAttribute('aria-modal'), 'true');
    assert.equal(bsod.element.hidden, true);

    // Repeated mount is a no-op
    bsod.mount(root);
    assert.equal(root.children.length, 1);

    bsod.dispose();
  });
});

test('createBSOD realistic content, stop codes, and Thai/English wording', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({ timers: time.timers });
    bsod.mount(root);

    const el = bsod.element;
    const text = el.textContent;

    // Emoticon
    const emoticon = el.querySelector('.bsod-emoticon');
    assert.ok(emoticon);
    assert.equal(emoticon.textContent, ':(');
    assert.equal(emoticon.getAttribute('role'), 'button');

    // Exact Thai & English text
    assert.match(text, /คอมพิวเตอร์ของคุณมีปัญหาและจำเป็นต้องรีสตาร์ท เรากำลังรวบรวมข้อมูลข้อผิดพลาดให้คุณ/);
    assert.match(text, /Your PC ran into a problem and needs to restart\. We're just collecting some error info, and then we'll restart for you\./);

    // Stop codes and error references
    assert.match(text, /Stop code:\s*BOSS_PROXIMITY_OVERHEAT/);
    assert.match(text, /What failed:\s*kpi_evaluation\.sys/);
    assert.match(text, /Error reference:\s*0xDEADB055/);

    // QR code mockup SVG
    const qrSvg = el.querySelector('.bsod-qr');
    assert.ok(qrSvg);
    assert.equal(qrSvg.getAttribute('role'), 'img');

    // Dismiss button and hidden spot
    assert.ok(el.querySelector('.bsod-dismiss-btn'));
    assert.ok(el.querySelector('.bsod-hidden-spot'));

    bsod.dispose();
  });
});

test('createBSOD show and hide toggle visibility and isShowing state', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({ timers: time.timers });
    bsod.mount(root);

    assert.equal(bsod.isShowing(), false);
    bsod.show();
    assert.equal(bsod.isShowing(), true);
    assert.equal(bsod.element.hidden, false);
    assert.equal(bsod.element.inert, false);

    bsod.hide();
    assert.equal(bsod.isShowing(), false);
    assert.equal(bsod.element.hidden, true);
    assert.equal(bsod.element.inert, true);

    bsod.dispose();
  });
});

test('createBSOD fake progress counter slowly ticks up to max and freezes', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({
      timers: time.timers,
      initialProgress: 87,
      tickInterval: 2000,
      maxProgress: 89,
    });
    bsod.mount(root);

    assert.equal(bsod.getProgress(), 87);
    bsod.show();

    // After 2000ms ticks to 88
    time.advance(2000);
    assert.equal(bsod.getProgress(), 88);

    // After another 2000ms ticks to 89
    time.advance(2000);
    assert.equal(bsod.getProgress(), 89);

    // Should stay stuck at 89% (maxProgress)
    time.advance(10000);
    assert.equal(bsod.getProgress(), 89);
    assert.equal(time.pending(), 0);

    bsod.dispose();
  });
});

test('createBSOD fake progress counter stays stuck at 87% when stayStuck is enabled', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({
      timers: time.timers,
      initialProgress: 87,
      stayStuck: true,
    });
    bsod.mount(root);
    bsod.show();

    time.advance(20000);
    assert.equal(bsod.getProgress(), 87);
    assert.equal(time.pending(), 0);

    bsod.dispose();
  });
});

test('createBSOD triggers onDismiss via Escape button', () => {
  runWithDOM(({ root }) => {
    let dismissed = 0;
    const bsod = createBSOD({ onDismiss: () => { dismissed++; } });
    bsod.mount(root);
    bsod.show();

    const btn = bsod.element.querySelector('.bsod-dismiss-btn');
    assert.ok(btn);
    btn.dispatchEvent({ type: 'click' });

    assert.equal(dismissed, 1);
    assert.equal(bsod.isShowing(), false);

    bsod.dispose();
  });
});

test('createBSOD triggers onDismiss via Escape key when showing, but not when hidden', () => {
  runWithDOM(({ root, mockWindow }) => {
    let dismissed = 0;
    const bsod = createBSOD({ onDismiss: () => { dismissed++; } });
    bsod.mount(root);

    // When hidden, Escape key does not trigger
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(dismissed, 0);

    // When showing, Escape triggers dismissal
    bsod.show();
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(dismissed, 1);
    assert.equal(bsod.isShowing(), false);

    bsod.dispose();
  });
});

test('createBSOD triggers onDismiss via hidden spot and emoticon click', () => {
  runWithDOM(({ root }) => {
    let dismissed = 0;
    const bsod = createBSOD({ onDismiss: () => { dismissed++; } });
    bsod.mount(root);
    bsod.show();

    // Hidden spot click
    const hiddenSpot = bsod.element.querySelector('.bsod-hidden-spot');
    assert.ok(hiddenSpot);
    hiddenSpot.dispatchEvent({ type: 'click' });
    assert.equal(dismissed, 1);
    assert.equal(bsod.isShowing(), false);

    // Show again and click emoticon
    bsod.show();
    const emoticon = bsod.element.querySelector('.bsod-emoticon');
    assert.ok(emoticon);
    emoticon.dispatchEvent({ type: 'click' });
    assert.equal(dismissed, 2);
    assert.equal(bsod.isShowing(), false);

    // Show again and press Enter on emoticon
    bsod.show();
    emoticon.dispatchEvent({
      type: 'keydown',
      key: 'Enter',
      preventDefault() {},
    });
    assert.equal(dismissed, 3);
    assert.equal(bsod.isShowing(), false);

    bsod.dispose();
  });
});

test('createBSOD theme adaptability for retro win95 and xp', () => {
  runWithDOM(({ root }) => {
    const bsod = createBSOD({ theme: 'win95' });
    bsod.mount(root);

    assert.equal(bsod.element.dataset.theme, 'win95');

    bsod.setTheme('xp');
    assert.equal(bsod.element.dataset.theme, 'xp');

    bsod.setTheme('win11');
    assert.equal(bsod.element.dataset.theme, 'win11');

    bsod.dispose();
  });
});

test('createBSOD dispose cleans up element and timers', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({ timers: time.timers, tickInterval: 1000 });
    bsod.mount(root);
    bsod.show();

    assert.equal(root.children.length, 1);
    assert.equal(time.pending(), 1);

    bsod.dispose();
    assert.equal(root.children.length, 0);
    assert.equal(time.pending(), 0);
    assert.equal(bsod.isShowing(), false);
  });
});
