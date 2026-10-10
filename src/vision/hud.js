export function createCameraHud() {
  let root;
  let video;
  let canvas;
  let overlay;
  let telemetryPeople;
  let telemetryEar;
  let telemetryBlink;
  let isMinimized = false;
  let isHidden = false;

  let lastFaces = [];
  let lastPredictions = [];
  let lastFaceCount = 0;
  let lastPersonCount = 0;
  let lastEar = null;
  let lastClosed = false;

  function mount(container) {
    root = document.createElement('aside');
    root.id = 'camera-hud-window';
    root.className = 'camera-hud-window';
    root.setAttribute('aria-label', 'AI Radar Mirror');
    root.innerHTML = `
      <div class="hud-header">
        <div class="hud-title">
          <span class="hud-dot"></span>
          <strong>AI RADAR MIRROR</strong>
        </div>
        <div class="hud-controls">
          <button type="button" class="hud-btn-min" data-hud-min title="ย่อ/ขยาย">_</button>
          <button type="button" class="hud-btn-min" data-hud-close title="ปิดหน้าต่าง">×</button>
        </div>
      </div>
      <div class="hud-body">
        <div class="hud-viewport">
          <video autoplay playsinline muted></video>
          <canvas></canvas>
          <div class="hud-overlay">
            <span>กล้องยังไม่เปิด</span>
            <small>กดปุ่ม "เปิดกล้อง AI" ด้านบนเพื่อเริ่ม</small>
          </div>
        </div>
        <div class="hud-telemetry">
          <div class="hud-stat-row">
            <span>ตรวจจับคน:</span>
            <strong data-hud-people>รอเปิดกล้อง...</strong>
          </div>
          <div class="hud-stat-row">
            <span>การลืมตา (EAR):</span>
            <strong data-hud-ear>—</strong>
          </div>
          <div class="hud-stat-row">
            <span>สถานะกะพริบตา:</span>
            <strong data-hud-blink>รอเปิดกล้อง...</strong>
          </div>
        </div>
      </div>
    `;
    video = root.querySelector('video');
    canvas = root.querySelector('canvas');
    overlay = root.querySelector('.hud-overlay');
    telemetryPeople = root.querySelector('[data-hud-people]');
    telemetryEar = root.querySelector('[data-hud-ear]');
    telemetryBlink = root.querySelector('[data-hud-blink]');

    root.querySelector('[data-hud-min]').addEventListener('click', toggleMinimize);
    root.querySelector('[data-hud-close]').addEventListener('click', toggleVisibility);

    container.append(root);
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    root.classList.toggle('minimized', isMinimized);
  }

  function toggleVisibility() {
    isHidden = !isHidden;
    root.hidden = isHidden;
  }

  function show() {
    isHidden = false;
    root.hidden = false;
  }

  function attachStream(stream) {
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    if (overlay) overlay.hidden = true;
    if (telemetryPeople) {
      telemetryPeople.textContent = 'กำลังเริ่มตรวจจับ...';
      telemetryPeople.style.color = 'var(--accent)';
    }
    if (telemetryBlink) {
      telemetryBlink.textContent = 'ตาเปิด';
      telemetryBlink.style.color = 'var(--accent)';
    }
  }

  function detachStream() {
    if (video) video.srcObject = null;
    if (overlay) overlay.hidden = false;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    lastFaces = [];
    lastPredictions = [];
    lastFaceCount = 0;
    lastPersonCount = 0;
    lastEar = null;
    lastClosed = false;
    if (telemetryPeople) {
      telemetryPeople.textContent = 'กล้องปิดอยู่';
      telemetryPeople.style.color = 'var(--muted)';
    }
    if (telemetryEar) telemetryEar.textContent = '—';
    if (telemetryBlink) {
      telemetryBlink.textContent = 'กล้องปิดอยู่';
      telemetryBlink.style.color = 'var(--muted)';
    }
  }

  function updateTelemetry() {
    const effectiveCount = Math.max(lastFaceCount, lastPersonCount);
    if (telemetryEar && lastEar !== null) telemetryEar.textContent = lastEar.toFixed(3);
    if (telemetryBlink) {
      telemetryBlink.textContent = lastClosed ? '👀 ตาปิด (กะพริบ!)' : 'ตาเปิด';
      telemetryBlink.style.color = lastClosed ? '#ffbb00' : 'var(--accent)';
    }
    if (telemetryPeople) {
      if (effectiveCount === 0) {
        telemetryPeople.textContent = '0 คน · ยังไม่พบใครหน้ากล้อง';
        telemetryPeople.style.color = '#ffbb00';
      } else if (effectiveCount === 1) {
        telemetryPeople.textContent = '1 คน · ตัวคุณ (ปลอดภัย 🟢)';
        telemetryPeople.style.color = '#00ff88';
      } else {
        telemetryPeople.textContent = `${effectiveCount} คน · 🚨 เจ้านายมา!`;
        telemetryPeople.style.color = '#ff3333';
      }
    }
  }

  function renderCanvas() {
    if (!canvas || !video) return;
    if (video.videoWidth && canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const effectiveCount = Math.max(lastFaceCount, lastPersonCount);

    // 1. Draw FaceMesh bounding boxes & eye landmarks
    if (lastFaces && lastFaces.length > 0) {
      lastFaces.forEach((face, idx) => {
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const pt of face) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }

        const padX = (maxX - minX) * 0.15;
        const padY = (maxY - minY) * 0.2;
        const bx = Math.max(0, (minX - padX) * canvas.width);
        const by = Math.max(0, (minY - padY) * canvas.height);
        const bw = Math.min(canvas.width - bx, (maxX - minX + padX * 2) * canvas.width);
        const bh = Math.min(canvas.height - by, (maxY - minY + padY * 2) * canvas.height);

        const isIntruder = idx > 0 || effectiveCount > 1;
        const color = isIntruder ? '#ff3333' : '#00ff88';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Draw HUD Corner Accents
        const corner = Math.min(bw, bh) * 0.2;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(bx, by + corner); ctx.lineTo(bx, by); ctx.lineTo(bx + corner, by);
        // Top-right
        ctx.moveTo(bx + bw - corner, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + corner);
        // Bottom-left
        ctx.moveTo(bx, by + bh - corner); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + corner, by + bh);
        // Bottom-right
        ctx.moveTo(bx + bw - corner, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - corner);
        ctx.stroke();

        // Label with flip compensation
        const label = isIntruder ? '🚨 BOSS / INTRUDER' : '🟢 YOU (คุณ)';
        const textY = by > 20 ? by - 6 : by + 16;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = color;
        ctx.save();
        // Mirrored canvas compensation: translate to right edge of box and flip horizontally
        ctx.translate(bx + bw - 4, textY);
        ctx.scale(-1, 1);
        ctx.fillText(label, 0, 0);
        ctx.restore();

        // Primary face eye markers & blink status
        if (idx === 0) {
          ctx.fillStyle = lastClosed ? '#ffbb00' : '#00ff88';
          const eyeIndices = [159, 145, 33, 133, 386, 374, 362, 263];
          eyeIndices.forEach(eyeIdx => {
            const pt = face[eyeIdx];
            if (pt) {
              ctx.beginPath();
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            }
          });

          if (lastClosed) {
            ctx.save();
            ctx.fillStyle = '#ffbb00';
            ctx.font = 'bold 11px monospace';
            ctx.translate(bx + bw - 4, textY + 16);
            ctx.scale(-1, 1);
            ctx.fillText('👀 PAUSED (กะพริบตา)', 0, 0);
            ctx.restore();
          }
        }
      });
    }

    // 2. Draw COCO-SSD person detections if present
    if (Array.isArray(lastPredictions)) {
      const people = lastPredictions.filter(p => p.class === 'person');
      people.forEach((p, idx) => {
        const [x, y, w, h] = p.bbox;
        const isThreat = idx >= 1 || effectiveCount > 1;
        const color = isThreat ? '#ff3333' : '#00e5ff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        const label = isThreat ? '🚨 PERSON 2' : '👤 BODY';
        ctx.font = '11px monospace';
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(x + w - 4, y + 14);
        ctx.scale(-1, 1);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });
    }
  }

  function drawFaceMesh(results, ear, closed) {
    lastFaces = results?.multiFaceLandmarks ?? [];
    lastFaceCount = lastFaces.length;
    lastEar = ear;
    lastClosed = closed;
    updateTelemetry();
    renderCanvas();
  }

  function drawPredictions(predictions, personCount) {
    lastPredictions = predictions ?? [];
    lastPersonCount = personCount ?? 0;
    updateTelemetry();
    renderCanvas();
  }

  return {
    mount,
    toggleMinimize,
    toggleVisibility,
    show,
    attachStream,
    detachStream,
    drawFaceMesh,
    drawPredictions
  };
}
