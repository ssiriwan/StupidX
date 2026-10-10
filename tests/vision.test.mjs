import test from 'node:test';
import assert from 'node:assert/strict';
import { BlinkTracker, calculateEAR, countPeople } from '../src/vision/geometry.js';
import { loadCocoSsd, TFJS_VERSION, COCO_SSD_VERSION } from '../src/vision/coco-ssd.js';
import { VisionSession, FRESHNESS_MS } from '../src/vision/session.js';
import { createVision } from '../src/vision/index.js';

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};

function landmarks(ear = 0.3, dx = 0) {
  const face = Array.from({ length: 468 }, () => ({ x: 0.5 + dx, y: 0.4 }));
  for (const [i, x] of [[33, 0.4], [133, 0.48], [362, 0.52], [263, 0.6]]) face[i] = { x: x + dx, y: 0.4 };
  const dy = ear * 0.08 / 2;
  for (const i of [159, 386]) face[i] = { x: 0.5 + dx, y: 0.4 - dy };
  for (const i of [145, 374]) face[i] = { x: 0.5 + dx, y: 0.4 + dy };
  return face;
}

function fixture(overrides = {}) {
  let now = 0;
  let requested = 0;
  let stopped = 0;
  let nextFaces = [landmarks()];
  let nextPredictions = [{ class: 'person', score: 0.9, bbox: [20, 20, 40, 80] }];
  let faceResults;
  let faceSends = 0;
  let personSends = 0;
  let faceCloses = 0;
  let personCloses = 0;
  const jobs = new Map();
  const events = new Map();
  const track = {
    stop() { stopped++; },
    addEventListener(type, fn) { events.set(type, fn); },
    removeEventListener(type) { events.delete(type); },
  };
  const stream = { getTracks: () => [track] };
  const video = {
    readyState: 2, videoWidth: 640, videoHeight: 480, currentTime: 0, paused: true,
    async play() { this.paused = false; },
    pause() { this.paused = true; },
  };
  const personEvents = [];
  const blinkEvents = [];
  const statuses = [];
  const face = {
    onResults(fn) { faceResults = fn; },
    async send() { faceSends++; faceResults({ multiFaceLandmarks: nextFaces }); },
    close() { faceCloses++; },
  };
  const person = {
    async detect() { personSends++; return nextPredictions; },
    close() { personCloses++; },
  };
  const session = new VisionSession({
    clock: () => now,
    onPerson: (event) => personEvents.push(event),
    onBlink: (event) => blinkEvents.push(event),
    onStatus: (state) => statuses.push(state),
  }, {
    video,
    timers: {
      setTimeout(fn) { const id = Symbol(); jobs.set(id, fn); return id; },
      clearTimeout(id) { jobs.delete(id); },
    },
    mediaDevices: {
      async getUserMedia(options) { assert.equal(options.audio, false); requested++; return stream; },
    },
    loadFace: async () => face,
    loadPerson: async () => person,
    ...overrides,
  });
  return {
    session, video, face, person, personEvents, blinkEvents, statuses, events, jobs,
    setFaces(faces) { nextFaces = faces; },
    setPredictions(predictions) { nextPredictions = predictions; },
    at(time, advanceVideo = true) {
      now = time;
      if (advanceVideo) video.currentTime = time / 1000;
      session.tick();
    },
    result(faces) { faceResults({ multiFaceLandmarks: faces }); },
    counts: () => ({ requested, stopped, faceSends, personSends, faceCloses, personCloses }),
  };
}

test('GitHub EAR calculation averages the normalized FaceMesh eye ratios', () => {
  assert.ok(Math.abs(calculateEAR(landmarks(0.3)) - 0.3) < 1e-6);
  assert.equal(calculateEAR([]), null);
});

test('blink detection requires an open-to-closed transition and uses hysteresis', () => {
  const blink = new BlinkTracker();
  assert.equal(blink.observe(0.1), null);
  assert.equal(blink.observe(0.3).closed, false);
  assert.equal(blink.observe(0.1).closed, true);
  assert.equal(blink.observe(0.1), null);
  assert.equal(blink.observe(0.2), null);
  assert.equal(blink.observe(0.3).closed, false);
  blink.reset();
  assert.equal(blink.observe(0.1), null);
});

test('COCO-SSD person counting uses the GitHub person class and confidence cutoff', () => {
  assert.equal(countPeople([
    { class: 'person', score: 0.46 },
    { class: 'person', score: 0.45 },
    { class: 'cat', score: 0.99 },
    { class: 'person', score: NaN },
  ]), 1);
  assert.equal(countPeople(null), 0);
});

