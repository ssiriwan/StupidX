import { icon } from './icons.js';
import { workProjects, workAverage, workTotal } from '../data/work-data.js';

/* =========================================================================
   1. ACCOUNTANT PERSONA (Excel Q4 Financial Spreadsheet)
   ========================================================================= */

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
  return `<svg viewBox="0 0 590 280" role="img" aria-label="กราฟความคืบหน้าโครงการ Q4"><title>ความคืบหน้าโครงการ</title><desc>${workProjects.map(project => `${project.name} ${project.progress}%`).join(', ')}</desc>${grid}${bars}</svg>`;
}

export function renderAccountant() {
  const columns = 'ABCDEFGHIJKLMNOP'.split('');
  const rows = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const project = workProjects[index - 1];
    const values = index === 0 ? ['โครงการ', 'ผู้รับผิดชอบ', 'สถานะ', 'ความคืบหน้า', 'กำหนดส่ง'] : project ? [project.name, project.owner, project.status, `${project.progress}%`, project.due] : number === 7 ? ['ค่าเฉลี่ย', '', '', `${Math.round(workAverage)}%`, ''] : [];
    return `<tr><th class="row-number" scope="row">${number}</th>${columns.map((column, cell) => {
      const selected = number === 7 && cell === 3;
      const statusClass = project && cell === 2 ? ` status-${project.status === 'เสร็จสิ้น' ? 'complete' : project.status === 'ตรวจทาน' ? 'review' : 'ongoing'}` : '';
      return `<${number === 1 ? 'th' : 'td'} ${number === 1 ? 'scope="col"' : ''} class="sheet-cell${number === 1 && cell < 5 ? ' data-heading' : ''}${selected ? ' selected-cell' : ''}${statusClass}${cell === 3 ? ' numeric-cell' : ''}" data-cell="${column}${number}">${values[cell] || ''}</${number === 1 ? 'th' : 'td'}>`;
    }).join('')}</tr>`;
  }).join('');

  return `
    <div class="persona-view accountant-view">
      <header class="document-header">
        <span class="document-icon" aria-hidden="true">X</span>
        <h1>รายงานผลการดำเนินงาน Q4.xlsx — Excel</h1>
        <span class="save-status">${icon('check')}บันทึกแล้วใน OneDrive</span>
        <button class="emergency-panic-btn" type="button" data-action="emergency-panic" title="กด B หรือ F8 หรือคลิกเพื่อเปิดจอฟ้า (BSOD) ฉุกเฉิน">🚨 ฉุกเฉิน: กด B เพื่อจอฟ้า (BSOD)</button>
        <span class="document-period">ตุลาคม — ธันวาคม 2026</span>
        <button class="document-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">${icon('close')}</button>
      </header>
      <nav class="document-menu" aria-label="เมนูเอกสาร">
        <span>ไฟล์</span>
        <span class="current-menu">หน้าแรก</span>
        <span>แทรก</span>
        <span>เค้าโครง</span>
        <span>สูตร</span>
        <span>ข้อมูล</span>
        <span>ตรวจทาน</span>
        <span>มุมมอง</span>
      </nav>
      <div class="document-ribbon" aria-label="การจัดรูปแบบเอกสาร">
        <div class="ribbon-group">
          <span class="ribbon-large" aria-hidden="true">▤</span>
          <span>วาง</span>
          <small>คลิปบอร์ด</small>
        </div>
        <div class="ribbon-group">
          <span class="font-face">TH Sarabun New <span>⌄</span></span>
          <span class="font-size">11 ⌄</span>
          <div class="ribbon-format"><b>B</b><i>I</i><u>U</u><span>▦</span><span class="text-highlight">A</span></div>
          <small>แบบอักษร</small>
        </div>
        <div class="ribbon-group">
          <span class="ribbon-format">≡　≡　≡</span>
          <span>ตัดข้อความอัตโนมัติ</span>
          <small>การจัดแนว</small>
        </div>
        <div class="ribbon-group">
          <span class="ribbon-format">ทั่วไป　⌄</span>
          <span>฿　%　.00</span>
          <small>ตัวเลข</small>
        </div>
        <div class="ribbon-group">
          <span class="ribbon-large" aria-hidden="true">▦</span>
          <span>จัดรูปแบบตาราง</span>
          <small>สไตล์</small>
        </div>
        <div class="ribbon-group">
          <span class="ribbon-large" aria-hidden="true">∑</span>
          <span>ผลรวมอัตโนมัติ</span>
          <small>การแก้ไข</small>
        </div>
      </div>
      <div class="formula-bar">
        <span class="cell-address">D7 <span>⌄</span></span>
        <span class="formula-symbol" aria-hidden="true">ƒx</span>
        <span class="formula-value">=AVERAGE(D2:D5)</span>
      </div>
      <div class="sheet-scroll">
        <div class="sheet-canvas">
          <table class="work-sheet" aria-label="ความคืบหน้าโครงการ Q4">
            <colgroup>
              <col class="row-number-col">
              ${columns.map((_, index) => `<col class="${index < 5 ? 'data-col' : 'empty-col'}">`).join('')}
            </colgroup>
            <thead>
              <tr>
                <th aria-label="แถว"></th>
                ${columns.map(column => `<th scope="col"${column === 'D' ? ' class="selected-column"' : ''}>${column}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <figure class="work-chart">
            <figcaption>ความคืบหน้าโครงการ Q4 (Actual vs Planned)</figcaption>
            ${progressChart()}
          </figure>
        </div>
      </div>
      <div class="document-sheet-tabs">
        <span class="sheet-navigation" aria-hidden="true">‹　›</span>
        <span class="document-sheet-tab selected-sheet">สรุปภาพรวม</span>
        <span class="document-sheet-tab">แผนงาน Q4</span>
        <span class="document-sheet-tab">งบประมาณ</span>
        <span class="document-sheet-tab">กระแสเงินสด</span>
        <span class="document-sheet-tab add-tab" title="เพิ่มแผ่นงาน">+</span>
      </div>
      <footer class="document-footer">
        <span>พร้อม</span>
        <span>ค่าเฉลี่ย: ${Math.round(workAverage)}%　จำนวน: ${workProjects.length}　ผลรวม: ${workTotal}%</span>
        <span class="document-zoom">▦　 ─────●──　100%</span>
      </footer>
    </div>
  `;
}

/* =========================================================================
   2. DEVELOPER PERSONA (VS Code Dark Theme)
   ========================================================================= */

const CODE_FILES = {
  'main.rs': {
    name: 'main.rs',
    ext: 'rust',
    badge: 'RS',
    iconColor: '#e37933',
    breadcrumb: 'src > core > main.rs > EnginePool > fn process_stream',
    codeLines: [
      { num: 1, html: `<span class="kwd">use</span> std::sync::<span class="type">Arc</span>;` },
      { num: 2, html: `<span class="kwd">use</span> tokio::sync::<span class="type">Mutex</span>;` },
      { num: 3, html: `<span class="kwd">use</span> stupidx_core::telemetry::<span class="type">TelemetrySink</span>;` },
      { num: 4, html: `<span class="kwd">use</span> stupidx_core::pipeline::{<span class="type">PipelineBuffer</span>, <span class="type">WorkerPool</span>};` },
      { num: 5, html: `` },
      { num: 6, html: `<span class="cmt">/// Context state tracking active worker threads and calibration flags</span>` },
      { num: 7, html: `<span class="kwd">pub struct</span> <span class="type">SessionContext</span> {` },
      { num: 8, html: `    <span class="kwd">pub</span> session_id: <span class="type">String</span>,` },
      { num: 9, html: `    <span class="kwd">pub</span> active_workers: <span class="type">usize</span>,` },
      { num: 10, html: `    <span class="kwd">pub</span> is_calibrated: <span class="type">bool</span>,` },
      { num: 11, html: `}` },
      { num: 12, html: `` },
      { num: 13, html: `<span class="kwd">impl</span> <span class="type">SessionContext</span> {` },
      { num: 14, html: `    <span class="kwd">pub fn</span> <span class="fn">new</span>() -&gt; <span class="type">Self</span> {` },
      { num: 15, html: `        <span class="type">Self</span> {` },
      { num: 16, html: `            session_id: <span class="str">"sess-prod-q4-8902"</span>.<span class="fn">to_string</span>(),` },
      { num: 17, html: `            active_workers: <span class="num">8</span>,` },
      { num: 18, html: `            is_calibrated: <span class="kwd">true</span>,` },
      { num: 19, html: `        }` },
      { num: 20, html: `    }` },
      { num: 21, html: `}` },
      { num: 22, html: `` },
      { num: 23, html: `<span class="kwd">pub async fn</span> <span class="fn">process_stream</span>(` },
      { num: 24, html: `    pool: <span class="type">Arc</span>&lt;<span class="type">Mutex</span>&lt;<span class="type">WorkerPool</span>&gt;&gt;,` },
      { num: 25, html: `    telemetry: <span class="type">Arc</span>&lt;<span class="type">TelemetrySink</span>&gt;,` },
      { num: 26, html: `    pipeline_buffer: <span class="type">PipelineBuffer</span>,` },
      { num: 27, html: `) -&gt; <span class="type">Result</span>&lt;<span class="type">usize</span>, <span class="type">Box</span>&lt;<span class="kwd">dyn</span> std::error::<span class="type">Error</span>&gt;&gt; {` },
      { num: 28, html: `    <span class="kwd">let</span> <span class="lint-warn" title="warning: variable does not need to be mutable: 'ctx' [clippy::let_and_return]">mut ctx</span> = <span class="type">SessionContext</span>::<span class="fn">new</span>();` },
      { num: 29, html: `    <span class="kwd">let mut</span> worker = pool.<span class="fn">lock</span>().<span class="kwd">await</span>;` },
      { num: 30, html: `` },
      { num: 31, html: `    <span class="cmt">// Dispatches tensor batch synchronously to hardware SIMD lanes</span>` },
      { num: 32, html: `    <span class="kwd">let</span> result = worker.<span class="fn">dispatch</span>(pipeline_buffer);` },
      { num: 33, html: `` },
      { num: 34, html: `    <span class="cmt">// CRITICAL: Record metric counter before finalizing session</span>` },
      { num: 35, html: `    telemetry.<span class="fn">record</span>(<span class="lint-error" title="error[E0382]: use of moved value: 'pipeline_buffer' — value used here after move">pipeline_buffer.len()</span>);` },
      { num: 36, html: `` },
      { num: 37, html: `    <span class="type">Ok</span>(result.processed_items)` },
      { num: 38, html: `}` },
    ]
  },
  'server.go': {
    name: 'server.go',
    ext: 'go',
    badge: 'GO',
    iconColor: '#00add8',
    breadcrumb: 'api > grpc > server.go > EventStreamer > Broadcast',
    codeLines: [
      { num: 1, html: `<span class="kwd">package</span> main` },
      { num: 2, html: `` },
      { num: 3, html: `<span class="kwd">import</span> (` },
      { num: 4, html: `    <span class="str">"context"</span>` },
      { num: 5, html: `    <span class="str">"fmt"</span>` },
      { num: 6, html: `    <span class="str">"log"</span>` },
      { num: 7, html: `    <span class="str">"net/http"</span>` },
      { num: 8, html: `    <span class="str">"sync"</span>` },
      { num: 9, html: `    <span class="str">"time"</span>` },
      { num: 10, html: `)` },
      { num: 11, html: `` },
      { num: 12, html: `<span class="cmt">// EventStreamer manages real-time broadcast channels for connected clients</span>` },
      { num: 13, html: `<span class="kwd">type</span> <span class="type">EventStreamer</span> <span class="kwd">struct</span> {` },
      { num: 14, html: `    mu       sync.<span class="type">RWMutex</span>` },
      { num: 15, html: `    clients  <span class="kwd">map</span>[<span class="type">string</span>]<span class="kwd">chan</span> []<span class="type">byte</span>` },
      { num: 16, html: `    isClosed <span class="type">bool</span>` },
      { num: 17, html: `}` },
      { num: 18, html: `` },
      { num: 19, html: `<span class="kwd">func</span> <span class="fn">NewEventStreamer</span>() *<span class="type">EventStreamer</span> {` },
      { num: 20, html: `    <span class="kwd">return</span> &amp;<span class="type">EventStreamer</span>{` },
      { num: 21, html: `        clients: <span class="fn">make</span>(<span class="kwd">map</span>[<span class="type">string</span>]<span class="kwd">chan</span> []<span class="type">byte</span>),` },
      { num: 22, html: `    }` },
      { num: 23, html: `}` },
      { num: 24, html: `` },
      { num: 25, html: `<span class="kwd">func</span> (s *<span class="type">EventStreamer</span>) <span class="fn">Broadcast</span>(ctx context.<span class="type">Context</span>, payload []<span class="type">byte</span>) <span class="type">error</span> {` },
      { num: 26, html: `    s.mu.<span class="fn">RLock</span>()` },
      { num: 27, html: `    <span class="kwd">defer</span> s.mu.<span class="fn">RUnlock</span>()` },
      { num: 28, html: `` },
      { num: 29, html: `    <span class="kwd">if</span> s.isClosed {` },
      { num: 30, html: `        <span class="kwd">return</span> fmt.<span class="fn">Errorf</span>(<span class="str">"streamer is terminated"</span>)` },
      { num: 31, html: `    }` },
      { num: 32, html: `    <span class="kwd">for</span> id, ch := <span class="kwd">range</span> s.clients {` },
      { num: 33, html: `        <span class="kwd">select</span> {` },
      { num: 34, html: `        <span class="kwd">case</span> ch &lt;- payload:` },
      { num: 35, html: `        <span class="kwd">case</span> &lt;-time.<span class="fn">After</span>(<span class="num">50</span> * time.Millisecond):` },
      { num: 36, html: `            log.<span class="fn">Printf</span>(<span class="str">"[WARN] client buffer overflow: %s"</span>, id)` },
      { num: 37, html: `        <span class="kwd">case</span> &lt;-ctx.<span class="fn">Done</span>():` },
      { num: 38, html: `            <span class="kwd">return</span> <span class="lint-error" title="error: unhandled error context.Canceled">ctx.Err()</span>` },
      { num: 39, html: `        }` },
      { num: 40, html: `    }` },
      { num: 41, html: `    <span class="kwd">return</span> <span class="kwd">nil</span>` },
      { num: 42, html: `}` },
    ]
  }
};

