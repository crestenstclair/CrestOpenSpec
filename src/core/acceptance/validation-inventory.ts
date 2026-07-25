import * as fs from 'node:fs';
import * as path from 'node:path';
import type { JsonObject, JsonValue } from '../cue-architecture.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import type {
  AcceptanceDiagnostic,
  AcceptanceScope,
  AssertionDeclaration,
  ProcessLimits,
  ResolvedValidation,
  TestSuiteProof,
  ValidationDeclarationKind,
  ValidationInventory,
} from './types.js';

export const MAX_ACCEPTANCE_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_ACCEPTANCE_STREAM_BYTES = 16 * 1024 * 1024;

interface ValidationCandidate {
  id?: string;
  value: JsonValue;
  location: string;
  owner: string;
  source: 'project' | 'attached';
}

interface ValidationReference {
  id: string;
  location: string;
}

interface CollectedArchitectureValidations {
  project: ValidationCandidate[];
  attached: ValidationCandidate[];
  references: ValidationReference[];
  malformedAttachments: AcceptanceDiagnostic[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function error(code: string, message: string, location: string): AcceptanceDiagnostic {
  return { severity: 'error', code, message, path: location };
}

function candidate(
  value: JsonValue,
  location: string,
  owner: string,
  source: ValidationCandidate['source']
): ValidationCandidate {
  return {
    id:
      isObject(value) && typeof value.id === 'string' && value.id.trim()
        ? value.id
        : undefined,
    value,
    location,
    owner,
    source,
  };
}

function collectContainer(
  value: JsonValue,
  location: string,
  owner: string,
  source: ValidationCandidate['source'],
  output: CollectedArchitectureValidations
): void {
  const target = source === 'project' ? output.project : output.attached;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const entryLocation = `${location}[${index}]`;
      if (typeof entry === 'string') {
        output.references.push({ id: entry, location: entryLocation });
      } else if (isObject(entry)) {
        target.push(candidate(entry, entryLocation, owner, source));
      } else {
        output.malformedAttachments.push(
          error(
            'validation_attachment_malformed',
            'Validation attachments must contain declaration objects or string identity references.',
            entryLocation
          )
        );
      }
    });
    return;
  }
  if (isObject(value)) {
    for (const [name, entry] of Object.entries(value).sort(([left], [right]) =>
      compareStrings(left, right)
    )) {
      const entryLocation = `${location}.${name}`;
      if (typeof entry === 'string') {
        output.references.push({ id: entry, location: entryLocation });
      } else if (isObject(entry)) {
        target.push(candidate(entry, entryLocation, owner, source));
      } else {
        output.malformedAttachments.push(
          error(
            'validation_attachment_malformed',
            'Validation attachments must contain declaration objects or string identity references.',
            entryLocation
          )
        );
      }
    }
    return;
  }
  output.malformedAttachments.push(
    error(
      'validation_attachment_malformed',
      "A 'validations' field must be an array or object.",
      location
    )
  );
}

