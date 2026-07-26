import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [mode = 'clean', ...arguments_] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = arguments_.indexOf(name);
  return index >= 0 ? arguments_[index + 1] : fallback;
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const line = (value) => process.stdout.write(`${value}\n`);
const startedPath = option('--started', '');
if (startedPath) writeFileSync(startedPath, String(process.pid));
const complete = () => {
  line('FINAL_STATE');
  line('FINAL_SUMMARY');
};

switch (mode) {
  case 'clean':
    line('CHECKPOINT');
    await wait(Number(option('--delay', '20')));
    complete();
    break;
  case 'success-hang':
    line('CHECKPOINT');
    complete();
    setInterval(() => {}, 1_000);
    break;
  case 'slow-progress': {
    const delay = Number(option('--delay', '60'));
    line('CHECKPOINT');
    await wait(delay);
    line('CHECKPOINT');
    await wait(delay);
    complete();
    break;
  }
  case 'silent':
    line('CHECKPOINT');
    setInterval(() => {}, 1_000);
    break;
  case 'early-exit':
    line('CHECKPOINT');
    break;
  case 'missing':
    line('CHECKPOINT');
    line('FINAL_STATE');
    break;
  case 'duplicate':
    line('CHECKPOINT');
    line('FINAL_STATE');
    line('FINAL_STATE');
    line('FINAL_SUMMARY');
    break;
  case 'out-of-order':
    line('CHECKPOINT');
    line('FINAL_SUMMARY');
    line('FINAL_STATE');
    break;
  case 'child-resident': {
    line('CHECKPOINT');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    line(`CHILD_PID:${child.pid}`);
    await wait(Number(option('--parent-delay', '140')));
    complete();
    break;
  }
  case 'persistent':
    line('CHECKPOINT');
    line('READY');
    process.on('SIGTERM', () => {
      line('STOPPED');
      process.exit(0);
    });
    setInterval(() => {}, 1_000);
    break;
  case 'buffered':
    if (process.stdout.isTTY) {
      line('CHECKPOINT');
      await wait(20);
      complete();
    } else {
      await wait(Number(option('--pipe-delay', '240')));
      line('CHECKPOINT');
      complete();
    }
    break;
  case 'interaction': {
    const seamPath = option('--seam', '');
    line('WINDOW_OPEN');
    const deadline = Date.now() + Number(option('--seam-timeout', '2000'));
    while (!existsSync(seamPath) && Date.now() < deadline) await wait(10);
    if (!existsSync(seamPath)) {
      process.stderr.write('interaction seam was not reached\n');
      process.exit(9);
    }
    const payload = JSON.parse(readFileSync(seamPath, 'utf8'));
    line(`ACTION:${payload.action}`);
    line('WINDOW_CLOSE');
    line('FINAL_SUMMARY');
    break;
  }
  case 'closed-interaction-window':
    process.stdout.write('WINDOW_OPEN\nWINDOW_CLOSE\nFINAL_SUMMARY\n');
    break;
  default:
    process.stderr.write(`unknown runtime fixture mode: ${mode}\n`);
    process.exit(64);
}
