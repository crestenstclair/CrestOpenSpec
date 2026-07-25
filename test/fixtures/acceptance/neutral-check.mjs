#!/usr/bin/env node

const [mode = 'evidence', selector = 'default', countText = '1'] = process.argv.slice(2);

if (mode === 'nonzero') {
  process.stderr.write('controlled fixture failure');
  process.exit(7);
}

if (mode === 'signal') {
  process.kill(process.pid, 'SIGTERM');
} else if (mode === 'timeout') {
  setInterval(() => {}, 1000);
} else if (mode === 'output') {
  process.stdout.write('x'.repeat(1024 * 1024));
} else {
  const executed = Number.parseInt(countText, 10);
  const selected = mode === 'mismatch' ? 'suite:all' : selector;
  process.stdout.write(
    JSON.stringify({
      selector: { kind: 'fixture', value: selected },
      discovered: executed,
      executed,
      passed: executed,
      failed: 0,
      skipped: 0,
      source: { kind: 'neutral-acceptance-fixture', mode },
    })
  );
}
