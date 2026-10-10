import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('styles/themes.css defines :root[data-theme="icu"] with all standard CSS tokens', async () => {
  const css = await readFile(new URL('../styles/themes.css', import.meta.url), 'utf8');

  // Verify theme selector
  assert.match(css, /:root\[data-theme=["']icu["']\]/);

  // Extract the :root[data-theme="icu"] declaration block
  const match = css.match(/:root\[data-theme=["']icu["']\]\s*\{([^}]+)\}/);
  assert.ok(match, ':root[data-theme="icu"] block should exist');
  const icuBlock = match[1];

  // Standard token contract checks
  const requiredTokens = [
    'color-scheme',
    '--desktop',
    '--surface',
    '--surface-alt',
    '--text',
    '--muted',
    '--border',
    '--accent',
    '--accent-text',
    '--radius',
    '--shadow',
    '--chrome',
    '--chrome-text',
    '--tab-idle',
    '--tab-selected',
    '--tab-text',
    '--brand-fill',
    '--button-shadow',
    '--panic',
    '--sheet-accent',
    '--sheet-grid',
    '--sheet-header',
    '--sheet-chrome',
    'font-family',
  ];

  for (const token of requiredTokens) {
    assert.ok(icuBlock.includes(token), `Token ${token} must be defined in :root[data-theme="icu"]`);
  }

  // Aesthetic color palette checks
  assert.match(icuBlock, /#05080c/i, 'Must include pitch black #05080c');
  assert.match(icuBlock, /#00e676/i, 'Must include oscilloscope green #00e676');
  assert.match(icuBlock, /#ffab00/i, 'Must include warning amber #ffab00');
  assert.match(icuBlock, /#00e5ff/i, 'Must include cyan #00e5ff');

  // Digital LCD / segmented typography checks
  assert.match(icuBlock, /monospace/i, 'Font family must include monospace');
  assert.match(icuBlock, /Consolas/i, 'Font family must include Consolas');
});

test('styles/themes.css includes ECG pulse wave animation, vital counter, and flatline alerts', async () => {
  const css = await readFile(new URL('../styles/themes.css', import.meta.url), 'utf8');

  // ECG wave styling: SVG waveform and keyframe animation
  assert.match(css, /@keyframes\s+icu-ecg-sweep/, 'Must define ECG sweep animation');
  assert.match(css, /data:image\/svg\+xml/, 'Must define SVG wave data URI');
  assert.match(css, /\[data-theme=["']icu["']\]\s+\.empty-progress/, 'Must style progress bar with ECG wave');

  // Heart rate counter checks
  assert.match(css, /HR:\s*78\s*bpm/i, 'Must display heart rate readout');
  assert.match(css, /SpO2:\s*99%/i, 'Must display SpO2 readout');
  assert.match(css, /ST:\s*Normal/i, 'Must display ST wave readout');

  // Flatline alert state styling when paused or panic triggered
  assert.match(css, /\[data-theme=["']icu["']\]\s+\.yt-blink-lock-overlay/, 'Must style paused lock overlay');
  assert.match(css, /\[data-theme=["']icu["']\]\s+body\.working/, 'Must style panic working state');
  assert.match(css, /FLATLINE/i, 'Must define flatline alert state');
  assert.match(css, /ASYSTOLE/i, 'Must reference asystole / flatline state');
});
