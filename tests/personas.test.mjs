import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, renderAccountant, renderDeveloper, renderDesigner, renderPM } from '../src/ui/personas.js';
import { createWorkView } from '../src/ui/work.js';

test('PERSONAS registry contains all 4 required work personas', () => {
  assert.ok(PERSONAS.accountant, 'Accountant persona exists');
  assert.ok(PERSONAS.developer, 'Developer persona exists');
  assert.ok(PERSONAS.designer, 'Designer persona exists');
  assert.ok(PERSONAS.pm, 'PM persona exists');

  assert.equal(PERSONAS.accountant.badge, 'Excel');
  assert.equal(PERSONAS.developer.badge, 'VS Code');
  assert.equal(PERSONAS.designer.badge, 'Figma');
  assert.equal(PERSONAS.pm.badge, 'Jira');
});

test('Accountant persona renders Excel spreadsheet, formula bar, and chart', () => {
  const html = renderAccountant();
  assert.match(html, /รายงานผลการดำเนินงาน Q4/);
  assert.match(html, /work-sheet/);
  assert.match(html, /formula-bar/);
  assert.match(html, /=AVERAGE\(D2:D5\)/);
  assert.match(html, /work-chart/);
  assert.match(html, /document-sheet-tabs/);
});

test('Developer persona renders VS Code interface with main.rs, server.go, squigglies, and terminal', () => {
  const rustHtml = renderDeveloper('main.rs');
  assert.match(rustHtml, /main\.rs/);
  assert.match(rustHtml, /vsc-workspace/);
  assert.match(rustHtml, /vsc-activity-bar/);
  assert.match(rustHtml, /lint-error/);
  assert.match(rustHtml, /error\[E0382\]/);
  assert.match(rustHtml, /lint-warn/);
  assert.match(rustHtml, /cargo check/);
  assert.match(rustHtml, /vsc-terminal-output/);

  const goHtml = renderDeveloper('server.go');
  assert.match(goHtml, /server\.go/);
  assert.match(goHtml, /EventStreamer/);
  assert.match(goHtml, /Broadcast/);
});

test('Designer persona renders Figma UI with Hero_Banner_FINAL_v2_edit_แก้รอบ3.png, rulers, and artboard', () => {
  const html = renderDesigner();
  assert.match(html, /Hero_Banner_FINAL_v2_edit_แก้รอบ3\.png/);
  assert.match(html, /figma-layers-sidebar/);
  assert.match(html, /figma-ruler-h/);
  assert.match(html, /figma-ruler-v/);
  assert.match(html, /figma-artboard-frame/);
  assert.match(html, /figma-selection-box/);
  assert.match(html, /figma-properties-sidebar/);
});

test('PM persona renders Jira Kanban board with To Do, In Progress, Blocked, Sprint 42, and Burndown stats', () => {
  const html = renderPM();
  assert.match(html, /EP Sprint 42 Kanban Board/);
  assert.match(html, /jira-burndown-banner/);
  assert.match(html, /burndown-svg/);
  assert.match(html, /To Do/);
  assert.match(html, /In Progress/);
  assert.match(html, /Blocked/);
  assert.match(html, /Sprint 42/);
  assert.match(html, /EP-402/);
  assert.match(html, /EP-388/);
  assert.match(html, /EP-377/);
  assert.match(html, /EP-350/);
});

