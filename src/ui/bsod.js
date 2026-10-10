/** Authentic Blue Screen of Death (BSOD) emergency screen with full OS and subtheme support */
export function createBSOD({
  onDismiss = () => {},
  timers = globalThis,
  initialProgress = 87,
  tickInterval = 3000,
  maxProgress = 89,
  stayStuck = false,
  theme = 'win11',
  os = 'win11',
  subtheme = 'default',
} = {}) {
  let element = null;
  let mounted = false;
  let showing = false;
  let progress = initialProgress;
  let currentOS = os;
  let currentSubtheme = subtheme;
  let currentTheme = theme;
  let timerId = null;

  // Resolve initial theme vs OS/subtheme if theme was explicitly passed
  if (theme && theme !== 'win11') {
    if (['win11', 'win95', 'xp'].includes(theme)) {
      currentOS = theme;
      currentSubtheme = 'default';
    } else {
      currentSubtheme = theme;
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      timers.clearTimeout(timerId);
      timerId = null;
    }
  }

  function scheduleTick() {
    if (stayStuck || progress >= maxProgress || !showing) return;
    timerId = timers.setTimeout(() => {
      timerId = null;
      if (!showing || stayStuck) return;
      progress += 1;
      const valEl = element?.querySelector('.bsod-progress-val');
      if (valEl) valEl.textContent = String(progress);
      if (progress < maxProgress) {
        scheduleTick();
      }
    }, tickInterval);
  }

  function renderHTML() {
    const isRetro = currentOS === 'win95' || currentOS === 'xp';
    const osBadgeText = currentOS === 'win95' ? ' Windows 95 ' : currentOS === 'xp' ? ' Windows XP ' : ' Windows ';

    return `
      <div class="bsod-container bsod-${currentOS} bsod-sub-${currentSubtheme}">
        <button class="bsod-hidden-spot" type="button" aria-label="Bypass error" tabindex="-1"></button>
        <div class="bsod-retro-header">
          <span class="bsod-retro-badge">${osBadgeText}</span>
        </div>
        <div class="bsod-subtheme-badge" hidden></div>
        <div class="bsod-emoticon" role="button" tabindex="0" aria-label="Restart notice">:(</div>
        <div class="bsod-message">
          <p class="bsod-text-th">คอมพิวเตอร์ของคุณมีปัญหาและจำเป็นต้องรีสตาร์ท เรากำลังรวบรวมข้อมูลข้อผิดพลาดให้คุณ</p>
          <p class="bsod-text-en">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</p>
          <p class="bsod-progress-counter"><span class="bsod-progress-val">${progress}</span>% complete</p>
        </div>
        <div class="bsod-footer-grid">
          <div class="bsod-qr-wrap">
            <svg class="bsod-qr" role="img" viewBox="0 0 33 33" aria-label="QR Code error lookup">
              <rect width="33" height="33" fill="#ffffff"/>
              <rect x="2" y="2" width="7" height="7" fill="#0078d7"/>
              <rect x="3" y="3" width="5" height="5" fill="#ffffff"/>
              <rect x="4" y="4" width="3" height="3" fill="#0078d7"/>
              <rect x="24" y="2" width="7" height="7" fill="#0078d7"/>
              <rect x="25" y="3" width="5" height="5" fill="#ffffff"/>
              <rect x="26" y="4" width="3" height="3" fill="#0078d7"/>
              <rect x="2" y="24" width="7" height="7" fill="#0078d7"/>
              <rect x="3" y="25" width="5" height="5" fill="#ffffff"/>
              <rect x="4" y="26" width="3" height="3" fill="#0078d7"/>
              <rect x="11" y="4" width="2" height="2" fill="#0078d7"/>
              <rect x="15" y="2" width="3" height="1" fill="#0078d7"/>
              <rect x="20" y="5" width="2" height="2" fill="#0078d7"/>
              <rect x="11" y="11" width="3" height="3" fill="#0078d7"/>
              <rect x="16" y="12" width="2" height="4" fill="#0078d7"/>
              <rect x="20" y="10" width="3" height="2" fill="#0078d7"/>
              <rect x="25" y="12" width="2" height="3" fill="#0078d7"/>
              <rect x="28" y="17" width="3" height="2" fill="#0078d7"/>
              <rect x="12" y="18" width="4" height="2" fill="#0078d7"/>
              <rect x="18" y="18" width="2" height="3" fill="#0078d7"/>
              <rect x="22" y="19" width="3" height="2" fill="#0078d7"/>
              <rect x="11" y="23" width="3" height="2" fill="#0078d7"/>
              <rect x="16" y="24" width="2" height="3" fill="#0078d7"/>
              <rect x="20" y="25" width="4" height="2" fill="#0078d7"/>
              <rect x="26" y="23" width="2" height="4" fill="#0078d7"/>
              <rect x="12" y="28" width="5" height="2" fill="#0078d7"/>
              <rect x="22" y="28" width="3" height="2" fill="#0078d7"/>
            </svg>
          </div>
          <div class="bsod-meta">
            <p class="bsod-support-text">For more information about this issue and possible fixes, visit https://windows.com/stopcode</p>
            <p class="bsod-support-instruction">If you call a support person, give them this info:</p>
            <div class="bsod-codes">
              <div class="bsod-code-row"><span class="bsod-code-name">Stop code:</span> <span class="bsod-code-value">BOSS_PROXIMITY_OVERHEAT</span></div>
              <div class="bsod-code-row"><span class="bsod-code-name">What failed:</span> <span class="bsod-code-value">kpi_evaluation.sys</span></div>
              <div class="bsod-code-row"><span class="bsod-code-name">Error reference:</span> <span class="bsod-code-value">0xDEADB055</span></div>
            </div>
            <div class="bsod-actions">
              <button class="bsod-dismiss-btn" type="button"><kbd class="bsod-kbd">Esc</kbd> Return to desktop</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function dismiss() {
    hide();
    onDismiss?.();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && showing) {
      event.preventDefault?.();
      event.stopPropagation?.();
      dismiss();
    }
  }

  function updateAppearance() {
    if (!element) return;
    element.dataset.os = currentOS;
    element.dataset.subtheme = currentSubtheme;
    element.dataset.theme = currentTheme || (currentSubtheme === 'default' ? currentOS : currentSubtheme);

    const container = element.querySelector('.bsod-container');
    if (container) {
      container.className = `bsod-container bsod-${currentOS} bsod-sub-${currentSubtheme}`;
    }

    const badge = element.querySelector('.bsod-retro-badge');
    if (badge) {
      badge.textContent = currentOS === 'win95' ? ' Windows 95 ' : currentOS === 'xp' ? ' Windows XP ' : ' Windows ';
    }

    const subBadge = element.querySelector('.bsod-subtheme-badge');
    if (subBadge) {
      const subLabels = {
        matrix: 'SYSTEM FAILURE · MATRIX CODE DISRUPTED 0x00FF',
        icu: 'ICU CRITICAL MONITOR · VITAL SIGNS FLATLINE',
        gov: 'ระบบจัดซื้อจัดจ้างภาครัฐ (e-GP) ขัดข้องชั่วคราว',
        hi5: 'Hi5 Profile Crash · Error 404 Glitter Not Found',
        dark: 'SYSTEM DIAGNOSTICS · DARK CONSOLE',
      };
      if (subLabels[currentSubtheme]) {
        subBadge.textContent = subLabels[currentSubtheme];
        subBadge.hidden = false;
      } else {
        subBadge.hidden = true;
        subBadge.textContent = '';
      }
    }
  }

  function mount(root) {
    if (mounted) return;
    mounted = true;

    element = document.createElement('div');
    element.className = 'bsod-screen';
    element.setAttribute('role', 'alertdialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-label', 'Blue Screen of Death (BSOD)');
    element.tabIndex = -1;
    element.hidden = true;
    element.inert = true;
    element.dataset.os = currentOS;
    element.dataset.subtheme = currentSubtheme;
    element.dataset.theme = currentTheme || (currentSubtheme === 'default' ? currentOS : currentSubtheme);
    element.innerHTML = renderHTML();
    updateAppearance();

    const hiddenSpot = element.querySelector('.bsod-hidden-spot');
    if (hiddenSpot) {
      hiddenSpot.addEventListener('click', () => dismiss());
    }

    const emoticon = element.querySelector('.bsod-emoticon');
    if (emoticon) {
      emoticon.addEventListener('click', () => dismiss());
      emoticon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault?.();
          dismiss();
        }
      });
    }

    const dismissBtn = element.querySelector('.bsod-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => dismiss());
    }

    window.addEventListener?.('keydown', handleKeyDown);

    root.append(element);
  }

  function show(osOrTheme, newSubtheme) {
    if (typeof osOrTheme === 'object' && osOrTheme !== null) {
      if (osOrTheme.os) currentOS = osOrTheme.os;
      if (osOrTheme.subtheme) currentSubtheme = osOrTheme.subtheme;
      if (osOrTheme.theme) currentTheme = osOrTheme.theme;
      updateAppearance();
    } else {
      if (osOrTheme) {
        if (['win11', 'win95', 'xp'].includes(osOrTheme)) {
          currentOS = osOrTheme;
        } else {
          currentTheme = osOrTheme;
          currentSubtheme = osOrTheme;
        }
      }
      if (newSubtheme) {
        currentSubtheme = newSubtheme;
      }
      currentTheme = currentSubtheme === 'default' ? currentOS : currentSubtheme;
      updateAppearance();
    }
    if (!element) return;
    showing = true;
    element.hidden = false;
    element.inert = false;
    element.focus?.({ preventScroll: true });
    scheduleTick();
  }

  function hide() {
    showing = false;
    stopTimer();
    if (element) {
      element.hidden = true;
      element.inert = true;
    }
  }

  function isShowing() {
    return showing;
  }

  function isVisible() {
    return showing;
  }

  function getProgress() {
    return progress;
  }

  function setOS(newOS) {
    if (newOS) {
      currentOS = newOS;
      currentTheme = currentSubtheme === 'default' ? currentOS : currentSubtheme;
      updateAppearance();
    }
  }

  function setSubtheme(newSubtheme) {
    if (newSubtheme) {
      currentSubtheme = newSubtheme;
      currentTheme = currentSubtheme === 'default' ? currentOS : currentSubtheme;
      updateAppearance();
    }
  }

  function setTheme(newTheme) {
    if (!newTheme) return;
    currentTheme = newTheme;
    if (['win11', 'win95', 'xp'].includes(newTheme)) {
      currentOS = newTheme;
      currentSubtheme = 'default';
    } else {
      currentSubtheme = newTheme;
    }
    updateAppearance();
  }

  function dispose() {
    stopTimer();
    window.removeEventListener?.('keydown', handleKeyDown);
    element?.remove();
    element = null;
    mounted = false;
    showing = false;
  }

  return {
    mount,
    show,
    hide,
    isShowing,
    isVisible,
    getProgress,
    setTheme,
    setOS,
    setSubtheme,
    getOS: () => currentOS,
    getSubtheme: () => currentSubtheme,
    dismiss,
    dispose,
    get element() {
      return element;
    },
  };
}

export { createBSOD as createBsod };
