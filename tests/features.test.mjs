import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAI, createAIModel } from '../src/features/ai.js';
import { createMusic, createMusicModel } from '../src/features/music.js';
import { lazyReply, passesBotCaptcha, BOT_LINES } from '../src/data/bot-lines.js';
import { TRACKS, volumePhrase } from '../src/data/tracks.js';

function fakeClock() {
  let time = 0;
  let sequence = 0;
  const pending = new Map();
  return {
    clock: () => time,
    timers: {
      setTimeout(callback, delay) { const id = ++sequence; pending.set(id, { at: time + delay, callback }); return id; },
      clearTimeout(id) { pending.delete(id); },
    },
    advance(ms) {
      const end = time + ms;
      while (true) {
        const next = [...pending].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        pending.delete(next[0]);
        time = next[1].at;
        next[1].callback();
      }
      time = end;
    },
    pending: () => pending.size,
  };
}

test('lazy replies recognize intended keywords and retain a useful fallback joke', () => {
  assert.equal(lazyReply('ช่วยสรุปงานให้หน่อย'), 'สรุปแล้วครับ: งานยังไม่เสร็จ');
  assert.equal(lazyReply('ช่วยเขียนโค้ดให้หน่อย'), 'ลองปิดแล้วเปิดใจใหม่ครับ');
  assert.equal(lazyReply('ต้องรีบส่งงานแล้ว'), 'ผมเข้าใจความเร่งด่วนครับ แต่ไม่อยากมีส่วนร่วม');
  assert.match(lazyReply('วันนี้อากาศดี'), /ยังไม่ทำ/);
});

test('AI prevents duplicate sends and freezes the pending reply while keeping another draft', () => {
  const time = fakeClock();
  const ai = createAIModel(time);
  ai.resume();
  ai.setDraft('ช่วยสรุปงาน');
  assert.equal(ai.send(), true);
  assert.equal(ai.send(), false);
  time.advance(500);
  ai.setDraft('คำถามถัดไปที่ยังไม่ส่ง');
  ai.suspend('work');
  ai.suspend('work');
  assert.equal(time.pending(), 0);
  time.advance(60000);
  assert.equal(ai.getState().pending, true);
  assert.equal(ai.getState().history.length, 2);
  assert.equal(ai.getState().draft, 'คำถามถัดไปที่ยังไม่ส่ง');
  ai.resume();
  ai.resume();
  assert.equal(time.pending(), 1);
  time.advance(799);
  assert.equal(ai.getState().pending, true);
  time.advance(1);
  assert.equal(ai.getState().pending, false);
  assert.equal(ai.getState().history.at(-1).text, 'สรุปแล้วครับ: งานยังไม่เสร็จ');
  ai.dispose();
});

test('CAPTCHA checks binary and cookies; wrong attempts remain retryable', () => {
  assert.equal(passesBotCaptcha('1101', false), false);
  assert.equal(passesBotCaptcha('13', true), false);
  const time = fakeClock();
  const ai = createAIModel(time);
  ai.resume();
  ai.setView('gate');
  ai.setCaptchaDraft('13');
  ai.setCookies(true);
  assert.equal(ai.submitCaptcha(), false);
  assert.match(ai.getState().captchaError, /ความเป็นมนุษย์สูง/);
  ai.suspend();
  time.advance(20000);
  assert.equal(ai.getState().captchaDraft, '13');
  assert.equal(ai.getState().cookies, true);
  assert.equal(ai.getState().view, 'gate');
  ai.resume();
  ai.setCaptchaDraft('1101');
  assert.equal(ai.submitCaptcha(), true);
  assert.equal(ai.getState().view, 'room');
  assert.equal(ai.getState().captchaError, '');
  assert.equal(ai.getState().roomLines[0].name, 'ChatLazy');
  ai.dispose();
});

test('bot room retains the script position and remaining delay across work and chat views', () => {
  const time = fakeClock();
  const ai = createAIModel(time);
  ai.resume();
  ai.setCaptchaDraft('1101');
  ai.setCookies(true);
  ai.submitCaptcha();
  time.advance(600);
  ai.suspend();
  time.advance(10000);
  assert.equal(ai.getState().view, 'room');
  assert.equal(ai.getState().roomLines.length, 1);
  ai.resume();
  time.advance(1099);
  assert.equal(ai.getState().roomLines.length, 1);
  time.advance(1);
  assert.equal(ai.getState().roomLines[1].name, 'CodeNap');
  ai.setView('chat');
  time.advance(20000);
  assert.equal(ai.getState().roomLines.length, 2);
  ai.setView('room');
  time.advance(1700 * BOT_LINES.length);
  assert.deepEqual(ai.getState().roomLines, BOT_LINES);
  assert.equal(time.pending(), 0);
  ai.dispose();
});

test('reset preserves suspension and cancels old replies instead of leaking them into the new chat', () => {
  const time = fakeClock();
  const ai = createAIModel(time);
  ai.resume();
  ai.setDraft('งานเก่า');
  ai.send();
  ai.suspend();
  ai.reset();
  assert.equal(ai.getState().suspended, true);
  ai.resume();
  time.advance(20000);
  assert.equal(ai.getState().history.length, 1);
  assert.equal(time.pending(), 0);
  ai.dispose();
  ai.dispose();
});

