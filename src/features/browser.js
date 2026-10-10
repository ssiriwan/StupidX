export function validateWebURL(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function createBrowserLauncher({ canInteract = () => true } = {}) {
  let root, abort, url = null, open = false, suspended = true;
  function show() {
    if (!url || suspended || !canInteract()) return;
    root.querySelector('[data-web-frame]').src = url;
    root.querySelector('[data-web-view]').hidden = false;
    open = true;
  }
  return {
    mount(container) {
      if (root) return;
      root = container; abort = new AbortController();
      root.innerHTML = `<div class="web-launcher"><h3>เปิดเว็บอื่น</h3><p class="muted">เว็บที่อนุญาตให้ฝังจะแสดงในแอป หากหน้าเว็บว่างให้เปิดแท็บภายนอกด้วยตัวเอง</p><form class="web-form"><label class="sr-only" for="web-url">URL เว็บไซต์</label><input id="web-url" class="field" type="url" placeholder="https://example.org" required><button class="button" type="submit">เปิดในแอป</button><button class="button" data-web-external type="button">เปิดแท็บภายนอก ↗</button></form><p class="muted" data-web-status>ระบบปิดบังและหยุด YouTube ได้เฉพาะในแอปนี้ · แท็บภายนอกอยู่นอกการควบคุม</p><div data-web-view hidden><div class="web-view-header"><span>เว็บไซต์ที่ฝัง</span><button class="button" type="button" data-web-close>ปิดเว็บไซต์</button></div><iframe data-web-frame title="เว็บไซต์ที่ผู้ใช้เลือก" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-same-origin" allow="autoplay 'none'; camera 'none'; microphone 'none'"></iframe></div></div>`;
      const options = { signal: abort.signal };
      const read = () => {
        const result = validateWebURL(root.querySelector('input').value.trim());
        if (!result) root.querySelector('[data-web-status]').textContent = 'ใช้ URL http หรือ https ที่ไม่มีข้อมูลล็อกอิน';
        return result;
      };
      root.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); if (!canInteract()) return; url = read(); show(); }, options);
      root.querySelector('[data-web-external]').addEventListener('click', () => { if (!canInteract()) return; const target = read(); if (target) window.open(target, '_blank', 'noopener,noreferrer'); }, options);
      root.querySelector('[data-web-close]').addEventListener('click', () => { open = false; root.querySelector('[data-web-frame]').src = 'about:blank'; root.querySelector('[data-web-view]').hidden = true; }, options);
    },
    suspend() { suspended = true; if (root && open) { root.querySelector('[data-web-frame]').src = 'about:blank'; root.querySelector('[data-web-view]').hidden = true; } },
    resume() { suspended = false; if (open) show(); },
    reset() { open = false; url = null; if (root) { root.querySelector('[data-web-frame]').src = 'about:blank'; root.querySelector('[data-web-view]').hidden = true; root.querySelector('input').value = ''; } },
    dispose() { this.suspend(); abort?.abort(); },
  };
}
