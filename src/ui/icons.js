const paths = {
  play: '<path d="m9 5 12 7-12 7Z" fill="currentColor" stroke="none"/>',
  bot: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 7V3M2 11v5m20-5v5M8 13h.01M16 13h.01m-8 4c2 1 6 1 8 0"/><circle cx="12" cy="2" r="1"/>',
  music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface)"/><circle cx="16" cy="17" r="3" fill="var(--surface)"/>',
  lock: '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  arrow: '<path d="m14 5-7 7 7 7"/>',
  windows: '<path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" fill="currentColor" stroke="none"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.windows}</svg>`;
}

export function sleepyComputer() {
  return '<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="5" width="46" height="39" rx="8" fill="var(--brand-fill)" stroke="currentColor" stroke-width="3"/><path d="M20 24q4 7 8 0m8 0q4 7 8 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M26 44v8h12v-8M17 57h30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M15 10h30" stroke="white" stroke-width="2" opacity=".7"/></svg>';
}
