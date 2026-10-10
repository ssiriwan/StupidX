import { loadFaceMesh } from './face-mesh.js';
import { loadCocoSsd } from './coco-ssd.js';
import { VisionSession } from './session.js';

export function createVision(options = {}, dependencies = {}) {
  const document = dependencies.document ?? globalThis.document;
  const timers = dependencies.timers ?? globalThis;
  let session;
  let root;
  let mounted = false;
  let disposed = false;
  let video;
  let status;
  let details;
  let startButton;
  let stopButton;
  const listeners = [];
  const listen = (node, type, fn) => {
    node.addEventListener(type, fn);
    listeners.push(() => node.removeEventListener(type, fn));
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (label, fn) => {
    const node = element('button', label, 'button');
    node.type = 'button';
    listen(node, 'click', fn);
    return node;
  };

  function render(state) {
    if (!root) return;
    status.textContent = state.text;
    const people = state.person.count === null ? '—' : state.person.count;
    const faces = state.faceCount === null ? '—' : state.faceCount;
    const ear = state.ear === null ? '—' : state.ear.toFixed(3);
    const age = state.person.ageMs === null ? 'ยังไม่มีผลตรวจ' : 'ผลตรวจล่าสุด ' + Math.round(state.person.ageMs) + ' ms';
    details.textContent = 'คน ' + people + ' · ใบหน้า ' + faces + ' · EAR ' + ear + ' · ' + age +
      (state.error ? ' · ' + state.error : '');
    startButton.disabled = state.running;
    stopButton.disabled = !state.running;
  }

  function mount(container) {
    if (mounted || disposed) return;
    mounted = true;
    root = element('section', '', 'feature vision-controls');
    root.append(element('h3', 'ตรวจจับคนและกะพริบตา', 'feature-heading'));
    status = element('p', '', 'muted');
    status.setAttribute('role', 'status');
    details = element('p', '', 'muted');
    video = element('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-label', 'ภาพจากกล้อง');
    video.style.width = '100%';
    video.style.maxWidth = '480px';
    video.style.display = 'block';
    const preview = element('div', '', 'vision-preview');
    preview.append(video);
    session = new VisionSession({ ...options, onStatus(state) {
      render(state);
      options.onStatus?.(state);
    } }, {
      ...dependencies,
      video,
      timers,
      loadFace: dependencies.loadFace ?? (() => loadFaceMesh({ document, timers })),
      loadPerson: dependencies.loadPerson ?? (() => loadCocoSsd({ document, timers })),
    });
    startButton = button('เปิดกล้องและเริ่มตรวจจับ', () => { void start(); });
    stopButton = button('หยุดตรวจจับ', stop);
    const controls = element('div', '', 'vision-actions');
    controls.append(startButton, stopButton);
    root.append(preview, controls, status, details);
    root.append(element('p',
      'กดเปิดกล้องครั้งเดียว ระบบตรวจจับตาและคนให้อัตโนมัติ ไม่ต้องตั้งกรอบหรือปรับความไว',
      'muted'));
    container.append(root);
    render(session.getStatus());
  }

  function start() {
    if (!session || disposed) return Promise.resolve();
    return session.start();
  }
  function stop() { session?.stop(); }
  function reset() { session?.reset(); }
  function dispose() {
    if (disposed) return;
    session?.dispose();
    listeners.splice(0).forEach((remove) => remove());
    root?.remove();
    disposed = true;
  }
  function getStatus() {
    return session?.getStatus() ?? {
      text: 'กล้องปิดอยู่ · ตัวตรวจจับจะโหลดเมื่อเริ่มใช้งาน',
      running: false,
      camera: { state: 'stopped', ready: false },
      eyes: { state: 'stopped', ready: false, ageMs: null },
      person: { state: 'stopped', ready: false, available: false, observedAt: null, ageMs: null, stale: true, count: null },
      faceCount: null,
      ear: null,
    };
  }
  function getStream() {
    return session?.getStream() ?? null;
  }
  function getVideoElement() {
    return session?.getVideoElement() ?? null;
  }
  return { mount, start, stop, reset, dispose, getStatus, getStream, getVideoElement };
}
