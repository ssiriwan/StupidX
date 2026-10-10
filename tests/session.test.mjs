import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionController, LEISURE, WORK_LOCKED, WORK_READY, ignoresShortcut } from '../src/core/session.js';
import { fakeClock } from './helpers/fake-clock.mjs';

function setup(hooks = {}) {
  const time = fakeClock();
  const session = new SessionController({ clock: time.clock, ...hooks });
  const person = (present, extra = {}) => session.observePerson({ present, available: true, calibrated: true, observedAt: time.clock(), ...extra });
  return { time, session, person };
}

test('person entry conceals synchronously; 2 seconds fresh clear unlocks only manual return', () => {
  const modes = [];
  const { time, session, person } = setup({ onMode: (mode) => modes.push(mode) });
  person(true);
  assert.equal(session.mode, WORK_LOCKED);
  assert.equal(session.requestReturn(), false);
  person(false);
  for (let i = 0; i < 19; i++) { time.advance(100); person(false); }
  assert.equal(session.requestReturn(), false);
  time.advance(100); person(false);
  assert.equal(session.mode, WORK_READY);
  assert.equal(session.mode !== LEISURE, true);
  assert.equal(session.requestReturn(), true);
  assert.deepEqual(modes, [WORK_LOCKED, WORK_READY, LEISURE]);
});

test('renewed person resets safe window and rejects every return path', () => {
  const { time, session, person } = setup();
  person(true); person(false);
  time.advance(1000); person(false);
  person(true);
  assert.equal(session.requestReturn({ acknowledgeUnknown: true }), false);
  time.advance(10); person(false);
  time.advance(1000); person(false);
  assert.equal(session.mode, WORK_LOCKED);
  time.advance(1000); person(false);
  assert.equal(session.mode, WORK_READY);
});

test('stale, unavailable, uncalibrated or interrupted observations never count as clear', () => {
  const { time, session, person } = setup();
  person(true); person(false);
  time.advance(2100); session.tick();
  assert.equal(session.mode, WORK_LOCKED);
  assert.equal(session.snapshot().unknown, true);
  person(false); time.advance(1000); person(false, { available: false });
  time.advance(1000); person(false, { calibrated: false });
  assert.equal(session.mode, WORK_LOCKED);
  person(false); time.advance(1000); person(false);
  assert.equal(session.requestReturn(), false);
});

test('manual panic survives callbacks, theme/tab/eyes and requires explicit return', () => {
  const { time, session, person } = setup();
  session.setTab('music'); session.setTheme('xp');
  session.enterWork('manual');
  person(false);
  session.observeBlink({ closed: true }); session.observeBlink({ closed: false });
  assert.equal(session.setTab('ai'), false);
  assert.equal(session.setTheme('win95'), false);
  assert.equal(session.activeTab, 'music');
  assert.equal(session.theme, 'xp');
  assert.equal(session.reason, 'manual');
  time.advance(1000); person(false); time.advance(1000); person(false);
  assert.equal(session.mode, WORK_READY);
  assert.equal(session.requestReturn(), true);
});

test('unknown camera requires deliberate acknowledged manual action', () => {
  const { session } = setup();
  session.enterWork();
  assert.equal(session.requestReturn(), false);
  assert.equal(session.requestReturn({ acknowledgeUnknown: true }), true);
});

test('blink counts only open to closed transitions and never supplies a play event', () => {
  let pauses = 0;
  const { session } = setup({ onBlink: () => pauses++ });
  session.observeBlink({ closed: true }); session.observeBlink({ closed: true });
  session.observeBlink({ closed: false });
  assert.equal(pauses, 1);
  session.observeBlink({ closed: true });
  assert.equal(pauses, 2);
  assert.equal(session.blinkCount, 2);
});

test('late and future sensor completions do not override threat', () => {
  const { time, session, person } = setup();
  time.advance(100); person(true);
  session.observePerson({ available: true, calibrated: true, present: false, observedAt: 99 });
  session.observePerson({ available: true, calibrated: true, present: false, observedAt: 101 });
  assert.equal(session.snapshot().present, true);
});

test('sensor source changes restart clear interval', () => {
  const { time, session, person } = setup();
  person(true); person(false); time.advance(1000);
  person(false, { source: 'simulation' }); time.advance(1000);
  person(false, { source: 'simulation' });
  assert.equal(session.mode, WORK_LOCKED);
});

