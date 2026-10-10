import { createShell } from './ui/shell.js';
import { createWorkView } from './ui/work.js';
import { SessionController, LEISURE, ignoresShortcut } from './core/session.js';
import { createYouTube } from './features/youtube.js';
import { createAI } from './features/ai.js';
import { createMusic } from './features/music.js';
import { createBrowserLauncher } from './features/browser.js';
import { createVision } from './vision/index.js';
import { createCameraHud } from './vision/hud.js';

const root = document.querySelector('#app');
const returnDialog = document.querySelector('#manual-return-dialog');
const abort = new AbortController();
const options = { signal: abort.signal };
let session;
let previousFocus = null;
let previousScroll = 0;
let simulation = false;
let simulatedPerson = false;
let visionStatus = 'กล้อง: ยังไม่เปิด · ยังไม่มีข้อมูลเฝ้าระวัง';
let disposed = false;
let simLeaveTimer = null;
const canInteract = (tab) => () => session?.mode === LEISURE && (!tab || session.activeTab === tab);
const features = {
  youtube: createYouTube({ canInteract: canInteract('youtube') }),
  ai: createAI({ canInteract: canInteract('ai') }),
  music: createMusic({ canInteract: canInteract('music') }),
};
let vision;
const hud = createCameraHud();
const launcher = createBrowserLauncher({ canInteract: canInteract() });
const shell = createShell({
  onTab: (tab) => session.setTab(tab),
  onTheme: (theme) => session.setTheme(theme),
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
  onToggleHud: () => hud.toggleVisibility(),
});
const work = createWorkView({ onReturn: () => requestReturn(true) });
shell.mount(root);
work.mount(root);
hud.mount(document.body);

function render(state) {
  let status;
  if (simulation) status = `จำลองชัดเจน: ${state.present ? 'ตรวจพบคนเพิ่ม' : state.unknown ? 'ข้อมูลยังไม่พร้อม' : 'ไม่พบคนเพิ่ม'}`;
  else status = state.fresh ? (state.present ? 'ตรวจพบคนหรือใบหน้าเพิ่ม' : 'กล้องพร้อม · ไม่พบคนเพิ่ม') : visionStatus;
  const cameraRunning = vision?.getStatus()?.running ?? false;
  shell.update({ ...state, status, cameraRunning });
  work.update({ canReturn: state.canReturn, unknown: state.unknown });
  if (state.present && returnDialog.open) returnDialog.close();
  const label = shell.refs.settings.querySelector('[data-simulation-label]');
  if (label) label.textContent = simulation ? 'กำลังจำลอง · ไม่ใช่ผลจากกล้องจริง' : 'ปิดการจำลอง · ใช้ข้อมูลจากกล้องเมื่อพร้อม';
}

function switchSurface(mode) {
  if (mode === LEISURE) {
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
  onMode: switchSurface,
  onChange: render,
  onTab: (tab, previous) => { features[previous].suspend('tab'); features[tab].resume(); },
  onBlink: () => features.youtube.blinkPause(),
});
for (const [tab, feature] of Object.entries(features)) feature.mount(shell.refs.panels[tab]);
launcher.mount(shell.refs.launcher);

vision = createVision({
  onPerson: (observation) => { if (!simulation) session.observePerson(observation); },
  onBlink: (observation) => { if (!simulation) session.observeBlink(observation); },
  onStatus: (status) => { visionStatus = status.text ?? 'กล้อง: ข้อมูลไม่พร้อม'; session.emit(); },
  onStreamReady: (stream) => hud.attachStream(stream),
  onFaceMeshResults: (results, ear, closed) => hud.drawFaceMesh(results, ear, closed),
  onPersonResults: (predictions, count) => hud.drawPredictions(predictions, count),
});
vision.mount(shell.refs.vision);

shell.refs.settings.innerHTML = `<section class="simulation-controls"><h3>โหมดจำลองสำหรับเดโม</h3><p class="muted">ส่งเหตุการณ์ผ่าน controller เดียวกับกล้องจริง · ไม่ใช่การตรวจจับจริง</p><label class="simulation-toggle"><input type="checkbox" data-simulation> เปิดโหมดจำลอง</label><p class="muted" role="status" data-simulation-label></p><div class="simulation-buttons"><button class="button" type="button" data-sim-blink>จำลองกะพริบตา</button><button class="button" type="button" data-sim-person>จำลองคนเข้ามา</button></div><p class="muted">B: เปิดรายงานทันที · Escape: ปิดรายงานเมื่อผ่านเงื่อนไขแล้ว หากข้อมูลกล้องไม่พร้อม ให้กด × และยืนยันด้วยตนเอง</p></section>`;
const simToggle = shell.refs.settings.querySelector('[data-simulation]');
const simPerson = shell.refs.settings.querySelector('[data-sim-person]');
function emitSimulation() {
  if (!simulation) return;
  session.observePerson({ present: simulatedPerson, available: true, calibrated: true, observedAt: performance.now(), source: 'simulation' });
}
simToggle.addEventListener('change', () => {
  if (session.mode !== LEISURE) return;
  simulation = simToggle.checked;
  simulatedPerson = false;
  session.observeBlink({ closed: false });
  if (simulation) emitSimulation();
  else session.observePerson({ present: false, available: false, calibrated: false, observedAt: performance.now(), source: 'camera' });
  session.emit();
}, options);
shell.refs.settings.querySelector('[data-sim-blink]').addEventListener('click', () => {
  if (!simulation || session.mode !== LEISURE) return;
  session.observeBlink({ closed: true, source: 'simulation' });
  session.observeBlink({ closed: false, source: 'simulation' });
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
  if (ignoresShortcut(event)) return;
  if (event.key.toLowerCase() === 'b') { event.preventDefault(); if (returnDialog.open) returnDialog.close(); session.enterWork('manual'); }
  else if (event.key === 'Escape' && session.mode !== LEISURE && !returnDialog.open) { event.preventDefault(); requestReturn(false); }
}, options);

function reset() {
  if (session.mode !== LEISURE) return;
  clearTimeout(simLeaveTimer); simLeaveTimer = null;
  simulation = false; simulatedPerson = false; simToggle.checked = false;
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
  launcher.dispose(); vision.dispose(); shell.dispose(); work.dispose();
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); else { for (const feature of Object.values(features)) feature.suspend('pagehide'); launcher.suspend(); vision.stop(); } }, options);
window.addEventListener('pageshow', (event) => { if (event.persisted && session.mode === LEISURE) { features[session.activeTab].resume(); launcher.resume(); } }, options);
features.youtube.resume(); launcher.resume(); session.emit();
