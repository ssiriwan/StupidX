export const EYE_CLOSED_THRESHOLD = 0.18;
export const EYE_OPEN_THRESHOLD = 0.22;

export function calculateEAR(landmarks) {
  const distance = (a, b) => {
    const p = landmarks[a];
    const q = landmarks[b];
    return p && q && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(q.x) && Number.isFinite(q.y)
      ? Math.hypot(p.x - q.x, p.y - q.y) : NaN;
  };
  const leftWidth = distance(33, 133);
  const rightWidth = distance(362, 263);
  if (!(leftWidth > 0) || !(rightWidth > 0)) return null;
  const left = distance(159, 145) / leftWidth;
  const right = distance(386, 374) / rightWidth;
  const ear = (left + right) / 2;
  return Number.isFinite(ear) && ear >= 0 ? ear : null;
}

export function countPeople(predictions, confidence = 0.45) {
  return (Array.isArray(predictions) ? predictions : []).filter((prediction) =>
    prediction.class === 'person' && Number.isFinite(prediction.score) && prediction.score > confidence,
  ).length;
}

export class BlinkTracker {
  constructor(closeThreshold = EYE_CLOSED_THRESHOLD, openThreshold = EYE_OPEN_THRESHOLD) {
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

export function checkAttention(landmarks, ear = null) {
  if (!landmarks || landmarks.length === 0) {
    return { lookingAtScreen: false, reason: 'no-face', eyesOpen: false };
  }

  const pointIsValid = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);
  const required = [1, 10, 33, 133, 152, 263, 362];
  if (!required.every((index) => pointIsValid(landmarks[index]))) {
    return { lookingAtScreen: null, reason: 'unknown', eyesOpen: ear === null ? null : ear >= EYE_OPEN_THRESHOLD };
  }

  if (landmarks.length >= 478 && (!pointIsValid(landmarks[468]) || !pointIsValid(landmarks[473]))) {
    return { lookingAtScreen: null, reason: 'unknown', eyesOpen: ear === null ? null : ear >= EYE_OPEN_THRESHOLD };
  }

  if (ear !== null && !Number.isFinite(ear)) {
    return { lookingAtScreen: null, reason: 'unknown', eyesOpen: null };
  }

  // 1. Eye closure / blink
  if (ear !== null && ear <= EYE_CLOSED_THRESHOLD) {
    return { lookingAtScreen: false, reason: 'eyes-closed', eyesOpen: false };
  }

  const p = (idx) => landmarks[idx];
  const nose = p(1);
  const eyeL = p(33);
  const eyeR = p(263);
  const chin = p(152);
  const forehead = p(10);

  const eyesOpen = ear === null ? null : ear >= EYE_OPEN_THRESHOLD;

  // 2. Head Yaw (หันซ้าย / หันขวา)
  const dL = Math.hypot(nose.x - eyeL.x, nose.y - eyeL.y);
  const dR = Math.hypot(nose.x - eyeR.x, nose.y - eyeR.y);
  const yawDist = dL + dR;
  if (yawDist > 0.02) {
    const yawRatio = dL / yawDist;
    if (yawRatio < 0.30) {
      return { lookingAtScreen: false, reason: 'head-turned-left', yawRatio, eyesOpen };
    }
    if (yawRatio > 0.70) {
      return { lookingAtScreen: false, reason: 'head-turned-right', yawRatio, eyesOpen };
    }
  }

  // 3. Head Pitch (ก้ม / เงย)
  if (pointIsValid(chin) && pointIsValid(forehead)) {
    const dTop = Math.abs(nose.y - forehead.y);
    const dBottom = Math.abs(chin.y - nose.y);
    const pitchDist = dTop + dBottom;
    if (pitchDist > 0.05) {
      const pitchRatio = dTop / pitchDist;
      if (pitchRatio < 0.35) {
        return { lookingAtScreen: false, reason: 'head-tilted-up', pitchRatio, eyesOpen };
      }
      if (pitchRatio > 0.78) {
        return { lookingAtScreen: false, reason: 'head-tilted-down', pitchRatio, eyesOpen };
      }
    }
  }

  // 4. Iris gaze (when 478 refined landmarks are available)
  if (landmarks.length >= 478 && landmarks[468] && landmarks[473]) {
    const innerL = p(133);
    const innerR = p(362);
    if (innerL && innerR) {
      const wL = Math.abs(innerL.x - eyeL.x);
      const wR = Math.abs(eyeR.x - innerR.x);
      if (wL > 0.015 && wR > 0.015) {
        const minXL = Math.min(eyeL.x, innerL.x);
        const minXR = Math.min(eyeR.x, innerR.x);
        const irisLH = (landmarks[468].x - minXL) / wL;
        const irisRH = (landmarks[473].x - minXR) / wR;
        if ((irisLH < 0.22 && irisRH < 0.22) || (irisLH > 0.78 && irisRH > 0.78)) {
          return { lookingAtScreen: false, reason: 'gaze-away', eyesOpen };
        }
      }
    }
  }

  return { lookingAtScreen: true, reason: 'looking-at-screen', eyesOpen };
}

export class AttentionTracker {
  constructor(consecutiveRequired = 2) {
    this.consecutiveRequired = consecutiveRequired;
    this.lookingAtScreen = true;
    this.awayStreak = 0;
    this.lookStreak = 0;
  }

  reset() {
    this.lookingAtScreen = true;
    this.awayStreak = 0;
    this.lookStreak = 0;
  }

  observe(looking, reason = '') {
    if (looking !== true && looking !== false) {
      this.awayStreak = 0;
      this.lookStreak = 0;
      return null;
    }
    if (looking) {
      this.awayStreak = 0;
      this.lookStreak++;
      if (!this.lookingAtScreen && this.lookStreak >= this.consecutiveRequired) {
        this.lookingAtScreen = true;
        return { lookingAtScreen: true, reason: 'looking-at-screen' };
      }
    } else {
      this.lookStreak = 0;
      this.awayStreak++;
      if (this.lookingAtScreen && this.awayStreak >= this.consecutiveRequired) {
        this.lookingAtScreen = false;
        return { lookingAtScreen: false, reason };
      }
    }
    return null;
  }
}
