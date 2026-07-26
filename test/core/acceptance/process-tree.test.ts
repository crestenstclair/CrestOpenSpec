import { describe, expect, it, vi } from 'vitest';

import {
  OwnedProcessTree,
  processTreeInternals,
  type ProcessTreeOperations,
} from '../../../src/core/acceptance/process-tree.js';

describe('owned process-tree platform adapters', () => {
  it('parses POSIX and Windows process inventories without executable-name matching', () => {
    expect(processTreeInternals.parsePosixProcesses(' 10 1 10\n11 10 10\n')).toEqual([
      { pid: 10, ppid: 1, pgid: 10 },
      { pid: 11, ppid: 10, pgid: 10 },
    ]);
    expect(
      processTreeInternals.parseWindowsProcesses(
        JSON.stringify([
          { ProcessId: 20, ParentProcessId: 1 },
          { ProcessId: 21, ParentProcessId: 20 },
        ])
      )
    ).toEqual([
      { pid: 20, ppid: 1 },
      { pid: 21, ppid: 20 },
    ]);
  });

  it('cleans a POSIX process group plus an escaped tracked descendant and leaves unrelated PIDs', async () => {
    const alive = new Set([300, 301, 302, 400]);
    const rows = [
      { pid: 300, ppid: 1, pgid: 300 },
      { pid: 301, ppid: 300, pgid: 300 },
      { pid: 302, ppid: 301, pgid: 302 },
      { pid: 400, ppid: 1, pgid: 400 },
    ];
    const signalPid = vi.fn((pid: number) => alive.delete(pid));
    const signalGroup = vi.fn((pgid: number) => {
      for (const row of rows) if (row.pgid === pgid) alive.delete(row.pid);
    });
    const operations: ProcessTreeOperations = {
      enumerate: async () => rows.filter((row) => alive.has(row.pid)),
      isAlive: (pid) => alive.has(pid),
      signalPid,
      signalGroup,
      terminateWindowsTree: vi.fn(),
    };
    const tree = new OwnedProcessTree(300, Date.now(), 'linux', operations);
    expect(await tree.snapshot()).toEqual([300, 301, 302]);

    const actions = [];
    expect(await tree.terminate(100, actions)).toEqual([]);
    expect(signalGroup).toHaveBeenCalledWith(300, 'SIGTERM');
    expect(signalPid).toHaveBeenCalledWith(302, 'SIGTERM');
    expect(alive.has(400)).toBe(true);
    expect((await tree.evidence()).observedDescendantPids).toEqual([301, 302]);
  });

  it('uses the exact root PID for Windows tree termination and retains unrelated PIDs', async () => {
    const alive = new Set([500, 501, 600]);
    const rows = [
      { pid: 500, ppid: 1 },
      { pid: 501, ppid: 500 },
      { pid: 600, ppid: 1 },
    ];
    const terminateWindowsTree = vi.fn(async (pid: number) => {
      if (pid === 500) {
        alive.delete(500);
        alive.delete(501);
      }
    });
    const operations: ProcessTreeOperations = {
      enumerate: async () => rows.filter((row) => alive.has(row.pid)),
      isAlive: (pid) => alive.has(pid),
      signalPid: (pid) => {
        alive.delete(pid);
      },
      signalGroup: vi.fn(),
      terminateWindowsTree,
    };
    const tree = new OwnedProcessTree(500, Date.now(), 'win32', operations);
    expect(await tree.snapshot()).toEqual([500, 501]);

    expect(await tree.terminate(100, [])).toEqual([]);
    expect(terminateWindowsTree).toHaveBeenCalledWith(500, false);
    expect(terminateWindowsTree).not.toHaveBeenCalledWith(600, expect.any(Boolean));
    expect(alive.has(600)).toBe(true);
  });
});
