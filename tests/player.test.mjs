import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackGuard, extractVideoId } from '../src/features/youtube.js';
import { validateWebURL } from '../src/features/browser.js';

test('pause on tab/work/blink; resume never plays or changes mute', () => {
  const calls = [];
  let allowed = true;
  const guard = new PlaybackGuard({ canInteract: () => allowed });
  guard.attach({ pauseVideo: () => calls.push('pause'), playVideo: () => calls.push('play'), mute: () => calls.push('mute'), unMute: () => calls.push('unmute') });
  guard.resume(); guard.play(); guard.pause(); guard.resume();
  assert.deepEqual(calls, ['pause', 'play', 'pause']);
  guard.setMute(true); guard.suspend(); guard.resume();
  assert.equal(guard.muted, true);
  assert.equal(calls.filter((call) => call === 'mute').length, 1);
  assert.equal(calls.includes('unmute'), false);
  allowed = false;
  assert.equal(guard.play(), false);
  guard.onPlaying();
  assert.equal(calls.at(-1), 'pause');
});

test('video parsing rejects hostile and malformed URLs', () => {
  for (const input of ['dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=42', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(extractVideoId(input), 'dQw4w9WgXcQ');
  for (const input of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://evil.test/dQw4w9WgXcQ', 'bad-id']) assert.equal(extractVideoId(input), null);
});

test('web launcher accepts http/s only and rejects embedded credentials', () => {
  assert.equal(validateWebURL('https://example.org'), 'https://example.org/');
  for (const input of ['file:///C:/secrets', 'javascript:alert(1)', 'data:text/html,hello', 'https://user:password@example.org']) assert.equal(validateWebURL(input), null);
});
