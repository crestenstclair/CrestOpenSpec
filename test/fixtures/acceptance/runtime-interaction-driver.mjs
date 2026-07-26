import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const payload = request.request ?? {};
const mode = payload.mode ?? 'pass';
if (mode === 'hang-child') {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  writeFileSync(payload.pidPath, String(child.pid));
  setInterval(() => {}, 1_000);
  await new Promise(() => {});
}
const deliveredAtMs =
  mode === 'before-window'
    ? 0
    : mode === 'after-window'
      ? Date.now() - request.sessionStartedAtEpochMs + 100_000
      : Date.now() - request.sessionStartedAtEpochMs;

if (mode !== 'miss-seam') {
  writeFileSync(payload.seamPath, JSON.stringify({ action: payload.action ?? 'mapped-input' }));
}

process.stdout.write(
  JSON.stringify({
    sessionId: mode === 'wrong-session' ? 'another-session' : request.sessionId,
    actionId: request.actionId,
    attempted: mode !== 'not-attempted',
    reachedSeam: mode !== 'miss-seam',
    deliveredAtMs,
    assertions: [
      {
        id: 'isolation-preserved',
        passed: mode !== 'assertion-failed',
        expected: 'autonomous-flow-continues',
        observed:
          mode === 'assertion-failed' ? 'state-overwritten' : 'autonomous-flow-continues',
      },
    ],
    details: { kind: 'fixture-production-seam', mode },
  })
);
