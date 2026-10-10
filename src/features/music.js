import { PausableTimer } from '../core/timers.js';
import { TRACKS, clampVolume, volumePhrase, formatTrackTime } from '../data/tracks.js';

export function createMusicModel({ clock = () => performance.now(), timers, onChange = () => {} } = {}) {
  let state;
  let tickTimer = null;
  let challengeTimer = null;
  let lastTick = clock();
  let disposed = false;
  const options = { clock, timers };
  const initial = (suspended) => ({ suspended, playing: false, trackIndex: 0, elapsed: 0, volume: 35, requestedVolume: 35, library: false, challenge: null, feedback: 'เงียบแบบมีคุณภาพ พร้อมให้บริการ' });
  state = initial(true);
  const interactive = () => !disposed && !state.suspended;
  const getState = () => ({ ...state, track: { ...TRACKS[state.trackIndex] }, challenge: state.challenge ? { ...state.challenge, remaining: challengeTimer?.remaining ?? 0 } : null });
  const emit = () => onChange(getState());
  function advance() {
    const now = clock();
    if (state.playing && !state.suspended) {
      state.elapsed += Math.max(0, now - lastTick) / 1000;
      while (state.elapsed >= TRACKS[state.trackIndex].duration) {
        state.elapsed -= TRACKS[state.trackIndex].duration;
        state.trackIndex = (state.trackIndex + 1) % TRACKS.length;
      }
    }
    lastTick = now;
  }
  function syncTick() {
    if (!interactive() || (!state.playing && !state.challenge)) {
      tickTimer?.cancel();
      tickTimer = null;
      return;
    }
    if (tickTimer) return;
    tickTimer = new PausableTimer(() => {
      tickTimer = null;
      advance();
      emit();
      syncTick();
    }, 250, options);
  }
  function finishChallenge(success, feedback) {
    if (success) state.volume = state.challenge.target;
    state.challenge = null;
    state.feedback = feedback;
    challengeTimer?.cancel();
    challengeTimer = null;
    emit();
    syncTick();
  }
  return {
    getState,
    togglePlay() {
      if (!interactive()) return;
      advance();
      state.playing = !state.playing;
      emit();
      syncTick();
    },
    selectTrack(index) {
      if (!interactive() || !Number.isInteger(index) || index < 0 || index >= TRACKS.length) return;
      advance();
      state.trackIndex = index;
      state.elapsed = 0;
      emit();
    },
    nextTrack() { this.selectTrack((state.trackIndex + 1) % TRACKS.length); },
    setLibrary(value) {
      if (!interactive() || state.challenge) return;
      state.library = Boolean(value);
      state.requestedVolume = state.volume;
      state.feedback = state.library ? 'โหมดห้องสมุด: พิมพ์ให้ดัง ภายใน 10 วินาที' : 'เพิ่มความเงียบได้ตามสบาย';
      emit();
    },
    requestVolume(value) {
      if (!interactive() || state.challenge) return;
      state.requestedVolume = clampVolume(value);
      if (!state.library) state.volume = state.requestedVolume;
      emit();
    },
    startChallenge() {
      if (!interactive() || !state.library || state.challenge || state.requestedVolume === state.volume) return false;
      state.challenge = { target: state.requestedVolume, phrase: volumePhrase(state.requestedVolume), draft: '' };
      state.feedback = 'พิมพ์ให้ตรงกับข้อความ ภายใน 10 วินาที';
      challengeTimer = new PausableTimer(() => {
        challengeTimer = null;
        finishChallenge(false, 'หมดเวลา · คงระดับเดิมไว้ ลองใหม่ได้');
      }, 10000, options);
      emit();
      syncTick();
      return true;
    },
    setChallengeDraft(value) { if (interactive() && state.challenge) { state.challenge.draft = value; emit(); } },
    submitChallenge() {
      if (!interactive() || !state.challenge) return false;
      if (challengeTimer.remaining <= 0) { finishChallenge(false, 'หมดเวลา · คงระดับเดิมไว้ ลองใหม่ได้'); return false; }
      if (state.challenge.draft !== state.challenge.phrase) {
        state.feedback = 'ข้อความยังไม่ตรง · พิมพ์ต่อได้ถ้ายังมีเวลา';
        emit();
        return false;
      }
      finishChallenge(true, 'ขอบคุณที่พิมพ์อย่างสุดเสียง · ยังคงได้ยิน 0%');
      return true;
    },
    cancelChallenge() { if (interactive() && state.challenge) finishChallenge(false, 'ยกเลิกแล้ว · คงระดับเดิมไว้'); },
    suspend() {
      if (disposed || state.suspended) return;
      advance();
      state.suspended = true;
      tickTimer?.pause();
      challengeTimer?.pause();
      emit();
    },
    resume() {
      if (disposed || !state.suspended) return;
      lastTick = clock();
      state.suspended = false;
      tickTimer?.resume();
      challengeTimer?.resume();
      syncTick();
      emit();
    },
    reset() {
      if (disposed) return;
      tickTimer?.cancel();
      challengeTimer?.cancel();
      tickTimer = challengeTimer = null;
      state = initial(state.suspended);
      lastTick = clock();
      emit();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      tickTimer?.cancel();
      challengeTimer?.cancel();
      tickTimer = challengeTimer = null;
    },
  };
}

