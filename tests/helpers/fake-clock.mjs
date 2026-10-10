export function fakeClock() {
  let now = 0;
  let id = 0;
  const jobs = new Map();
  return {
    clock: () => now,
    timers: {
      setTimeout(callback, delay) { const key = ++id; jobs.set(key, { callback, at: now + delay }); return key; },
      clearTimeout(key) { jobs.delete(key); },
    },
    advance(amount) {
      const end = now + amount;
      while (true) {
        const pending = [...jobs.entries()].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!pending) break;
        const [key, job] = pending;
        now = job.at;
        jobs.delete(key);
        job.callback();
      }
      now = end;
    },
    pending: () => jobs.size,
  };
}
