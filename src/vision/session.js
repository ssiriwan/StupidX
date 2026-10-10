import { BlinkTracker, calculateEAR, countPeople, AttentionTracker, checkAttention } from './geometry.js';

export const FRESHNESS_MS = 1000;
const PERSON_CONFIDENCE = 0.45;
const PERSON_INTERVAL_MS = 300;
export const CAMERA_CONSTRAINTS = [
  { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false },
  { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
  { video: true, audio: false },
];

export async function acquireCameraStream(mediaDevices) {
  if (!mediaDevices?.getUserMedia) {
    throw new Error('กล้องต้องใช้ localhost/HTTPS และ browser ที่รองรับ');
  }
  let lastError;
  for (const constraints of CAMERA_CONSTRAINTS) {
    try {
      const stream = await mediaDevices.getUserMedia(constraints);
      if (stream) return stream;
    } catch (err) {
      lastError = err;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        throw err;
      }
    }
  }
  throw lastError || new Error('ไม่สามารถเข้าถึงกล้องได้');
}

export function formatCameraError(error) {
  if (!error) return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการเปิดกล้อง';
  const name = error.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'เบราว์เซอร์ถูกปฏิเสธการเข้าถึงกล้อง (กรุณากดอนุญาตสิทธิ์ที่ไอคอนกล้องข้าง URL)';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'ไม่พบอุปกรณ์กล้องในเครื่องของคุณ (กรุณาเสียบกล้องหรือตรวจสอบการเชื่อมต่อ)';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'กล้องกำลังถูกโปรแกรมอื่นใช้งานอยู่ (เช่น Zoom/Teams/Chrome แถบอื่น)';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'อุปกรณ์กล้องไม่รองรับความละเอียดที่ระบุ';
  }
  return error.message || 'ไม่สามารถเปิดกล้องได้';
}

export class VisionSession {
  constructor({ onPerson = () => {}, onBlink = () => {}, onStatus = () => {}, onFaceMeshResults = () => {}, onPersonResults = () => {}, onStreamReady = () => {}, onAttention = () => {}, clock = () => performance.now() } = {}, {
    video, mediaDevices = globalThis.navigator?.mediaDevices, timers = globalThis,
    loadFace, loadPerson = null,
  } = {}) {
    this.video = video;
    this.mediaDevices = mediaDevices;
    this.timers = timers;
    this.loadFace = loadFace;
    this.loadPerson = loadPerson;
    this.callbacks = { onPerson, onBlink, onStatus, onFaceMeshResults, onPersonResults, onStreamReady, onAttention };
    this.clock = clock;
    this.epoch = 0;
    this.revision = 0;
    this.running = false;
    this.disposed = false;
    this.blink = new BlinkTracker();
    this.attention = new AttentionTracker();
    this.lookingAtScreen = true;
    this.attentionReason = 'looking-at-screen';
    this.cameraState = 'stopped';
    this.eyesState = 'stopped';
    this.personState = loadPerson ? 'stopped' : 'pending-approval';
    this.personAvailable = false;
    this.personObservedAt = null;
    this.faceObservedAt = null;
    this.personCount = 0;
    this.faceCount = 0;
    this.ear = null;
    this.nextPersonAt = 0;
    this.trackListeners = [];
  }