test('COCO-SSD loader follows the pinned GitHub script approach and releases its model', async () => {
  const scripts = [];
  let disposed = 0;
  const document = {
    defaultView: {},
    createElement: () => ({ remove() {}, setAttribute() {} }),
    head: { append(script) {
      scripts.push(script.src);
      queueMicrotask(() => {
        if (script.src.includes('tf.min.js')) document.defaultView.tf = {};
        else document.defaultView.cocoSsd = {
          async load() { return { detect: async (video) => [{ class: 'person', score: video.score }], dispose() { disposed++; } }; },
        };
        script.onload();
      });
    } },
  };
  const timers = { setTimeout, clearTimeout };
  const model = await loadCocoSsd({ document, timers });
  assert.deepEqual(scripts, [
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@' + TFJS_VERSION + '/dist/tf.min.js',
    'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@' + COCO_SSD_VERSION + '/dist/coco-ssd.min.js',
  ]);
  assert.equal((await model.detect({ score: 0.9 }))[0].score, 0.9);
  model.close();
  assert.equal(disposed, 1);
});

test('camera starts both detectors automatically without region or sensitivity setup', async () => {
  const f = fixture();
  await f.session.start();
  await settle();
  f.at(100);
  await settle();
  assert.equal(f.counts().requested, 1);
  assert.equal(f.counts().faceSends, 1);
  assert.equal(f.counts().personSends, 1);
  assert.equal(f.personEvents.at(-1).available, true);
  assert.equal(f.personEvents.at(-1).present, false);
  assert.equal(f.session.getStatus().eyes.ready, true);
  assert.equal(f.session.getStatus().person.available, true);
  f.session.dispose();
});

test('two COCO-SSD people or two FaceMesh faces trigger the same warning', async () => {
  const personFixture = fixture();
  personFixture.setPredictions([
    { class: 'person', score: 0.9, bbox: [10, 10, 40, 80] },
    { class: 'person', score: 0.8, bbox: [90, 10, 40, 80] },
  ]);
  await personFixture.session.start();
  await settle();
  personFixture.at(100);
  await settle();
  assert.equal(personFixture.personEvents.at(-1).present, true);
  assert.equal(personFixture.session.getStatus().person.count, 2);
  personFixture.session.dispose();

  const faceFixture = fixture({ loadPerson: null });
  faceFixture.setFaces([landmarks(), landmarks(0.3, -0.4)]);
  await faceFixture.session.start();
  await settle();
  faceFixture.at(100);
  await settle();
  assert.equal(faceFixture.personEvents.at(-1).present, true);
  assert.equal(faceFixture.personEvents.at(-1).available, true);
  faceFixture.session.dispose();
});

test('face detector failure still permits COCO-SSD threat detection, but not a false clear', async () => {
  const f = fixture({ loadFace: async () => { throw new Error('offline'); } });
  await f.session.start();
  await settle();
  f.at(100);
  await settle();
  assert.equal(f.session.getStatus().eyes.state, 'error');
  assert.equal(f.personEvents.at(-1).present, false);
  assert.equal(f.personEvents.at(-1).available, false);
  f.setPredictions([
    { class: 'person', score: 0.9 },
    { class: 'person', score: 0.8 },
  ]);
  f.at(400);
  await settle();
  assert.equal(f.personEvents.at(-1).present, true);
  assert.equal(f.personEvents.at(-1).available, true);
  f.session.dispose();
});

test('person detector failure leaves blink detection working and multiple faces still trigger', async () => {
  const f = fixture({ loadPerson: async () => { throw new Error('offline'); } });
  await f.session.start();
  await settle();
  f.at(100);
  await settle();
  f.setFaces([landmarks(0.1)]);
  f.at(200);
  await settle();
  f.setFaces([landmarks(0.3)]);
  f.at(300);
  await settle();
  assert.deepEqual(f.blinkEvents.map((event) => event.closed), [false, true, false]);
  assert.equal(f.personEvents.at(-1).available, false);
  f.setFaces([landmarks(), landmarks(0.3, -0.4)]);
  f.at(400);
  await settle();
  assert.equal(f.personEvents.at(-1).present, true);
  assert.equal(f.personEvents.at(-1).available, true);
  f.session.dispose();
});

test('stale face or person results never count as a clear frame', async () => {
  const f = fixture();
  await f.session.start();
  await settle();
  f.at(100);
  await settle();
  assert.equal(f.personEvents.at(-1).available, true);
  f.at(100 + FRESHNESS_MS + 1, false);
  await settle();
  assert.equal(f.personEvents.at(-1).available, false);
  assert.equal(f.session.getStatus().person.stale, true);
  f.session.dispose();
});

