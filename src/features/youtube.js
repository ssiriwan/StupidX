export function extractVideoId(input) {
  const text = String(input).trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.slice(1).split('/')[0];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = url.searchParams.get('v') ?? (/^\/(?:embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null);
    }
    return /^[\w-]{11}$/.test(id ?? '') ? id : null;
  } catch { return null; }
}

export class PlaybackGuard {
  constructor({ canInteract = () => true } = {}) { this.canInteract = canInteract; this.player = null; this.muted = false; this.suspended = true; }
  attach(player) { this.player = player; this.pause(); if (this.muted) player.mute?.(); }
  pause() { this.player?.pauseVideo?.(); }
  suspend() { this.suspended = true; this.pause(); }
  resume() { this.suspended = false; }
  play() { if (this.suspended || !this.canInteract()) return false; this.player?.playVideo?.(); return Boolean(this.player); }
  setMute(muted) { this.muted = muted; if (muted) this.player?.mute?.(); else this.player?.unMute?.(); }
  onPlaying() { if (this.suspended || !this.canInteract()) this.pause(); }
}

let apiPromise;
function loadAPI() {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let settled = false;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.id = 'youtube-api';
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) { script.remove(); apiPromise = null; reject(error); }
      else resolve(globalThis.YT);
    };
    const timeout = setTimeout(() => finish(new Error('เชื่อมต่อ YouTube ไม่สำเร็จ · กดเชื่อมต่อเพื่อลองใหม่')), 15000);
    globalThis.onYouTubeIframeAPIReady = () => finish();
    script.onerror = () => finish(new Error('โหลด YouTube ไม่ได้ · ตรวจสอบอินเทอร์เน็ต'));
    document.head.append(script);
  });
  return apiPromise;
}

