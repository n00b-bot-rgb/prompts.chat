import { cpSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const templateDir = path.join(packageDir, 'template');

const EXCLUDED_TOP_LEVEL_ENTRIES = new Set([
  '.claude',
  '.git',
  '.github',
  '.next',
  '.turbo',
  '.vercel',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'packages',
]);

function shouldIncludeScaffoldPath(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join('/');
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return true;
  }

  if (EXCLUDED_TOP_LEVEL_ENTRIES.has(segments[0])) {
    return false;
  }

  const name = path.basename(normalizedPath);

  if (name === '.DS_Store' || name.endsWith('.log')) {
    return false;
  }

  if (name.startsWith('.env') && name !== '.env.example') {
    return false;
  }

  if (
    segments[0] === 'scripts' &&
    (name.startsWith('generate') || name.startsWith('rebuild'))
  ) {
    return false;
  }

  return true;
}

rmSync(templateDir, { recursive: true, force: true });
mkdirSync(templateDir, { recursive: true });

cpSync(repoRoot, templateDir, {
  recursive: true,
  filter: (sourcePath) => {
    const relativePath = path.relative(repoRoot, sourcePath);
    if (!relativePath) {
      return true;
    }

    return shouldIncludeScaffoldPath(relativePath);
  },
});
