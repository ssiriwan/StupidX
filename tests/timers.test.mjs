import test from 'node:test';
import assert from 'node:assert/strict';
import { PausableTimer } from '../src/core/timers.js';
import { fakeClock } from './helpers/fake-clock.mjs';

test('paused deadline retains time across a long work session and fires once', () => {
  const time = fakeClock();
  let calls = 0;
  const timer = new PausableTimer(() => calls++, 10000, time);
  time.advance(3700);
  timer.pause(); timer.pause();
  assert.equal(timer.remaining, 6300);
  time.advance(60000);
  assert.equal(calls, 0);
  timer.resume(); timer.resume();
  time.advance(6299);
  assert.equal(calls, 0);
  time.advance(1);
  assert.equal(calls, 1);
  timer.resume(); time.advance(60000);
  assert.equal(calls, 1);
  assert.equal(time.pending(), 0);
});

test('cancel clears active and suspended timers', () => {
  const time = fakeClock();
  const timer = new PausableTimer(() => assert.fail('cancelled timer fired'), 10, time);
  timer.pause(); timer.cancel(); timer.resume();
  time.advance(100);
  assert.equal(time.pending(), 0);
});
