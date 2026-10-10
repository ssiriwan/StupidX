import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackGuard, extractVideoId, createYouTube } from '../src/features/youtube.js';
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

test('attentionResume auto-plays when locked due to look-away or blink, but never resumes manual pause', () => {
  const calls = [];
  let allowed = true;
  const mockPlayer = {
    pauseVideo: () => calls.push('pause'),
    playVideo: () => calls.push('play'),
  };
  const guard = new PlaybackGuard({ canInteract: () => allowed });
  guard.attach(mockPlayer);
  guard.resume();
  calls.length = 0; // reset attach pause

  const yt = createYouTube({ canInteract: () => allowed, guard });

  // 1. Initially not locked
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(yt.attentionResume(), false);
  assert.equal(calls.includes('play'), false);

  // 2. Look-away pauses and locks video
  yt.attentionPause({ type: 'look-away', reason: 'head-turned-left' });
  assert.equal(yt.getState().isBlinkLocked, true);
  assert.equal(calls.at(-1), 'pause');

  // 3. Looking back at screen auto-resumes video
  assert.equal(yt.attentionResume(), true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(calls.at(-1), 'play');

  // 4. Blink pauses and locks video
  yt.blinkPause();
  assert.equal(yt.getState().isBlinkLocked, true);
  assert.equal(calls.at(-1), 'pause');

  // 5. Looking back auto-resumes after blink
  assert.equal(yt.attentionResume(), true);
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(calls.at(-1), 'play');

  // 6. User pauses manually
  yt.pause();
  assert.equal(yt.getState().userPaused, true);
  assert.equal(yt.getState().isBlinkLocked, false);
  calls.length = 0;

  // 7. Attention pause does not lock when user has manually paused
  yt.attentionPause({ type: 'look-away', reason: 'gaze-away' });
  assert.equal(yt.getState().isBlinkLocked, false);
  assert.equal(calls.length, 0);

  // 8. Looking back does NOT auto-resume when user had paused manually
  assert.equal(yt.attentionResume(), false);
  assert.equal(calls.length, 0);

  // 9. If user plays manually, auto-resume works again on next lock
  yt.play();
  assert.equal(yt.getState().userPaused, false);
  assert.equal(calls.at(-1), 'play');
  yt.attentionPause({ type: 'look-away' });
  assert.equal(yt.getState().isBlinkLocked, true);

  // 10. When canInteract returns false (e.g. boss/work view), auto-resume does not play
  allowed = false;
  assert.equal(yt.attentionResume(), false);
  assert.equal(yt.getState().isBlinkLocked, true);
});