test('shortcuts ignore inputs, contenteditable, IME and held/modifier keys', () => {
  for (const event of [{ isComposing: true }, { keyCode: 229 }, { repeat: true }, { ctrlKey: true }, { target: { isContentEditable: true } }, { target: { closest: () => ({}) } }]) assert.equal(ignoresShortcut(event), true);
  assert.equal(ignoresShortcut({ target: { closest: () => null } }), false);
});

test('session accepts all 8 themes and rejects invalid themes', () => {
  const { session } = setup();
  const allThemes = ['win11', 'dark', 'win95', 'xp', 'gov', 'hi5', 'matrix', 'icu'];
  for (const t of allThemes) {
    assert.equal(session.setTheme(t), true);
    assert.equal(session.theme, t);
    assert.equal(session.snapshot().theme, t);
  }
  assert.equal(session.setTheme('nonexistent-theme'), false);
  assert.equal(session.theme, 'icu');
});

test('BSOD cannot be triggered in Leisure mode; triggers and snapshots properly in Work mode', () => {
  const { session } = setup();
  assert.equal(session.triggerBsod(), false);
  assert.equal(session.bsod, false);
  assert.equal(session.snapshot().bsod, false);

  session.enterWork('manual');
  assert.equal(session.triggerBsod(), true);
  assert.equal(session.bsod, true);
  assert.equal(session.snapshot().bsod, true);
  // Idempotent
  assert.equal(session.triggerBsod(), true);

  assert.equal(session.dismissBsod(), true);
  assert.equal(session.bsod, false);
  assert.equal(session.snapshot().bsod, false);
  assert.notEqual(session.mode, LEISURE);

  assert.equal(session.dismissBsod(), false);
});

test('BSOD blocks requestReturn until dismissed; dismissal returns to Work mode', () => {
  const { time, session, person } = setup();
  session.enterWork('manual');
  person(false);
  time.advance(1000);
  person(false);
  time.advance(1000);
  person(false);
  assert.equal(session.mode, WORK_READY);

  session.triggerBsod();
  assert.equal(session.requestReturn(), false);
  assert.equal(session.requestReturn({ acknowledgeUnknown: true }), false);

  session.dismissBsod();
  assert.equal(session.bsod, false);
  assert.equal(session.mode, WORK_READY);
  assert.equal(session.requestReturn(), true);
  assert.equal(session.mode, LEISURE);
});

test('Boss panic hotkey controller simulates b, F8, Escape, and ignores shortcuts inside inputs', () => {
  const { time, session, person } = setup();

  function simulateKey(key, target = {}) {
    const event = {
      key,
      isComposing: false,
      keyCode: 0,
      repeat: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      target: {
        isContentEditable: false,
        closest: (sel) => (target.tag && sel.includes(target.tag) ? target : null),
        ...target,
      },
      preventDefault: () => {},
    };

    if (session.bsod) {
      if (event.key === 'Escape') {
        session.dismissBsod();
      }
      return;
    }

    if (ignoresShortcut(event)) return;

    const isB = event.key.toLowerCase() === 'b';
    const isF8 = event.key === 'F8';

    if (session.mode === LEISURE) {
      if (isB) session.enterWork('manual');
    } else {
      if (isB || isF8) {
        session.triggerBsod();
      } else if (event.key === 'Escape') {
        session.requestReturn();
      }
    }
  }

  // 1. Typing 'b' inside input in Leisure mode does nothing
  simulateKey('b', { tag: 'input' });
  assert.equal(session.mode, LEISURE);

  // 2. Pressing 'b' outside input enters Work mode
  simulateKey('b');
  assert.equal(session.mode, WORK_LOCKED);

  // 3. In Work mode, pressing 'b' triggers BSOD
  simulateKey('b');
  assert.equal(session.bsod, true);

  // 4. While BSOD is visible, pressing Escape dismisses BSOD back to Work mode
  simulateKey('Escape');
  assert.equal(session.bsod, false);
  assert.equal(session.mode, WORK_LOCKED);

  // 5. In Work mode, pressing F8 also triggers BSOD
  simulateKey('F8');
  assert.equal(session.bsod, true);

  // 6. Dismiss BSOD again with Escape
  simulateKey('Escape');
  assert.equal(session.bsod, false);
  assert.equal(session.mode, WORK_LOCKED);

  // 7. Make safe and press Escape in Work mode -> returns to Leisure
  person(false);
  time.advance(1000);
  person(false);
  time.advance(1000);
  person(false);
  assert.equal(session.mode, WORK_READY);
  simulateKey('Escape');
  assert.equal(session.mode, LEISURE);
});

