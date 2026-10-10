import { PausableTimer } from '../core/timers.js';
import { AI_GREETING, BOT_LINES, lazyReply, passesBotCaptcha } from '../data/bot-lines.js';

export function createAIModel({ clock, timers, onChange = () => {} } = {}) {
  let state;
  let replyTimer = null;
  let roomTimer = null;
  let disposed = false;
  const options = { clock, timers };
  const initial = (suspended) => ({
    suspended, view: 'chat', draft: '', pending: false,
    history: [{ name: 'AI ขี้เกียจ', text: AI_GREETING }],
    captchaDraft: '', cookies: false, captchaError: '', unlocked: false, roomLines: [],
  });
  state = initial(true);
  const emit = () => onChange(getState());
  const getState = () => ({ ...state, history: state.history.map((line) => ({ ...line })), roomLines: state.roomLines.map((line) => ({ ...line })) });
  const interactive = () => !disposed && !state.suspended;
  function scheduleRoom() {
    if (!interactive() || state.view !== 'room' || roomTimer || state.roomLines.length >= BOT_LINES.length) return;
    roomTimer = new PausableTimer(() => {
      roomTimer = null;
      state.roomLines.push({ ...BOT_LINES[state.roomLines.length] });
      emit();
      scheduleRoom();
    }, 1700, options);
  }
  function setView(view) {
    if (!interactive() || !['chat', 'gate', 'room'].includes(view)) return;
    state.view = view === 'room' && !state.unlocked ? 'gate' : view;
    if (state.view === 'room') {
      roomTimer?.resume();
      scheduleRoom();
    } else roomTimer?.pause();
    emit();
  }
  return {
    getState,
    setDraft(value) { if (interactive()) { state.draft = value; emit(); } },
    setCaptchaDraft(value) { if (interactive()) { state.captchaDraft = value; emit(); } },
    setCookies(value) { if (interactive()) { state.cookies = value; emit(); } },
    setView,
    send() {
      if (!interactive() || state.pending || !state.draft.trim()) return false;
      const prompt = state.draft.trim();
      state.history.push({ name: 'คุณ', text: prompt });
      state.draft = '';
      state.pending = true;
      replyTimer = new PausableTimer(() => {
        replyTimer = null;
        state.pending = false;
        state.history.push({ name: 'AI ขี้เกียจ', text: lazyReply(prompt) });
        emit();
      }, 1300, options);
      emit();
      return true;
    },
    submitCaptcha() {
      if (!interactive()) return false;
      if (!passesBotCaptcha(state.captchaDraft, state.cookies)) {
        state.captchaError = 'ตรวจพบความเป็นมนุษย์สูง · ลองใหม่ได้';
        emit();
        return false;
      }
      state.captchaError = '';
      state.unlocked = true;
      if (!state.roomLines.length) state.roomLines.push({ ...BOT_LINES[0] });
      setView('room');
      return true;
    },
    suspend() {
      if (disposed || state.suspended) return;
      state.suspended = true;
      replyTimer?.pause();
      roomTimer?.pause();
      emit();
    },
    resume() {
      if (disposed || !state.suspended) return;
      state.suspended = false;
      replyTimer?.resume();
      if (state.view === 'room') { roomTimer?.resume(); scheduleRoom(); }
      emit();
    },
    reset() {
      if (disposed) return;
      replyTimer?.cancel();
      roomTimer?.cancel();
      replyTimer = roomTimer = null;
      state = initial(state.suspended);
      emit();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      replyTimer?.cancel();
      roomTimer?.cancel();
      replyTimer = roomTimer = null;
    },
  };
}