  getStatus() {
    const now = this.clock();
    const age = (at) => at === null ? null : Math.max(0, now - at);
    const personAge = age(this.personObservedAt);
    const faceAge = age(this.faceObservedAt);
    const personFresh = personAge !== null && personAge <= FRESHNESS_MS;
    const faceFresh = faceAge !== null && faceAge <= FRESHNESS_MS;
    const cameraReady = this.running && this.cameraState === 'ready';
    const multiplePeople = personFresh && this.personCount > 1;
    const multipleFaces = faceFresh && this.faceCount > 1;
    const clearReady = cameraReady && this.eyesState === 'ready' && this.personState === 'ready' && personFresh && faceFresh;
    const available = cameraReady && (multiplePeople || multipleFaces || clearReady);
    const messages = {
      'pending-approval': 'ยังไม่โหลดตัวตรวจคน',
      loading: 'กำลังโหลด', error: 'ใช้งานไม่ได้', stopped: 'ปิดอยู่', ready: 'พร้อม', interrupted: 'ภาพขาดหาย',
    };
    return {
      text: 'กล้อง: ' + (messages[this.cameraState] ?? this.cameraState) +
        ' · ตา: ' + (messages[this.eyesState] ?? this.eyesState) +
        ' · คน: ' + (messages[this.personState] ?? this.personState),
      running: this.running,
      camera: { state: this.cameraState, ready: this.cameraState === 'ready' },
      eyes: {
        state: this.eyesState,
        ready: this.eyesState === 'ready' && this.ear !== null && faceFresh,
        ageMs: faceAge,
      },
      attention: {
        lookingAtScreen: this.lookingAtScreen,
        reason: this.attentionReason,
      },
      person: {
        state: this.personState,
        ready: this.personState === 'ready',
        available,
        observedAt: this.personObservedAt,
        ageMs: personAge,
        stale: !available,
        count: personFresh ? this.personCount : null,
      },
      faceCount: faceFresh ? this.faceCount : null,
      ear: this.ear,
      error: this.error ?? null,
    };
  }

  publish() { this.callbacks.onStatus(this.getStatus()); }

  getStream() { return this.stream ?? null; }

  getVideoElement() { return this.video ?? null; }

  unavailable(force = false) {
    if (this.personAvailable || force) {
      this.personAvailable = false;
      this.lastPersonPresent = false;
      this.lastPersonPublishAt = null;
      this.callbacks.onPerson({
        present: false, available: false, observedAt: this.clock(), source: 'camera', calibrated: true,
      });
    }
  }

  publishObservation(force = false) {
    const status = this.getStatus();
    if (!status.person.available) { this.unavailable(); return; }

    const personThreat = status.person.count !== null && status.person.count > 1;
    const faceThreat = status.faceCount !== null && status.faceCount > 1;
    const present = personThreat || faceThreat;
    const now = this.clock();
    const observedAt = present
      ? Math.max(...[personThreat ? this.personObservedAt : null, faceThreat ? this.faceObservedAt : null].filter((at) => at !== null))
      : Math.min(this.personObservedAt, this.faceObservedAt);
    const changed = !this.personAvailable || present !== this.lastPersonPresent;
    const refreshDue = this.lastPersonPublishAt === null || now - this.lastPersonPublishAt >= PERSON_INTERVAL_MS;
    if (!force && !changed && !refreshDue) return;

    this.personAvailable = true;
    this.lastPersonPresent = present;
    this.lastPersonPublishAt = now;
    this.callbacks.onPerson({ present, available: true, observedAt, source: 'camera', calibrated: true });
  }

  start() {
    if (this.disposed) return Promise.resolve();
    if (this.running) return this.startPromise ?? Promise.resolve();
    this.running = true;
    const token = ++this.epoch;
    this.error = null;
    this.cameraState = 'loading';
    this.eyesState = 'loading';
    this.personState = this.loadPerson ? 'loading' : 'pending-approval';
    this.unavailable(true);
    this.publish();
    void this.initializeFace(token);
    if (this.loadPerson) void this.initializePerson(token);
    this.startPromise = this.initializeCamera(token);
    return this.startPromise;
  }

  async initializeCamera(token) {
    let stream;
    try {
      stream = await acquireCameraStream(this.mediaDevices);
      if (!this.valid(token)) { stream.getTracks().forEach((track) => track.stop()); return; }
      const videoTracks = stream.getVideoTracks?.() ?? [];
      if (stream.getVideoTracks && videoTracks.length === 0) {
        throw new Error('ไม่พบสัญญาณภาพวิดีโอจากกล้อง');
      }
      this.stream = stream;
      if (this.video) {
        this.video.muted = true;
        this.video.defaultMuted = true;
        this.video.playsInline = true;
        this.video.setAttribute?.('playsinline', '');
        this.video.setAttribute?.('muted', '');
        this.video.setAttribute?.('autoplay', '');
        this.video.srcObject = stream;
      }
      this.callbacks.onStreamReady?.(stream);
      stream.getTracks().forEach((track) => {
        const ended = () => {
          if (this.running && this.stream === stream) {
            this.stop();
            this.cameraState = 'error';
            this.error = 'กล้องถูกตัดการเชื่อมต่อ';
            this.publish();
          }
        };
        track.addEventListener?.('ended', ended);
        this.trackListeners.push(() => track.removeEventListener?.('ended', ended));
        const mute = () => {
          if (this.running && this.stream === stream) {
            this.revision++;
            this.cameraState = 'interrupted';
            this.clearObservations();
            this.publish();
          }
        };
        const unmute = () => {
          if (this.running && this.stream === stream) { this.cameraState = 'ready'; this.publish(); }
        };
        track.addEventListener?.('mute', mute);
        track.addEventListener?.('unmute', unmute);
        this.trackListeners.push(() => {
          track.removeEventListener?.('mute', mute);
          track.removeEventListener?.('unmute', unmute);
        });
      });
      await this.video.play();
      if (!this.valid(token)) return;
      this.cameraState = 'ready';
      this.publish();
      this.schedule();
    } catch (error) {
      if (!this.valid(token)) return;
      this.stop();
      this.cameraState = 'error';
      this.error = formatCameraError(error);
      this.publish();
    }
  }

