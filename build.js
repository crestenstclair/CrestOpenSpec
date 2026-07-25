#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

const runTsc = (args = []) => {
  const tscPath = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tscPath, ...args], { stdio: 'inherit' });
};

const buildCueBridge = () => {
  const outputName = process.platform === 'win32' ? 'crest-cue-bridge.exe' : 'crest-cue-bridge';
  const outputPath = path.resolve('bin', outputName);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  execFileSync(
    'go',
    ['build', '-trimpath', '-o', outputPath, './cmd/crest-cue-bridge'],
    { cwd: path.resolve('cuebridge'), stdio: 'inherit' }
  );
};

console.log('🔨 Building OpenSpec...\n');

// Clean dist directory
if (existsSync('dist')) {
  console.log('Cleaning dist directory...');
  rmSync('dist', { recursive: true, force: true });
}

// Run TypeScript compiler (use local version explicitly)
console.log('Compiling TypeScript...');
try {
  console.log('Compiling CUE bridge...');
  buildCueBridge();
  runTsc(['--version']);
  runTsc();
  console.log('\n✅ Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed!');
  process.exit(1);
}
