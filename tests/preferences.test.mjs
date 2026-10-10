import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences, savePreferences } from '../src/core/preferences.js';
import { SessionController } from '../src/core/session.js';

test('OS, subtheme and resume policy survive storage round trip', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const session = new SessionController();
  session.setOS('xp'); session.setSubtheme('matrix'); session.setResumePolicy('manual');
  assert.equal(savePreferences(storage, session.snapshot()), true);
  const restored = new SessionController({ preferences: loadPreferences(storage) });
  assert.deepEqual([restored.os, restored.subtheme, restored.resumePolicy], ['xp', 'matrix', 'manual']);
  assert.equal(restored.setResumePolicy('invalid'), false);
  restored.enterWork();
  assert.equal(restored.setResumePolicy('auto'), false);
  restored.reset();
  assert.equal(restored.resumePolicy, 'auto');
});

test('malformed or unavailable storage keeps usable defaults', () => {
  const defaults = { os: 'win11', subtheme: 'default', resumePolicy: 'auto' };
  for (const value of ['{broken', 'null', '42', '{"os":"bad","subtheme":"xp","resumePolicy":"bad"}']) {
    assert.deepEqual(loadPreferences({ getItem: () => value }), defaults);
  }
  const unavailable = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(loadPreferences(unavailable), defaults);
  assert.equal(savePreferences(unavailable, defaults), false);
  assert.equal(savePreferences(undefined, defaults), false);
});
