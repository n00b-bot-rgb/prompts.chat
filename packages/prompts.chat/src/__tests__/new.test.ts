import { beforeEach, describe, expect, it, vi } from 'vitest';

const execSyncMock = vi.fn();
const existsSyncMock = vi.fn();
const readdirSyncMock = vi.fn();
const copyScaffoldFilesMock = vi.fn();
const findScaffoldSourceMock = vi.fn();

vi.mock('child_process', () => ({
  execSync: execSyncMock,
  spawn: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readdirSync: readdirSyncMock,
}));

vi.mock('../cli/scaffold.js', () => ({
  copyScaffoldFiles: copyScaffoldFilesMock,
  findScaffoldSource: findScaffoldSourceMock,
}));

describe('createNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSyncMock.mockReturnValue(false);
    findScaffoldSourceMock.mockReturnValue({
      bundled: true,
      sourceDir: '/tmp/prompts-chat-template',
    });
  });

  it('installs dev dependencies when creating a scaffold', async () => {
    const { createNew, INSTALL_DEPENDENCIES_COMMAND } = await import('../cli/new');

    await createNew({ directory: 'my-prompts-chat' });

    expect(execSyncMock).toHaveBeenCalledWith(INSTALL_DEPENDENCIES_COMMAND, {
      cwd: expect.stringMatching(/my-prompts-chat$/),
      stdio: 'inherit',
    });
  });
});
