const defaultClock = () => performance.now();
const defaultTimers = {
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (id) => globalThis.clearTimeout(id),
};

/** A single deadline that keeps its unspent duration while suspended. */
export class PausableTimer {
  constructor(callback, delay, { clock = defaultClock, timers = defaultTimers } = {}) {
    this.callback = callback;
    this.clock = clock;
    this.timers = timers;
    this.left = Math.max(0, delay);
    this.handle = null;
    this.deadline = null;
    this.finished = false;
    this.resume();
  }

  get remaining() {
    return this.finished ? 0 : this.deadline === null ? this.left : Math.max(0, this.deadline - this.clock());
  }

  pause() {
    if (this.finished || this.deadline === null) return;
    this.left = this.remaining;
    this.timers.clearTimeout(this.handle);
    this.handle = null;
    this.deadline = null;
  }

  resume() {
    if (this.finished || this.deadline !== null) return;
    this.deadline = this.clock() + this.left;
    this.handle = this.timers.setTimeout(() => {
      if (this.finished || this.deadline === null) return;
      this.finished = true;
      this.handle = null;
      this.deadline = null;
      this.left = 0;
      this.callback();
    }, this.left);
  }

  cancel() {
    if (this.handle !== null) this.timers.clearTimeout(this.handle);
    this.handle = null;
    this.deadline = null;
    this.left = 0;
    this.finished = true;
  }
}