test('silent music progresses, preserves its position during work, then changes tracks', () => {
  const time = fakeClock();
  const music = createMusicModel(time);
  music.resume();
  music.togglePlay();
  time.advance(2250);
  assert.equal(music.getState().elapsed, 2.25);
  music.suspend('work');
  music.suspend('work');
  time.advance(60000);
  assert.equal(music.getState().elapsed, 2.25);
  music.resume();
  music.resume();
  assert.equal(time.pending(), 1);
  time.advance(750);
  assert.equal(music.getState().elapsed, 3);
  music.nextTrack();
  assert.equal(music.getState().track.id, TRACKS[1].id);
  assert.equal(music.getState().elapsed, 0);
  music.togglePlay();
  time.advance(5000);
  assert.equal(music.getState().elapsed, 0);
  assert.equal(time.pending(), 0);
  music.dispose();
});

test('playlist advances automatically and wraps while staying silent', () => {
  const time = fakeClock();
  const music = createMusicModel(time);
  music.resume();
  const lastIndex = TRACKS.length - 1;
  music.selectTrack(lastIndex);
  music.togglePlay();
  time.advance(TRACKS[lastIndex].duration * 1000 + 500);
  assert.equal(music.getState().trackIndex, 0);
  assert.equal(music.getState().elapsed, .5);
  music.dispose();
});

test('library challenge freezes draft/deadline; success commits volume only after exact typing', () => {
  const time = fakeClock();
  const music = createMusicModel(time);
  music.resume();
  music.setLibrary(true);
  music.requestVolume(100);
  assert.equal(music.getState().volume, 35);
  assert.equal(music.startChallenge(), true);
  time.advance(3500);
  music.setChallengeDraft('ข้าพเจ้า');
  music.suspend('work');
  time.advance(60000);
  assert.equal(music.getState().challenge.remaining, 6500);
  assert.equal(music.getState().challenge.draft, 'ข้าพเจ้า');
  assert.equal(music.getState().volume, 35);
  music.resume();
  time.advance(6000);
  assert.equal(music.submitChallenge(), false);
  assert.equal(music.getState().volume, 35);
  music.setChallengeDraft(music.getState().challenge.phrase);
  assert.equal(music.submitChallenge(), true);
  assert.equal(music.getState().volume, 100);
  assert.equal(music.getState().challenge, null);
  assert.equal(time.pending(), 0);
  music.dispose();
});

test('challenge timeout and cancel preserve old volume; lower levels have shorter text and can retry', () => {
  const lengths = [25, 50, 75, 100].map((level) => volumePhrase(level).length);
  assert.ok(lengths.every((length, index) => index === 0 || length > lengths[index - 1]));
  const time = fakeClock();
  const music = createMusicModel(time);
  music.resume();
  music.setLibrary(true);
  // Volume decrease from 35 to 10 is instant without challenge
  music.requestVolume(10);
  assert.equal(music.getState().volume, 10);
  // Volume increase from 10 to 90 triggers challenge
  music.requestVolume(90);
  assert.equal(music.getState().volume, 10);
  assert.equal(music.getState().requestedVolume, 90);
  assert.equal(music.startChallenge(), true);
  time.advance(10000);
  assert.equal(music.getState().volume, 10);
  assert.equal(music.getState().requestedVolume, 10);
  assert.equal(music.getState().challenge, null);
  assert.match(music.getState().feedback, /หมดเวลา/);
  music.requestVolume(90);
  assert.equal(music.startChallenge(), true);
  music.cancelChallenge();
  assert.equal(music.getState().volume, 10);
  assert.equal(music.getState().requestedVolume, 10);
  music.requestVolume(90);
  assert.equal(music.startChallenge(), true);
  music.setChallengeDraft(music.getState().challenge.phrase);
  assert.equal(music.submitChallenge(), true);
  assert.equal(music.getState().volume, 90);
  assert.equal(music.getState().requestedVolume, 90);
  music.dispose();
});

test('music reset and disposal cancel playback and challenge deadlines without restarting suspended work', () => {
  const time = fakeClock();
  const music = createMusicModel(time);
  music.resume();
  music.togglePlay();
  music.setLibrary(true);
  music.requestVolume(100);
  music.startChallenge();
  music.suspend();
  music.reset();
  assert.equal(music.getState().suspended, true);
  music.resume();
  time.advance(20000);
  assert.equal(music.getState().playing, false);
  assert.equal(music.getState().elapsed, 0);
  assert.equal(music.getState().volume, 35);
  assert.equal(time.pending(), 0);
  music.togglePlay();
  music.dispose();
  music.dispose();
  music.resume();
  assert.equal(time.pending(), 0);
});

test('feature factories do not start timers before mount; music contains no audio creation path', async () => {
  const time = fakeClock();
  const ai = createAI(time);
  const music = createMusic(time);
  ai.resume();
  music.resume();
  assert.equal(time.pending(), 0);
  ai.dispose();
  music.dispose();
  const source = await readFile(new URL('../src/features/music.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<audio\b|<source\b|AudioContext|new\s+Audio\b|createElement\(['"]audio['"]\)/i);
});
