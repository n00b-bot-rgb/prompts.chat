import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  copyScaffoldFiles: vi.fn(),
  findScaffoldSource: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('child_process', () => ({ execSync: mocks.execSync, spawn: mocks.spawn }));
vi.mock('fs', () => ({ existsSync: mocks.existsSync, readdirSync: mocks.readdirSync }));
vi.mock('../cli/scaffold.js', () => ({
  copyScaffoldFiles: mocks.copyScaffoldFiles,
  findScaffoldSource: mocks.findScaffoldSource,
}));

import { createNew, INSTALL_DEPENDENCIES_COMMAND } from '../cli/new';

const previousExitCode = process.exitCode;

describe('createNew', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.exitCode = undefined;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.existsSync.mockReturnValue(false);
    mocks.findScaffoldSource.mockReturnValue({
      bundled: true,
      sourceDir: '/tmp/prompts-chat-template',
      cleanup: mocks.cleanup,
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    vi.restoreAllMocks();
  });

  function expectFailure() {
    expect(process.exitCode).toBe(1);
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('instance is ready'));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('SECRET-MARKER');
  }

  function setupChild(event: 'close' | 'error', value: number | null | Error) {
    mocks.existsSync.mockImplementation((path: string) => path.endsWith('setup.js'));
    mocks.spawn.mockImplementation(() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit(event, value));
      return child;
    });
  }

  it('installs all scaffold dependencies and completes when no setup script exists', async () => {
    await createNew({ directory: 'my-prompts-chat' });
    expect(mocks.execSync).toHaveBeenCalledOnce();
    expect(mocks.execSync).toHaveBeenCalledWith(INSTALL_DEPENDENCIES_COMMAND, {
      cwd: expect.stringMatching(/my-prompts-chat$/), stdio: 'inherit',
    });
    expect(mocks.cleanup).toHaveBeenCalledOnce();
    expect(process.exitCode).toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('instance is ready'));
  });

  it('stops before setup when dependency installation fails', async () => {
    mocks.execSync.mockImplementation(() => { throw new Error('SECRET-MARKER'); });
    await createNew({ directory: 'demo' });
    expect(mocks.spawn).not.toHaveBeenCalled();
    expectFailure();
  });

  it('rejects a nonempty target without copying or installing', async () => {
    mocks.existsSync.mockReturnValue(true);
    mocks.readdirSync.mockReturnValue(['existing.txt']);
    await createNew({ directory: 'demo' });
    expect(mocks.copyScaffoldFiles).not.toHaveBeenCalled();
    expect(mocks.execSync).not.toHaveBeenCalled();
    expectFailure();
  });

  it('reports missing scaffold as failure', async () => {
    mocks.findScaffoldSource.mockImplementation(() => { throw new Error('SECRET-MARKER'); });
    await createNew({ directory: 'demo' });
    expect(mocks.execSync).not.toHaveBeenCalled();
    expectFailure();
  });

  it('cleans up after copy failure and suppresses raw exception details', async () => {
    mocks.copyScaffoldFiles.mockImplementation(() => { throw new Error('SECRET-MARKER'); });
    await createNew({ directory: 'demo' });
    expect(mocks.cleanup).toHaveBeenCalledOnce();
    expect(mocks.execSync).not.toHaveBeenCalled();
    expectFailure();
  });

  it('reports cleanup failure without installing', async () => {
    mocks.cleanup.mockImplementation(() => { throw new Error('SECRET-MARKER'); });
    await createNew({ directory: 'demo' });
    expect(mocks.execSync).not.toHaveBeenCalled();
    expectFailure();
  });

  it.each([1, null])('reports setup exit %s as failure', async (code) => {
    setupChild('close', code);
    await createNew({ directory: 'demo' });
    expectFailure();
  });

  it('reports setup spawn failure without raw exception details', async () => {
    setupChild('error', new Error('SECRET-MARKER'));
    await createNew({ directory: 'demo' });
    expectFailure();
  });

  it('reports success only after setup exits successfully', async () => {
    setupChild('close', 0);
    await createNew({ directory: 'demo' });
    expect(process.exitCode).toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('instance is ready'));
  });
});
