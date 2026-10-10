import { normalizePreferences, OS_OPTIONS, SUBTHEME_OPTIONS, RESUME_POLICIES } from './preferences.js';

export const LEISURE = 'LEISURE';
export const WORK_LOCKED = 'WORK_LOCKED';
export const WORK_READY = 'WORK_READY';
const TABS = new Set(['youtube', 'ai', 'music']);
export const OS_LIST = OS_OPTIONS;
export const OS_CHOICES = OS_LIST;
export const SUBTHEMES = SUBTHEME_OPTIONS;
export const THEMES = new Set(['win11', 'dark', 'win95', 'xp', 'gov', 'hi5', 'matrix', 'icu']);

export function ignoresShortcut(event) {
  if (event.isComposing || event.keyCode === 229 || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return true;
  const target = event.target;
  return Boolean(target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

/** No browser or model dependency; every sensor and simulation uses these events. */
export class SessionController {
  constructor({ clock = () => performance.now(), freshnessMs = 1500, safeDelay = 2000, preferences = {}, onChange = () => {}, onMode = () => {}, onTab = () => {}, onBlink = () => {} } = {}) {
    Object.assign(this, { clock, freshnessMs, safeDelay, onChange, onMode, onTab, onBlink });
    this.mode = LEISURE;
    this.activeTab = 'youtube';
    Object.assign(this, normalizePreferences(preferences));
    this.theme = this.subtheme === 'default' ? this.os : this.subtheme;
    this.blinkCount = 0;
    this.eyesClosed = false;
    this.observation = null;
    this.safeSince = null;
    this.reason = null;
    this.bsod = false;
  }

  isFresh(now = this.clock()) {
    const obs = this.observation;
    return Boolean(obs?.available && obs.calibrated && obs.observedAt <= now && now - obs.observedAt <= this.freshnessMs);
  }

  snapshot() {
    const fresh = this.isFresh();
    return {
      mode: this.mode, activeTab: this.activeTab,
      os: this.os, subtheme: this.subtheme, theme: this.theme, resumePolicy: this.resumePolicy,
      blinkCount: this.blinkCount, eyesClosed: this.eyesClosed,
      fresh, unknown: !fresh, present: fresh && this.observation.present,
      source: this.observation?.source ?? null,
      canReturn: this.mode === WORK_READY && fresh && !this.observation.present,
      safeRemaining: this.safeSince === null ? this.safeDelay : Math.max(0, this.safeDelay - (this.clock() - this.safeSince)),
      reason: this.reason,
      bsod: this.bsod,
    };
  }

  triggerBsod() {
    if (this.mode === LEISURE) return false;
    if (this.bsod) return true;
    this.bsod = true;
    this.emit();
    return true;
  }

  dismissBsod() {
    if (!this.bsod) return false;
    this.bsod = false;
    this.emit();
    return true;
  }

  emit() { this.onChange(this.snapshot()); }

  changeMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.onMode(mode, this.snapshot());
  }

  enterWork(reason = 'manual') {
    this.reason = reason;
    this.safeSince = null;
    this.changeMode(WORK_LOCKED);
    this.emit();
  }

  observePerson({ present, available, observedAt = this.clock(), calibrated = true, source = 'camera' }) {
    const now = this.clock();
    if (!Number.isFinite(observedAt) || observedAt > now || observedAt < (this.observation?.observedAt ?? -Infinity)) return;
    const previous = this.observation;
    const continuous = this.isFresh(now) && previous?.source === source;
    this.observation = { present: Boolean(present), available: Boolean(available), calibrated: Boolean(calibrated), observedAt, source };
    if (!this.isFresh(now)) {
      this.safeSince = null;
      if (this.mode !== LEISURE) this.changeMode(WORK_LOCKED);
    } else if (present) {
      this.safeSince = null;
      if (this.mode === LEISURE) this.enterWork(source === 'simulation' ? 'simulation' : 'person');
      else this.changeMode(WORK_LOCKED);
    } else if (this.mode !== LEISURE) {
      if (!continuous || previous?.present || this.safeSince === null) this.safeSince = observedAt;
      this.tick(false);
    }
    this.emit();
  }

  tick(emit = true) {
    if (!this.isFresh()) {
      this.safeSince = null;
      if (this.mode !== LEISURE) this.changeMode(WORK_LOCKED);
    } else if (this.mode !== LEISURE && !this.observation.present && this.safeSince !== null && this.clock() - this.safeSince >= this.safeDelay) {
      this.changeMode(WORK_READY);
    }
    if (emit) this.emit();
  }

  requestReturn({ acknowledgeUnknown = false } = {}) {
    if (this.bsod) return false;
    this.tick(false);
    if (this.mode === LEISURE) return true;
    const state = this.snapshot();
    if (!state.canReturn && !(state.unknown && acknowledgeUnknown)) { this.emit(); return false; }
    this.reason = null;
    this.safeSince = null;
    this.changeMode(LEISURE);
    this.emit();
    return true;
  }

  observeBlink({ closed }) {
    const changedToClosed = Boolean(closed) && !this.eyesClosed;
    this.eyesClosed = Boolean(closed);
    if (changedToClosed) {
      this.blinkCount += 1;
      this.onBlink(this.snapshot());
    }
    this.emit();
  }

  setTab(tab) {
    if (this.mode !== LEISURE || !TABS.has(tab) || this.activeTab === tab) return false;
    const previous = this.activeTab;
    this.activeTab = tab;
    this.onTab(tab, previous);
    this.emit();
    return true;
  }

  setOS(os) {
    if (this.mode !== LEISURE || !OS_LIST.has(os)) return false;
    this.os = os;
    this.theme = this.subtheme === 'default' ? this.os : this.subtheme;
    this.emit();
    return true;
  }

  setSubtheme(subtheme) {
    if (this.mode !== LEISURE || !SUBTHEMES.has(subtheme)) return false;
    this.subtheme = subtheme;
    this.theme = this.subtheme === 'default' ? this.os : this.subtheme;
    this.emit();
    return true;
  }

  setTheme(theme) {
    if (this.mode !== LEISURE || (!THEMES.has(theme) && !SUBTHEMES.has(theme))) return false;
    if (OS_LIST.has(theme)) {
      this.os = theme;
      this.subtheme = 'default';
    } else if (SUBTHEMES.has(theme)) {
      this.subtheme = theme;
    }
    this.theme = this.subtheme === 'default' ? this.os : this.subtheme;
    this.emit();
    return true;
  }

  setResumePolicy(policy) {
    if (this.mode !== LEISURE || !RESUME_POLICIES.has(policy)) return false;
    this.resumePolicy = policy;
    this.emit();
    return true;
  }

  reset() {
    this.activeTab = 'youtube';
    this.os = 'win11';
    this.subtheme = 'default';
    this.theme = 'win11';
    this.resumePolicy = 'auto';
    this.blinkCount = 0;
    this.eyesClosed = false;
    this.observation = null;
    this.safeSince = null;
    this.reason = null;
    this.bsod = false;
    this.changeMode(LEISURE);
    this.emit();
  }
}