  async initializeFace(token) {
    try {
      const model = await this.loadFace();
      if (!this.valid(token)) { void this.closeModel(model); return; }
      this.face = model;
      const context = { busy: false, sample: null };
      this.faceContext = context;
      model.onResults((results) => {
        const sample = context.sample;
        if (this.face !== model || !sample || !this.valid(sample.token) ||
            sample.revision !== this.revision || this.clock() - sample.at > FRESHNESS_MS) return;
        const faces = results.multiFaceLandmarks ?? [];
        const primary = faces[0] ?? null;
        this.faceCount = faces.length;
        this.faceObservedAt = sample.at;
        this.ear = primary ? calculateEAR(primary) : null;
        if (this.ear === null) this.blink.reset();
        else {
          const transition = this.blink.observe(this.ear);
          if (transition) this.callbacks.onBlink({ ...transition, source: 'camera' });
        }

        // Attention / Screen Gaze Tracking
        const attention = checkAttention(primary, this.ear);
        this.lookingAtScreen = attention.lookingAtScreen === true;
        this.attentionReason = attention.reason;
        const qualifiesForAttention = attention.lookingAtScreen === true && attention.eyesOpen === true;
        const trackedAttention = attention.lookingAtScreen === true && !qualifiesForAttention
          ? null : attention.lookingAtScreen;
        const attentionTransition = this.attention.observe(trackedAttention, attention.reason);
        const stable = trackedAttention === true
          ? this.attention.lookStreak >= this.attention.consecutiveRequired
          : trackedAttention === false
            ? this.attention.awayStreak >= this.attention.consecutiveRequired
            : false;
        this.callbacks.onAttention?.({
          ...attention,
          stable,
          transition: Boolean(attentionTransition),
          observedAt: sample.at,
          source: 'camera',
        });

        this.publishObservation();
        this.callbacks.onFaceMeshResults?.(results, this.ear, this.blink.closed, attention);
      });
      this.eyesState = 'ready';
      this.publish();
    } catch (error) {
      if (!this.valid(token)) return;
      this.eyesState = 'error';
      this.error = 'FaceMesh: ' + error.message;
      this.blink.reset();
      this.publishObservation();
      this.publish();
    }
  }

  async initializePerson(token) {
    try {
      const model = await this.loadPerson();
      if (!this.valid(token)) { void this.closeModel(model); return; }
      this.person = model;
      this.personContext = { busy: false };
      this.personState = 'ready';
      this.publish();
    } catch (error) {
      if (!this.valid(token)) return;
      this.personState = 'error';
      this.error = 'COCO-SSD: ' + error.message;
      this.publishObservation();
      this.publish();
    }
  }

  valid(token) { return this.running && !this.disposed && token === this.epoch; }

  schedule() {
    if (!this.running || this.loop !== undefined) return;
    this.loop = this.timers.setTimeout(() => {
      this.loop = undefined;
      this.tick();
      this.schedule();
    }, 33);
  }