test('setOS(os) validates valid OSes, rejects invalid OSes, and rejects in work mode', () => {
  const { session } = setup();
  assert.equal(session.os, 'win11');
  assert.equal(session.snapshot().os, 'win11');
  assert.equal(session.subtheme, 'default');
  assert.equal(session.snapshot().subtheme, 'default');

  const validOSes = ['win95', 'xp', 'win11'];
  for (const os of validOSes) {
    assert.equal(session.setOS(os), true);
    assert.equal(session.os, os);
    assert.equal(session.snapshot().os, os);
  }

  for (const invalid of ['macos', 'linux', 'win10', 'windows98', '', null, undefined, 123]) {
    assert.equal(session.setOS(invalid), false);
    assert.equal(session.os, 'win11');
    assert.equal(session.snapshot().os, 'win11');
  }

  session.setOS('win95');
  assert.equal(session.theme, 'win95');
  session.setOS('xp');
  assert.equal(session.theme, 'xp');
  session.setOS('win11');
  assert.equal(session.theme, 'win11');

  session.enterWork('manual');
  assert.notEqual(session.mode, LEISURE);
  assert.equal(session.setOS('win95'), false);
  assert.equal(session.os, 'win11');
  assert.equal(session.snapshot().os, 'win11');
});

test('setSubtheme(subtheme) validates valid subthemes, rejects invalid subthemes, and rejects in work mode', () => {
  const { session } = setup();
  assert.equal(session.subtheme, 'default');
  assert.equal(session.snapshot().subtheme, 'default');

  const validSubthemes = ['default', 'dark', 'gov', 'hi5', 'matrix', 'icu'];
  for (const sub of validSubthemes) {
    assert.equal(session.setSubtheme(sub), true);
    assert.equal(session.subtheme, sub);
    assert.equal(session.snapshot().subtheme, sub);
  }

  session.setSubtheme('matrix');
  assert.equal(session.theme, 'matrix');
  session.setSubtheme('default');
  assert.equal(session.theme, session.os);

  for (const invalid of ['neon', 'cyberpunk', 'retro', 'win11', '', null, undefined, 42]) {
    assert.equal(session.setSubtheme(invalid), false);
    assert.equal(session.subtheme, 'default');
    assert.equal(session.snapshot().subtheme, 'default');
  }

  session.enterWork('manual');
  assert.notEqual(session.mode, LEISURE);
  assert.equal(session.setSubtheme('dark'), false);
  assert.equal(session.subtheme, 'default');
  assert.equal(session.snapshot().subtheme, 'default');
});

test('OS and subtheme state preservation across modes and reset', () => {
  const { time, session, person } = setup();

  assert.equal(session.setOS('xp'), true);
  assert.equal(session.setSubtheme('hi5'), true);
  assert.equal(session.os, 'xp');
  assert.equal(session.subtheme, 'hi5');
  assert.equal(session.snapshot().os, 'xp');
  assert.equal(session.snapshot().subtheme, 'hi5');

  person(true);
  assert.equal(session.mode, WORK_LOCKED);
  assert.equal(session.os, 'xp');
  assert.equal(session.subtheme, 'hi5');
  assert.equal(session.snapshot().os, 'xp');
  assert.equal(session.snapshot().subtheme, 'hi5');

  assert.equal(session.setOS('win95'), false);
  assert.equal(session.setSubtheme('matrix'), false);
  assert.equal(session.os, 'xp');
  assert.equal(session.subtheme, 'hi5');

  person(false);
  time.advance(1000);
  person(false);
  time.advance(1000);
  person(false);
  assert.equal(session.mode, WORK_READY);
  assert.equal(session.requestReturn(), true);
  assert.equal(session.mode, LEISURE);

  assert.equal(session.os, 'xp');
  assert.equal(session.subtheme, 'hi5');
  assert.equal(session.snapshot().os, 'xp');
  assert.equal(session.snapshot().subtheme, 'hi5');

  session.reset();
  assert.equal(session.os, 'win11');
  assert.equal(session.subtheme, 'default');
  assert.equal(session.theme, 'win11');
  assert.equal(session.snapshot().os, 'win11');
  assert.equal(session.snapshot().subtheme, 'default');
});

