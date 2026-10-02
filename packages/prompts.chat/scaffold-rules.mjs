import path from 'path';

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

export function shouldIncludeScaffoldPath(relativePath) {
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
