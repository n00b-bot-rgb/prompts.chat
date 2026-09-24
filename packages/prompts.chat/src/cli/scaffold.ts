import { cpSync, existsSync, mkdirSync } from 'fs';
import { basename, join, relative } from 'path';

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

export interface ScaffoldSource {
  bundled: boolean;
  sourceDir: string;
}

function toPosixPath(filePath: string): string {
  return filePath.split('\\').join('/');
}

export function shouldIncludeScaffoldPath(relativePath: string): boolean {
  const normalizedPath = toPosixPath(relativePath);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return true;
  }

  if (EXCLUDED_TOP_LEVEL_ENTRIES.has(segments[0]!)) {
    return false;
  }

  const name = basename(normalizedPath);

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

export function findScaffoldSource(packageRoot: string): ScaffoldSource {
  const templateDir = join(packageRoot, 'template');
  if (existsSync(templateDir)) {
    return {
      bundled: true,
      sourceDir: templateDir,
    };
  }

  const repoRoot = join(packageRoot, '..', '..');
  if (existsSync(join(repoRoot, 'prompts.config.ts'))) {
    return {
      bundled: false,
      sourceDir: repoRoot,
    };
  }

  throw new Error('Bundled scaffold not found. Reinstall prompts.chat and try again.');
}

export function copyScaffoldFiles(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });

  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = relative(sourceDir, sourcePath);
      if (!relativePath) {
        return true;
      }

      return shouldIncludeScaffoldPath(relativePath);
    },
  });
}