function collectArchitectureValidations(project: JsonObject): CollectedArchitectureValidations {
  const output: CollectedArchitectureValidations = {
    project: [],
    attached: [],
    references: [],
    malformedAttachments: [],
  };
  const projectOwner =
    typeof project.name === 'string' && project.name.trim()
      ? `project.${project.name}`
      : 'project';

  if (project.validations !== undefined) {
    collectContainer(
      project.validations,
      'project.validations',
      projectOwner,
      'project',
      output
    );
  }

  const walk = (value: JsonValue, location: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${location}[${index}]`));
      return;
    }
    if (!isObject(value)) return;
    for (const [key, entry] of Object.entries(value).sort(([left], [right]) =>
      compareStrings(left, right)
    )) {
      if (location === 'project' && key === 'validations') continue;
      const childLocation = `${location}.${key}`;
      if (key === 'validations') {
        collectContainer(entry, childLocation, location, 'attached', output);
      } else {
        walk(entry, childLocation);
      }
    }
  };
  walk(project, 'project');
  return output;
}

function parseProjectCheckReferences(
  project: JsonObject,
  diagnostics: AcceptanceDiagnostic[]
): { fieldPresent: boolean; references: ValidationReference[] } {
  const completion = project.completion;
  if (completion === undefined) return { fieldPresent: false, references: [] };
  if (!isObject(completion)) {
    diagnostics.push(
      error(
        'project_completion_malformed',
        "Evaluated project 'completion' must be an object.",
        'project.completion'
      )
    );
    return { fieldPresent: true, references: [] };
  }
  if (!hasOwn(completion, 'projectChecks')) {
    return { fieldPresent: false, references: [] };
  }
  const raw = completion.projectChecks;
  if (!Array.isArray(raw)) {
    diagnostics.push(
      error(
        'project_checks_malformed',
        "Evaluated 'completion.projectChecks' must be an array of non-empty validation IDs.",
        'project.completion.projectChecks'
      )
    );
    return { fieldPresent: true, references: [] };
  }

  const references: ValidationReference[] = [];
  const seen = new Set<string>();
  raw.forEach((value, index) => {
    const location = `project.completion.projectChecks[${index}]`;
    if (typeof value !== 'string' || !value.trim()) {
      diagnostics.push(
        error(
          'project_check_reference_malformed',
          'Every project-check reference must be a non-empty string.',
          location
        )
      );
      return;
    }
    if (seen.has(value)) {
      diagnostics.push(
        error(
          'project_check_reference_duplicate',
          `Project-check reference '${value}' is declared more than once.`,
          location
        )
      );
      return;
    }
    seen.add(value);
    references.push({ id: value, location });
  });
  return { fieldPresent: true, references };
}

function hasTestProof(candidate: ValidationCandidate): boolean {
  return isObject(candidate.value) && hasOwn(candidate.value, 'proof');
}

function validateGlobalIdentity(
  candidates: ValidationCandidate[],
  references: ValidationReference[],
  diagnostics: AcceptanceDiagnostic[]
): void {
  const byId = new Map<string, ValidationCandidate[]>();
  for (const entry of candidates) {
    if (!entry.id) {
      diagnostics.push(
        error(
          'validation_identity_missing',
          'Every validation declaration in an acceptance-governed project must have a non-empty string id.',
          `${entry.location}.id`
        )
      );
      continue;
    }
    const matches = byId.get(entry.id) ?? [];
    matches.push(entry);
    byId.set(entry.id, matches);
  }

  for (const [id, matches] of [...byId.entries()].sort(([left], [right]) =>
    compareStrings(left, right)
  )) {
    if (matches.length > 1) {
      diagnostics.push(
        error(
          'validation_identity_ambiguous_owner',
          `Validation identity '${id}' is declared by multiple owners: ${matches.map((match) => `${match.owner} at ${match.location}`).join('; ')}.`,
          matches[0].location
        )
      );
    }
  }

  for (const reference of references) {
    const matches = byId.get(reference.id) ?? [];
    if (matches.length === 0) {
      diagnostics.push(
        error(
          'validation_evidence_reference_orphaned',
          `Validation reference '${reference.id}' does not resolve to a declaration.`,
          reference.location
        )
      );
    } else if (matches.length > 1) {
      diagnostics.push(
        error(
          'validation_evidence_reference_ambiguous',
          `Validation reference '${reference.id}' resolves to multiple declaration owners.`,
          reference.location
        )
      );
    }
  }
}

function parseAttachedApplicability(
  candidate: ValidationCandidate,
  scope: AcceptanceScope,
  diagnostics: AcceptanceDiagnostic[]
): boolean | undefined {
  if (!isObject(candidate.value)) return undefined;
  const value = candidate.value.applicability;
  const location = `${candidate.location}.applicability`;
  if (!isObject(value)) {
    diagnostics.push(
      error(
        'validation_applicability_missing',
        'Attached test validation requires explicit applicability metadata.',
        location
      )
    );
    return undefined;
  }
  if (value.mode === 'always') return true;
  if (value.mode !== 'changes') {
    diagnostics.push(
      error(
        'validation_applicability_malformed',
        "Attached test applicability mode must be 'always' or 'changes'.",
        `${location}.mode`
      )
    );
    return undefined;
  }
  if (
    !Array.isArray(value.changes) ||
    value.changes.length === 0 ||
    !value.changes.every((change) => typeof change === 'string' && change.trim()) ||
    new Set(value.changes).size !== value.changes.length
  ) {
    diagnostics.push(
      error(
        'validation_applicability_malformed',
        "Change applicability requires a non-empty, unique array of change IDs.",
        `${location}.changes`
      )
    );
    return undefined;
  }
  return scope.mode === 'project' || Boolean(scope.change && value.changes.includes(scope.change));
}

function parseLimits(
  value: JsonValue | undefined,
  location: string,
  diagnostics: AcceptanceDiagnostic[]
): ProcessLimits | undefined {
  if (!isObject(value)) {
    diagnostics.push(
      error(
        'validation_limits_malformed',
        'Validation limits must be an object with timeoutMs, stdoutBytes, and stderrBytes.',
        location
      )
    );
    return undefined;
  }
  const fields = [
    ['timeoutMs', MAX_ACCEPTANCE_TIMEOUT_MS],
    ['stdoutBytes', MAX_ACCEPTANCE_STREAM_BYTES],
    ['stderrBytes', MAX_ACCEPTANCE_STREAM_BYTES],
  ] as const;
  let valid = true;
  for (const [field, maximum] of fields) {
    const fieldValue = value[field];
    if (
      typeof fieldValue !== 'number' ||
      !Number.isSafeInteger(fieldValue) ||
      fieldValue < 1 ||
      fieldValue > maximum
    ) {
      valid = false;
      diagnostics.push(
        error(
          'validation_limits_malformed',
          `'${field}' must be an integer from 1 through ${maximum}.`,
          `${location}.${field}`
        )
      );
    }
  }
  return valid
    ? {
        timeoutMs: value.timeoutMs as number,
        stdoutBytes: value.stdoutBytes as number,
        stderrBytes: value.stderrBytes as number,
      }
    : undefined;
}

function canonicalWorkingDirectory(
  projectRoot: string,
  value: JsonValue | undefined,
  location: string,
  diagnostics: AcceptanceDiagnostic[]
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    diagnostics.push(
      error(
        'validation_working_directory_malformed',
        "Validation 'workingDirectory' must be a non-empty path string.",
        location
      )
    );
    return undefined;
  }
  const canonicalRoot = FileSystemUtils.canonicalizeExistingPath(projectRoot);
  const candidatePath = path.resolve(canonicalRoot, value);
  try {
    if (!fs.statSync(candidatePath).isDirectory()) throw new Error('not a directory');
  } catch {
    diagnostics.push(
      error(
        'validation_working_directory_unavailable',
        `Validation working directory is unavailable: ${candidatePath}`,
        location
      )
    );
    return undefined;
  }
  const canonical = FileSystemUtils.canonicalizeExistingPath(candidatePath);
  const relative = path.relative(canonicalRoot, canonical);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    diagnostics.push(
      error(
        'validation_working_directory_outside_root',
        `Validation working directory resolves outside the canonical project root: ${canonical}`,
        location
      )
    );
    return undefined;
  }
  return canonical;
}

function parseAssertions(
  value: JsonValue | undefined,
  location: string,
  diagnostics: AcceptanceDiagnostic[]
): AssertionDeclaration[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    diagnostics.push(
      error(
        'validation_assertions_malformed',
        "Validation 'assertions' must be an array when present.",
        location
      )
    );
    return undefined;
  }
  const assertions: AssertionDeclaration[] = [];
  value.forEach((entry, index) => {
    if (!isObject(entry) || typeof entry.type !== 'string' || !entry.type.trim()) {
      diagnostics.push(
        error(
          'validation_assertions_malformed',
          'Every assertion must be an object with a non-empty string type.',
          `${location}[${index}]`
        )
      );
    } else {
      assertions.push(entry as AssertionDeclaration);
    }
  });
  return assertions;
}

function parseProof(
  value: JsonValue | undefined,
  location: string,
  diagnostics: AcceptanceDiagnostic[]
): TestSuiteProof | undefined | null {
  if (value === undefined) return undefined;
  if (!isObject(value) || value.type !== 'test-suite') {
    diagnostics.push(
      error(
        'validation_proof_malformed',
        "Validation proof must be an object with type 'test-suite'.",
        location
      )
    );
    return null;
  }
  if (typeof value.provider !== 'string' || !value.provider.trim()) {
    diagnostics.push(
      error(
        'validation_proof_malformed',
        "Test-suite proof requires a non-empty 'provider'.",
        `${location}.provider`
      )
    );
    return null;
  }
  if (!hasOwn(value, 'selector') || value.selector === undefined) {
    diagnostics.push(
      error(
        'validation_selector_missing',
        'Test-suite proof requires an explicit opaque selector.',
        `${location}.selector`
      )
    );
    return null;
  }
  const minimumExecuted = value.minimumExecuted === undefined ? 1 : value.minimumExecuted;
  if (
    typeof minimumExecuted !== 'number' ||
    !Number.isSafeInteger(minimumExecuted) ||
    minimumExecuted < 1
  ) {
    diagnostics.push(
      error(
        'validation_proof_malformed',
        "Test-suite 'minimumExecuted' must be an integer of at least one.",
        `${location}.minimumExecuted`
      )
    );
    return null;
  }
  const options = value.options === undefined ? {} : value.options;
  if (!isObject(options)) {
    diagnostics.push(
      error(
        'validation_proof_malformed',
        "Test-suite proof 'options' must be an object when present.",
        `${location}.options`
      )
    );
    return null;
  }
  return {
    type: 'test-suite',
    provider: value.provider,
    minimumExecuted,
    selector: value.selector,
    options,
  };
}

function parseExecutableValidation(
  entry: ValidationCandidate,
  expectedScope: 'project' | 'attached',
  kind: ValidationDeclarationKind,
  projectRoot: string,
  diagnostics: AcceptanceDiagnostic[]
): ResolvedValidation | undefined {
  if (!isObject(entry.value) || !entry.id) {
    diagnostics.push(
      error(
        'validation_declaration_malformed',
        'Executable validation must be an object with a unique non-empty id.',
        entry.location
      )
    );
    return undefined;
  }
  const value = entry.value;
  const before = diagnostics.length;
  if (value.scope !== expectedScope) {
    diagnostics.push(
      error(
        'validation_scope_invalid',
        `Validation '${entry.id}' must declare scope '${expectedScope}'.`,
        `${entry.location}.scope`
      )
    );
  }

  let argv: string[] | undefined;
  if (
    Array.isArray(value.command) &&
    value.command.length > 0 &&
    value.command.every((argument) => typeof argument === 'string') &&
    typeof value.command[0] === 'string' &&
    value.command[0].trim()
  ) {
    argv = [...value.command] as string[];
  } else {
    diagnostics.push(
      error(
        'validation_command_malformed',
        "Validation 'command' must be a non-empty string argument vector with a non-empty executable.",
        `${entry.location}.command`
      )
    );
  }
  const cwd = canonicalWorkingDirectory(
    projectRoot,
    value.workingDirectory,
    `${entry.location}.workingDirectory`,
    diagnostics
  );
  const limits = parseLimits(value.limits, `${entry.location}.limits`, diagnostics);
  const assertions = parseAssertions(
    value.assertions,
    `${entry.location}.assertions`,
    diagnostics
  );
  const proof = parseProof(value.proof, `${entry.location}.proof`, diagnostics);

  if (
    diagnostics.length !== before ||
    !argv ||
    !cwd ||
    !limits ||
    !assertions ||
    proof === null
  ) {
    return undefined;
  }
  return {
    id: entry.id,
    declaration: { kind, location: entry.location, owner: entry.owner },
    argv,
    cwd,
    limits,
    assertions,
    ...(proof ? { proof } : {}),
  };
}

export function resolveValidationInventory(
  project: JsonObject,
  projectRoot: string,
  scope: AcceptanceScope
): ValidationInventory {
  const diagnostics: AcceptanceDiagnostic[] = [];
  const collected = collectArchitectureValidations(project);
  const projectChecks = parseProjectCheckReferences(project, diagnostics);
  const attachedWithProof = collected.attached.filter(hasTestProof);
  const declared = projectChecks.fieldPresent || attachedWithProof.length > 0;
  if (!declared) {
    return {
      declared: false,
      projectCheckReferenceCount: 0,
      applicableAttachedTestCount: 0,
      checks: [],
      diagnostics: [],
    };
  }

  diagnostics.push(...collected.malformedAttachments);
  const allCandidates = [...collected.project, ...collected.attached];
  validateGlobalIdentity(allCandidates, collected.references, diagnostics);

  const checks: ResolvedValidation[] = [];
  for (const reference of projectChecks.references) {
    const matches = collected.project.filter((entry) => entry.id === reference.id);
    if (matches.length === 0) {
      diagnostics.push(
        error(
          'project_check_reference_missing',
          `Project-check reference '${reference.id}' does not resolve to a top-level project validation.`,
          reference.location
        )
      );
    } else if (matches.length > 1) {
      diagnostics.push(
        error(
          'project_check_reference_ambiguous',
          `Project-check reference '${reference.id}' resolves to multiple top-level validations.`,
          reference.location
        )
      );
    } else {
      const check = parseExecutableValidation(
        matches[0],
        'project',
        'project_check',
        projectRoot,
        diagnostics
      );
      if (check) checks.push(check);
    }
  }

  let applicableAttachedTestCount = 0;
  for (const entry of attachedWithProof) {
    const applicable = parseAttachedApplicability(entry, scope, diagnostics);
    if (applicable !== true) continue;
    applicableAttachedTestCount++;
    const check = parseExecutableValidation(
      entry,
      'attached',
      'attached_test',
      projectRoot,
      diagnostics
    );
    if (check) checks.push(check);
  }

  return {
    declared: true,
    projectCheckReferenceCount: projectChecks.references.length,
    applicableAttachedTestCount,
    checks,
    diagnostics,
  };
}
