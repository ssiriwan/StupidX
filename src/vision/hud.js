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
            <strong data-hud-people>0 คน (ปลอดภัย)</strong>
          </div>
          <div class="hud-stat-row">
            <span>การลืมตา (EAR):</span>
            <strong data-hud-ear>—</strong>
          </div>
          <div class="hud-stat-row">
            <span>สถานะกะพริบตา:</span>
            <strong data-hud-blink>ตาเปิด</strong>
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
  }

  function detachStream() {
    if (overlay) overlay.hidden = false;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawFaceMesh(results, ear, closed) {
    if (!canvas || !video) return;
    if (video.videoWidth && canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (telemetryEar && ear !== null) telemetryEar.textContent = ear.toFixed(3);
    if (telemetryBlink) {
      telemetryBlink.textContent = closed ? '👀 ตาปิด (กะพริบ!)' : 'ตาเปิด';
      telemetryBlink.style.color = closed ? '#ffbb00' : 'var(--accent)';
    }

    const faces = results?.multiFaceLandmarks ?? [];
    if (faces.length > 0) {
      const primary = faces[0];
      ctx.fillStyle = closed ? '#ff3333' : '#00ff88';
      const eyeIndices = [159, 145, 33, 133, 386, 374, 362, 263];
      eyeIndices.forEach(idx => {
        const pt = primary[idx];
        if (pt) {
          ctx.beginPath();
          ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  }

  function drawPredictions(predictions, personCount) {
    if (!canvas || !video) return;
    if (telemetryPeople) {
      const threat = personCount > 1;
      telemetryPeople.textContent = `${personCount} คน (${threat ? '🚨 เจ้านายมา!' : 'ปลอดภัย'})`;
      telemetryPeople.style.color = threat ? '#ff3333' : '#00ff88';
    }

    const ctx = canvas.getContext('2d');
    if (predictions && Array.isArray(predictions)) {
      const people = predictions.filter(p => p.class === 'person');
      people.forEach((p, idx) => {
        const [x, y, w, h] = p.bbox;
        const isThreat = idx >= 1 || personCount > 1;
        ctx.strokeStyle = isThreat ? '#ff3333' : '#00ff88';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = isThreat ? '#ff3333' : '#00ff88';
        ctx.font = '12px monospace';
        ctx.fillText(isThreat ? '🚨 BOSS' : 'USER', x + 4, y + 14);
      });
    }
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
