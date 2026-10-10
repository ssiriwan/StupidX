import { ignoresShortcut } from '../core/session.js';

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
  constructor({ canInteract = () => true } = {}) {
    this.canInteract = canInteract;
    this.player = null;
    this.muted = false;
    this.suspended = true;
  }
  attach(player) {
    this.player = player;
    this.pause();
    if (this.muted) player.mute?.();
  }
  pause() {
    this.player?.pauseVideo?.();
  }
  suspend() {
    this.suspended = true;
    this.pause();
  }
  resume() {
    this.suspended = false;
  }
  play() {
    if (this.suspended || !this.canInteract()) return false;
    this.player?.playVideo?.();
    return Boolean(this.player);
  }
  setMute(muted) {
    this.muted = muted;
    if (muted) this.player?.mute?.();
    else this.player?.unMute?.();
  }
  onPlaying() {
    if (this.suspended || !this.canInteract()) this.pause();
  }
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
    const timeout = setTimeout(() => finish(new Error('เชื่อมต่อ YouTube ไม่สำเร็จ · ลองกดเชื่อมต่อใหม่')), 15000);
    globalThis.onYouTubeIframeAPIReady = () => finish();
    script.onerror = () => finish(new Error('โหลด YouTube ไม่ได้ · ตรวจสอบอินเทอร์เน็ต'));
    document.head.append(script);
  });
  return apiPromise;
}

const defaultVideos = [
  {
    id: "jfKfPfyJRdk",
    title: "lofi hip hop radio 📚 - beats to relax/study to",
    channel: "Lofi Girl",
    views: "68M views",
    published: "Live now",
    duration: "LIVE",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hq720.jpg"
  },
  {
    id: "fC7oUOUEEi4",
    title: "Cat Vibing To Street Musician's Ievan Polkka (Official Video)",
    channel: "The Kiffness",
    views: "98M views",
    published: "3 years ago",
    duration: "3:08",
    thumbnail: "https://i.ytimg.com/vi/fC7oUOUEEi4/hq720.jpg"
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    channel: "Rick Astley",
    views: "1.5B views",
    published: "14 years ago",
    duration: "3:33",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg"
  },
  {
    id: "YS6pMX13skE",
    title: "CAT MEMES Family Vacation Trip Compilation 😹",
    channel: "NO1 CAT MEMES",
    views: "2.1M views",
    published: "1 month ago",
    duration: "32:37",
    thumbnail: "https://i.ytimg.com/vi/YS6pMX13skE/hq720.jpg"
  },
  {
    id: "OaaxAzx7GeI",
    title: "Cat Clapping Funk vs Meme Compilation",
    channel: "Ya BegituLive",
    views: "2.5M views",
    published: "6 days ago",
    duration: "0:37",
    thumbnail: "https://i.ytimg.com/vi/OaaxAzx7GeI/hq720.jpg"
  },
  {
    id: "0e3GPea1Tyg",
    title: "$456,000 Squid Game In Real Life!",
    channel: "MrBeast",
    views: "620M views",
    published: "2 years ago",
    duration: "25:42",
    thumbnail: "https://i.ytimg.com/vi/0e3GPea1Tyg/hq720.jpg"
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Luis Fonsi - Despacito ft. Daddy Yankee",
    channel: "Luis Fonsi",
    views: "8.4B views",
    published: "7 years ago",
    duration: "4:42",
    thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hq720.jpg"
  },
  {
    id: "kXYiU_JCYtU",
    title: "Numb - Linkin Park (Official Music Video) [4K UPGRADE]",
    channel: "Linkin Park",
    views: "2.2B views",
    published: "17 years ago",
    duration: "3:07",
    thumbnail: "https://i.ytimg.com/vi/kXYiU_JCYtU/hq720.jpg"
  }
];

