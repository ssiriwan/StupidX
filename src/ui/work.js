import { icon } from './icons.js';
import { workProjects, workAverage, workTotal } from '../data/work-data.js';

function progressChart() {
  const grid = [0, 20, 40, 60, 80, 100].map(value => {
    const y = 232 - value * 1.7;
    return `<line x1="50" x2="550" y1="${y}" y2="${y}" stroke="var(--sheet-grid)"/><text x="39" y="${y + 4}" text-anchor="end">${value}%</text>`;
  }).join('');
  const bars = workProjects.map((project, index) => {
    const x = 75 + index * 123;
    const height = project.progress * 1.7;
    return `<rect x="${x}" y="${232 - height}" width="65" height="${height}" fill="var(--sheet-accent)" rx="1"/><text class="chart-value" x="${x + 32.5}" y="${222 - height}" text-anchor="middle">${project.progress}%</text><text x="${x + 32.5}" y="255" text-anchor="middle">${project.name}</text>`;
  }).join('');
  return `<svg viewBox="0 0 590 280" role="img" aria-labelledby="work-chart-title work-chart-desc"><title id="work-chart-title">ความคืบหน้าโครงการ</title><desc id="work-chart-desc">${workProjects.map(project => `${project.name} ${project.progress}%`).join(', ')}</desc>${grid}${bars}</svg>`;
}

/** The work surface contains only document content, with no leisure affordances. */
export function createWorkView({ onReturn } = {}) {
  let element;
  let close;
  let mounted = false;
  let returnAllowed = false;
  const closeDocument = () => { if (returnAllowed) onReturn?.(); };
  function mount(root) {
    if (mounted) return;
    mounted = true;
    element = document.createElement('section');
    element.className = 'work-view';
    element.tabIndex = -1;
    element.hidden = true;
    element.setAttribute('aria-label', 'รายงานผลการดำเนินงาน Q4');
    const columns = 'ABCDEFGHIJKLMNOP'.split('');
    const rows = Array.from({ length: 20 }, (_, index) => {
      const number = index + 1;
      const project = workProjects[index - 1];
      const values = index === 0 ? ['โครงการ', 'ผู้รับผิดชอบ', 'สถานะ', 'ความคืบหน้า', 'กำหนดส่ง'] : project ? [project.name, project.owner, project.status, `${project.progress}%`, project.due] : number === 7 ? ['ค่าเฉลี่ย', '', '', `${Math.round(workAverage)}%`, ''] : [];
      return `<tr><th class="row-number" scope="row">${number}</th>${columns.map((column, cell) => {
        const selected = number === 7 && cell === 3;
        const statusClass = project && cell === 2 ? ` status-${project.status === 'เสร็จสิ้น' ? 'complete' : project.status === 'ตรวจทาน' ? 'review' : 'ongoing'}` : '';
        return `<${number === 1 ? 'th' : 'td'} ${number === 1 ? 'scope="col"' : ''} class="sheet-cell${number === 1 && cell < 5 ? ' data-heading' : ''}${selected ? ' selected-cell' : ''}${statusClass}${cell === 3 ? ' numeric-cell' : ''}">${values[cell] || ''}</${number === 1 ? 'th' : 'td'}>`;
      }).join('')}</tr>`;
    }).join('');
    element.innerHTML = `<header class="document-header"><span class="document-icon" aria-hidden="true">X</span><h1>รายงานผลการดำเนินงาน Q4</h1><span class="save-status">${icon('check')}บันทึกแล้ว</span><span class="document-period">ตุลาคม — ธันวาคม 2026</span><button class="document-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">${icon('close')}</button></header>
      <nav class="document-menu" aria-label="เมนูเอกสาร"><span>ไฟล์</span><span class="current-menu">หน้าแรก</span><span>แทรก</span><span>ข้อมูล</span><span>ตรวจทาน</span></nav>
      <div class="document-ribbon" aria-label="การจัดรูปแบบเอกสาร"><div class="ribbon-group"><span class="ribbon-large" aria-hidden="true">▤</span><span>วาง</span><small>คลิปบอร์ด</small></div><div class="ribbon-group"><span class="font-face">TH Sarabun New <span>⌄</span></span><span class="font-size">11 ⌄</span><div class="ribbon-format"><b>B</b><i>I</i><u>U</u><span>▦</span><span class="text-highlight">A</span></div><small>แบบอักษร</small></div><div class="ribbon-group"><span class="ribbon-format">≡　≡　≡</span><span>ตัดข้อความอัตโนมัติ</span><small>การจัดแนว</small></div><div class="ribbon-group"><span class="ribbon-format">ทั่วไป　⌄</span><span>฿　%　.00</span><small>ตัวเลข</small></div><div class="ribbon-group"><span class="ribbon-large" aria-hidden="true">▦</span><span>จัดรูปแบบตาราง</span><small>สไตล์</small></div><div class="ribbon-group"><span class="ribbon-large" aria-hidden="true">∑</span><span>ผลรวมอัตโนมัติ</span><small>การแก้ไข</small></div></div>
      <div class="formula-bar"><span class="cell-address">D7 <span>⌄</span></span><span class="formula-symbol" aria-hidden="true">ƒx</span><span class="formula-value">=AVERAGE(D2:D5)</span></div>
      <div class="sheet-scroll"><div class="sheet-canvas"><table class="work-sheet" aria-label="ความคืบหน้าโครงการ Q4"><colgroup><col class="row-number-col">${columns.map((_, index) => `<col class="${index < 5 ? 'data-col' : 'empty-col'}">`).join('')}</colgroup><thead><tr><th aria-label="แถว"></th>${columns.map(column => `<th scope="col"${column === 'D' ? ' class="selected-column"' : ''}>${column}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><figure class="work-chart"><figcaption>ความคืบหน้าโครงการ</figcaption>${progressChart()}</figure></div></div>
      <div class="document-sheet-tabs"><span class="sheet-navigation" aria-hidden="true">‹　›</span><span class="document-sheet-tab selected-sheet">สรุปภาพรวม</span><span class="document-sheet-tab">แผนงาน</span><span class="document-sheet-tab">งบประมาณ</span></div>
      <footer class="document-footer"><span>พร้อม</span><span>ค่าเฉลี่ย: ${Math.round(workAverage)}%　จำนวน: ${workProjects.length}　ผลรวม: ${workTotal}%</span><span class="document-zoom">▦　 ─────●──　100%</span></footer>`;
    root.append(element);
    close = element.querySelector('.document-close');
    close.addEventListener('click', closeDocument);
    update({ canReturn: false, unknown: true });
  }
  function show() {
    if (!element) return;
    element.hidden = false;
    element.inert = false;
    element.focus({ preventScroll: true });
  }
  function hide() {
    if (!element) return;
    element.hidden = true;
    element.inert = true;
  }
  function update({ canReturn = false, unknown = false } = {}) {
    returnAllowed = Boolean(canReturn || unknown);
    if (!close) return;
    close.disabled = !returnAllowed;
    close.title = returnAllowed ? 'ปิดเอกสาร' : 'กำลังประมวลผลเอกสาร';
  }
  function dispose() {
    close?.removeEventListener('click', closeDocument);
    element?.remove();
    mounted = false;
  }
  return { mount, show, hide, update, dispose };
}
