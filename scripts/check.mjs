import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesAt(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}
const sources = (await filesAt('src')).filter((path) => path.endsWith('.js'));
const ids = new Map();
let failures = 0;
for (const path of sources) {
  const check = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (check.status !== 0) { console.error(check.stderr); failures++; }
  const source = await readFile(path, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
    try { await access(resolve(dirname(path), match[1])); }
    catch { console.error(`Missing import ${match[1]} in ${path}`); failures++; }
  }
  for (const [, id] of source.matchAll(/\bid="([^"$]+)"/g)) {
    if (ids.has(id)) { console.error(`Duplicate literal DOM id ${id}: ${path}, ${ids.get(id)}`); failures++; }
    ids.set(id, path);
  }
}
const html = await readFile('index.html', 'utf8');
for (const [, id] of html.matchAll(/\bid="([^"$]+)"/g)) {
  if (ids.has(id)) { console.error(`Duplicate DOM id ${id}`); failures++; }
  ids.set(id, 'index.html');
}
for (const [, reference] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  try { await access(reference); } catch { console.error(`Missing HTML asset ${reference}`); failures++; }
}
if (failures) process.exitCode = 1;
else console.log(`Syntax/imports/HTML assets checked: ${sources.length} modules; ${ids.size} literal DOM IDs are unique.`);
