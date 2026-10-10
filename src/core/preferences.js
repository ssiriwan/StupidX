export const OS_OPTIONS = new Set(['win11', 'win95', 'xp']);
export const SUBTHEME_OPTIONS = new Set(['default', 'dark', 'gov', 'hi5', 'matrix', 'icu']);
export const RESUME_POLICIES = new Set(['auto', 'manual']);
export const PREFERENCES_KEY = 'totally-working.preferences';

export function normalizePreferences(value = {}) {
  return {
    os: OS_OPTIONS.has(value?.os) ? value.os : 'win11',
    subtheme: SUBTHEME_OPTIONS.has(value?.subtheme) ? value.subtheme : 'default',
    resumePolicy: RESUME_POLICIES.has(value?.resumePolicy) ? value.resumePolicy : 'auto',
  };
}

export function loadPreferences(storage) {
  try { return normalizePreferences(JSON.parse(storage?.getItem(PREFERENCES_KEY) ?? 'null')); }
  catch { return normalizePreferences(); }
}

export function savePreferences(storage, value) {
  try {
    if (!storage) return false;
    storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(value)));
    return true;
  } catch { return false; }
}
