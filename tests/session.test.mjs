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
