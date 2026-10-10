export function calculateEAR(landmarks) {
  const distance = (a, b) => {
    const p = landmarks[a];
    const q = landmarks[b];
    return p && q ? Math.hypot(p.x - q.x, p.y - q.y) : NaN;
  };
  const left = distance(159, 145) / distance(33, 133);
  const right = distance(386, 374) / distance(362, 263);
  const ear = (left + right) / 2;
  return Number.isFinite(ear) && ear >= 0 ? ear : null;
}

export function countPeople(predictions, confidence = 0.45) {
  return (Array.isArray(predictions) ? predictions : []).filter((prediction) =>
    prediction.class === 'person' && Number.isFinite(prediction.score) && prediction.score > confidence,
  ).length;
}

export class BlinkTracker {
  constructor(closeThreshold = 0.18, openThreshold = 0.22) {
    this.closeThreshold = closeThreshold;
    this.openThreshold = openThreshold;
    this.reset();
  }

  reset() { this.closed = null; }

  observe(ear) {
    if (!Number.isFinite(ear)) { this.reset(); return null; }
    if (ear >= this.openThreshold && this.closed !== false) {
      this.closed = false;
      return { closed: false, ear };
    }
    if (ear <= this.closeThreshold && this.closed === false) {
      this.closed = true;
      return { closed: true, ear };
    }
    return null;
  }
}