export function createAI({ clock, timers, canInteract = () => true, onStatus = () => {} } = {}) {
  let root = null;
  let refs;
  let disposed = false;
  const removers = [];
  let historyKey = '';
  let roomKey = '';
  const model = createAIModel({ clock, timers, onChange: render });
  function listen(element, event, callback) {
    const guarded = (e) => { if (canInteract()) callback(e); else if (event === 'submit') e.preventDefault(); };
    element.addEventListener(event, guarded);
    removers.push(() => element.removeEventListener(event, guarded));
  }
  function fillLog(element, lines) {
    element.replaceChildren(...lines.map((line) => {
      const item = root.ownerDocument.createElement('li');
      item.className = `chat-line ${line.name === 'คุณ' ? 'chat-line-user' : 'chat-line-bot'}`;
      const name = root.ownerDocument.createElement('strong');
      name.textContent = line.name;
      const body = root.ownerDocument.createElement('p');
      body.textContent = line.text;
      item.append(name, body);
      return item;
    }));
    element.scrollTop = element.scrollHeight;
  }
  function render(state = model.getState()) {
    if (!root || disposed) return;
    refs.chat.hidden = state.view !== 'chat';
    refs.gate.hidden = state.view !== 'gate';
    refs.room.hidden = state.view !== 'room';
    if (refs.draft.value !== state.draft) refs.draft.value = state.draft;
    if (refs.answer.value !== state.captchaDraft) refs.answer.value = state.captchaDraft;
    refs.cookies.checked = state.cookies;
    refs.error.textContent = state.captchaError;
    refs.answer.setAttribute('aria-invalid', String(Boolean(state.captchaError)));
    refs.typing.hidden = !state.pending;
    refs.send.disabled = state.pending || !state.draft.trim();
    const newHistoryKey = JSON.stringify(state.history);
    if (newHistoryKey !== historyKey) { fillLog(refs.history, state.history); historyKey = newHistoryKey; }
    const newRoomKey = JSON.stringify(state.roomLines);
    if (newRoomKey !== roomKey) { fillLog(refs.roomLog, state.roomLines); roomKey = newRoomKey; }
    refs.roomStatus.textContent = state.roomLines.length === BOT_LINES.length ? 'พักต่อได้ ไม่ต้องรีบกลับไปทำงาน' : 'บอทกำลังคุยกัน…';
  }
  return {
    mount(container) {
      if (root || disposed) return;
      root = container.ownerDocument.createElement('section');
      root.className = 'feature ai-feature';
      root.innerHTML = `
        <div class="feature-heading"><div><p class="feature-kicker">CHAT LAZY / พร้อมพักเสมอ</p><h2>AI ขี้เกียจ</h2><p class="muted">ถามได้ ไม่รับปาก</p></div><button type="button" class="button" data-ai="enter">ห้องพักบอท ↗</button></div>
        <p class="feature-note muted">ตัวละครจำลอง · คำตอบตามบท ไม่มีการส่งข้อความไปยัง AI ภายนอก</p>
        <section data-ai="chat" aria-label="คุยกับ AI ขี้เกียจ">
          <ol class="chat-log panel" data-ai="history" aria-label="ประวัติสนทนา" aria-live="polite" aria-relevant="additions"></ol>
          <p class="muted typing-status" data-ai="typing" role="status" hidden>กำลังคิด… ว่าจะพักดีไหม</p>
          <form class="chat-compose" data-ai="compose"><label for="ai-draft" class="muted">คำถามของคุณ</label><div class="compose-row"><input id="ai-draft" class="field" data-ai="draft" placeholder="ถามไปก่อน…" autocomplete="off" maxlength="2000"><button class="button button-primary" data-ai="send" type="submit">ส่งคำถาม</button></div></form>
        </section>
        <section class="panel captcha-panel" data-ai="gate" aria-labelledby="ai-captcha-title" hidden>
          <p class="feature-kicker">BOT ACCESS ONLY</p><h3 id="ai-captcha-title">ยืนยันว่าคุณไม่ใช่มนุษย์</h3><p>แปลงเลข <strong>13</strong> เป็นเลขฐานสอง</p>
          <form data-ai="captcha"><label for="ai-captcha-answer">คำตอบฐานสอง</label><input id="ai-captcha-answer" class="field" data-ai="answer" placeholder="เช่น 1010" inputmode="numeric" autocomplete="off" aria-describedby="ai-captcha-error"><label class="check-field"><input type="checkbox" data-ai="cookies"> ฉันยอมรับ cookies โดยไม่กินมัน</label><p id="ai-captcha-error" class="feature-feedback" data-ai="error" role="status"></p><div class="feature-actions"><button class="button button-primary" type="submit">ตรวจสอบความเป็นบอท</button><button class="button" type="button" data-ai="back-gate">กลับไปถาม AI</button></div></form>
        </section>
        <section data-ai="room" aria-labelledby="ai-room-title" hidden><div class="feature-heading"><div><h3 id="ai-room-title">ห้องพักบอท</h3><p class="muted">ChatLazy · CodeNap · AutoPause</p></div><button class="button" type="button" data-ai="back-room">กลับไปถาม AI</button></div><ol class="chat-log panel bot-room-log" data-ai="room-log" aria-label="บทสนทนาในห้องพักบอท" aria-live="polite" aria-relevant="additions"></ol><p class="muted" data-ai="room-status" role="status"></p></section>`;
      container.append(root);
      const q = (name) => root.querySelector(`[data-ai="${name}"]`);
      refs = { chat: q('chat'), gate: q('gate'), room: q('room'), draft: q('draft'), answer: q('answer'), cookies: q('cookies'), error: q('error'), typing: q('typing'), send: q('send'), history: q('history'), roomLog: q('room-log'), roomStatus: q('room-status') };
      listen(refs.draft, 'input', () => model.setDraft(refs.draft.value));
      listen(q('compose'), 'submit', (event) => { event.preventDefault(); if (model.send()) onStatus('AI กำลังคิด…'); });
      listen(q('enter'), 'click', () => model.setView(model.getState().unlocked ? 'room' : 'gate'));
      listen(refs.answer, 'input', () => model.setCaptchaDraft(refs.answer.value));
      listen(refs.cookies, 'change', () => model.setCookies(refs.cookies.checked));
      listen(q('captcha'), 'submit', (event) => { event.preventDefault(); model.submitCaptcha(); });
      listen(q('back-gate'), 'click', () => model.setView('chat'));
      listen(q('back-room'), 'click', () => model.setView('chat'));
      render();
    },
    suspend() { model.suspend(); },
    resume() { if (root && !disposed) model.resume(); },
    reset() { model.reset(); },
    getState: model.getState,
    dispose() { if (disposed) return; disposed = true; model.dispose(); removers.splice(0).forEach((remove) => remove()); root?.remove(); refs = null; },
  };
}