export function renderDeveloper(selectedFile = 'main.rs') {
  const activeFile = CODE_FILES[selectedFile] || CODE_FILES['main.rs'];

  return `
    <div class="persona-view developer-view">
      <!-- VS Code Window Header -->
      <div class="vsc-titlebar">
        <div class="vsc-title-left">
          <span class="vsc-brand-icon">⌘</span>
          <span class="vsc-menu-item">File</span>
          <span class="vsc-menu-item">Edit</span>
          <span class="vsc-menu-item">Selection</span>
          <span class="vsc-menu-item">View</span>
          <span class="vsc-menu-item">Go</span>
          <span class="vsc-menu-item">Run</span>
          <span class="vsc-menu-item">Terminal</span>
          <span class="vsc-menu-item">Help</span>
        </div>
        <div class="vsc-title-center">
          <div class="vsc-search-bar">
            <span>🔍</span>
            <span>stupidx-core — ${activeFile.name}</span>
          </div>
        </div>
        <div class="vsc-title-right">
          <span class="vsc-win-ctl">─</span>
          <span class="vsc-win-ctl">▢</span>
          <button class="document-close vsc-win-ctl vsc-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">✕</button>
        </div>
      </div>

      <!-- Main Body: Activity Bar + Sidebar + Editor + Terminal -->
      <div class="vsc-workspace">
        <!-- Activity Bar -->
        <aside class="vsc-activity-bar" aria-label="Activity Bar">
          <div class="vsc-activity-item active" title="Explorer (Ctrl+Shift+E)">📁</div>
          <div class="vsc-activity-item" title="Search (Ctrl+Shift+F)">🔍</div>
          <div class="vsc-activity-item" title="Source Control (Ctrl+Shift+G)">
            <span class="vsc-badge">2</span>🌿
          </div>
          <div class="vsc-activity-item" title="Run and Debug (Ctrl+Shift+D)">▷</div>
          <div class="vsc-activity-item" title="Extensions (Ctrl+Shift+X)">🧩</div>
          <div class="vsc-activity-spacer"></div>
          <div class="vsc-activity-item" title="Accounts">👤</div>
          <div class="vsc-activity-item" title="Settings (Ctrl+,)">⚙</div>
        </aside>

        <!-- Sidebar / Explorer -->
        <aside class="vsc-sidebar">
          <div class="vsc-sidebar-header">
            <span>EXPLORER</span>
            <span class="vsc-sidebar-actions">···</span>
          </div>
          <div class="vsc-project-tree">
            <div class="vsc-tree-section">
              <span class="vsc-tree-arrow">▾</span>
              <strong>STUPIDX-CORE</strong>
            </div>
            <div class="vsc-tree-items">
              <div class="vsc-tree-folder">▾ src</div>
              <div class="vsc-tree-folder indent-1">▾ core</div>
              <div class="vsc-tree-file indent-2" data-file="engine.rs"><span class="f-icon rs">RS</span> engine.rs</div>
              <div class="vsc-tree-file indent-2" data-file="memory.rs"><span class="f-icon rs">RS</span> memory.rs</div>
              <div class="vsc-tree-file indent-1 ${selectedFile === 'main.rs' ? 'active-file' : ''}" data-file="main.rs"><span class="f-icon rs">RS</span> main.rs <span class="mod-dot">●</span></div>
              <div class="vsc-tree-folder indent-1">▾ api</div>
              <div class="vsc-tree-file indent-2 ${selectedFile === 'server.go' ? 'active-file' : ''}" data-file="server.go"><span class="f-icon go">GO</span> server.go</div>
              <div class="vsc-tree-file indent-2" data-file="handlers.go"><span class="f-icon go">GO</span> handlers.go</div>
              <div class="vsc-tree-file indent-1" data-file="Cargo.toml"><span class="f-icon toml">⚙</span> Cargo.toml</div>
              <div class="vsc-tree-file indent-1" data-file="go.mod"><span class="f-icon mod">⚙</span> go.mod</div>
            </div>
          </div>
        </aside>

        <!-- Main Editor & Terminal Area -->
        <main class="vsc-editor-container">
          <!-- Editor Tabs -->
          <div class="vsc-tabs-bar" role="tablist">
            <button type="button" class="vsc-tab ${selectedFile === 'main.rs' ? 'active' : ''}" data-file="main.rs" role="tab">
              <span class="f-icon rs">RS</span>
              <span>main.rs</span>
              <span class="vsc-tab-dot">●</span>
              <span class="vsc-tab-close">×</span>
            </button>
            <button type="button" class="vsc-tab ${selectedFile === 'server.go' ? 'active' : ''}" data-file="server.go" role="tab">
              <span class="f-icon go">GO</span>
              <span>server.go</span>
              <span class="vsc-tab-close">×</span>
            </button>
          </div>

          <!-- Breadcrumbs -->
          <div class="vsc-breadcrumbs">
            <span>${activeFile.breadcrumb}</span>
          </div>

          <!-- Code View Area -->
          <div class="vsc-code-scroll">
            <div class="vsc-gutter">
              ${activeFile.codeLines.map(line => `<span class="vsc-line-num">${line.num}</span>`).join('')}
            </div>
            <div class="vsc-code-content">
              ${activeFile.codeLines.map(line => `<div class="vsc-code-line">${line.html || '&nbsp;'}</div>`).join('')}
            </div>
          </div>

          <!-- Integrated Terminal & Problems Panel -->
          <div class="vsc-panel">
            <div class="vsc-panel-header">
              <div class="vsc-panel-tabs">
                <span class="vsc-panel-tab"><span class="err-count">⊗ 1</span> <span class="warn-count">⚠ 1</span> PROBLEMS</span>
                <span class="vsc-panel-tab">OUTPUT</span>
                <span class="vsc-panel-tab">DEBUG CONSOLE</span>
                <span class="vsc-panel-tab active">TERMINAL</span>
              </div>
              <div class="vsc-panel-tools">
                <span>1: cargo check (bash)</span>
                <span>+ ⌄</span>
                <span>🗑</span>
                <span>⌃</span>
                <span>✕</span>
              </div>
            </div>
            <div class="vsc-terminal-body" tabindex="0">
              <pre class="vsc-terminal-output"><span class="term-dim">[cargo v1.78.0-nightly (a14d59f 2026-10-08)]</span>
<span class="term-cyan">   Compiling</span> stupidx-core v0.9.4 (/home/dev/workspace/stupidx)
<span class="term-yellow">warning: variable does not need to be mutable: \`ctx\`</span>
  <span class="term-dim">--&gt;</span> src/core/main.rs:28:9
   <span class="term-dim">|</span>
<span class="term-dim">28 |</span>     <span class="term-yellow">let mut ctx = SessionContext::new();</span>
   <span class="term-dim">|         ----^^^</span>
   <span class="term-dim">|         |</span>
   <span class="term-dim">|         help: remove this \`mut\`</span>
   <span class="term-dim">|</span>
   <span class="term-dim">= note: \`#[warn(unused_mut)]\` on by default</span>

<span class="term-red">error[E0382]: use of moved value: \`pipeline_buffer\`</span>
  <span class="term-dim">--&gt;</span> src/core/main.rs:35:22
   <span class="term-dim">|</span>
<span class="term-dim">26 |</span>     pipeline_buffer: PipelineBuffer,
   <span class="term-dim">|     --------------- move occurs because \`pipeline_buffer\` has type \`PipelineBuffer\`, which does not implement \`Copy\`</span>
<span class="term-dim">...</span>
<span class="term-dim">32 |</span>     let result = worker.dispatch(pipeline_buffer);
   <span class="term-dim">|                                  --------------- value moved here</span>
<span class="term-dim">...</span>
<span class="term-dim">35 |</span>     telemetry.record(<span class="term-red">pipeline_buffer.len()</span>);
   <span class="term-dim">|                      ^^^^^^^^^^^^^^^ value borrowed here after move</span>

<span class="term-red">error: could not compile \`stupidx-core\` (bin "engine") due to 1 previous error; 1 warning emitted</span>
<span class="term-green">dev@worker-node-04:~/stupidx$</span> <span class="term-cursor">cargo check --workspace</span> <span class="term-blink">▋</span></pre>
            </div>
          </div>
        </main>
      </div>

      <!-- VS Code Status Bar -->
      <footer class="vsc-statusbar">
        <div class="vsc-status-left">
          <span class="status-badge"><span class="git-icon">🌿</span> main*</span>
          <span class="status-badge">⟳ 0↓ 1↑</span>
          <span class="status-badge"><span class="term-red">⊗ 1</span> <span class="term-yellow">⚠ 1</span></span>
        </div>
        <div class="vsc-status-right">
          <span>Ln 35, Col 22</span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>${activeFile.ext === 'rust' ? 'Rust' : 'Go'}</span>
          <span>rust-analyzer: ready</span>
          <span>Prettier: ✓</span>
        </div>
      </footer>
    </div>
  `;
}

