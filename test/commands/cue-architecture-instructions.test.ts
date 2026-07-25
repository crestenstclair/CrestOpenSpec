import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runCLI } from '../helpers/run-cli.js';

describe('CUE architecture in workflow instructions', () => {
  let projectRoot: string;
  let changeDir: string;
  let cueFiles: string[];

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-cue-instructions-'));
    changeDir = path.join(projectRoot, 'openspec', 'changes', 'add-checkout');
    const specDir = path.join(projectRoot, 'spec');

    await fs.mkdir(path.join(changeDir, 'specs', 'checkout'), { recursive: true });
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '## Why\nCheckout is needed.\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(
      path.join(changeDir, 'specs', 'checkout', 'spec.md'),
      '## ADDED Requirements\n'
    );
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Implement checkout\n');
    await fs.writeFile(
      path.join(specDir, 'project.cue'),
      'package architecture\nproject: {name: "shop", adapters: Stripe: implements: "port.Checkout.Payment"}\n'
    );
    await fs.writeFile(
      path.join(specDir, 'checkout.cue'),
      'package architecture\nproject: contexts: Checkout: {purpose: "Owns checkout", ports: Payment: direction: "outbound"}\n'
    );

    cueFiles = [
      await fs.realpath(path.join(specDir, 'checkout.cue')),
      await fs.realpath(path.join(specDir, 'project.cue')),
    ];
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  it('injects evaluated CUE semantics into artifact planning', async () => {
    const result = await runCLI(
      ['instructions', 'design', '--change', 'add-checkout', '--json'],
      { cwd: projectRoot }
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.context).toContain('CUE architecture (authoritative)');
    expect(payload.context).toContain('primary architecture input to planning');
    expect(payload.context).toContain('Owns checkout');
    expect(payload.context).toContain('adapter.Stripe` --implements--> `port.Checkout.Payment');
    for (const cueFile of cueFiles) {
      expect(payload.context).toContain(cueFile);
    }
  });

  it('gives apply agents both the semantic render and original CUE files', async () => {
    const result = await runCLI(
      ['instructions', 'apply', '--change', 'add-checkout', '--json'],
      { cwd: projectRoot }
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.context).toContain('Owns checkout');
    expect(payload.context).toContain('adapter.Stripe` --implements--> `port.Checkout.Payment');
    expect(payload.contextFiles.cue).toEqual(cueFiles);
  });

  it('exposes the same evaluated architecture to exploration through context', async () => {
    const result = await runCLI(['context', '--json'], { cwd: projectRoot });

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.architecture.kind).toBe('cue');
    expect(payload.architecture.files).toEqual(cueFiles);
    expect(payload.architecture.project.contexts.Checkout.purpose).toBe('Owns checkout');
    expect(payload.architecture.relationships).toContainEqual({
      from: 'adapter.Stripe',
      relation: 'implements',
      to: 'port.Checkout.Payment',
    });
    expect(payload.architecture.interpretation).toContain('primary architecture input to planning');
    expect(payload.architecture.context).toBeUndefined();
  });

  it('stops planning when the authoritative CUE package conflicts', async () => {
    await fs.writeFile(
      path.join(projectRoot, 'spec', 'conflict.cue'),
      'package architecture\nproject: name: "a-different-project"\n'
    );

    const result = await runCLI(
      ['instructions', 'design', '--change', 'add-checkout', '--json'],
      { cwd: projectRoot }
    );

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain('Could not evaluate CUE architecture');
    expect(`${result.stdout}\n${result.stderr}`).toContain('conflicting values');
  });

  it('leaves projects without CUE files unchanged', async () => {
    await fs.rm(path.join(projectRoot, 'spec'), { recursive: true, force: true });

    const artifactResult = await runCLI(
      ['instructions', 'design', '--change', 'add-checkout', '--json'],
      { cwd: projectRoot }
    );
    const applyResult = await runCLI(
      ['instructions', 'apply', '--change', 'add-checkout', '--json'],
      { cwd: projectRoot }
    );

    expect(JSON.parse(artifactResult.stdout).context).toBeUndefined();
    expect(JSON.parse(applyResult.stdout).contextFiles.cue).toBeUndefined();
  });
});