export function createYouTube({ canInteract = () => true } = {}) {
  const guard = new PlaybackGuard({ canInteract });
  let root, abort, player, ready = false, disposed = false, connecting = false, generation = 0;
  let videoId = 'dQw4w9WgXcQ';
  const status = (text) => { if (root) root.querySelector('[data-yt-status]').textContent = text; };
  const buttons = () => {
    if (!root) return;
    root.querySelector('[data-yt-play]').disabled = !ready;
    root.querySelector('[data-yt-pause]').disabled = !ready;
    root.querySelector('[data-yt-mute]').disabled = !ready;
  };
  async function connect() {
    if (connecting || disposed || ready) return;
    connecting = true;
    const token = ++generation;
    status('กำลังเชื่อมต่อเครื่องเล่น YouTube…');
    try {
      const YT = await loadAPI();
      if (disposed || token !== generation) return;
      root.querySelector('[data-yt-host]').replaceChildren();
      const target = document.createElement('div');
      root.querySelector('[data-yt-host]').append(target);
      player = new YT.Player(target, {
        width: '100%', height: '100%', videoId,
        playerVars: { autoplay: 0, playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady(event) {
            if (disposed || token !== generation) { event.target.destroy(); return; }
            ready = true; guard.attach(event.target); buttons(); status('พร้อมแล้ว · กด Play เพื่อเริ่มอู้');
          },
          onStateChange(event) { if (event.data === 1) guard.onPlaying(); },
          onError(event) { status(`คลิปนี้เล่นไม่ได้ (${event.data}) · ลอง URL อื่นหรือเปิด YouTube เอง`); },
        },
      });
    } catch (error) { if (!disposed && token === generation) status(error.message); }
    finally { if (token === generation) connecting = false; }
  }
  function cue(input) {
    if (!canInteract()) return;
    const id = extractVideoId(input);
    if (!id) { status('ลิงก์ไม่ถูกต้อง · ใส่ URL YouTube หรือรหัสวิดีโอ 11 ตัว'); return; }
    videoId = id;
    guard.pause();
    if (ready) { player.cueVideoById(id); status('โหลดคลิปแล้ว · กด Play เองเมื่อพร้อม'); }
    else connect();
  }
  return {
    mount(container) {
      if (root) return;
      root = container;
      abort = new AbortController();
      root.innerHTML = `<div class="feature youtube-feature">
        <div class="yt-heading"><div><span class="eyebrow">ANTI-FOMO DEPARTMENT</span><h1>คุณกะพริบ เราหยุด<span class="punctuation">.</span></h1><p class="muted">ตรวจพบว่าคุณพลาดไป 0.2 วินาที เรารับไม่ได้</p></div><span class="yt-stamp">ทุกเฟรม<br><strong>สำคัญมาก™</strong></span></div>
        <form class="yt-url-form"><label class="sr-only" for="youtube-url">URL YouTube</label><input id="youtube-url" class="field" name="url" placeholder="วางลิงก์ YouTube ที่ควรดูในเวลางาน…" value="https://youtu.be/dQw4w9WgXcQ"><button class="button button-primary" type="submit">โหลดคลิป ↗</button></form>
        <div class="yt-screen"><div data-yt-host class="yt-host"><div class="yt-placeholder"><span class="yt-placeholder-symbol">Ⅱ</span><h2>พักไว้ก่อน แล้วค่อย Play</h2><p>เครื่องเล่นจริงต้องใช้อินเทอร์เน็ต</p></div></div></div>
        <div class="yt-controls"><div><button type="button" class="button button-primary" data-yt-play>▶ Play</button><button type="button" class="button" data-yt-pause>Ⅱ Pause</button><button type="button" class="button" data-yt-mute aria-pressed="false">เสียง: เปิด</button></div><button type="button" class="button" data-yt-connect>เชื่อมต่อ YouTube</button></div>
        <p class="yt-status" role="status" data-yt-status>กำลังเตรียมเครื่องเล่น…</p>
        <div class="yt-presets"><span class="muted">วาระการประชุม:</span><button class="button" type="button" data-video="dQw4w9WgXcQ">เพลงที่ทุกคนรู้จัก</button><button class="button" type="button" data-video="jfKfPfyJRdk">พักสมอง / Lofi</button><span class="muted">ลืมตาแล้วคลิปยังหยุด · ต้องกด Play เอง</span></div>
      </div>`;
      const options = { signal: abort.signal };
      root.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); cue(root.querySelector('input').value); }, options);
      root.querySelector('[data-yt-play]').addEventListener('click', () => { if (guard.play()) status('กำลังเล่น · อย่าพลาดแม้แต่เสี้ยววินาที'); }, options);
      root.querySelector('[data-yt-pause]').addEventListener('click', () => { if (canInteract()) { guard.pause(); status('หยุดไว้แล้ว · ตำแหน่งคลิปยังอยู่'); } }, options);
      root.querySelector('[data-yt-mute]').addEventListener('click', (event) => {
        if (!canInteract()) return;
        guard.setMute(!guard.muted); event.currentTarget.textContent = guard.muted ? 'เสียง: ปิด' : 'เสียง: เปิด'; event.currentTarget.setAttribute('aria-pressed', String(guard.muted));
      }, options);
      root.querySelector('[data-yt-connect]').addEventListener('click', () => { if (canInteract()) connect(); }, options);
      root.querySelectorAll('[data-video]').forEach((button) => button.addEventListener('click', () => cue(button.dataset.video), options));
      buttons(); connect();
    },
    blinkPause() { guard.pause(); status('กะพริบตาแล้ว กรุณากดเล่นต่อเอง'); },
    suspend(reason) { guard.suspend(); if (ready && reason !== 'initial') status('หยุดไว้แล้ว · กลับมาแล้วกด Play เอง'); },
    resume() { guard.resume(); },
    reset() { guard.pause(); videoId = 'dQw4w9WgXcQ'; if (ready) player.cueVideoById(videoId); if (root) root.querySelector('input').value = 'https://youtu.be/dQw4w9WgXcQ'; status(ready ? 'พร้อมแล้ว · กด Play เพื่อเริ่มอู้' : 'YouTube ยังไม่พร้อม · ลองเชื่อมต่อใหม่'); },
    dispose() { if (disposed) return; disposed = true; generation++; abort?.abort(); guard.suspend(); player?.destroy?.(); guard.player = null; ready = false; },
    getState() { return { ready, videoId, muted: guard.muted, suspended: guard.suspended }; },
  };
}
