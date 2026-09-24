import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  copyScaffoldFiles,
  findScaffoldSource,
  shouldIncludeScaffoldPath,
} from '../cli/scaffold';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'prompts-chat-scaffold-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('scaffold helpers', () => {
  it('filters development-only scaffold paths', () => {
    expect(shouldIncludeScaffoldPath('package.json')).toBe(true);
    expect(shouldIncludeScaffoldPath('.env.example')).toBe(true);
    expect(shouldIncludeScaffoldPath('scripts/setup.js')).toBe(true);
    expect(shouldIncludeScaffoldPath('scripts/generate-docs.ts')).toBe(false);
    expect(shouldIncludeScaffoldPath('scripts/rebuild-history.sh')).toBe(false);
    expect(shouldIncludeScaffoldPath('.github/workflows/ci.yml')).toBe(false);
    expect(shouldIncludeScaffoldPath('packages/prompts.chat/package.json')).toBe(false);
    expect(shouldIncludeScaffoldPath('.env.local')).toBe(false);
  });

  it('copies scaffold files without development-only content', () => {
    const sourceDir = createTempDir();
    const targetDir = createTempDir();

    mkdirSync(join(sourceDir, 'scripts'), { recursive: true });
    mkdirSync(join(sourceDir, 'src', 'app'), { recursive: true });
    mkdirSync(join(sourceDir, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(sourceDir, 'packages', 'prompts.chat'), { recursive: true });

    writeFileSync(join(sourceDir, 'package.json'), '{}');
    writeFileSync(join(sourceDir, '.env.example'), 'AUTH_SECRET=""');
    writeFileSync(join(sourceDir, '.env.local'), 'SECRET=1');
    writeFileSync(join(sourceDir, 'scripts', 'setup.js'), 'console.log("setup");');
    writeFileSync(join(sourceDir, 'scripts', 'generate-docs.ts'), 'console.log("skip");');
    writeFileSync(join(sourceDir, 'src', 'app', 'page.tsx'), 'export default function Page() {}');
    writeFileSync(join(sourceDir, '.github', 'workflows', 'ci.yml'), 'name: ci');
    writeFileSync(join(sourceDir, 'packages', 'prompts.chat', 'package.json'), '{}');

    copyScaffoldFiles(sourceDir, targetDir);

    expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
    expect(existsSync(join(targetDir, '.env.example'))).toBe(true);
    expect(existsSync(join(targetDir, 'scripts', 'setup.js'))).toBe(true);
    expect(existsSync(join(targetDir, 'src', 'app', 'page.tsx'))).toBe(true);
    expect(existsSync(join(targetDir, '.env.local'))).toBe(false);
    expect(existsSync(join(targetDir, 'scripts', 'generate-docs.ts'))).toBe(false);
    expect(existsSync(join(targetDir, '.github'))).toBe(false);
    expect(existsSync(join(targetDir, 'packages'))).toBe(false);
  });

  it('prefers the bundled template when present', () => {
    const repoRoot = createTempDir();
    const packageRoot = join(repoRoot, 'packages', 'prompts.chat');
    const templateDir = join(packageRoot, 'template');

    mkdirSync(templateDir, { recursive: true });
    writeFileSync(join(repoRoot, 'prompts.config.ts'), 'export default {};');

    expect(findScaffoldSource(packageRoot)).toEqual({
      bundled: true,
      sourceDir: templateDir,
    });
  });

  it('falls back to the local repository when the template is missing', () => {
    const repoRoot = createTempDir();
    const packageRoot = join(repoRoot, 'packages', 'prompts.chat');

    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(repoRoot, 'prompts.config.ts'), 'export default {};');

    expect(findScaffoldSource(packageRoot)).toEqual({
      bundled: false,
      sourceDir: repoRoot,
    });
  });
});