/* =========================================================================
   3. DESIGNER PERSONA (Figma / Photoshop UI)
   ========================================================================= */

export function renderDesigner() {
  return `
    <div class="persona-view designer-view">
      <!-- Figma Top Navigation Toolbar -->
      <header class="figma-topbar">
        <div class="figma-topbar-left">
          <div class="figma-logo" title="Figma Menu">❖</div>
          <div class="figma-tool-group">
            <button type="button" class="figma-tool active" title="Move Tool (V)">↖</button>
            <button type="button" class="figma-tool" title="Frame (F)">▦</button>
            <button type="button" class="figma-tool" title="Rectangle (R)">▢</button>
            <button type="button" class="figma-tool" title="Pen Tool (P)">✒</button>
            <button type="button" class="figma-tool" title="Text (T)">T</button>
            <button type="button" class="figma-tool" title="Resources (Shift+I)">❖</button>
            <button type="button" class="figma-tool" title="Hand Tool (H)">✋</button>
            <button type="button" class="figma-tool" title="Comments (C)">💬</button>
          </div>
        </div>
        <div class="figma-topbar-center">
          <div class="figma-filename">
            <strong>Hero_Banner_FINAL_v2_edit_แก้รอบ3.png</strong>
            <span class="figma-dropdown-arrow">⌄</span>
            <span class="figma-file-status">Drafts / Edited 2m ago</span>
          </div>
        </div>
        <div class="figma-topbar-right">
          <div class="figma-avatars">
            <span class="figma-avatar" style="background:#f24822;">JD</span>
            <span class="figma-avatar" style="background:#1abcfe;">TH</span>
          </div>
          <button type="button" class="figma-share-btn">Share</button>
          <button type="button" class="figma-play-btn" title="Present">▶</button>
          <span class="figma-zoom">100% ⌄</span>
          <button class="document-close figma-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">✕</button>
        </div>
      </header>

      <!-- Figma Workspace: Layers Panel + Canvas Rulers + Properties Inspector -->
      <div class="figma-workspace">
        <!-- Left Sidebar: Layers & Assets -->
        <aside class="figma-layers-sidebar">
          <div class="figma-sidebar-tabs">
            <button type="button" class="figma-tab active">Layers</button>
            <button type="button" class="figma-tab">Assets</button>
          </div>
          <div class="figma-layers-filter">
            <span>🔍</span>
            <input type="text" placeholder="Filter layers..." readonly value="">
          </div>
          <div class="figma-layer-tree">
            <div class="figma-layer-item folder">
              <span class="tree-arrow">▾</span>
              <span class="layer-icon">▦</span>
              <span>Desktop 1440px — Hero Banner</span>
            </div>
            <div class="figma-layer-item folder indent-1">
              <span class="tree-arrow">▾</span>
              <span class="layer-icon">▦</span>
              <span>Navigation_Bar</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">T</span>
              <span>Brand_Logo_Typography</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">⬚</span>
              <span>Nav_Links_AutoLayout</span>
            </div>
            <div class="figma-layer-item folder indent-1">
              <span class="tree-arrow">▾</span>
              <span class="layer-icon">▦</span>
              <span>Hero_Content_Group</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">T</span>
              <span>Display_Headline_Bold</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">T</span>
              <span>Subheading_Thai_Copy</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">▨</span>
              <span>Button_CTA_Primary</span>
            </div>
            <div class="figma-layer-item folder indent-1">
              <span class="tree-arrow">▾</span>
              <span class="layer-icon">▦</span>
              <span>Visual_Compositions</span>
            </div>
            <!-- Explicit requested layer name -->
            <div class="figma-layer-item selected-layer indent-2">
              <span class="layer-icon">🖼</span>
              <strong>Hero_Banner_FINAL_v2_edit_แก้รอบ3.png</strong>
              <span class="eye-icon">👁</span>
              <span class="lock-icon">🔓</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">⬚</span>
              <span>Glow_Mesh_Gradient_FX</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">⬚</span>
              <span>Vector_Grid_Perspective</span>
            </div>
            <div class="figma-layer-item indent-2">
              <span class="layer-icon">⬚</span>
              <span>Glass_Card_Container</span>
            </div>
          </div>
        </aside>

        <!-- Center Canvas Area with Rulers -->
        <main class="figma-canvas-area">
          <!-- Horizontal Ruler -->
          <div class="figma-ruler-h">
            <span class="ruler-tick">0</span>
            <span class="ruler-tick">200</span>
            <span class="ruler-tick">400</span>
            <span class="ruler-tick">600</span>
            <span class="ruler-tick">800</span>
            <span class="ruler-tick">1000</span>
            <span class="ruler-tick">1200</span>
            <span class="ruler-tick">1400</span>
            <span class="ruler-tick">1600</span>
          </div>

          <div class="figma-canvas-viewport">
            <!-- Vertical Ruler -->
            <div class="figma-ruler-v">
              <span class="ruler-tick">0</span>
              <span class="ruler-tick">100</span>
              <span class="ruler-tick">200</span>
              <span class="ruler-tick">300</span>
              <span class="ruler-tick">400</span>
              <span class="ruler-tick">500</span>
              <span class="ruler-tick">600</span>
              <span class="ruler-tick">700</span>
              <span class="ruler-tick">800</span>
            </div>

            <!-- Canvas Background & Artboards -->
            <div class="figma-canvas-stage">
              <!-- Artboard Frame -->
              <div class="figma-artboard-frame">
                <div class="artboard-label">
                  <span>Desktop 1440px — Hero Banner</span>
                  <small>1440 × 820</small>
                </div>

                <!-- High-fidelity artboard design mockup -->
                <div class="artboard-canvas-surface">
                  <div class="artboard-hero-card">
                    <!-- Ambient Glow -->
                    <div class="hero-glow-sphere"></div>
                    <div class="hero-grid-mesh"></div>

                    <!-- Hero UI Content -->
                    <div class="hero-mockup-nav">
                      <div class="mockup-logo">❖ NEXUS PLATFORM</div>
                      <div class="mockup-menu">
                        <span>Solutions</span>
                        <span>Enterprise</span>
                        <span>Security</span>
                        <span>Pricing</span>
                      </div>
                      <button type="button" class="mockup-btn-sm">Book Demo</button>
                    </div>

                    <div class="hero-mockup-body">
                      <div class="mockup-badge">✨ ENTERPRISE SUITE 2026 · V2.4</div>
                      <h2 class="mockup-title">Accelerate Velocity With Zero Friction.</h2>
                      <p class="mockup-subtitle">ระบบบริหารจัดการประสิทธิภาพและการประสานงานระดับองค์กรแบบเรียลไทม์</p>
                      <div class="mockup-actions">
                        <button type="button" class="mockup-btn-primary">Start 14-Day Free Trial →</button>
                        <button type="button" class="mockup-btn-secondary">Explore API Specs</button>
                      </div>

                      <!-- Dashboard Preview Card inside artboard -->
                      <div class="mockup-dashboard-preview">
                        <div class="preview-header">
                          <span class="preview-dot red"></span>
                          <span class="preview-dot yellow"></span>
                          <span class="preview-dot green"></span>
                          <span class="preview-title">Real-Time Core Engine Metrics (Q4)</span>
                        </div>
                        <div class="preview-stats-row">
                          <div class="stat-pill">
                            <small>Throughput</small>
                            <strong>1.48M req/s</strong>
                          </div>
                          <div class="stat-pill">
                            <small>Latency p99</small>
                            <strong>1.2ms</strong>
                          </div>
                          <div class="stat-pill">
                            <small>Uptime</small>
                            <strong>99.998%</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Blue Selection Box over Hero_Banner_FINAL_v2_edit_แก้รอบ3.png -->
                    <div class="figma-selection-box">
                      <div class="selection-handle top-left"></div>
                      <div class="selection-handle top-center"></div>
                      <div class="selection-handle top-right"></div>
                      <div class="selection-handle middle-left"></div>
                      <div class="selection-handle middle-right"></div>
                      <div class="selection-handle bottom-left"></div>
                      <div class="selection-handle bottom-center"></div>
                      <div class="selection-handle bottom-right"></div>
                      <div class="selection-tag">Hero_Banner_FINAL_v2_edit_แก้รอบ3.png (1440 × 820)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- Right Sidebar: Properties Panel -->
        <aside class="figma-properties-sidebar">
          <div class="figma-props-tabs">
            <button type="button" class="figma-tab active">Design</button>
            <button type="button" class="figma-tab">Prototype</button>
            <button type="button" class="figma-tab">Inspect</button>
          </div>
          <!-- Alignment -->
          <div class="props-section align-section">
            <div class="align-buttons">
              <span title="Align Left">⇤</span>
              <span title="Align Horizontal Center">↔</span>
              <span title="Align Right">⇥</span>
              <span title="Align Top">⤒</span>
              <span title="Align Vertical Center">↕</span>
              <span title="Align Bottom">⤓</span>
            </div>
          </div>
          <!-- Geometry -->
          <div class="props-section">
            <div class="props-row">
              <div class="prop-field"><label>X</label><span>240</span></div>
              <div class="prop-field"><label>Y</label><span>130</span></div>
            </div>
            <div class="props-row">
              <div class="prop-field"><label>W</label><span>1440</span></div>
              <div class="prop-field"><label>H</label><span>820</span></div>
            </div>
            <div class="props-row">
              <div class="prop-field"><label>∠</label><span>0°</span></div>
              <div class="prop-field"><label>╭</label><span>16</span></div>
            </div>
          </div>
          <!-- Auto Layout -->
          <div class="props-section">
            <div class="section-title">Auto layout</div>
            <div class="props-row">
              <span class="badge-tag">⬇ Vertical</span>
              <span class="badge-tag">Gap: 24px</span>
            </div>
          </div>
          <!-- Fill -->
          <div class="props-section">
            <div class="section-title">Fill</div>
            <div class="fill-row">
              <span class="color-swatch" style="background: linear-gradient(135deg, #0f172a, #1e1b4b);"></span>
              <span>Linear Gradient (Hex #0F172A)</span>
              <span class="fill-opacity">100%</span>
            </div>
          </div>
          <!-- Stroke -->
          <div class="props-section">
            <div class="section-title">Stroke</div>
            <div class="fill-row">
              <span class="color-swatch" style="background: #38bdf8;"></span>
              <span>Inside 1px #38BDF8</span>
              <span class="fill-opacity">35%</span>
            </div>
          </div>
          <!-- Effects -->
          <div class="props-section">
            <div class="section-title">Effects</div>
            <div class="props-row">
              <span>💧 Drop shadow</span>
              <small class="muted">0, 24, 48, #000000 50%</small>
            </div>
          </div>
          <!-- Export -->
          <div class="props-section export-section">
            <div class="section-title">Export</div>
            <div class="props-row">
              <span>PNG</span>
              <span>2x</span>
            </div>
            <button type="button" class="figma-export-btn">Export Hero_Banner_FINAL_v2_edit_แก้รอบ3.png</button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

/* =========================================================================
   4. PM (PROJECT MANAGER) PERSONA (Jira / Trello Kanban Board)
   ========================================================================= */

const KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    count: 4,
    badgeColor: '#42526e',
    cards: [
      {
        key: 'EP-402',
        title: 'Implement OAuth2.0 PKCE auth flow for mobile endpoints',
        type: 'story',
        priority: 'high',
        points: 5,
        tag: 'Backend',
        avatar: 'JD',
        avatarColor: '#0052cc',
      },
      {
        key: 'EP-409',
        title: 'Update API rate limiting policy on Redis cluster',
        type: 'task',
        priority: 'medium',
        points: 3,
        tag: 'DevOps',
        avatar: 'AL',
        avatarColor: '#00875a',
      },
      {
        key: 'EP-415',
        title: 'Design Figma specs for enterprise settings modal',
        type: 'story',
        priority: 'low',
        points: 3,
        tag: 'Design',
        avatar: 'MT',
        avatarColor: '#6554c0',
      },
      {
        key: 'EP-422',
        title: 'Refactor telemetry event schema for Q4 compliance audit',
        type: 'task',
        priority: 'high',
        points: 8,
        tag: 'Core',
        avatar: 'PK',
        avatarColor: '#ff5630',
      },
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    count: 3,
    badgeColor: '#0052cc',
    cards: [
      {
        key: 'EP-388',
        title: 'Migrate legacy billing webhook to Stripe v3 idempotent workers',
        type: 'story',
        priority: 'highest',
        points: 8,
        tag: 'Billing',
        avatar: 'JD',
        avatarColor: '#0052cc',
      },
      {
        key: 'EP-394',
        title: 'Optimize Postgres composite index on ledger_transactions_q4',
        type: 'task',
        priority: 'high',
        points: 5,
        tag: 'Database',
        avatar: 'AL',
        avatarColor: '#00875a',
      },
      {
        key: 'EP-399',
        title: 'Implement real-time WebSocket connection heartbeat pool',
        type: 'story',
        priority: 'medium',
        points: 3,
        tag: 'Frontend',
        avatar: 'MT',
        avatarColor: '#6554c0',
      },
    ]
  },
  {
    id: 'blocked',
    title: 'Blocked',
    count: 2,
    badgeColor: '#de350b',
    cards: [
      {
        key: 'EP-377',
        title: 'App Store compliance review: Camera permission dialog rejected',
        type: 'bug',
        priority: 'highest',
        points: 5,
        tag: 'Mobile',
        avatar: 'PK',
        avatarColor: '#ff5630',
        blockedReason: '⚠️ Awaiting Legal Team Approval (Ticket #9102)',
      },
      {
        key: 'EP-381',
        title: 'Cross-region DB replica latency spike on AWS us-east-1',
        type: 'bug',
        priority: 'highest',
        points: 8,
        tag: 'Infra',
        avatar: 'AL',
        avatarColor: '#00875a',
        blockedReason: '⚠️ Awaiting AWS Enterprise Support Escalation',
      },
    ]
  },
  {
    id: 'sprint-42',
    title: 'Sprint 42',
    subtitle: 'Done (4)',
    count: 4,
    badgeColor: '#00875a',
    cards: [
      {
        key: 'EP-350',
        title: 'Fix memory leak in COCO-SSD object detection pipeline',
        type: 'bug',
        priority: 'high',
        points: 5,
        tag: 'Vision',
        avatar: 'JD',
        avatarColor: '#0052cc',
        done: true,
      },
      {
        key: 'EP-355',
        title: 'Deliver Q4 executive financial summary report & model',
        type: 'story',
        priority: 'high',
        points: 8,
        tag: 'Finance',
        avatar: 'MT',
        avatarColor: '#6554c0',
        done: true,
      },
      {
        key: 'EP-361',
        title: 'Implement keyboard panic shortcut (KeyB) instant trigger',
        type: 'task',
        priority: 'medium',
        points: 3,
        tag: 'Core',
        avatar: 'AL',
        avatarColor: '#00875a',
        done: true,
      },
      {
        key: 'EP-369',
        title: 'Setup automated CI pipeline for headless browser tests',
        type: 'task',
        priority: 'medium',
        points: 5,
        tag: 'DevOps',
        avatar: 'PK',
        avatarColor: '#ff5630',
        done: true,
      },
    ]
  }
];

function burndownChartSvg() {
  return `
    <svg viewBox="0 0 340 100" class="burndown-svg" role="img" aria-label="กราฟ Burndown สำหรับ Sprint 42">
      <!-- Grid Lines -->
      <line x1="30" y1="15" x2="330" y2="15" stroke="#dfe1e6" stroke-dasharray="2,2"/>
      <line x1="30" y1="45" x2="330" y2="45" stroke="#dfe1e6" stroke-dasharray="2,2"/>
      <line x1="30" y1="75" x2="330" y2="75" stroke="#dfe1e6"/>
      <!-- Y-Axis Labels -->
      <text x="24" y="18" font-size="9" text-anchor="end" fill="#6b778c">58</text>
      <text x="24" y="48" font-size="9" text-anchor="end" fill="#6b778c">30</text>
      <text x="24" y="78" font-size="9" text-anchor="end" fill="#6b778c">0</text>
      <!-- Ideal Guideline (gray dashed line) -->
      <line x1="35" y1="15" x2="325" y2="75" stroke="#97a0af" stroke-width="2" stroke-dasharray="4,4"/>
      <!-- Actual Burned Line (blue solid line) -->
      <polyline points="35,15 90,20 145,32 200,48 240,54" fill="none" stroke="#0052cc" stroke-width="2.5"/>
      <!-- Data Points -->
      <circle cx="35" cy="15" r="3.5" fill="#0052cc"/>
      <circle cx="90" cy="20" r="3.5" fill="#0052cc"/>
      <circle cx="145" cy="32" r="3.5" fill="#0052cc"/>
      <circle cx="200" cy="48" r="3.5" fill="#0052cc"/>
      <circle cx="240" cy="54" r="4.5" fill="#ff5630" stroke="#fff" stroke-width="1.5"/>
      <!-- Day Labels -->
      <text x="35" y="92" font-size="9" text-anchor="middle" fill="#6b778c">Day 1</text>
      <text x="110" y="92" font-size="9" text-anchor="middle" fill="#6b778c">Day 4</text>
      <text x="180" y="92" font-size="9" text-anchor="middle" fill="#6b778c">Day 8</text>
      <text x="240" y="92" font-size="9" text-anchor="middle" fill="#0052cc" font-weight="bold">Today</text>
      <text x="325" y="92" font-size="9" text-anchor="middle" fill="#6b778c">Day 14</text>
    </svg>
  `;
}

export function renderPM() {
  return `
    <div class="persona-view pm-view">
      <!-- Jira Navigation Header -->
      <header class="jira-navbar">
        <div class="jira-nav-left">
          <span class="jira-waffle-icon" title="App Switcher">:::</span>
          <div class="jira-brand">
            <span class="jira-logo-mark">▲</span>
            <strong>Jira Software</strong>
          </div>
          <nav class="jira-nav-links">
            <span class="jira-link active">Projects ▾</span>
            <span class="jira-link">Filters ▾</span>
            <span class="jira-link">Dashboards ▾</span>
            <span class="jira-link">Teams ▾</span>
            <span class="jira-link">Plans ▾</span>
          </nav>
          <button type="button" class="jira-create-btn">+ Create</button>
        </div>
        <div class="jira-nav-right">
          <div class="jira-search-input">
            <span>🔍</span>
            <input type="text" placeholder="Search Jira..." readonly>
          </div>
          <span class="jira-icon-btn" title="Notifications">🔔</span>
          <span class="jira-icon-btn" title="Settings">⚙</span>
          <span class="jira-user-avatar">JD</span>
          <button class="document-close jira-close" type="button" aria-label="ปิดเอกสาร" title="ปิดเอกสาร">✕</button>
        </div>
      </header>

      <!-- Board Header & Quick Filters -->
      <div class="jira-board-header">
        <div class="jira-breadcrumbs">
          <span>Projects</span> / <span>Enterprise Platform (EP)</span> / <span>Boards</span> / <strong>Sprint 42</strong>
        </div>
        <div class="jira-board-title-row">
          <h1>EP Sprint 42 Kanban Board</h1>
          <div class="jira-sprint-badge">
            <span class="sprint-status-dot"></span>
            <span>Sprint 42 (Oct 10 – Oct 24) · 14 days remaining</span>
          </div>
        </div>
        <!-- Burndown Stats Widget Banner -->
        <div class="jira-burndown-banner">
          <div class="burndown-metrics">
            <div class="burndown-metric-card">
              <span class="metric-title">Sprint Velocity</span>
              <strong class="metric-value text-green">78% on track</strong>
              <small class="metric-hint">Burn rate optimal</small>
            </div>
            <div class="burndown-metric-card">
              <span class="metric-title">Total Story Points</span>
              <strong class="metric-value">58 pts</strong>
              <small class="metric-hint">13 total issues</small>
            </div>
            <div class="burndown-metric-card">
              <span class="metric-title">Completed</span>
              <strong class="metric-value text-blue">34 pts (59%)</strong>
              <small class="metric-hint">4 issues done</small>
            </div>
            <div class="burndown-metric-card">
              <span class="metric-title">In Flight</span>
              <strong class="metric-value text-orange">16 pts</strong>
              <small class="metric-hint">3 in progress</small>
            </div>
            <div class="burndown-metric-card">
              <span class="metric-title">Blocked</span>
              <strong class="metric-value text-red">8 pts ⚠️</strong>
              <small class="metric-hint">2 critical blockers</small>
            </div>
          </div>
          <div class="burndown-chart-container">
            <div class="burndown-chart-header">
              <span>Burndown Trend: Ideal vs Actual</span>
              <small><span class="legend-box blue"></span>Actual <span class="legend-box gray"></span>Guideline</small>
            </div>
            ${burndownChartSvg()}
          </div>
        </div>
        <!-- Quick Filter Pills -->
        <div class="jira-filter-bar">
          <span class="filter-label">Quick Filters:</span>
          <button type="button" class="jira-pill active">All Issues (13)</button>
          <button type="button" class="jira-pill">Only My Issues</button>
          <button type="button" class="jira-pill">High Priority</button>
          <button type="button" class="jira-pill">Frontend</button>
          <button type="button" class="jira-pill">Backend</button>
          <button type="button" class="jira-pill filter-blocked">⚠️ Blocked Only (2)</button>
          <span class="jira-filter-spacer"></span>
          <span class="jira-group-by">Group By: <strong>None ▾</strong></span>
        </div>
      </div>

      <!-- Kanban Columns Board -->
      <main class="jira-kanban-board">
        ${KANBAN_COLUMNS.map(col => `
          <div class="kanban-column" data-column="${col.id}">
            <div class="kanban-column-header">
              <div class="col-title-group">
                <h3>${col.title}</h3>
                <span class="col-count-badge" style="background:${col.badgeColor}">${col.count}</span>
              </div>
              <span class="col-more-btn">···</span>
            </div>
            <div class="kanban-cards-list">
              ${col.cards.map(card => `
                <div class="kanban-card ${card.blockedReason ? 'card-blocked' : ''} ${card.done ? 'card-done' : ''}">
                  <div class="card-top-row">
                    <span class="card-key">${card.key}</span>
                    <span class="card-tag">${card.tag}</span>
                  </div>
                  <h4 class="card-title">${card.title}</h4>
                  ${card.blockedReason ? `<div class="card-blocked-banner">${card.blockedReason}</div>` : ''}
                  <div class="card-bottom-row">
                    <div class="card-indicators">
                      <span class="priority-icon ${card.priority}" title="Priority: ${card.priority}">
                        ${card.priority === 'highest' ? '⬆' : card.priority === 'high' ? '🔺' : card.priority === 'medium' ? '➖' : '🔽'}
                      </span>
                      <span class="story-points" title="Story Points">${card.points}</span>
                    </div>
                    <span class="card-avatar" style="background:${card.avatarColor}" title="Assignee: ${card.avatar}">${card.avatar}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </main>
    </div>
  `;
}

/* =========================================================================
   PERSONAS REGISTRY
   ========================================================================= */

export const PERSONAS = {
  accountant: {
    id: 'accountant',
    name: 'Accountant',
    software: 'Excel Q4 Financial Spreadsheet',
    badge: 'Excel',
    icon: '📊',
    windowTitle: 'รายงานผลการดำเนินงาน Q4.xlsx — Microsoft Excel',
    render: () => renderAccountant(),
  },
  developer: {
    id: 'developer',
    name: 'Developer',
    software: 'VS Code Dark Theme',
    badge: 'VS Code',
    icon: '💻',
    windowTitle: 'main.rs — stupidx-core — Visual Studio Code',
    render: (state) => renderDeveloper(state?.selectedFile || 'main.rs'),
  },
  designer: {
    id: 'designer',
    name: 'Designer',
    software: 'Figma / Photoshop UI',
    badge: 'Figma',
    icon: '🎨',
    windowTitle: 'Hero_Banner_FINAL_v2_edit_แก้รอบ3.png — Figma',
    render: () => renderDesigner(),
  },
  pm: {
    id: 'pm',
    name: 'PM (Project Manager)',
    software: 'Jira / Trello Kanban Board',
    badge: 'Jira',
    icon: '📋',
    windowTitle: 'EP Sprint 42 Kanban Board — Jira Software',
    render: () => renderPM(),
  },
};
