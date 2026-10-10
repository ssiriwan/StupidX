import { createShell } from './ui/shell.js';
import { createWorkView } from './ui/work.js';
import { createBsod } from './ui/bsod.js';
import { SessionController, LEISURE, ignoresShortcut } from './core/session.js';
import { createYouTube } from './features/youtube.js';
import { createAI } from './features/ai.js';
import { createMusic } from './features/music.js';
import { createBrowserLauncher } from './features/browser.js';
import { createVision } from './vision/index.js';
import { createCameraHud } from './vision/hud.js';
import { loadPreferences, savePreferences, normalizePreferences } from './core/preferences.js';

const root = document.querySelector('#app');
const returnDialog = document.querySelector('#manual-return-dialog');
const abort = new AbortController();
const options = { signal: abort.signal };
let session;
let previousFocus = null;
let previousScroll = 0;
let simulation = false;
let simulatedPerson = false;
let simulatedLooking = true;
let visionStatus = 'กล้อง: ยังไม่เปิด · ยังไม่มีข้อมูลเฝ้าระวัง';
let disposed = false;
let simLeaveTimer = null;
let preferenceStorage;
try { preferenceStorage = globalThis.localStorage; } catch { /* Storage can be disabled. */ }
const preferences = loadPreferences(preferenceStorage);
let savedPreferences = JSON.stringify(preferences);
let renderedResumePolicy;
const canInteract = (tab) => () => session?.mode === LEISURE && (!tab || session.activeTab === tab);
const features = {
  youtube: createYouTube({ canInteract: canInteract('youtube') }),
  ai: createAI({ canInteract: canInteract('ai') }),
  music: createMusic({ canInteract: canInteract('music') }),
};
let vision;
const hud = createCameraHud({ onStartCamera: () => { void vision?.start(); } });
const launcher = createBrowserLauncher({ canInteract: canInteract() });
const bsod = createBsod({
  onDismiss: () => session.dismissBsod(),
});
const shell = createShell({
  onTab: (tab) => session.setTab(tab),
  onOS: (os) => session.setOS(os),
  onSubtheme: (subtheme) => session.setSubtheme(subtheme),
  onPanic: () => session.enterWork('manual'),
  onReset: reset,
  onToggleCamera: () => {
    const st = vision?.getStatus();
    if (st?.running) {
      vision?.stop();
      hud.detachStream();
    } else {
      hud.show();
      void vision?.start();
    }
  },
  onToggleHud: () => {
    const isHidden = hud.toggleVisibility();
    if (!isHidden) {
      const st = vision?.getStatus();
      if (!st?.running) {
        void vision?.start();
      } else {
        const stream = vision?.getStream?.();
        if (stream) hud.attachStream(stream, vision?.getVideoElement?.());
      }
    }
  },
});
const work = createWorkView({
  onReturn: () => requestReturn(true),
  onPanic: () => {
    if (session.mode !== LEISURE) session.triggerBsod();
  },
});
shell.mount(root);
work.mount(root);
hud.mount(document.body);
bsod.mount(document.body);

function render(state) {
  let status;
  const vStatus = vision?.getStatus();
  const faceCount = vStatus?.faceCount ?? 0;
  const personCount = vStatus?.person?.count ?? 0;
  const effectiveCount = Math.max(faceCount, personCount);

  if (simulation) {
    status = `จำลอง: ${state.present ? '🚨 ตรวจพบคนเพิ่ม (เจ้านายมา!)' : state.unknown ? 'ข้อมูลยังไม่พร้อม' : '🟢 ปลอดภัย · พบคุณคนเดียว'}`;
  } else if (state.fresh) {
    if (state.present) {
      status = '🚨 เจ้านายมา! ตรวจพบคนข้างหลัง';
    } else if (effectiveCount === 0) {
      status = '🟡 กล้องพร้อม · รอผู้ใช้นั่งหน้ากล้อง';
    } else {
      status = '🟢 ปลอดภัย · พบคุณคนเดียว (ไม่มีเจ้านาย)';
    }
  } else {
    status = visionStatus;
  }
  const cameraRunning = vision?.getStatus()?.running ?? false;
  shell.update({ ...state, status, cameraRunning });
  if (renderedResumePolicy !== state.resumePolicy) {
    features.youtube.setResumePolicy(state.resumePolicy);
    renderedResumePolicy = state.resumePolicy;
  }
  const policySelect = shell.refs.settings.querySelector('[data-resume-policy]');
  if (policySelect) policySelect.value = state.resumePolicy;
  const nextPreferences = JSON.stringify(normalizePreferences(state));
  if (nextPreferences !== savedPreferences) {
    savePreferences(preferenceStorage, state);
    savedPreferences = nextPreferences;
  }
  work.update({ canReturn: state.canReturn, unknown: state.unknown });
  if (state.bsod) {
    bsod.show(state.os, state.subtheme);
  } else {
    bsod.hide();
  }
  if (state.present && returnDialog.open) returnDialog.close();
  const label = shell.refs.settings.querySelector('[data-simulation-label]');
  if (label) label.textContent = simulation ? 'กำลังจำลอง · ไม่ใช่ผลจากกล้องจริง' : 'ปิดการจำลอง · ใช้ข้อมูลจากกล้องเมื่อพร้อม';
}