export function createMusic({ clock, timers, canInteract = () => true, onStatus = () => {} } = {}) {
  let root = null;
  let refs;
  let disposed = false;
  const removers = [];
  const model = createMusicModel({ clock, timers, onChange: render });
  function listen(element, event, callback) {
    const guarded = (e) => { if (canInteract()) callback(e); else if (event === 'submit') e.preventDefault(); };
    element.addEventListener(event, guarded);
    removers.push(() => element.removeEventListener(event, guarded));
  }
  function render(state = model.getState()) {
    if (!root || disposed) return;
    refs.title.textContent = state.track.title;
    refs.artist.textContent = `${state.track.artist} · ${state.track.album}`;
    refs.cover.dataset.cover = state.track.cover;
    refs.play.textContent = state.playing ? 'หยุดความเงียบ' : 'เล่นความเงียบ';
    refs.play.setAttribute('aria-pressed', String(state.playing));
    refs.progress.max = state.track.duration;
    refs.progress.value = state.elapsed;
    refs.time.textContent = `${formatTrackTime(state.elapsed)} / ${formatTrackTime(state.track.duration)}`;
    refs.volume.textContent = `ดัง ${state.volume}% · ได้ยิน 0%`;
    refs.requested.textContent = `${state.requestedVolume}%`;
    refs.range.value = state.requestedVolume;
    refs.library.checked = state.library;
    refs.range.disabled = Boolean(state.challenge);
    refs.library.disabled = Boolean(state.challenge);
    refs.challengeStart.hidden = !state.library;
    refs.challengeStart.disabled = Boolean(state.challenge) || state.requestedVolume === state.volume;
    refs.challenge.hidden = !state.challenge;
    refs.feedback.textContent = state.feedback;
    if (state.challenge) {
      refs.phrase.textContent = state.challenge.phrase;
      refs.remaining.textContent = `เหลือ ${(state.challenge.remaining / 1000).toFixed(1)} วินาที`;
      if (refs.draft.value !== state.challenge.draft) refs.draft.value = state.challenge.draft;
    } else refs.draft.value = '';
    refs.trackButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === state.trackIndex)));
  }
  return {
    mount(container) {
      if (root || disposed) return;
      root = container.ownerDocument.createElement('section');
      root.className = 'feature music-feature';
      root.innerHTML = `
        <div class="feature-heading"><div><p class="feature-kicker">NO-FI / เงียบแบบมีคุณภาพ</p><h2>เพลงเงียบ</h2><p class="muted">เพลงสำหรับคนที่อยากฟัง แต่ไม่อยากได้ยิน</p></div><span class="silent-badge">SILENT · 0 dB</span></div>
        <div class="music-layout"><section class="panel silent-player" aria-label="เครื่องเล่นเพลงเงียบ"><div class="album-cover" data-music="cover" data-cover="rain" role="img" aria-label="ปกอัลบั้ม NO-FI"><span class="album-label">วงไม่มีเสียง</span><strong>NO<br>FI<span class="album-period">.</span></strong><span class="album-caption">SOUND OF ABSOLUTELY NOTHING</span></div><h3 data-music="title"></h3><p class="muted" data-music="artist"></p><progress data-music="progress" aria-label="ความคืบหน้าเพลง" max="183" value="0"></progress><p class="muted player-time" data-music="time"></p><div class="feature-actions player-actions"><button class="button button-primary" data-music="play" type="button">เล่นความเงียบ</button><button class="button" data-music="next" type="button">เพลงถัดไป →</button></div><p class="volume-readout" data-music="volume" aria-live="polite"></p></section>
        <aside class="music-sidebar"><section class="panel playlist"><h3>เงียบแบบมีคุณภาพ</h3><p class="muted">3 เพลง · ไม่มีเสียงทุกเพลง</p><ol data-music="tracks" class="track-list"></ol></section><section class="panel volume-panel"><h3>เพิ่มความเงียบ</h3><label class="volume-label" for="music-volume">ระดับที่ต้องการ <output data-music="requested" for="music-volume"></output></label><input id="music-volume" data-music="range" type="range" min="0" max="100" value="35"><label class="check-field"><input data-music="library" type="checkbox"> โหมดห้องสมุด</label><p class="muted">ในห้องสมุด ต้องพิมพ์เพื่อปรับระดับภายใน 10 วินาที</p><button class="button button-primary" data-music="start" type="button" hidden>พิมพ์ให้ดัง</button></section></aside></div>
        <section class="panel typing-challenge" data-music="challenge" aria-labelledby="music-challenge-title" hidden><div class="feature-heading"><h3 id="music-challenge-title">พิมพ์ให้ดัง</h3><span class="challenge-countdown" data-music="remaining" role="timer"></span></div><p class="challenge-phrase" data-music="phrase" id="music-challenge-phrase"></p><form data-music="challenge-form"><label for="music-challenge-draft">พิมพ์ข้อความด้านบนให้ตรง</label><textarea id="music-challenge-draft" class="field" data-music="draft" rows="2" autocomplete="off" spellcheck="false" aria-describedby="music-challenge-phrase"></textarea><div class="feature-actions"><button class="button button-primary" type="submit">ยืนยันระดับเสียง</button><button class="button" data-music="cancel" type="button">ยกเลิก</button></div></form></section><p class="feature-feedback" data-music="feedback" role="status"></p>`;
      container.append(root);
      const q = (name) => root.querySelector(`[data-music="${name}"]`);
      const trackButtons = TRACKS.map((track, index) => {
        const item = root.ownerDocument.createElement('li');
        const button = root.ownerDocument.createElement('button');
        button.type = 'button';
        button.className = 'track-button';
        const title = root.ownerDocument.createElement('strong');
        title.textContent = `${String(index + 1).padStart(2, '0')}  ${track.title}`;
        const subtitle = root.ownerDocument.createElement('span');
        subtitle.className = 'muted';
        subtitle.textContent = `${track.artist} · ${formatTrackTime(track.duration)}`;
        button.append(title, subtitle);
        item.append(button);
        q('tracks').append(item);
        listen(button, 'click', () => model.selectTrack(index));
        return button;
      });
      refs = { title: q('title'), artist: q('artist'), cover: q('cover'), play: q('play'), progress: q('progress'), time: q('time'), volume: q('volume'), requested: q('requested'), range: q('range'), library: q('library'), challengeStart: q('start'), challenge: q('challenge'), feedback: q('feedback'), phrase: q('phrase'), remaining: q('remaining'), draft: q('draft'), trackButtons };
      listen(refs.play, 'click', () => { model.togglePlay(); onStatus('เพลงเงียบ · ได้ยิน 0%'); });
      listen(q('next'), 'click', () => model.nextTrack());
      listen(refs.range, 'input', () => model.requestVolume(refs.range.value));
      listen(refs.library, 'change', () => model.setLibrary(refs.library.checked));
      listen(refs.challengeStart, 'click', () => { if (model.startChallenge()) refs.draft.focus(); });
      listen(refs.draft, 'input', () => model.setChallengeDraft(refs.draft.value));
      listen(q('challenge-form'), 'submit', (event) => { event.preventDefault(); model.submitChallenge(); });
      listen(q('cancel'), 'click', () => model.cancelChallenge());
      render();
    },
    suspend() { model.suspend(); },
    resume() { if (root && !disposed) model.resume(); },
    reset() { model.reset(); },
    getState: model.getState,
    dispose() { if (disposed) return; disposed = true; model.dispose(); removers.splice(0).forEach((remove) => remove()); root?.remove(); refs = null; },
  };
}
