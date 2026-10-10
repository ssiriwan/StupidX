import test from 'node:test';
import assert from 'node:assert/strict';
import { createShell, osOptions, subthemes, themes } from '../src/ui/shell.js';
import { SessionController } from '../src/core/session.js';

class MockClassList {
  constructor(node) {
    this.node = node;
  }
  get _classes() {
    return (this.node.className || '').trim().split(/\s+/).filter(Boolean);
  }
  contains(cls) {
    return this._classes.includes(cls);
  }
  add(...classes) {
    const set = new Set(this._classes);
    classes.forEach(c => set.add(c));
    this.node.className = Array.from(set).join(' ');
  }
  remove(...classes) {
    const set = new Set(this._classes);
    classes.forEach(c => set.delete(c));
    this.node.className = Array.from(set).join(' ');
  }
  toggle(cls, force) {
    if (force === true) { this.add(cls); return true; }
    if (force === false) { this.remove(cls); return false; }
    if (this.contains(cls)) { this.remove(cls); return false; }
    this.add(cls); return true;
  }
}

class MockNode {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.dataset = {};
    this.hidden = false;
    this._text = '';
    this.id = '';
    this.classList = new MockClassList(this);
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(val) {
    this.setAttribute('class', val);
  }

  setAttribute(name, value) {
    const strVal = String(value);
    this.attributes.set(name, strVal);
    if (name === 'hidden') this.hidden = true;
    if (name === 'id') this.id = strVal;
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = strVal;
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
    if (name === 'class') this.attributes.delete('class');
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

  click() {
    const event = {
      type: 'click',
      target: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
    };
    this.dispatchEvent(event);
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

  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
  }

  contains(other) {
    let curr = other;
    while (curr) {
      if (curr === this) return true;
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
        if (node.classList.contains(cls)) results.push(node);
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
      } else if (selector.startsWith('[aria-')) {
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
        const selfClosing = token.endsWith('/>') || token.startsWith('<rect') || token.startsWith('<circle') || token.startsWith('<path') || token.startsWith('<polygon') || token.startsWith('<polyline') || token.startsWith('<ellipse') || token.startsWith('<line');
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

function runWithDOM(fn) {
  const root = new MockNode('DIV');
  root.id = 'app';
  const html = new MockNode('HTML');
  html.dataset = { theme: 'win11' };
  const docListeners = new Map();

  const mockDocument = {
    documentElement: html,
    body: root,
    activeElement: root,
    createElement(tag) { return new MockNode(tag); },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      docListeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      const set = docListeners.get(event.type);
      if (set) {
        for (const fn of Array.from(set)) fn.call(mockDocument, event);
      }
    },
  };

  const prevDoc = globalThis.document;
  globalThis.document = mockDocument;
  try {
    return fn({ root, document: mockDocument });
  } finally {
    globalThis.document = prevDoc;
  }
}

test('createShell mounts both OS Switcher and Sub-theme Dropdown', () => {
  runWithDOM(({ root }) => {
    const shell = createShell();
    shell.mount(root);

    // 1. Verify OS Switcher mounting
    const osSwitcher = root.querySelector('.os-switcher');
    assert.ok(osSwitcher, 'os-switcher element mounted');
    assert.equal(osSwitcher.getAttribute('role'), 'group');

    const osButtons = root.querySelectorAll('[data-os-choice]');
    assert.equal(osButtons.length, 3, 'All 3 OS choices present');

    const expectedOS = {
      win95: '💾 Win 95',
      xp: '🍀 Win XP',
      win11: '🪟 Win 11',
    };
    for (const [id, label] of Object.entries(expectedOS)) {
      const btn = root.querySelector(`[data-os-choice="${id}"]`);
      assert.ok(btn, `OS button for ${id} exists`);
      assert.ok(btn.textContent.includes(label), `OS button ${id} includes label "${label}"`);
    }

    const defaultOSBtn = root.querySelector('[data-os-choice="win11"]');
    assert.equal(defaultOSBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(defaultOSBtn.classList.contains('active'));

    // 2. Verify Sub-theme Dropdown mounting
    const themePicker = root.querySelector('.theme-picker');
    assert.ok(themePicker, 'theme-picker (subtheme picker) element mounted');

    const dropdownToggle = root.querySelector('.theme-dropdown-toggle');
    assert.ok(dropdownToggle, 'theme-dropdown-toggle element mounted');
    assert.equal(dropdownToggle.getAttribute('aria-expanded'), 'false');

    const currentLabel = root.querySelector('.theme-current-label');
    assert.equal(currentLabel.textContent, subthemes.default);

    const subthemeButtons = root.querySelectorAll('[data-subtheme-choice]');
    assert.equal(subthemeButtons.length, 6, 'All 6 subthemes present in dropdown');

    const expectedSubthemes = {
      default: 'คลาสสิก (Original)',
      dark: 'Dark Mode',
      gov: 'ราชการไทย 1.0 (e-GP)',
      hi5: 'Hi5 Y2K (2005)',
      matrix: 'Matrix 1999',
      icu: 'ICU Monitor',
    };
    for (const [id, label] of Object.entries(expectedSubthemes)) {
      const btn = root.querySelector(`[data-subtheme-choice="${id}"]`);
      assert.ok(btn, `Sub-theme button for ${id} exists`);
      assert.ok(btn.textContent.includes(label), `Sub-theme button ${id} includes label "${label}"`);
    }

    shell.dispose();
  });
});

test('dropdown opens and closes on toggle click and outside click', () => {
  runWithDOM(({ root, document }) => {
    const shell = createShell();
    shell.mount(root);

    const dropdownToggle = root.querySelector('.theme-dropdown-toggle');
    const dropdownMenu = root.querySelector('.theme-dropdown-menu');

    assert.equal(dropdownMenu.hidden, true);
    assert.equal(dropdownToggle.getAttribute('aria-expanded'), 'false');

    // Open dropdown
    dropdownToggle.click();
    assert.equal(dropdownMenu.hidden, false);
    assert.equal(dropdownToggle.getAttribute('aria-expanded'), 'true');

    // Toggle close
    dropdownToggle.click();
    assert.equal(dropdownMenu.hidden, true);
    assert.equal(dropdownToggle.getAttribute('aria-expanded'), 'false');

    // Open and click outside to close
    dropdownToggle.click();
    assert.equal(dropdownMenu.hidden, false);
    const outsideNode = new MockNode('DIV');
    document.dispatchEvent({ type: 'click', target: outsideNode });
    assert.equal(dropdownMenu.hidden, true);

    shell.dispose();
  });
});

test('clicking OS buttons dispatches onOS and updates document.documentElement.dataset.os', () => {
  runWithDOM(({ root, document }) => {
    const selectedOSList = [];
    const shell = createShell({
      onOS: (os) => { selectedOSList.push(os); shell.update({ os }); },
    });
    shell.mount(root);

    const testOS = ['win95', 'xp', 'win11'];
    for (const id of testOS) {
      const btn = root.querySelector(`[data-os-choice="${id}"]`);
      assert.ok(btn, `Button for ${id} exists`);
      btn.click();

      assert.equal(document.documentElement.dataset.os, id, `dataset.os should be updated to ${id}`);
      assert.equal(btn.getAttribute('aria-pressed'), 'true', `active OS button has aria-pressed="true"`);
      assert.ok(btn.classList.contains('active'), `active OS button has active class`);

      const otherButtons = root.querySelectorAll('[data-os-choice]').filter(b => b.dataset.osChoice !== id);
      for (const other of otherButtons) {
        assert.equal(other.getAttribute('aria-pressed'), 'false');
        assert.equal(other.classList.contains('active'), false);
      }
    }

    assert.deepEqual(selectedOSList, ['win95', 'xp', 'win11']);
    shell.dispose();
  });
});

test('clicking Sub-theme buttons dispatches onSubtheme and updates document.documentElement.dataset.subtheme', () => {
  runWithDOM(({ root, document }) => {
    const selectedSubthemes = [];
    const shell = createShell({
      onSubtheme: (subtheme) => { selectedSubthemes.push(subtheme); shell.update({ subtheme }); },
    });
    shell.mount(root);

    const subList = [
      { id: 'dark', label: 'Dark Mode' },
      { id: 'gov', label: 'ราชการไทย 1.0 (e-GP)' },
      { id: 'hi5', label: 'Hi5 Y2K (2005)' },
      { id: 'matrix', label: 'Matrix 1999' },
      { id: 'icu', label: 'ICU Monitor' },
      { id: 'default', label: 'คลาสสิก (Original)' },
    ];

    const currentLabel = root.querySelector('.theme-current-label');

    for (const { id, label } of subList) {
      const btn = root.querySelector(`[data-subtheme-choice="${id}"]`);
      assert.ok(btn, `Subtheme button ${id} exists`);
      btn.click();

      assert.equal(document.documentElement.dataset.subtheme, id, `dataset.subtheme should be ${id}`);
      assert.equal(currentLabel.textContent, label, `current label should display ${label}`);
      assert.equal(btn.getAttribute('aria-pressed'), 'true', `active subtheme has aria-pressed="true"`);

      const otherButtons = root.querySelectorAll('[data-subtheme-choice]').filter(b => b.dataset.subthemeChoice !== id);
      for (const other of otherButtons) {
        assert.equal(other.getAttribute('aria-pressed'), 'false');
      }
    }

    assert.deepEqual(selectedSubthemes, ['dark', 'gov', 'hi5', 'matrix', 'icu', 'default']);
    shell.dispose();
  });
});

test('shell.update({ os, subtheme, theme }) updates DOM datasets and UI state for both OS and Subtheme', () => {
  runWithDOM(({ root, document }) => {
    const shell = createShell();
    shell.mount(root);

    const currentLabel = root.querySelector('.theme-current-label');
    const triggerSwatch = root.querySelector('.theme-swatch');

    // Update with both os and subtheme
    shell.update({ os: 'xp', subtheme: 'matrix' });
    assert.equal(document.documentElement.dataset.os, 'xp');
    assert.equal(document.documentElement.dataset.subtheme, 'matrix');
    assert.equal(document.documentElement.dataset.theme, 'matrix');
    assert.equal(root.querySelector('[data-os-choice="xp"]').getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelector('[data-os-choice="win11"]').getAttribute('aria-pressed'), 'false');
    assert.equal(currentLabel.textContent, 'Matrix 1999');
    assert.ok(triggerSwatch.classList.contains('theme-swatch-matrix'));
    assert.equal(root.querySelector('[data-subtheme-choice="matrix"]').getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelector('[data-subtheme-choice="default"]').getAttribute('aria-pressed'), 'false');

    // Update with win95 and icu
    shell.update({ os: 'win95', subtheme: 'icu' });
    assert.equal(document.documentElement.dataset.os, 'win95');
    assert.equal(document.documentElement.dataset.subtheme, 'icu');
    assert.equal(document.documentElement.dataset.theme, 'icu');
    assert.equal(root.querySelector('[data-os-choice="win95"]').getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelector('[data-os-choice="xp"]').getAttribute('aria-pressed'), 'false');
    assert.equal(currentLabel.textContent, 'ICU Monitor');
    assert.ok(triggerSwatch.classList.contains('theme-swatch-icu'));

    // Backward compatibility: update with legacy theme name
    shell.update({ theme: 'gov' });
    assert.equal(document.documentElement.dataset.subtheme, 'gov');
    assert.equal(document.documentElement.dataset.theme, 'gov');
    assert.equal(currentLabel.textContent, 'ราชการไทย 1.0 (e-GP)');

    shell.dispose();
  });
});

test('rejected controller choices do not change rendered theme state', () => {
  runWithDOM(({ root, document }) => {
    let shell;
    const session = new SessionController({ onChange: ({ os, subtheme, theme }) => shell.update({ os, subtheme, theme }) });
    shell = createShell({ onOS: os => session.setOS(os), onSubtheme: subtheme => session.setSubtheme(subtheme) });
    shell.mount(root);
    session.setOS('xp'); session.setSubtheme('dark'); session.enterWork();
    root.querySelector('[data-os-choice="win95"]').click();
    root.querySelector('[data-subtheme-choice="matrix"]').click();
    assert.equal(document.documentElement.dataset.os, 'xp');
    assert.equal(document.documentElement.dataset.subtheme, 'dark');
    assert.equal(document.documentElement.dataset.theme, 'dark');
    shell.dispose();
  });
});

