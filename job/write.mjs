/**
 * Writes the three data files into one folder, all or nothing.
 *
 * The job calls this only after every check has passed. Each file is written first under a
 * name of its own beside the target (.<name>.writing), and only when all three are on disk are
 * they renamed into place: installers.json, territory.json, then build.json, which holds the
 * fingerprints of the other two. If a write fails before the renames, the files already there
 * are untouched and the .writing files this call made are removed; nothing else is removed.
 */
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const FILE_NAMES = ['installers.json', 'territory.json', 'build.json'];

/** files: { 'installers.json': text, 'territory.json': text, 'build.json': text }. */
export function writeFiles(folder, files) {
  const staged = [];
  try {
    for (const name of FILE_NAMES) {
      if (typeof files[name] !== 'string') throw new Error(`no contents for ${name}`);
      const temp = join(folder, `.${name}.writing`);
      staged.push([temp, join(folder, name)]);
      writeFileSync(temp, files[name]);
    }
  } catch (e) {
    for (const [temp] of staged) if (existsSync(temp)) rmSync(temp, { force: true });
    throw e;
  }
  for (const [temp, target] of staged) renameSync(temp, target);
}