test('person inference does not overlap and stale completion is discarded', async () => {
  const f = fixture();
  const pending = deferred();
  let personCalls = 0;
  f.person.detect = () => { personCalls++; return pending.promise; };
  await f.session.start();
  await settle();
  f.at(100);
  assert.equal(f.session.personContext.busy, true);
  f.at(500);
  assert.equal(personCalls, 1);
  f.at(1200);
  pending.resolve([]);
  await settle();
  assert.equal(f.session.personContext.busy, false);
  assert.ok(f.personEvents.every((event) => !event.available));
  f.session.dispose();
});

test('camera opens one silent stream; repeated starts and disposal are idempotent', async () => {
  const f = fixture();
  const first = f.session.start();
  assert.equal(first, f.session.start());
  await first;
  await settle();
  assert.equal(f.counts().requested, 1);
  assert.equal(f.jobs.size, 1);
  f.session.dispose();
  f.session.dispose();
  await settle();
  assert.equal(f.counts().stopped, 1);
  assert.equal(f.jobs.size, 0);
  assert.equal(f.counts().faceCloses, 1);
  assert.equal(f.counts().personCloses, 1);
  assert.equal(f.video.srcObject, null);
  await f.session.start();
  assert.equal(f.counts().requested, 1);
});

test('stop ignores late detections and waits for face inference before model release', async () => {
  const f = fixture();
  const pending = deferred();
  f.face.send = () => pending.promise;
  await f.session.start();
  await settle();
  f.at(100);
  assert.equal(f.session.faceContext.busy, true);
  f.session.stop();
  await settle();
  assert.equal(f.counts().faceCloses, 0);
  f.result([landmarks(0.1)]);
  pending.resolve();
  await settle();
  assert.equal(f.personEvents.at(-1).available, false);
  assert.equal(f.counts().faceCloses, 1);
  assert.equal(f.session.getStatus().running, false);
});

test('stop waits for COCO-SSD inference before disposing its model', async () => {
  const f = fixture();
  const pending = deferred();
  f.person.detect = () => pending.promise;
  await f.session.start();
  await settle();
  f.at(100);
  assert.equal(f.session.personContext.busy, true);
  f.session.stop();
  await settle();
  assert.equal(f.counts().personCloses, 0);
  pending.resolve([{ class: 'person', score: 0.99 }]);
  await settle();
  assert.equal(f.counts().personCloses, 1);
  assert.equal(f.personEvents.at(-1).available, false);
});

test('reset invalidates pending inference while leaving the camera available', async () => {
  const f = fixture();
  const pending = deferred();
  f.person.detect = () => pending.promise;
  await f.session.start();
  await settle();
  f.at(100);
  f.session.reset();
  pending.resolve([{ class: 'person', score: 0.99 }]);
  await settle();
  assert.equal(f.counts().requested, 1);
  assert.equal(f.session.running, true);
  assert.equal(f.personEvents.at(-1).available, false);
  f.session.dispose();
});

test('camera permission errors keep detections unavailable and release loaded models', async () => {
  const f = fixture({
    mediaDevices: { async getUserMedia() { throw new Error('Permission denied'); } },
  });
  await f.session.start();
  await settle();
  assert.equal(f.session.getStatus().camera.state, 'error');
  assert.ok(f.personEvents.every((event) => !event.available));
  assert.equal(f.counts().faceCloses, 1);
  assert.equal(f.counts().personCloses, 1);
});

test('settings now offer one start/stop flow with no calibration fields', () => {
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.listeners = new Map(); this.textContent = ''; this.style = {}; }
    append(...children) { this.children.push(...children); }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    removeEventListener(type) { this.listeners.delete(type); }
    setAttribute() {}
    remove() {}
  }
  const document = { createElement: (tag) => new Element(tag) };
  const container = new Element('div');
  const vision = createVision({}, {
    document,
    loadFace: async () => ({}),
    loadPerson: async () => ({}),
  });
  vision.mount(container);
  const collect = (node) => [node, ...node.children.flatMap(collect)];
  const nodes = collect(container);
  assert.equal(nodes.filter((node) => node.tagName === 'input').length, 0);
  assert.deepEqual(nodes.filter((node) => node.tagName === 'button').map((node) => node.textContent), [
    'เปิดกล้องและเริ่มตรวจจับ', 'หยุดตรวจจับ',
  ]);
  assert.ok(nodes.some((node) => node.textContent.includes('ไม่ต้องตั้งกรอบหรือปรับความไว')));
  vision.dispose();
});
