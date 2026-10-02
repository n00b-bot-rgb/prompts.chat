import { cpSync, mkdirSync, readdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { shouldIncludeScaffoldPath } from '../scaffold-rules.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const templateDir = path.join(packageDir, 'template');

rmSync(templateDir, { recursive: true, force: true });
const entries = readdirSync(repoRoot);
mkdirSync(templateDir, { recursive: true });

for (const entry of entries) {
  if (!shouldIncludeScaffoldPath(entry)) {
    continue;
  }

  const sourcePath = path.join(repoRoot, entry);
  const targetPath = path.join(templateDir, entry);

  cpSync(sourcePath, targetPath, {
    recursive: true,
    filter: (nestedSourcePath) =>
      shouldIncludeScaffoldPath(path.relative(repoRoot, nestedSourcePath)),
  });
}