function switchSurface(mode) {
  if (mode === LEISURE) {
    bsod.hide();
    work.hide();
    shell.refs.leisure.hidden = false;
    shell.refs.leisure.inert = false;
    document.title = 'ทำงานอยู่ครับ™ — Totally Working';
    document.body.classList.remove('working');
    features[session.activeTab].resume();
    launcher.resume();
    window.scrollTo(0, previousScroll);
    if (previousFocus?.isConnected && shell.refs.leisure.contains(previousFocus) && !previousFocus.closest('[hidden]')) previousFocus.focus({ preventScroll: true });
    else shell.refs.tabs[session.activeTab].focus({ preventScroll: true });
  } else {
    if (!shell.refs.leisure.hidden) {
      previousFocus = document.activeElement;
      previousScroll = window.scrollY;
    }
    shell.refs.leisure.inert = true;
    shell.refs.leisure.hidden = true;
    document.title = 'รายงานผลการดำเนินงาน Q4';
    document.body.classList.add('working');
    work.show();
    for (const feature of Object.values(features)) feature.suspend('work');
    launcher.suspend('work');
  }
}

session = new SessionController({
  preferences,
  onMode: switchSurface,
  onChange: render,
  onTab: (tab, previous) => { features[previous].suspend('tab'); features[tab].resume(); },
});
for (const [tab, feature] of Object.entries(features)) feature.mount(shell.refs.panels[tab]);
launcher.mount(shell.refs.launcher);

function observeBlink(observation) {
  session.observeBlink(observation);
  features.youtube.observeBlink(observation);
}

function observeAttention(observation) {
  features.youtube.observeAttention(observation);
}

vision = createVision({
  onPerson: (observation) => { if (!simulation) session.observePerson(observation); },
  onBlink: (observation) => {
    if (!simulation) {
      observeBlink(observation);
    }
  },
  onAttention: (observation) => {
    if (!simulation) {
      observeAttention(observation);
    }
  },
  onStatus: (status) => {
    visionStatus = status.text ?? 'กล้อง: ข้อมูลไม่พร้อม';
    hud.updateStatus(status);
    if (!simulation && (!status.running || !status.camera?.ready || !status.eyes?.ready)) {
      observeAttention({ lookingAtScreen: null, eyesOpen: false, reason: 'unavailable', observedAt: performance.now() });
    }
    const stream = vision?.getStream?.();
    if (stream && status.camera?.ready) {
      hud.attachStream(stream, vision?.getVideoElement?.());
    }
    session.emit();
  },
  onStreamReady: (stream) => hud.attachStream(stream, vision?.getVideoElement?.()),
  onFaceMeshResults: (results, ear, closed, attention) => hud.drawFaceMesh(results, ear, closed, attention),
  onPersonResults: (predictions, count) => hud.drawPredictions(predictions, count),
});
vision.mount(shell.refs.vision);

shell.refs.settings.innerHTML = `
  <section class="playback-settings">
    <h3>เล่นต่อหลังจากกะพริบตาหรือละสายตา</h3>
    <label for="resume-policy">เมื่อกลับมามองจอ</label>
    <select id="resume-policy" class="field" data-resume-policy>
      <option value="auto">เล่นต่ออัตโนมัติ</option>
      <option value="manual">รอให้กดปุ่มเล่นต่อ</option>
    </select>
    <p class="muted">ใช้กับทั้งการกะพริบตาและหันหน้าออก · จดจำการตั้งค่าเมื่อเปิดเว็บครั้งถัดไป</p>
  </section>
  <section class="simulation-controls">
    <h3>โหมดจำลองสำหรับเดโม</h3>
    <p class="muted">ใช้ขั้นตอนเดียวกับกล้องจริง · ไม่ใช่การตรวจจับจริง</p>
    <label class="simulation-toggle"><input type="checkbox" data-simulation> เปิดโหมดจำลอง</label>
    <p class="muted" role="status" data-simulation-label></p>
    <div class="simulation-buttons">
      <button class="button" type="button" data-sim-blink>จำลองกะพริบตา</button>
      <button class="button" type="button" data-sim-lookaway>จำลองละสายตาจากจอ</button>
      <button class="button" type="button" data-sim-lookback>จำลองกลับมามองจอ</button>
      <button class="button" type="button" data-sim-person>จำลองคนเข้ามา</button>
    </div>
    <p class="muted">B: เปิดรายงานทันที · Escape: ปิดรายงานเมื่อผ่านเงื่อนไขแล้ว หากข้อมูลกล้องไม่พร้อม ให้กด × และยืนยันด้วยตนเอง</p>
  </section>`;