  tick() {
    if (!this.running || this.cameraState !== 'ready') return;
    const now = this.clock();
    this.publishObservation();
    if (this.faceObservedAt === null || now - this.faceObservedAt > FRESHNESS_MS) {
      this.blink.reset();
      this.ear = null;
      this.attention.observe(false, 'no-face');
      this.lookingAtScreen = false;
      this.attentionReason = 'no-face';
      this.callbacks.onAttention?.({
        lookingAtScreen: false,
        reason: 'no-face',
        eyesOpen: false,
        stable: this.attention.awayStreak >= this.attention.consecutiveRequired,
        transition: false,
        observedAt: now,
        source: 'camera',
      });
    }
    const newFrame = this.video.currentTime !== this.lastVideoTime;
    if (this.video.readyState >= 2 && this.video.videoWidth && this.video.videoHeight && !this.video.paused && newFrame) {
      this.lastVideoTime = this.video.currentTime;
      if (this.face && this.eyesState === 'ready' && !this.faceContext.busy) void this.inferFace(now);
      if (this.person && this.personState === 'ready' && !this.personContext.busy && now >= this.nextPersonAt) {
        this.nextPersonAt = now + PERSON_INTERVAL_MS;
        void this.inferPerson(now);
      }
    }
    if (now >= (this.nextStatusAt ?? 0)) { this.nextStatusAt = now + 250; this.publish(); }
  }

  async inferFace(at) {
    const model = this.face;
    const context = this.faceContext;
    const token = this.epoch;
    const revision = this.revision;
    context.busy = true;
    context.sample = { at, token, revision };
    try {
      context.pending = model.send({ image: this.video });
      await context.pending;
    } catch (error) {
      if (this.valid(token) && revision === this.revision && this.face === model) {
        this.eyesState = 'error';
        this.error = 'FaceMesh: ' + error.message;
        this.blink.reset();
        this.publishObservation();
        this.publish();
      }
    } finally {
      context.busy = false;
      context.sample = null;
      context.pending = null;
    }
  }

  async inferPerson(at) {
    const model = this.person;
    const context = this.personContext;
    const token = this.epoch;
    const revision = this.revision;
    context.busy = true;
    try {
      context.pending = model.detect(this.video);
      const predictions = await context.pending;
      if (!this.valid(token) || revision !== this.revision || this.person !== model) return;
      if (this.clock() - at > FRESHNESS_MS) { this.unavailable(true); this.publish(); return; }
      this.personCount = countPeople(predictions, PERSON_CONFIDENCE);
      this.personObservedAt = at;
      this.publishObservation(true);
      this.publish();
      this.callbacks.onPersonResults?.(predictions, this.personCount);
    } catch (error) {
      if (this.valid(token) && revision === this.revision && this.person === model) {
        this.personState = 'error';
        this.personCount = 0;
        this.personObservedAt = null;
        this.error = 'COCO-SSD: ' + error.message;
        this.publishObservation();
        this.publish();
      }
    } finally { context.busy = false; context.pending = null; }
  }

  clearObservations() {
    this.blink.reset();
    this.attention.reset();
    this.lookingAtScreen = true;
    this.attentionReason = 'looking-at-screen';
    this.ear = null;
    this.faceCount = 0;
    this.personCount = 0;
    this.personObservedAt = null;
    this.faceObservedAt = null;
    this.nextPersonAt = 0;
    this.lastVideoTime = undefined;
    this.unavailable(true);
  }

  reset() {
    this.revision++;
    this.clearObservations();
    this.publish();
  }

  async closeModel(model, pending = null) {
    try { await pending; } catch { /* Ignore a cancelled inference while releasing its model. */ }
    try { await model?.close?.(); } catch { /* Already-stopped model cleanup is best effort. */ }
  }

  stop() {
    this.running = false;
    this.epoch++;
    if (this.loop !== undefined) { this.timers.clearTimeout(this.loop); this.loop = undefined; }
    this.trackListeners.splice(0).forEach((remove) => remove());
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video?.pause?.();
    if (this.video) this.video.srcObject = null;
    const face = this.face;
    const person = this.person;
    this.face = null;
    this.person = null;
    void this.closeModel(face, this.faceContext?.pending);
    void this.closeModel(person, this.personContext?.pending);
    this.cameraState = 'stopped';
    this.eyesState = 'stopped';
    this.personState = this.loadPerson ? 'stopped' : 'pending-approval';
    this.clearObservations();
    this.publish();
  }

  dispose() { if (!this.disposed) { this.stop(); this.disposed = true; } }
}
