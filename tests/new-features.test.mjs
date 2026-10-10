import test from 'node:test';
import assert from 'node:assert/strict';
import { createYouTube, PlaybackGuard } from '../src/features/youtube.js';
import { createBSOD, createBsod } from '../src/ui/bsod.js';
import { PERSONAS, renderAccountant, renderDeveloper, renderDesigner, renderPM } from '../src/ui/personas.js';
import { createWorkView } from '../src/ui/work.js';
import { SessionController, THEMES, LEISURE, WORK_LOCKED } from '../src/core/session.js';
import { themes as shellThemes } from '../src/ui/shell.js';
import { fakeClock } from './helpers/fake-clock.mjs';

/* -------------------------------------------------------------------------
   Lightweight DOM Mock Environment for Node Test Runner
   ------------------------------------------------------------------------- */
function createMockDOM() {
  function matchesCompound(node, compound) {
    if (!node || !node.tagName) return false;

    // 1. Tag name check if present at start
    const tagMatch = compound.match(/^[a-zA-Z0-9_-]+/);
    if (tagMatch) {
      if (node.tagName !== tagMatch[0].toUpperCase()) return false;
      compound = compound.slice(tagMatch[0].length);
    }

    // 2. Class names (.class)
    const classes = compound.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classes) {
      for (const c of classes) {
        if (!node.classList.contains(c.slice(1))) return false;
      }
    }

    // 3. ID (#id)
    const idMatch = compound.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      if (node.id !== idMatch[1]) return false;
    }

    // 4. Attributes [attr] or [attr="val"]
    const attrRegex = /\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(compound)) !== null) {
      const [, attr, val] = attrMatch;
      if (val !== undefined) {
        if (node.getAttribute(attr) !== val) return false;
      } else {
        if (!node.hasAttribute(attr)) return false;
      }
    }

    return true;
  }

  function matchesSelector(node, selector) {
    if (!node || !node.tagName) return false;
    const parts = selector.split(',').map(s => s.trim());
    return parts.some(part => {
      const segments = part.split(/\s+/);
      return matchesCompound(node, segments.at(-1));
    });
  }

  class MockNode {
    constructor(tagName = 'DIV') {
      this.tagName = tagName.toUpperCase();
      this.id = '';
      this.className = '';
      this.hidden = false;
      this.inert = false;
      this.tabIndex = 0;
      this.title = '';
      this.disabled = false;
      this.dataset = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.children = [];
      this.parentNode = null;
      this._text = '';
    }

    replaceChildren(...nodes) {
      for (const child of this.children) {
        child.parentNode = null;
      }
      this.children = [];
      this._text = '';
      this.append(...nodes);
    }

    get classList() {
      const self = this;
      return {
        add(...classes) {
          const current = new Set(self.className ? self.className.split(/\s+/).filter(Boolean) : []);
          for (const c of classes) current.add(c);
          self.className = Array.from(current).join(' ');
        },
        remove(...classes) {
          const current = new Set(self.className ? self.className.split(/\s+/).filter(Boolean) : []);
          for (const c of classes) current.delete(c);
          self.className = Array.from(current).join(' ');
        },
        contains(cls) {
          return self.className ? self.className.split(/\s+/).includes(cls) : false;
        },
        toggle(cls, force) {
          const current = new Set(self.className ? self.className.split(/\s+/).filter(Boolean) : []);
          const has = current.has(cls);
          const shouldHave = force !== undefined ? Boolean(force) : !has;
          if (shouldHave) current.add(cls);
          else current.delete(cls);
          self.className = Array.from(current).join(' ');
          return shouldHave;
        },
      };
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
      let curr = this;
      let stop = false;
      event.stopPropagation = () => { stop = true; };

      while (curr && !stop) {
        const set = curr.listeners.get(event.type);
        if (set) {
          for (const fn of Array.from(set)) {
            fn.call(curr, event);
          }
        }
        curr = curr.parentNode;
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

    closest(selector) {
      let curr = this;
      while (curr && curr.tagName) {
        if (matchesSelector(curr, selector)) return curr;
        curr = curr.parentNode;
      }
      return null;
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
        if (matchesSelector(node, selector)) {
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
          const selfClosing = token.endsWith('/>') || token.startsWith('<rect') || token.startsWith('<circle') || token.startsWith('<path') || token.startsWith('<input') || token.startsWith('<col') || token.startsWith('<line');
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

  const storageMap = new Map();
  const mockLocalStorage = {
    getItem: (k) => storageMap.get(k) ?? null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  const mockDocument = {
    title: '',
    body: root,
    activeElement: root,
    createElement(tagName) {
      return new MockNode(tagName);
    },
  };

  return { root, mockWindow, mockDocument, mockLocalStorage };
}

function runWithDOM(fn) {
  const { root, mockWindow, mockDocument, mockLocalStorage } = createMockDOM();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevStorage = globalThis.localStorage;

  globalThis.document = mockDocument;
  globalThis.window = mockWindow;
  globalThis.localStorage = mockLocalStorage;

  try {
    return fn({ root, mockWindow, mockDocument, mockLocalStorage });
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    if (prevStorage !== undefined) globalThis.localStorage = prevStorage;
    else delete globalThis.localStorage;
  }
}

/* =========================================================================
   1. AUTO-RESUME LOGIC TESTS
   ========================================================================= */

test('auto-resume: attentionResume() plays video when locked via look-away, but respects manual pause', () => {
  const playbackCalls = [];
  let allowedToInteract = true;

  const mockPlayer = {
    pauseVideo: () => playbackCalls.push('pause'),
    playVideo: () => playbackCalls.push('play'),
  };

  const guard = new PlaybackGuard({ canInteract: () => allowedToInteract });
  guard.attach(mockPlayer);
  guard.resume();
  playbackCalls.length = 0; // Clear attach pause

  const yt = createYouTube({ canInteract: () => allowedToInteract, guard });

  // 1. Initial state: not blink-locked
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(yt.getState().userPaused, false);
  assert.equal(yt.attentionResume(), false);
  assert.equal(playbackCalls.includes('play'), false);

  // 2. Anti-FOMO lock triggered by looking away
  yt.attentionPause({ type: 'look-away', reason: 'head-turned-left' });
  assert.equal(yt.getState().isBlinkLocked, true);
  assert.equal(playbackCalls.at(-1), 'pause');

  // 3. Auto-resume triggers when user looks back at screen
  assert.equal(yt.attentionResume(), true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(playbackCalls.at(-1), 'play');

  // 4. Anti-FOMO lock triggered by blink
  yt.blinkPause();
  assert.equal(yt.getState().isBlinkLocked, true);
  assert.equal(playbackCalls.at(-1), 'pause');

  // 5. Auto-resume triggers again after eyes open
  assert.equal(yt.attentionResume(), true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(playbackCalls.at(-1), 'play');

  // 6. Manual user pause: must NEVER be overridden by attentionResume
  yt.pause();
  assert.equal(yt.getState().userPaused, true);
  assert.equal(yt.getState().isBlinkLocked, false);
  playbackCalls.length = 0;

  // Looking away while manually paused does NOT enter blink lock
  yt.attentionPause({ type: 'look-away', reason: 'head-turned-right' });
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(playbackCalls.length, 0);

  // Looking back must NOT auto-play when user manually paused
  assert.equal(yt.attentionResume(), false);
  assert.equal(playbackCalls.length, 0);
  assert.equal(yt.getState().userPaused, true);

  // 7. Manual play clears userPaused and re-enables auto-resume on future locks
  yt.play();
  assert.equal(yt.getState().userPaused, false);
  assert.equal(playbackCalls.at(-1), 'play');

  yt.attentionPause({ type: 'look-away' });
  assert.equal(yt.getState().isBlinkLocked, true);

  // If user pauses while currently locked, lock is released and manual pause sticks
  yt.pause();
  assert.equal(yt.getState().userPaused, true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(yt.attentionResume(), false);
});

test('auto-resume: attentionResume() respects canInteract condition (e.g. boss nearby)', () => {
  const playbackCalls = [];
  let allowedToInteract = true;

  const mockPlayer = {
    pauseVideo: () => playbackCalls.push('pause'),
    playVideo: () => playbackCalls.push('play'),
  };

  const guard = new PlaybackGuard({ canInteract: () => allowedToInteract });
  guard.attach(mockPlayer);
  guard.resume();
  playbackCalls.length = 0;

  const yt = createYouTube({ canInteract: () => allowedToInteract, guard });

  // Trigger lock while user is still in leisure
  yt.attentionPause({ type: 'look-away' });
  assert.equal(yt.getState().isBlinkLocked, true);

  // Boss arrives -> leisure interaction disabled
  allowedToInteract = false;

  // Auto-resume must refuse to play while interaction is prohibited
  assert.equal(yt.attentionResume(), false);
  assert.equal(yt.getState().isBlinkLocked, true);
  assert.equal(playbackCalls.includes('play'), false);

  // Safe again -> auto-resume succeeds
  allowedToInteract = true;
  assert.equal(yt.attentionResume(), true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(playbackCalls.at(-1), 'play');
});

test('auto-resume: DOM overlay shows during attention lock and hides on attentionResume()', () => {
  runWithDOM(({ root }) => {
    let allowed = true;
    const calls = [];
    const guard = new PlaybackGuard({ canInteract: () => allowed });
    guard.attach({ pauseVideo: () => calls.push('pause'), playVideo: () => calls.push('play') });
    guard.resume();

    const yt = createYouTube({ canInteract: () => allowed, guard });
    yt.mount(root);

    const overlay = root.querySelector('[data-yt-blink-overlay]');
    assert.ok(overlay);
    assert.equal(overlay.hidden, true);

    // Look away pauses and shows overlay
    yt.attentionPause({ type: 'look-away', reason: 'head-turned-left' });
    assert.equal(overlay.hidden, false);

    // Look back auto-resumes and hides overlay
    assert.equal(yt.attentionResume(), true);
    assert.equal(overlay.hidden, true);

    yt.dispose();
  });
});

/* -------------------------------------------------------------------------
   2. BSOD COMPONENT TESTS
   ------------------------------------------------------------------------- */

test('bsod: mounts, shows, hides, and handles accessibility attributes properly', () => {
  runWithDOM(({ root }) => {
    const time = fakeClock();
    const bsod = createBSOD({ timers: time.timers });

    assert.equal(bsod.isShowing(), false);
    assert.equal(bsod.isVisible(), false);

    bsod.mount(root);
    assert.ok(bsod.element);
    assert.equal(bsod.element.getAttribute('role'), 'alertdialog');
    assert.equal(bsod.element.getAttribute('aria-modal'), 'true');
    assert.equal(bsod.element.hidden, true);
    assert.equal(bsod.element.inert, true);
    assert.equal(bsod.isShowing(), false);

    // Idempotent mount: does not duplicate DOM node
    bsod.mount(root);
    assert.equal(root.children.length, 1);

    // Show
    bsod.show();
    assert.equal(bsod.isShowing(), true);
    assert.equal(bsod.isVisible(), true);
    assert.equal(bsod.element.hidden, false);
    assert.equal(bsod.element.inert, false);

    // Hide
    bsod.hide();
    assert.equal(bsod.isShowing(), false);
    assert.equal(bsod.isVisible(), false);
    assert.equal(bsod.element.hidden, true);
    assert.equal(bsod.element.inert, true);

    bsod.dispose();
    assert.equal(root.children.length, 0);
  });
});

test('bsod: dismisses on Escape key when showing, but not when hidden', () => {
  runWithDOM(({ root, mockWindow }) => {
    let dismissCount = 0;
    const bsod = createBSOD({ onDismiss: () => { dismissCount++; } });
    bsod.mount(root);

    // When hidden, Escape does nothing
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(dismissCount, 0);
    assert.equal(bsod.isShowing(), false);

    // When showing, Escape triggers dismissal and hides BSOD
    bsod.show();
    assert.equal(bsod.isShowing(), true);

    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(dismissCount, 1);
    assert.equal(bsod.isShowing(), false);

    // Subsequent Escape when already dismissed has no effect
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault() {},
      stopPropagation() {},
    });
    assert.equal(dismissCount, 1);

    bsod.dispose();
  });
});

test('bsod: dismiss button, hidden spot, and emoticon trigger dismissal', () => {
  runWithDOM(({ root }) => {
    let dismissCount = 0;
    const bsod = createBSOD({ onDismiss: () => { dismissCount++; } });
    bsod.mount(root);

    // 1. Dismiss button
    bsod.show();
    const btn = bsod.element.querySelector('.bsod-dismiss-btn');
    assert.ok(btn);
    btn.dispatchEvent({ type: 'click' });
    assert.equal(dismissCount, 1);
    assert.equal(bsod.isShowing(), false);

    // 2. Hidden spot click
    bsod.show();
    const hiddenSpot = bsod.element.querySelector('.bsod-hidden-spot');
    assert.ok(hiddenSpot);
    hiddenSpot.dispatchEvent({ type: 'click' });
    assert.equal(dismissCount, 2);
    assert.equal(bsod.isShowing(), false);

    // 3. Emoticon click
    bsod.show();
    const emoticon = bsod.element.querySelector('.bsod-emoticon');
    assert.ok(emoticon);
    emoticon.dispatchEvent({ type: 'click' });
    assert.equal(dismissCount, 3);
    assert.equal(bsod.isShowing(), false);

    // 4. Emoticon Enter key
    bsod.show();
    emoticon.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault() {} });
    assert.equal(dismissCount, 4);
    assert.equal(bsod.isShowing(), false);

    bsod.dispose();
  });
});

test('bsod: supports theme adaptability and exported aliases', () => {
  runWithDOM(({ root }) => {
    assert.equal(typeof createBsod, 'function');
    assert.equal(createBsod, createBSOD);

    const bsod = createBsod({ theme: 'win95' });
    bsod.mount(root);
    assert.equal(bsod.element.dataset.theme, 'win95');

    bsod.setTheme('xp');
    assert.equal(bsod.element.dataset.theme, 'xp');

    bsod.show('win11');
    assert.equal(bsod.element.dataset.theme, 'win11');

    bsod.dispose();
  });
});

/* -------------------------------------------------------------------------
   3. WORK PERSONAS TESTS
   ------------------------------------------------------------------------- */

test('personas: PERSONAS registry defines all 4 required personas with correct metadata', () => {
  const expectedKeys = ['accountant', 'developer', 'designer', 'pm'];
  assert.deepEqual(Object.keys(PERSONAS), expectedKeys);

  // Accountant
  assert.equal(PERSONAS.accountant.id, 'accountant');
  assert.equal(PERSONAS.accountant.name, 'Accountant');
  assert.equal(PERSONAS.accountant.badge, 'Excel');
  assert.equal(typeof PERSONAS.accountant.render, 'function');

  // Developer
  assert.equal(PERSONAS.developer.id, 'developer');
  assert.equal(PERSONAS.developer.name, 'Developer');
  assert.equal(PERSONAS.developer.badge, 'VS Code');
  assert.equal(typeof PERSONAS.developer.render, 'function');

  // Designer
  assert.equal(PERSONAS.designer.id, 'designer');
  assert.equal(PERSONAS.designer.name, 'Designer');
  assert.equal(PERSONAS.designer.badge, 'Figma');
  assert.equal(typeof PERSONAS.designer.render, 'function');

  // PM
  assert.equal(PERSONAS.pm.id, 'pm');
  assert.match(PERSONAS.pm.name, /PM/);
  assert.equal(PERSONAS.pm.badge, 'Jira');
  assert.equal(typeof PERSONAS.pm.render, 'function');
});

test('personas: standalone render functions produce authentic software interfaces', () => {
  // Accountant produces Excel spreadsheet
  const accountantHTML = renderAccountant();
  assert.match(accountantHTML, /excel-view|accountant-view/);
  assert.match(accountantHTML, /work-sheet/);
  assert.match(accountantHTML, /formula-bar/);

  // Developer produces VS Code interface
  const devHTML = renderDeveloper('main.rs');
  assert.match(devHTML, /developer-view/);
  assert.match(devHTML, /vsc-workspace/);
  assert.match(devHTML, /cargo check/);

  // Designer produces Figma interface with Hero_Banner specs
  const designerHTML = renderDesigner();
  assert.match(designerHTML, /designer-view/);
  assert.match(designerHTML, /figma-workspace/);
  assert.match(designerHTML, /Hero_Banner_FINAL_v2_edit_แก้รอบ3\.png/);

  // PM produces Jira Kanban board with Sprint 42 tasks
  const pmHTML = renderPM();
  assert.match(pmHTML, /pm-view/);
  assert.match(pmHTML, /jira-board|kanban-columns/);
  assert.match(pmHTML, /EP-402|OAuth2\.0/);
});

test('work view: switches correctly between Accountant, Developer, Designer, and PM', () => {
  runWithDOM(({ root, mockDocument }) => {
    const work = createWorkView();
    work.mount(root);
    work.show();

    // 1. Initial default persona is Accountant
    assert.equal(work.getPersona(), 'accountant');
    assert.ok(root.querySelector('.accountant-view'));
    assert.equal(mockDocument.title, PERSONAS.accountant.windowTitle);

    // 2. Switch to Developer persona
    work.setPersona('developer');
    assert.equal(work.getPersona(), 'developer');
    assert.ok(root.querySelector('.developer-view'));
    assert.equal(mockDocument.title, PERSONAS.developer.windowTitle);

    // Check switcher tab active state
    const devTab = root.querySelector('.persona-tab-btn[data-persona="developer"]');
    assert.ok(devTab);
    assert.equal(devTab.classList.contains('active'), true);
    assert.equal(devTab.getAttribute('aria-selected'), 'true');

    // 3. Switch to Designer persona
    work.setPersona('designer');
    assert.equal(work.getPersona(), 'designer');
    assert.ok(root.querySelector('.designer-view'));
    assert.equal(mockDocument.title, PERSONAS.designer.windowTitle);

    const designerTab = root.querySelector('.persona-tab-btn[data-persona="designer"]');
    assert.ok(designerTab);
    assert.equal(designerTab.classList.contains('active'), true);

    // 4. Switch to PM persona
    work.setPersona('pm');
    assert.equal(work.getPersona(), 'pm');
    assert.ok(root.querySelector('.pm-view'));
    assert.equal(mockDocument.title, PERSONAS.pm.windowTitle);

    const pmTab = root.querySelector('.persona-tab-btn[data-persona="pm"]');
    assert.ok(pmTab);
    assert.equal(pmTab.classList.contains('active'), true);

    // 5. Switch back to Accountant
    work.setPersona('accountant');
    assert.equal(work.getPersona(), 'accountant');
    assert.ok(root.querySelector('.accountant-view'));

    // 6. Unknown persona ID is rejected
    work.setPersona('unsupported-role');
    assert.equal(work.getPersona(), 'accountant');

    work.dispose();
  });
});

test('work view: clicking switcher tab buttons changes active persona via event delegation', () => {
  runWithDOM(({ root, mockDocument }) => {
    const work = createWorkView();
    work.mount(root);
    work.show();

    // Click Developer tab
    const devTabBtn = root.querySelector('.persona-tab-btn[data-persona="developer"]');
    assert.ok(devTabBtn);
    devTabBtn.dispatchEvent({ type: 'click' });

    assert.equal(work.getPersona(), 'developer');
    assert.ok(root.querySelector('.developer-view'));
    assert.equal(mockDocument.title, PERSONAS.developer.windowTitle);

    // Click PM tab
    const pmTabBtn = root.querySelector('.persona-tab-btn[data-persona="pm"]');
    assert.ok(pmTabBtn);
    pmTabBtn.dispatchEvent({ type: 'click' });

    assert.equal(work.getPersona(), 'pm');
    assert.ok(root.querySelector('.pm-view'));
    assert.equal(mockDocument.title, PERSONAS.pm.windowTitle);

    work.dispose();
  });
});

/* -------------------------------------------------------------------------
   4. THEME SUPPORT TESTS
   ------------------------------------------------------------------------- */

test('theme: verifies all 8 theme IDs are valid and supported in session and shell registries', () => {
  const expectedThemeIds = ['win11', 'dark', 'win95', 'xp', 'gov', 'hi5', 'matrix', 'icu'];

  // 1. Session THEMES set contains all 8 IDs
  assert.equal(THEMES.size, 8);
  for (const id of expectedThemeIds) {
    assert.equal(THEMES.has(id), true, `Expected THEMES Set to contain ${id}`);
  }

  // 2. Shell themes registry contains all 8 IDs with labels
  assert.equal(Object.keys(shellThemes).length, 8);
  for (const id of expectedThemeIds) {
    assert.ok(shellThemes[id], `Expected shellThemes to have a title for ${id}`);
    assert.equal(typeof shellThemes[id], 'string');
    assert.notEqual(shellThemes[id].trim(), '');
  }

  // 3. Controller setTheme in LEISURE mode accepts all 8 themes
  const time = fakeClock();
  const session = new SessionController({ clock: time.clock });

  assert.equal(session.theme, 'win11');

  for (const themeId of expectedThemeIds) {
    const success = session.setTheme(themeId);
    assert.equal(success, true, `setTheme should succeed for valid theme ${themeId}`);
    assert.equal(session.theme, themeId);
    assert.equal(session.snapshot().theme, themeId);
  }

  // 4. Invalid themes are rejected
  assert.equal(session.setTheme('macos'), false);
  assert.equal(session.setTheme('ubuntu'), false);
  assert.equal(session.setTheme('solarized-light'), false);
  assert.equal(session.theme, 'icu'); // Last valid theme remains intact

  // 5. In WORK_LOCKED mode, leisure theme switching is disabled
  session.enterWork('manual');
  assert.equal(session.mode, WORK_LOCKED);

  for (const themeId of expectedThemeIds) {
    assert.equal(session.setTheme(themeId), false, `setTheme should fail during work mode for ${themeId}`);
  }
});