export function createYouTube({ canInteract = () => true, guard: customGuard = null } = {}) {
  const guard = customGuard ?? new PlaybackGuard({ canInteract });
  let root, abort, player, ready = false, disposed = false, connecting = false, generation = 0;
  let videoId = 'dQw4w9WgXcQ';
  let currentVideo = defaultVideos[0];
  let isBlinkLocked = false;
  let userPaused = false;
  let currentView = 'browse'; // 'browse' or 'watch'
  let resumePolicy = 'auto';
  let confirmedPlaying = false;
  let sensorPauseInFlight = false;
  let lockEligible = false;
  let lockType = null;
  let attentionLookStreak = 0;
  let lastAttentionAt = null;
  let pendingUserPlay = false;
  let terminalVideo = false;
  let latestAttentionObservation = null;

  const status = (text) => {
    if (root) {
      const el = root.querySelector('[data-yt-status]');
      if (el) el.textContent = text;
    }
  };

  const updateButtons = () => {
    if (!root) return;
    const playBtn = root.querySelector('[data-yt-play]');
    const pauseBtn = root.querySelector('[data-yt-pause]');
    const muteBtn = root.querySelector('[data-yt-mute]');
    if (playBtn) playBtn.disabled = !ready;
    if (pauseBtn) pauseBtn.disabled = !ready;
    if (muteBtn) muteBtn.disabled = !ready;
  };

  async function connect() {
    if (connecting || disposed || ready) return;
    connecting = true;
    const token = ++generation;
    let playerCreated = false;
    status('กำลังเชื่อมต่อเครื่องเล่น YouTube…');
    try {
      const YT = await loadAPI();
      if (disposed || token !== generation) return;
      
      const host = root.querySelector('[data-yt-host]');
      if (!host) return;
      host.replaceChildren();
      const target = document.createElement('div');
      host.append(target);

      player = new YT.Player(target, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady(event) {
            if (disposed || token !== generation) { event.target.destroy(); return; }
            connecting = false;
            ready = true;
            guard.attach(event.target);
            updateButtons();
            const startSelectedClip = pendingUserPlay && currentView === 'watch' && canInteract() && !userPaused && !guard.suspended;
            if (startSelectedClip) {
              pendingUserPlay = false;
              event.target.loadVideoById(videoId);
            }
            status(startSelectedClip ? `กำลังโหลดวิดีโอ: ${currentVideo.title}` : 'พร้อมแล้ว · เลือกคลิปเพื่อเริ่มดู');
          },
          onStateChange(event) {
            if (disposed || token !== generation) return;
            if (event.data === 1) {
              if (isBlinkLocked || terminalVideo || currentView !== 'watch' || guard.suspended || !canInteract()) {
                confirmedPlaying = false;
                guard.pause();
                return;
              }
              userPaused = false;
              confirmedPlaying = true;
              status(`กำลังเล่น: ${currentVideo.title}`);
            } else if (event.data === 2) {
              confirmedPlaying = false;
              if (sensorPauseInFlight) sensorPauseInFlight = false;
              else if (!isBlinkLocked) {
                // A native iframe pause is an intentional pause from the user's point of view.
                userPaused = true;
                lockEligible = false;
                status('หยุดไว้แล้ว');
              }
            } else if (event.data === 0) {
              confirmedPlaying = false;
              terminalVideo = true;
              clearAttentionLock();
            } else if (event.data === -1 || event.data === 5 || event.data === 3) {
              confirmedPlaying = false;
            }
          },
          onError(event) {
            if (disposed || token !== generation) return;
            pendingUserPlay = false;
            confirmedPlaying = false;
            terminalVideo = true;
            clearAttentionLock();
            status(`คลิปนี้มีปัญหาจากเจ้าของลิขสิทธิ์ (${event.data}) · ลองเลือกคลิปอื่น`);
          },
        },
      });
      playerCreated = true;
    } catch (error) {
      if (!disposed && token === generation) {
        connecting = false;
        status(error.message);
      }
    } finally {
      if (token === generation && !playerCreated) connecting = false;
    }
  }

  function playVideoItem(item) {
    if (!canInteract()) return;
    userPaused = false;
    confirmedPlaying = false;
    terminalVideo = false;
    lockEligible = false;
    lockType = null;
    pendingUserPlay = true;
    isBlinkLocked = false;
    if (root) {
      const overlay = root.querySelector('[data-yt-blink-overlay]');
      if (overlay) overlay.hidden = true;
    }
    currentVideo = item;
    videoId = item.id;
    guard.resume();

    // Switch view to Watch View
    switchView('watch');

    if (root) {
      const titleEl = root.querySelector('[data-current-title]');
      const channelEl = root.querySelector('[data-current-channel]');
      if (titleEl) titleEl.textContent = item.title;
      if (channelEl) channelEl.textContent = item.channel;
    }

    if (ready && player) {
      pendingUserPlay = false;
      player.loadVideoById(item.id);
      status(`กำลังขอเล่น: ${item.title}`);
    } else {
      connect();
    }

    renderRelated(item);
  }

  function switchView(view) {
    if (view !== 'watch' && currentView === 'watch') {
      pendingUserPlay = false;
      confirmedPlaying = false;
      lockEligible = false;
      clearAttentionLock();
      guard.pause();
    }
    currentView = view;
    if (!root) return;
    const browse = root.querySelector('[data-yt-browse-view]');
    const watch = root.querySelector('[data-yt-watch-view]');
    if (browse && watch) {
      browse.hidden = view !== 'browse';
      watch.hidden = view !== 'watch';
    }
  }

  function renderGrid(videos) {
    if (!root) return;
    const grid = root.querySelector('[data-yt-grid]');
    if (!grid) return;
    grid.replaceChildren();

    if (!videos || videos.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'yt-empty-state';
      empty.textContent = 'ไม่พบวิดีโอที่ค้นหา ลองค้นหาด้วยคำอื่นดูครับ';
      grid.append(empty);
      return;
    }

    videos.forEach(v => {
      const card = document.createElement('div');
      card.className = 'yt-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.innerHTML = `
        <div class="yt-thumb-box">
          <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
          ${v.duration ? `<span class="yt-duration">${v.duration}</span>` : ''}
        </div>
        <div class="yt-meta">
          <div class="yt-avatar">${v.channel ? v.channel.slice(0, 1).toUpperCase() : 'Y'}</div>
          <div class="yt-info">
            <h4 class="yt-card-title" title="${v.title}">${v.title}</h4>
            <p class="yt-card-channel">${v.channel}</p>
            <p class="yt-card-stats">${v.views || ''} ${v.published ? '• ' + v.published : ''}</p>
          </div>
        </div>
      `;
      card.addEventListener('click', () => playVideoItem(v));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playVideoItem(v);
        }
      });
      grid.append(card);
    });
  }

  function renderRelated(current) {
    if (!root) return;
    const list = root.querySelector('[data-yt-related-list]');
    if (!list) return;
    list.replaceChildren();

    const related = defaultVideos.filter(v => v.id !== current.id);
    related.forEach(v => {
      const row = document.createElement('div');
      row.className = 'yt-related-row';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.innerHTML = `
        <div class="yt-related-thumb">
          <img src="${v.thumbnail}" alt="${v.title}">
          ${v.duration ? `<span class="yt-duration">${v.duration}</span>` : ''}
        </div>
        <div class="yt-related-info">
          <h5>${v.title}</h5>
          <p>${v.channel}</p>
          <small>${v.views}</small>
        </div>
      `;
      row.addEventListener('click', () => playVideoItem(v));
      list.append(row);
    });
  }

  async function searchVideos(query) {
    status(`กำลังค้นหา "${query}" บน YouTube...`);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          renderGrid(results);
          status(`พบ ${results.length} วิดีโอสำหรับ "${query}"`);
          return;
        }
      }
    } catch (err) {
      console.warn("Backend search endpoint unavailable, using fallback filter.");
    }

    const filtered = defaultVideos.filter(v => 
      v.title.toLowerCase().includes(query.toLowerCase()) || 
      v.channel.toLowerCase().includes(query.toLowerCase())
    );
    renderGrid(filtered.length > 0 ? filtered : defaultVideos);
    status(`ค้นหา "${query}" เสร็จสิ้น`);
  }

  function showAttentionLock({ type = 'look-away', reason = '' } = {}) {
    if (userPaused || currentView !== 'watch' || !confirmedPlaying) return false;
    latestAttentionObservation = null;
    attentionLookStreak = 0;
    lastAttentionAt = null;
    lockEligible = true;
    lockType = type;
    confirmedPlaying = false;
    sensorPauseInFlight = true;
    isBlinkLocked = true;
    guard.pause();
    if (root) {
      const overlay = root.querySelector('[data-yt-blink-overlay]');
      const icon = root.querySelector('[data-yt-lock-icon]');
      const title = root.querySelector('[data-yt-lock-title]');
      const desc = root.querySelector('[data-yt-lock-desc]');
      if (overlay) overlay.hidden = false;

      let reasonText = 'คุณไม่ได้มองหน้าจอ';
      if (type === 'blink') {
        reasonText = 'ตรวจพบการกระพริบตา';
        if (icon) icon.textContent = '👁️';
        if (title) title.textContent = 'ตรวจพบการกระพริบตา! วิดีโอหยุดทำงาน';
        if (desc) desc.innerHTML = 'ระบบ <strong>Anti-FOMO</strong> ล็อควิดีโอไว้ เพื่อให้แน่ใจว่าคุณจะไม่พลาดเนื้อหาสำคัญแม้แต่เฟรมเดียว';
      } else {
        if (reason === 'no-face') reasonText = 'ไม่พบคุณอยู่หน้าจอ';
        else if (reason === 'head-turned-left') reasonText = 'หันศีรษะไปทางซ้าย (ไม่ได้มองจอ)';
        else if (reason === 'head-turned-right') reasonText = 'หันศีรษะไปทางขวา (ไม่ได้มองจอ)';
        else if (reason === 'head-tilted-up') reasonText = 'เงยหน้าขึ้น (ไม่ได้มองจอ)';
        else if (reason === 'head-tilted-down') reasonText = 'ก้มหน้าลง (มองโทรศัพท์หรือคีย์บอร์ด)';
        else if (reason === 'gaze-away') reasonText = 'สายตามองออกไปนอกจอ';

        if (icon) icon.textContent = '👀';
        if (title) title.textContent = 'ตรวจพบว่าไม่ได้มองหน้าจอ! วิดีโอหยุดทำงาน';
        if (desc) desc.innerHTML = `ระบบ <strong>Anti-FOMO</strong> ตรวจพบว่า (${reasonText}) จึงหยุดวิดีโอไว้ เพื่อไม่ให้คุณพลาดเนื้อหาสำคัญ`;
      }
    }
    updateAttentionLockCopy();
    return true;
  }

  function showBlinkLock() {
    showAttentionLock({ type: 'blink' });
  }

  function dismissBlinkLock(userInitiated = false) {
    if (!isBlinkLocked || userPaused || !lockEligible || !canInteract() || guard.suspended) return false;
    if (resumePolicy === 'manual' && !userInitiated) return false;
    const previousLockType = lockType;
    isBlinkLocked = false;
    lockEligible = false;
    lockType = null;
    guard.resume();
    const played = guard.play();
    if (!played) {
      isBlinkLocked = true;
      lockEligible = true;
      lockType = previousLockType;
      if (root) {
        const overlay = root.querySelector('[data-yt-blink-overlay]');
        if (overlay) overlay.hidden = false;
      }
      return false;
    }
    if (root) {
      const overlay = root.querySelector('[data-yt-blink-overlay]');
      if (overlay) overlay.hidden = true;
    }
    status('กำลังขอเล่นต่อ · รอสัญญาณจากวิดีโอ');
    return true;
  }

  function updateAttentionLockCopy() {
    if (root) {
      const desc = root.querySelector('[data-yt-lock-desc]');
      const button = root.querySelector('[data-yt-resume]');
      const hint = root.querySelector('.yt-blink-card small');
      if (desc && resumePolicy === 'manual') {
        desc.textContent = 'วิดีโอหยุดไว้แล้ว · กดปุ่มด้านล่างหรือ Space เพื่อเล่นต่อ';
      } else if (desc) {
        desc.textContent = 'ระบบหยุดวิดีโอไว้ชั่วคราว และจะขอเล่นต่อเมื่อมองจอด้วยตาที่เปิดอยู่';
      }
      if (button) button.textContent = resumePolicy === 'manual' ? '▶ เล่นต่อด้วยตัวเอง' : '▶ ยืนยันว่าพร้อมดูต่อ (กดเพื่อเล่นต่อ)';
      if (hint) hint.textContent = resumePolicy === 'manual' ? 'หรือกดปุ่ม Space บนคีย์บอร์ด' : 'ระบบเล่นต่อเมื่อพบสายตาที่เปิดและมองจอ';
    }
    status(resumePolicy === 'manual'
      ? '👀 วิดีโอถูกล็อคไว้ · กดปุ่มเล่นต่อหรือ Space'
      : '👀 วิดีโอถูกล็อคไว้ · จะขอเล่นต่อเมื่อมองจอด้วยตาที่เปิดอยู่');
  }

  function playManually() {
    if (!canInteract() || currentView !== 'watch' || guard.suspended || !ready || !player) return false;
    const wasLocked = isBlinkLocked;
    const wasUserPaused = userPaused;
    const wasLockType = lockType;
    const wasTerminal = terminalVideo;
    userPaused = false;
    terminalVideo = false;
    pendingUserPlay = false;
    if (isBlinkLocked) clearAttentionLock();
    guard.resume();
    const played = guard.play();
    if (!played) {
      userPaused = wasUserPaused;
      terminalVideo = wasTerminal;
      if (wasLocked) {
        isBlinkLocked = true;
        lockEligible = true;
        lockType = wasLockType;
        if (root) {
          const overlay = root.querySelector('[data-yt-blink-overlay]');
          if (overlay) overlay.hidden = false;
        }
      }
    }
    return played;
  }

  function pauseManually() {
    if (!canInteract()) return false;
    pendingUserPlay = false;
    userPaused = true;
    confirmedPlaying = false;
    clearAttentionLock();
    guard.pause();
    return true;
  }

  function attentionResume() {
    return tryRecover(latestAttentionObservation ?? {});
  }

  function clearAttentionLock() {
    isBlinkLocked = false;
    lockEligible = false;
    lockType = null;
    sensorPauseInFlight = false;
    attentionLookStreak = 0;
    lastAttentionAt = null;
    latestAttentionObservation = null;
    if (root) {
      const overlay = root.querySelector('[data-yt-blink-overlay]');
      if (overlay) overlay.hidden = true;
    }
  }

  function tryRecover(observation = {}) {
    if (!isBlinkLocked || !lockEligible || userPaused || !canInteract() ||
        currentView !== 'watch' || !confirmedLockVideo()) return false;
    if (resumePolicy !== 'auto') return false;
    if (observation.lookingAtScreen !== true || observation.eyesOpen !== true) {
      attentionLookStreak = 0;
      lastAttentionAt = null;
      return false;
    }
    const now = Number.isFinite(observation.observedAt) ? observation.observedAt : null;
    if (observation.observedAt !== undefined) {
      const clockNow = globalThis.performance?.now?.() ?? Date.now();
      if (now === null || now > clockNow + 100 || clockNow - now > 1000) {
        attentionLookStreak = 0;
        lastAttentionAt = null;
        return false;
      }
    }
    if (observation.stable === true) return dismissBlinkLock();

    const sampleAt = now ?? (globalThis.performance?.now?.() ?? Date.now());
    if (lastAttentionAt === null || sampleAt - lastAttentionAt > 500) attentionLookStreak = 0;
    lastAttentionAt = sampleAt;
    attentionLookStreak++;
    if (attentionLookStreak >= 2) return dismissBlinkLock();
    return false;
  }

  function confirmedLockVideo() {
    return Boolean(player && ready && currentView === 'watch');
  }

  function observeAttention(observation = {}) {
    if (observation.observedAt !== undefined) {
      const now = globalThis.performance?.now?.() ?? Date.now();
      if (!Number.isFinite(observation.observedAt) || observation.observedAt > now + 100 || now - observation.observedAt > 1000) {
        attentionLookStreak = 0;
        lastAttentionAt = null;
        latestAttentionObservation = null;
        return;
      }
    }
    if (observation.lookingAtScreen !== true || observation.eyesOpen !== true) {
      attentionLookStreak = 0;
      lastAttentionAt = null;
      latestAttentionObservation = null;
    } else {
      latestAttentionObservation = observation;
    }
    if (observation.lookingAtScreen === false && observation.stable === true) {
      showAttentionLock({ type: 'look-away', reason: observation.reason });
      return;
    }
    tryRecover(observation);
  }

  function observeBlink(observation = {}) {
    if (observation.closed === true) {
      latestAttentionObservation = null;
      attentionLookStreak = 0;
      showAttentionLock({ type: 'blink' });
    }
    // Recovery is evaluated by the same-frame attention observation. Blink callbacks
    // arrive before attention callbacks, so an open transition must not use cached gaze.
  }

  return {
    mount(container) {
      if (root) return;
      root = container;
      abort = new AbortController();
      const options = { signal: abort.signal };

      root.innerHTML = `
        <div class="feature youtube-feature yt-stream-app">
          <!-- Top YouTube Search Bar -->
          <div class="yt-top-search-area">
            <div class="yt-brand-logo">
              <span class="yt-play-icon">▶</span>
              <strong>YouTube</strong>
              <span class="yt-subtag">CHILL</span>
            </div>
            <form class="yt-search-form" data-yt-search-form>
              <input type="text" class="field yt-search-input" data-yt-search-input placeholder="ค้นหาคลิปบน YouTube ที่ต้องการดูในเวลางาน...">
              <button type="submit" class="button button-primary yt-search-submit">🔍 ค้นหา</button>
            </form>
          </div>

          <!-- Category Pills -->
          <div class="yt-pills-bar">
            <button type="button" class="yt-pill active" data-cat="">ทั้งหมด</button>
            <button type="button" class="yt-pill" data-cat="เพลงฮิต">เพลงฮิต</button>
            <button type="button" class="yt-pill" data-cat="แมวน่ารัก">แมวน่ารัก</button>
            <button type="button" class="yt-pill" data-cat="เกมฮิต">เกมฮิต</button>
            <button type="button" class="yt-pill" data-cat="Lo-Fi">Lo-Fi Chill</button>
            <button type="button" class="yt-pill" data-cat="มีมตลก">มีมตลก</button>
            <button type="button" class="yt-pill" data-cat="Stupid Hackathon">Stupid Hackathon</button>
            <button type="button" class="yt-pill" data-cat="เรื่องผี">เรื่องผี</button>
            <button type="button" class="yt-pill" data-cat="อนิเมะ">อนิเมะ</button>
          </div>

          <!-- VIEW 1: Browse / Search Results Grid -->
          <div class="yt-browse-view" data-yt-browse-view>
            <div class="yt-grid" data-yt-grid></div>
          </div>

          <!-- VIEW 2: Watch Player View (Theatre Mode) -->
          <div class="yt-watch-view" data-yt-watch-view hidden>
            <div class="yt-watch-main">
              <button type="button" class="button yt-back-btn" data-yt-back>← กลับไปเลือกคลิปอื่น</button>

              <div class="yt-screen-wrapper">
                <div class="yt-screen">
                  <div data-yt-host class="yt-host">
                    <div class="yt-placeholder">
                      <span class="yt-placeholder-symbol">Ⅱ</span>
                      <h2>กำลังโหลดสตรีม...</h2>
                    </div>
                  </div>
                </div>

                <!-- ANTI-FOMO BLINK & ATTENTION LOCK OVERLAY -->
                <div class="yt-blink-lock-overlay" data-yt-blink-overlay hidden>
                  <div class="yt-blink-card">
                    <span class="yt-blink-icon" data-yt-lock-icon>👁️</span>
                    <h3 data-yt-lock-title>ตรวจพบการกระพริบตา! วิดีโอหยุดทำงาน</h3>
                    <p data-yt-lock-desc>ระบบ <strong>Anti-FOMO</strong> ล็อควิดีโอไว้ เพื่อให้แน่ใจว่าคุณจะไม่พลาดเนื้อหาสำคัญแม้แต่เฟรมเดียว</p>
                    <button type="button" class="button button-primary yt-resume-btn" data-yt-resume>
                      ▶ ยืนยันว่าพร้อมดูต่อ (กดเพื่อเล่นต่อ)
                    </button>
                    <small>หรือกดปุ่ม [Spacebar] บนคีย์บอร์ด</small>
                  </div>
                </div>
              </div>

              <div class="yt-video-meta">
                <h2 class="yt-video-title" data-current-title>กำลังโหลดชื่อวิดีโอ...</h2>
                <div class="yt-video-channel-row">
                  <div class="yt-channel-badge">
                    <div class="yt-avatar">YT</div>
                    <div>
                      <strong data-current-channel>Channel</strong>
                      <span class="muted">ผู้ติดตาม 2.4M คน</span>
                    </div>
                  </div>
                  <div class="yt-controls-row">
                    <button type="button" class="button button-primary" data-yt-play>▶ Play</button>
                    <button type="button" class="button" data-yt-pause>Ⅱ Pause</button>
                    <button type="button" class="button" data-yt-mute aria-pressed="false">เสียง: เปิด</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Related Videos Sidebar -->
            <div class="yt-related-col">
              <h4>คลิปแนะนำถัดไป</h4>
              <div class="yt-related-list" data-yt-related-list></div>
            </div>
          </div>

          <p class="yt-status" role="status" data-yt-status>พร้อมแล้ว · ค้นหาหรือเลือกคลิปที่ต้องการดูได้ทันที</p>
        </div>
      `;

      // Setup Search Form
      const form = root.querySelector('[data-yt-search-form]');
      const searchInput = root.querySelector('[data-yt-search-input]');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
          switchView('browse');
          searchVideos(q);
        }
      }, options);

      // Setup Category Pills
      root.querySelectorAll('.yt-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          root.querySelectorAll('.yt-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cat = pill.dataset.cat;
          switchView('browse');
          if (cat) searchVideos(cat);
          else renderGrid(defaultVideos);
        }, options);
      });

      // Back to browse button
      root.querySelector('[data-yt-back]').addEventListener('click', () => {
        switchView('browse');
      }, options);

      // Resume button from Blink Lock
      root.querySelector('[data-yt-resume]').addEventListener('click', () => {
        dismissBlinkLock(true);
      }, options);

      // Play / Pause / Mute buttons
      root.querySelector('[data-yt-play]').addEventListener('click', () => {
        if (playManually()) status('กำลังเล่น · อย่าพลาดแม้แต่เสี้ยววินาที');
      }, options);

      root.querySelector('[data-yt-pause]').addEventListener('click', () => {
        if (pauseManually()) status('หยุดไว้แล้ว');
      }, options);

      root.querySelector('[data-yt-mute]').addEventListener('click', (event) => {
        if (!canInteract()) return;
        guard.setMute(!guard.muted);
        event.currentTarget.textContent = guard.muted ? 'เสียง: ปิด' : 'เสียง: เปิด';
        event.currentTarget.setAttribute('aria-pressed', String(guard.muted));
      }, options);

      // Spacebar resumes blink lock
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && isBlinkLocked && currentView === 'watch' && canInteract() && !ignoresShortcut(e)) {
          e.preventDefault();
          dismissBlinkLock(true);
        }
      }, options);

      // Initial Grid render
      renderGrid(defaultVideos);
      updateButtons();
      connect();
    },

    blinkPause() {
      showBlinkLock();
    },

    attentionPause(details) {
      return showAttentionLock(details || { type: 'look-away' });
    },

    setResumePolicy(policy) {
      if (policy !== 'auto' && policy !== 'manual') return false;
      if (resumePolicy === policy) return true;
      resumePolicy = policy;
      attentionLookStreak = 0;
      latestAttentionObservation = null;
      if (isBlinkLocked) updateAttentionLockCopy();
      return true;
    },

    observeAttention(observation) { observeAttention(observation); },

    observeBlink(observation) { observeBlink(observation); },

    attentionResume() {
      return attentionResume();
    },

    dismissBlinkLock() {
      return dismissBlinkLock();
    },

    play() {
      return playManually();
    },

    pause() {
      return pauseManually();
    },

    suspend(reason) {
      pendingUserPlay = false;
      confirmedPlaying = false;
      clearAttentionLock();
      guard.suspend();
      if (ready && reason !== 'initial') status('หยุดไว้แล้ว · กลับมาแล้วกด Play เอง');
    },

    resume() {
      guard.resume();
    },

    reset() {
      pendingUserPlay = false;
      terminalVideo = false;
      guard.pause();
      clearAttentionLock();
      userPaused = false;
      videoId = 'dQw4w9WgXcQ';
      currentVideo = defaultVideos[0];
      switchView('browse');
      renderGrid(defaultVideos);
      if (ready && player) player.cueVideoById(videoId);
      status('พร้อมแล้ว · เลือกคลิปเพื่อเริ่มดู');
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      pendingUserPlay = false;
      generation++;
      abort?.abort();
      guard.suspend();
      player?.destroy?.();
      guard.player = null;
      ready = false;
    },

    getState() {
      return {
        ready,
        videoId,
        muted: guard.muted,
        suspended: guard.suspended,
        isBlinkLocked,
        userPaused,
        resumePolicy,
        confirmedPlaying,
      };
    },
  };
}