shell.refs.settings.querySelector('[data-resume-policy]').addEventListener('change', (event) => {
  session.setResumePolicy(event.target.value);
}, options);
const simToggle = shell.refs.settings.querySelector('[data-simulation]');
const simPerson = shell.refs.settings.querySelector('[data-sim-person]');
const simLookaway = shell.refs.settings.querySelector('[data-sim-lookaway]');
function emitSimulation() {
  if (!simulation) return;
  session.observePerson({ present: simulatedPerson, available: true, calibrated: true, observedAt: performance.now(), source: 'simulation' });
}
simToggle.addEventListener('change', () => {
  if (session.mode !== LEISURE) return;
  simulation = simToggle.checked;
  simulatedPerson = false;
  simulatedLooking = true;
  observeBlink({ closed: false, observedAt: performance.now() });
  observeAttention({ lookingAtScreen: null, eyesOpen: false, reason: 'source-changed', observedAt: performance.now() });
  if (simulation) emitSimulation();
  else session.observePerson({ present: false, available: false, calibrated: false, observedAt: performance.now(), source: 'camera' });
  session.emit();
}, options);
shell.refs.settings.querySelector('[data-sim-blink]').addEventListener('click', () => {
  if (!simulation || session.mode !== LEISURE) return;
  observeBlink({ closed: true, source: 'simulation', observedAt: performance.now() });
  observeAttention({ lookingAtScreen: false, eyesOpen: false, reason: 'eyes-closed', observedAt: performance.now() });
  observeBlink({ closed: false, source: 'simulation', observedAt: performance.now() });
  observeAttention({ lookingAtScreen: simulatedLooking, eyesOpen: true, stable: simulatedLooking, reason: simulatedLooking ? 'looking-at-screen' : 'head-turned-left', source: 'simulation', observedAt: performance.now() });
}, options);
simLookaway?.addEventListener('click', () => {
  if (!simulation || session.mode !== LEISURE) return;
  simulatedLooking = false;
  observeAttention({ lookingAtScreen: false, eyesOpen: true, stable: true, reason: 'head-turned-left', source: 'simulation', observedAt: performance.now() });
}, options);
shell.refs.settings.querySelector('[data-sim-lookback]').addEventListener('click', () => {
  if (!simulation || session.mode !== LEISURE) return;
  simulatedLooking = true;
  observeBlink({ closed: false, source: 'simulation', observedAt: performance.now() });
  observeAttention({ lookingAtScreen: true, eyesOpen: true, stable: true, source: 'simulation', observedAt: performance.now() });
}, options);
simPerson.addEventListener('click', () => {
  if (!simulation || session.mode !== LEISURE) return;
  simulatedPerson = true;
  emitSimulation();
  clearTimeout(simLeaveTimer);
  simLeaveTimer = setTimeout(() => { simulatedPerson = false; emitSimulation(); }, 3000);
}, options);

function requestReturn(deliberate) {
  const state = session.snapshot();
  if (session.mode === LEISURE) return;
  if (state.canReturn) session.requestReturn();
  else if (state.unknown && deliberate) returnDialog.showModal();
}
document.querySelector('#return-cancel').addEventListener('click', () => returnDialog.close(), options);
document.querySelector('#return-confirm').addEventListener('click', () => {
  if (session.requestReturn({ acknowledgeUnknown: true })) returnDialog.close();
}, options);
window.addEventListener('keydown', (event) => {
  if (session.bsod || bsod.isVisible()) {
    if (event.key === 'Escape') {
      event.preventDefault();
      session.dismissBsod();
    }
    return;
  }

  if (ignoresShortcut(event)) return;

  const key = event.key;
  const isB = key.toLowerCase() === 'b';
  const isF8 = key === 'F8';

  if (session.mode === LEISURE) {
    if (isB) {
      event.preventDefault();
      if (returnDialog.open) returnDialog.close();
      session.enterWork('manual');
    }
  } else {
    // Already in Work mode
    if (isB || isF8) {
      event.preventDefault();
      if (returnDialog.open) returnDialog.close();
      session.triggerBsod();
    } else if (key === 'Escape' && !returnDialog.open) {
      event.preventDefault();
      requestReturn(false);
    }
  }
}, options);

function reset() {
  if (session.mode !== LEISURE) return;
  clearTimeout(simLeaveTimer); simLeaveTimer = null;
  simulation = false; simulatedPerson = false; simToggle.checked = false;
  simulatedLooking = true;
  for (const feature of Object.values(features)) feature.suspend('reset');
  for (const feature of Object.values(features)) feature.reset();
  launcher.reset(); vision.reset();
  session.reset();
  features.youtube.resume(); launcher.resume();
}

const pulse = setInterval(() => { emitSimulation(); session.tick(); }, 100);
function dispose() {
  if (disposed) return;
  disposed = true;
  abort.abort(); clearInterval(pulse); clearTimeout(simLeaveTimer);
  for (const feature of Object.values(features)) feature.dispose();
  launcher.dispose(); vision.dispose(); shell.dispose(); work.dispose(); bsod.dispose();
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); else { for (const feature of Object.values(features)) feature.suspend('pagehide'); launcher.suspend(); vision.stop(); } }, options);
window.addEventListener('pageshow', (event) => { if (event.persisted && session.mode === LEISURE) { features[session.activeTab].resume(); launcher.resume(); } }, options);
features.youtube.resume(); launcher.resume(); session.emit();
