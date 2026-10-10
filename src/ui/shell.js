import { icon, sleepyComputer } from './icons.js';

const tabData = {
  youtube: { title: 'YouTube', icon: 'play', address: 'youtube.com', caption: 'คุณกะพริบ เราหยุด' },
  ai: { title: 'AI ขี้เกียจ', icon: 'bot', address: 'ai.local', caption: 'ถามได้ ไม่รับปาก' },
  music: { title: 'เพลงเงียบ', icon: 'music', address: 'music.local', caption: 'ดังได้ เงียบด้วย' },
};
const themes = { win95: 'Windows 95', xp: 'Windows XP', win11: 'Windows 11' };

/** Stable DOM shell. Feature factories mount once into refs.panels. */
export function createShell({ onTab, onTheme, onPanic, onReset, onSettings, onToggleCamera, onToggleHud } = {}) {
  const refs = { leisure: null, panels: {}, vision: null, launcher: null, settings: null, status: null, tabs: {} };
  let mounted = false;
  let selectedTab = 'youtube';
  let settingsOpen = false;
  const removers = [];
  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    removers.push(() => element.removeEventListener(name, callback));
  }
  function setSettings(open) {
    settingsOpen = open;
    refs.leisure.querySelector('.settings-drawer').hidden = !open;
    refs.leisure.querySelector('[data-action="settings"]').setAttribute('aria-expanded', String(open));
    onSettings?.(open);
  }
  function mount(root) {
    if (mounted) return;
    mounted = true;
    const leisure = document.createElement('div');
    leisure.className = 'leisure-shell';
    leisure.innerHTML = `
      <header class="app-header">
        <div class="brand">${sleepyComputer()}<div><h1>ทำงานอยู่ครับ<sup>™</sup></h1><span class="brand-subtitle">TOTALLY WORKING</span></div></div>
        <div class="watch-status"><span class="status-dot" aria-hidden="true"></span><span class="shell-status" role="status">กล้อง: ยังไม่เปิด</span></div>
        <div class="header-actions">
          <button class="button camera-button" data-action="toggle-camera" type="button" title="เปิด/ปิดกล้อง">${icon('camera')}<span class="camera-btn-text">เปิดกล้อง AI</span></button>
          <button class="button hud-button" data-action="toggle-hud" type="button" title="เปิด/ปิดจอเรดาร์ส่องหลัง">${icon('bot')}<span>จอเรดาร์ AI</span></button>
          <div class="theme-picker" role="group" aria-label="ธีมหน้าต่าง">${Object.entries(themes).map(([id, label]) => `<button class="theme-button" data-theme-choice="${id}" type="button" aria-pressed="${id === 'win11'}">${icon('windows')}<span>${label}</span></button>`).join('')}</div>
          <button class="panic-button" data-action="panic" type="button">${icon('briefcase')}<span>ทำงานอยู่ครับ!</span><kbd>B</kbd></button>
        </div>
      </header>
      <main class="app-window">
        <div class="tab-strip" role="tablist" aria-label="กิจกรรม">${Object.entries(tabData).map(([id, data]) => `<button id="tab-${id}" class="app-tab" type="button" role="tab" aria-controls="panel-${id}" aria-selected="${id === 'youtube'}" tabindex="${id === 'youtube' ? '0' : '-1'}" data-tab="${id}">${icon(data.icon)}<span>${data.title}</span></button>`).join('')}</div>
        <div class="address-bar"><span class="chrome-arrows" aria-hidden="true">${icon('arrow')}${icon('arrow', 'forward-arrow')}</span><div class="address-field">${icon('lock')}<span class="address-text">youtube.com</span><span class="address-caption">คุณกะพริบ เราหยุด</span></div><button class="button icon-button" data-action="settings" type="button" aria-expanded="false" aria-controls="app-settings" title="ตั้งค่าและกล้อง" aria-label="ตั้งค่าและกล้อง">${icon('settings')}</button></div>
        <section id="app-settings" class="settings-drawer" aria-label="ตั้งค่า" hidden><div class="settings-heading"><div><h2>ศูนย์ควบคุมการอู้</h2><p class="muted">ตั้งกล้องให้พร้อม แล้วกลับไปพักอย่างมั่นใจ</p></div><button class="button reset-button" data-action="reset" type="button">${icon('reset')}รีเซ็ตเดโม</button></div><div class="settings-grid"><section class="vision-mount" aria-label="กล้องและการตรวจจับ"></section><section class="launcher-mount" aria-label="เปิดเว็บไซต์"></section><section class="settings-mount" aria-label="ตัวเลือกเพิ่มเติม"></section></div></section>
        <div class="feature-stage">${Object.entries(tabData).map(([id, data]) => `<section class="feature-panel" id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}" ${id !== 'youtube' ? 'hidden' : ''}></section>`).join('')}</div>
      </main>
      <footer class="app-footer"><span class="work-progress"><span class="tiny-chart" aria-hidden="true">▂▅▇</span>งานเสร็จ <strong>0%</strong><span class="empty-progress" aria-hidden="true"></span></span><span class="blink-counter">กะพริบ <strong>0</strong> ครั้ง</span><span class="footer-note">ออนไลน์…แต่ยังไม่ทำงาน</span></footer>`;
    root.append(leisure);
    refs.leisure = leisure;
    refs.status = leisure.querySelector('.shell-status');
    refs.vision = leisure.querySelector('.vision-mount');
    refs.launcher = leisure.querySelector('.launcher-mount');
    refs.settings = leisure.querySelector('.settings-mount');
    for (const id of Object.keys(tabData)) {
      refs.panels[id] = leisure.querySelector(`#panel-${id}`);
      refs.tabs[id] = leisure.querySelector(`#tab-${id}`);
      listen(refs.tabs[id], 'click', () => onTab?.(id));
      listen(refs.tabs[id], 'keydown', event => {
        const ids = Object.keys(tabData);
        let next;
        if (event.key === 'ArrowRight') next = ids[(ids.indexOf(id) + 1) % ids.length];
        if (event.key === 'ArrowLeft') next = ids[(ids.indexOf(id) + ids.length - 1) % ids.length];
        if (event.key === 'Home') next = ids[0];
        if (event.key === 'End') next = ids.at(-1);
        if (!next) return;
        event.preventDefault();
        refs.tabs[next].focus();
        onTab?.(next);
      });
    }
    for (const button of leisure.querySelectorAll('[data-theme-choice]')) listen(button, 'click', () => onTheme?.(button.dataset.themeChoice));
    listen(leisure.querySelector('[data-action="panic"]'), 'click', () => onPanic?.());
    listen(leisure.querySelector('[data-action="reset"]'), 'click', () => onReset?.());
    listen(leisure.querySelector('[data-action="settings"]'), 'click', () => setSettings(!settingsOpen));
    const camBtn = leisure.querySelector('[data-action="toggle-camera"]');
    if (camBtn) listen(camBtn, 'click', () => onToggleCamera?.());
    const hudBtn = leisure.querySelector('[data-action="toggle-hud"]');
    if (hudBtn) listen(hudBtn, 'click', () => onToggleHud?.());
    update({ activeTab: selectedTab, theme: document.documentElement.dataset.theme || 'win11' });
  }
  function update({ activeTab, theme, status, blinkCount, cameraRunning } = {}) {
    if (theme && themes[theme]) document.documentElement.dataset.theme = theme;
    else if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = 'win11';
    if (!mounted) return;
    if (cameraRunning !== undefined) {
      const camLabel = refs.leisure?.querySelector('.camera-btn-text');
      if (camLabel) camLabel.textContent = cameraRunning ? 'ปิดกล้อง AI' : 'เปิดกล้อง AI';
    }
    if (activeTab && tabData[activeTab]) {
      selectedTab = activeTab;
      for (const id of Object.keys(tabData)) {
        const selected = id === activeTab;
        refs.tabs[id].setAttribute('aria-selected', String(selected));
        refs.tabs[id].tabIndex = selected ? 0 : -1;
        refs.panels[id].hidden = !selected;
        refs.panels[id].inert = !selected;
      }
      refs.leisure.querySelector('.address-text').textContent = tabData[activeTab].address;
      refs.leisure.querySelector('.address-caption').textContent = tabData[activeTab].caption;
    }
    if (theme) for (const button of refs.leisure.querySelectorAll('[data-theme-choice]')) button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    if (status !== undefined) refs.status.textContent = typeof status === 'string' ? status : (status?.text || status?.message || 'กล้อง: กำลังเตรียม');
    if (blinkCount !== undefined) refs.leisure.querySelector('.blink-counter strong').textContent = String(blinkCount);
  }
  function dispose() {
    removers.splice(0).forEach(remove => remove());
    refs.leisure?.remove();
    mounted = false;
  }
  return { mount, refs, update, dispose };
}
