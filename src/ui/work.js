import { icon } from './icons.js';
import { PERSONAS } from './personas.js';

/**
 * Creates the Work View surface with 4 selectable Work Personas:
 * - Accountant (Default): Excel Q4 Financial Spreadsheet
 * - Developer: VS Code Dark Theme interface
 * - Designer: Figma / Photoshop UI
 * - PM: Jira / Trello Kanban Board
 */
export function createWorkView({ onReturn, onPanic } = {}) {
  let element;
  let stageElement;
  let mounted = false;
  let returnAllowed = false;

  let currentPersona = 'accountant';
  try {
    const saved = localStorage.getItem('stupidx_work_persona');
    if (saved && PERSONAS[saved]) currentPersona = saved;
  } catch {}

  const developerState = {
    selectedFile: 'main.rs',
  };

  const closeDocument = () => {
    if (returnAllowed) onReturn?.();
  };

  function updateCloseButtons() {
    if (!element) return;
    const buttons = element.querySelectorAll('.document-close');
    for (const btn of buttons) {
      btn.disabled = !returnAllowed;
      btn.title = returnAllowed ? 'ปิดเอกสาร' : 'กำลังประมวลผลเอกสาร';
    }
  }

  function renderCurrentPersona() {
    if (!stageElement) return;
    const persona = PERSONAS[currentPersona] || PERSONAS.accountant;
    stageElement.innerHTML = persona.render(developerState);
    updateCloseButtons();
  }

  function setPersona(personaId) {
    if (!PERSONAS[personaId]) return;
    currentPersona = personaId;
    try {
      localStorage.setItem('stupidx_work_persona', personaId);
    } catch {}

    // Update active tab buttons in switcher bar
    const tabBtns = element.querySelectorAll('.persona-tab-btn');
    for (const btn of tabBtns) {
      const isActive = btn.dataset.persona === currentPersona;
      btn.classList?.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    }

    renderCurrentPersona();

    if (!element.hidden) {
      document.title = PERSONAS[currentPersona]?.windowTitle || 'รายงานผลการดำเนินงาน Q4';
    }
  }

  function mount(root) {
    if (mounted) return;
    mounted = true;

    element = document.createElement('section');
    element.className = 'work-view';
    element.tabIndex = -1;
    element.hidden = true;
    element.setAttribute('aria-label', 'พื้นที่ทำงานจำลอง (Work Persona View)');

    element.innerHTML = `
      <!-- Top Unified Persona Switcher Bar -->
      <nav class="work-persona-switcher" role="toolbar" aria-label="เลือก Persona การทำงาน">
        <div class="switcher-brand">
          <span class="switcher-brand-icon" aria-hidden="true">💼</span>
          <span class="switcher-brand-title">WORK PERSONA:</span>
        </div>
        <div class="switcher-tabs" role="tablist">
          <button type="button" class="persona-tab-btn ${currentPersona === 'accountant' ? 'active' : ''}" data-persona="accountant" role="tab" aria-selected="${currentPersona === 'accountant'}" title="Accountant: Excel Q4 Financial Spreadsheet">
            <span class="persona-tab-icon">📊</span>
            <span class="persona-tab-name">Accountant</span>
            <span class="persona-tab-badge">Excel</span>
          </button>
          <button type="button" class="persona-tab-btn ${currentPersona === 'developer' ? 'active' : ''}" data-persona="developer" role="tab" aria-selected="${currentPersona === 'developer'}" title="Developer: VS Code Dark Theme">
            <span class="persona-tab-icon">💻</span>
            <span class="persona-tab-name">Developer</span>
            <span class="persona-tab-badge">VS Code</span>
          </button>
          <button type="button" class="persona-tab-btn ${currentPersona === 'designer' ? 'active' : ''}" data-persona="designer" role="tab" aria-selected="${currentPersona === 'designer'}" title="Designer: Figma Design Workspace">
            <span class="persona-tab-icon">🎨</span>
            <span class="persona-tab-name">Designer</span>
            <span class="persona-tab-badge">Figma</span>
          </button>
          <button type="button" class="persona-tab-btn ${currentPersona === 'pm' ? 'active' : ''}" data-persona="pm" role="tab" aria-selected="${currentPersona === 'pm'}" title="PM: Jira Sprint 42 Kanban Board">
            <span class="persona-tab-icon">📋</span>
            <span class="persona-tab-name">PM</span>
            <span class="persona-tab-badge">Jira</span>
          </button>
        </div>
        <div class="switcher-meta">
          <button class="emergency-panic-btn" type="button" data-action="emergency-panic" title="กด B หรือ F8 หรือคลิกเพื่อเปิดจอฟ้า (BSOD) ฉุกเฉิน">🚨 ฉุกเฉิน: กด B เพื่อจอฟ้า (BSOD)</button>
          <span class="switcher-autosave" title="บันทึกข้อมูลล่าสุดแล้ว">● บันทึกแล้ว</span>
          <button class="document-close switcher-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">${icon('close')}</button>
        </div>
      </nav>

      <!-- Persona Stage (Active persona renders here) -->
      <div class="work-persona-stage"></div>
    `;

    root.append(element);
    stageElement = element.querySelector('.work-persona-stage');

    renderCurrentPersona();

    // Universal delegation for all interactive elements within the work view
    element.addEventListener('click', (event) => {
      // 0. Emergency Panic BSOD clicked
      const panicBtn = event.target.closest('[data-action="emergency-panic"], .emergency-panic-btn');
      if (panicBtn) {
        onPanic?.();
        return;
      }

      // 1. Close button clicked
      const closeBtn = event.target.closest('.document-close');
      if (closeBtn) {
        closeDocument();
        return;
      }

      // 2. Persona Switcher tab clicked
      const switchBtn = event.target.closest('.persona-tab-btn');
      if (switchBtn) {
        const personaId = switchBtn.dataset.persona;
        if (personaId && personaId !== currentPersona) {
          setPersona(personaId);
        }
        return;
      }

      // 3. Developer Persona: File switching in tabs or explorer
      const fileTarget = event.target.closest('.vsc-tab, .vsc-tree-file');
      if (fileTarget) {
        const fileName = fileTarget.dataset.file;
        if (fileName && fileName !== developerState.selectedFile) {
          developerState.selectedFile = fileName;
          renderCurrentPersona();
        }
        return;
      }

      // 4. Designer Persona: Layer clicking
      const layerItem = event.target.closest('.figma-layer-item');
      if (layerItem) {
        element.querySelectorAll('.figma-layer-item').forEach(el => el.classList.remove('selected-layer'));
        layerItem.classList.add('selected-layer');
        return;
      }

      // 5. Designer Persona: Tool clicking
      const figmaTool = event.target.closest('.figma-tool');
      if (figmaTool) {
        element.querySelectorAll('.figma-tool').forEach(el => el.classList.remove('active'));
        figmaTool.classList.add('active');
        return;
      }

      // 6. PM Persona: Filter pill clicking
      const jiraPill = event.target.closest('.jira-pill');
      if (jiraPill) {
        element.querySelectorAll('.jira-pill').forEach(el => el.classList.remove('active'));
        jiraPill.classList.add('active');
        return;
      }

      // 7. Accountant Persona: Sheet tab clicking
      const sheetTab = event.target.closest('.document-sheet-tab:not(.add-tab)');
      if (sheetTab) {
        element.querySelectorAll('.document-sheet-tab').forEach(el => el.classList.remove('selected-sheet'));
        sheetTab.classList.add('selected-sheet');
        return;
      }

      // 8. Accountant Persona: Cell selection
      const cell = event.target.closest('.sheet-cell');
      if (cell) {
        element.querySelectorAll('.sheet-cell').forEach(el => el.classList.remove('selected-cell'));
        cell.classList.add('selected-cell');
        const cellAddr = cell.dataset.cell;
        const addrEl = element.querySelector('.cell-address');
        if (addrEl && cellAddr) addrEl.innerHTML = `${cellAddr} <span>⌄</span>`;
        const formulaVal = element.querySelector('.formula-value');
        if (formulaVal) formulaVal.textContent = cell.textContent ? `=${cell.textContent}` : '';
        return;
      }
    });

    update({ canReturn: false, unknown: true });
  }

  function show() {
    if (!element) return;
    element.hidden = false;
    element.inert = false;
    document.title = PERSONAS[currentPersona]?.windowTitle || 'รายงานผลการดำเนินงาน Q4';
    element.focus({ preventScroll: true });
  }

  function hide() {
    if (!element) return;
    element.hidden = true;
    element.inert = true;
  }

  function update({ canReturn = false, unknown = false } = {}) {
    returnAllowed = Boolean(canReturn || unknown);
    updateCloseButtons();
  }

  function dispose() {
    element?.remove();
    mounted = false;
  }

  return { mount, show, hide, update, dispose, setPersona, getPersona: () => currentPersona };
}
