import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  loadCueArchitecture,
  renderCueArchitectureContext,
  type JsonObject,
} from '../../src/core/cue-architecture.js';

const resolvedProject: JsonObject = {
  name: 'shop',
  mission: 'Let buyers complete purchases safely.',
  actors: { Buyer: { description: 'A customer' } },
  goals: {
    Checkout: {
      actors: ['actor.Buyer'],
      capabilities: ['capability.PlaceOrder'],
      requirements: ['requirement.AuditOrders'],
    },
  },
  capabilities: {
    PlaceOrder: {
      goals: ['goal.Checkout'],
      acceptance: {
        Success: { actor: 'actor.Buyer', evidence: ['evidence.OrderRecorded'] },
      },
    },
  },
  requirements: {
    AuditOrders: { goals: ['goal.Checkout'], capabilities: ['capability.PlaceOrder'] },
  },
  evidence: { OrderRecorded: { validations: ['validation.checkout'] } },
  contexts: {
    Checkout: {
      purpose: 'Owns checkout',
      ports: { Payment: { direction: 'outbound' } },
      aggregates: {
        Order: {
          publishes: ['event.Checkout.OrderPlaced'],
          contributesTo: [
            { capability: 'capability.PlaceOrder', contribution: 'Creates the order' },
          ],
        },
      },
    },
  },
  adapters: { Stripe: { implements: 'port.Checkout.Payment' } },
  validations: {
    checkout: { id: 'validation.checkout', resources: ['aggregate.Checkout.Order'] },
  },
};

describe('CUE architecture loading', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-cue-architecture-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads the top-level CUE package only and derives deterministic relationships', () => {
    const specDir = path.join(tempDir, 'spec');
    const ignoredPhaseDir = path.join(specDir, 'phases');
    fs.mkdirSync(ignoredPhaseDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'project.cue'), 'project: name: "shop"\n');
    fs.writeFileSync(path.join(specDir, 'checkout.cue'), 'project: contexts: Checkout: {}\n');
    fs.writeFileSync(path.join(ignoredPhaseDir, 'phase.cue'), 'phase: 1\n');
    fs.writeFileSync(path.join(specDir, 'notes.md'), 'not architecture\n');
    const evaluate = vi.fn(() => resolvedProject);

    const architecture = loadCueArchitecture(tempDir, { evaluate });

    expect(evaluate).toHaveBeenCalledWith(fs.realpathSync.native(specDir));
    expect(architecture?.files).toEqual([
      fs.realpathSync.native(path.join(specDir, 'checkout.cue')),
      fs.realpathSync.native(path.join(specDir, 'project.cue')),
    ]);
    expect(architecture?.project).toEqual(resolvedProject);
    expect(architecture?.relationships).toContainEqual({
      from: 'adapter.Stripe',
      relation: 'implements',
      to: 'port.Checkout.Payment',
    });
    expect(architecture?.relationships).toContainEqual({
      from: 'aggregate.Checkout.Order',
      relation: 'contributes_to',
      to: 'capability.PlaceOrder',
      detail: 'Creates the order',
    });
    expect(architecture?.relationships).toContainEqual({
      from: 'goal.Checkout',
      relation: 'requires_capability',
      to: 'capability.PlaceOrder',
    });
  });

  it('returns no architecture when spec contains no top-level CUE files', () => {
    fs.mkdirSync(path.join(tempDir, 'spec', 'phases'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'spec', 'phases', 'phase.cue'), 'phase: 1\n');

    expect(loadCueArchitecture(tempDir, { evaluate: () => resolvedProject })).toBeUndefined();
  });

  it('canonicalizes an aliased project path to the same architecture identity', () => {
    const realProject = path.join(tempDir, 'real-project');
    const aliasProject = path.join(tempDir, 'project-alias');
    const cueFile = path.join(realProject, 'spec', 'project.cue');
    fs.mkdirSync(path.dirname(cueFile), { recursive: true });
    fs.writeFileSync(cueFile, 'project: name: "aliased"\n');
    fs.symlinkSync(realProject, aliasProject, process.platform === 'win32' ? 'junction' : 'dir');

    const options = { evaluate: () => resolvedProject };
    expect(loadCueArchitecture(aliasProject, options)).toEqual(loadCueArchitecture(realProject, options));
    expect(loadCueArchitecture(aliasProject, options)?.files).toEqual([
      fs.realpathSync.native(cueFile),
    ]);
  });

  it('renders the semantic contract, relationship index, and resolved model', () => {
    const specDir = path.join(tempDir, 'spec');
    fs.mkdirSync(specDir);
    fs.writeFileSync(path.join(specDir, 'project.cue'), 'project: name: "shop"\n');
    const architecture = loadCueArchitecture(tempDir, { evaluate: () => resolvedProject });

    const context = renderCueArchitectureContext(architecture!);

    expect(context).toContain('CUE architecture (authoritative)');
    expect(context).toContain('primary architecture input to planning');
    expect(context).toContain('adapter.Stripe` --implements--> `port.Checkout.Payment');
    expect(context).toContain('Owns checkout');
    expect(context).toContain('Do not create bookkeeping tasks for mirroring CUE elsewhere');
  });
});
