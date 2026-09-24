import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { join, relative } from 'path';
import { tmpdir } from 'os';
import { shouldIncludeScaffoldPath } from '../../scaffold-rules.mjs';

export interface ScaffoldSource {
  bundled: boolean;
  cleanup?: () => void;
  sourceDir: string;
}

export { shouldIncludeScaffoldPath } from '../../scaffold-rules.mjs';

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
    const fallbackDir = mkdtempSync(join(tmpdir(), 'prompts-chat-scaffold-'));
    copyScaffoldFiles(repoRoot, fallbackDir);

    return {
      bundled: false,
      cleanup: () => rmSync(fallbackDir, { force: true, recursive: true }),
      sourceDir: fallbackDir,
    };
  }

  throw new Error('Bundled scaffold not found. Reinstall prompts.chat and try again.');
}

export function copyScaffoldFiles(sourceDir: string, targetDir: string): void {
  const entries = readdirSync(sourceDir);

  mkdirSync(targetDir, { recursive: true });

  for (const entry of entries) {
    if (!shouldIncludeScaffoldPath(entry)) {
      continue;
    }

    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);

    cpSync(sourcePath, targetPath, {
      recursive: true,
      filter: (nestedSourcePath) =>
        shouldIncludeScaffoldPath(relative(sourceDir, nestedSourcePath)),
    });
  }
}