/* Simple lightweight Mock DOM for testing createWorkView lifecycle */
class MockNode {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.inert = false;
    this.tabIndex = 0;
    this.disabled = false;
    this.title = '';
    this.className = '';
    this._html = '';
  }

  get classList() {
    const node = this;
    return {
      contains(cls) { return node.className?.split(/\s+/).includes(cls) ?? false; },
      add(cls) {
        const classes = new Set(node.className?.split(/\s+/).filter(Boolean) || []);
        classes.add(cls);
        node.className = Array.from(classes).join(' ');
      },
      remove(cls) {
        const classes = new Set(node.className?.split(/\s+/).filter(Boolean) || []);
        classes.delete(cls);
        node.className = Array.from(classes).join(' ');
      },
      toggle(cls, force) {
        const classes = new Set(node.className?.split(/\s+/).filter(Boolean) || []);
        const shouldAdd = force !== undefined ? Boolean(force) : !classes.has(cls);
        if (shouldAdd) classes.add(cls);
        else classes.delete(cls);
        node.className = Array.from(classes).join(' ');
        return shouldAdd;
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
    }
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }

  dispatchEvent(event) {
    event.target = this;
    event.closest = (selector) => {
      let cur = this;
      while (cur) {
        if (selector.startsWith('.') && cur.className?.includes(selector.slice(1))) return cur;
        if (selector.startsWith('#') && cur.attributes.get('id') === selector.slice(1)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };
    const set = this.listeners.get(event.type);
    if (set) {
      for (const fn of set) fn(event);
    }
  }

  focus() {}

  get innerHTML() {
    return this._html;
  }

  set innerHTML(html) {
    this._html = html;
    this.children = [];
    const tokens = html.match(/<[^>]+>|[^<]+/g) || [];
    const stack = [this];

    for (const token of tokens) {
      if (token.startsWith('</')) {
        if (stack.length > 1) stack.pop();
      } else if (token.startsWith('<')) {
        const selfClosing = token.endsWith('/>') || token.startsWith('<input') || token.startsWith('<col') || token.startsWith('<line') || token.startsWith('<rect') || token.startsWith('<circle') || token.startsWith('<path');
        const tagMatch = token.match(/<([a-zA-Z0-9_-]+)/);
        if (!tagMatch) continue;
        const node = new MockNode(tagMatch[1]);
        const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
        attrRegex.lastIndex = tagMatch[0].length;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(token)) !== null) {
          const name = attrMatch[1];
          const val = attrMatch[2] ?? '';
          if (name !== '/' && !name.endsWith('>')) {
            node.setAttribute(name, val);
            if (name.startsWith('data-')) {
              node.dataset = node.dataset || {};
              node.dataset[name.slice(5)] = val;
            }
          }
        }
        stack.at(-1).append(node);
        if (!selfClosing) stack.push(node);
      }
    }
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    function match(node) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (node.className?.split(/\s+/).includes(cls)) results.push(node);
      } else if (selector.startsWith('#')) {
        if (node.getAttribute('id') === selector.slice(1)) results.push(node);
      } else if (node.tagName === selector.toUpperCase()) {
        results.push(node);
      }
      for (const child of node.children) match(child);
    }
    for (const child of this.children) match(child);
    return results;
  }
}

test('createWorkView mounts switcher bar and switches personas cleanly', () => {
  const root = new MockNode('DIV');
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement(tag) { return new MockNode(tag); }
  };

  try {
    let returnCalled = false;
    const work = createWorkView({ onReturn: () => { returnCalled = true; } });

    work.mount(root);

    const switcher = root.querySelector('.work-persona-switcher');
    assert.ok(switcher, 'Persona switcher bar is mounted');

    const tabs = root.querySelectorAll('.persona-tab-btn');
    assert.equal(tabs.length, 4, '4 persona switch buttons rendered');

    // Default is accountant
    assert.equal(work.getPersona(), 'accountant');
    assert.ok(root.querySelector('.accountant-view'), 'Accountant view rendered by default');

    // Switch to developer
    work.setPersona('developer');
    assert.equal(work.getPersona(), 'developer');
    assert.ok(root.querySelector('.developer-view'), 'Developer view rendered after switch');
    assert.ok(root.querySelector('.vsc-terminal-output'), 'Terminal output present in Developer');

    // Switch to designer
    work.setPersona('designer');
    assert.equal(work.getPersona(), 'designer');
    assert.ok(root.querySelector('.designer-view'), 'Designer view rendered after switch');
    assert.ok(root.querySelector('.figma-artboard-frame'), 'Artboard present in Designer');

    // Switch to pm
    work.setPersona('pm');
    assert.equal(work.getPersona(), 'pm');
    assert.ok(root.querySelector('.pm-view'), 'PM view rendered after switch');
    assert.ok(root.querySelector('.jira-kanban-board'), 'Kanban board present in PM');

    // Test close button behavior
    work.update({ canReturn: false });
    const closeBtns = root.querySelectorAll('.document-close');
    assert.ok(closeBtns.length >= 1, 'At least one close button exists');
    for (const btn of closeBtns) {
      assert.equal(btn.disabled, true, 'Close button disabled when return not allowed');
    }

    work.update({ canReturn: true });
    for (const btn of closeBtns) {
      assert.equal(btn.disabled, false, 'Close button enabled when return allowed');
    }

    work.dispose();
    assert.equal(root.children.length, 0, 'Work view removed on dispose');
  } finally {
    globalThis.document = prevDoc;
  }
});
