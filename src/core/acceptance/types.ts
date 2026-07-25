import type { JsonObject, JsonValue } from '../cue-architecture.js';
import type { RootOutput } from '../root-selection.js';
import type { ValidationIssue } from '../validation/types.js';

export const ACCEPTANCE_REPORT_VERSION = '1.0' as const;

export type AcceptanceGateStatus = 'passed' | 'failed' | 'not_applicable';
export type AcceptanceScopeMode = 'change' | 'project';

export interface AcceptanceDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  fix?: string;
}

export interface AcceptanceGateResult {
  status: AcceptanceGateStatus;
  diagnostics: AcceptanceDiagnostic[];
}

export interface ArchitectureGateResult extends AcceptanceGateResult {
  root?: string;
  files: string[];
}

export type OpenSpecValidationItemType =
  | 'change'
  | 'proposal'
  | 'spec'
  | 'future_spec';

export interface OpenSpecValidationItem {
  id: string;
  type: OpenSpecValidationItemType;
  path: string;
  valid: boolean;
  issues: ValidationIssue[];
}

export interface OpenSpecValidationGateResult extends AcceptanceGateResult {
  items: OpenSpecValidationItem[];
}

export interface ProcessLimits {
  timeoutMs: number;
  stdoutBytes: number;
  stderrBytes: number;
}

export interface ProcessExecutionRequest {
  argv: string[];
  cwd: string;
  limits: ProcessLimits;
}

export type ProcessTermination =
  | 'exited'
  | 'signaled'
  | 'timed_out'
  | 'output_limit'
  | 'spawn_error';

export interface ProcessSpawnError {
  code?: string;
  message: string;
}

export interface ProcessResult {
  argv: string[];
  cwd: string;
  limits: ProcessLimits;
  durationMs: number;
  termination: ProcessTermination;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  outputLimitExceeded: Array<'stdout' | 'stderr'>;
  spawnError?: ProcessSpawnError;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface CommandRunner {
  run(request: ProcessExecutionRequest): Promise<ProcessResult>;
}

export interface AssertionDeclaration extends JsonObject {
  type: string;
}

export interface AssertionResult {
  index: number;
  type: string;
  passed: boolean;
  expected?: JsonValue;
  observed?: JsonValue;
  diagnostic?: AcceptanceDiagnostic;
}

export interface TestSuiteProof {
  type: 'test-suite';
  provider: string;
  minimumExecuted: number;
  selector: JsonValue;
  options: JsonObject;
}

export interface TestEvidence {
  provider: string;
  selector: JsonValue;
  discovered?: number;
  executed: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  source: JsonObject;
}

export interface TestEvidenceResult {
  provider: string;
  minimumExecuted: number;
  selector: JsonValue;
  status: 'passed' | 'failed';
  evidence?: TestEvidence;
  diagnostics: AcceptanceDiagnostic[];
}

export interface ResolvedValidation {
  id: string;
  declaration: ValidationDeclarationProvenance;
  argv: string[];
  cwd: string;
  limits: ProcessLimits;
  assertions: AssertionDeclaration[];
  proof?: TestSuiteProof;
}

export interface AcceptanceCheckResult {
  id: string;
  declaration: ValidationDeclarationProvenance;
  process: ProcessResult;
  processPassed: boolean;
  assertions: AssertionResult[];
  assertionsPassed: boolean;
  testEvidence?: TestEvidenceResult;
  passed: boolean;
  diagnostics: AcceptanceDiagnostic[];
}

export type ValidationDeclarationKind = 'project_check' | 'attached_test';

export interface ValidationDeclarationProvenance {
  kind: ValidationDeclarationKind;
  location: string;
  owner: string;
}

export interface ValidationExecutionGateResult extends AcceptanceGateResult {
  declaredProjectChecks: number;
  applicableAttachedTests: number;
  resolved: number;
  executed: number;
}

export interface AcceptanceScope {
  mode: AcceptanceScopeMode;
  change?: string;
}

export interface SemanticReviewBoundary {
  status: 'not_evaluated';
  message: string;
}

export interface AcceptanceReport {
  version: typeof ACCEPTANCE_REPORT_VERSION;
  scope: AcceptanceScope;
  root: RootOutput | null;
  applicable: boolean;
  passed: boolean;
  gates: {
    architecture: ArchitectureGateResult;
    openspec: OpenSpecValidationGateResult;
    validations: ValidationExecutionGateResult;
  };
  checks: AcceptanceCheckResult[];
  diagnostics: AcceptanceDiagnostic[];
  semanticReview: SemanticReviewBoundary;
}

export interface AcceptanceRunOptions {
  scope: AcceptanceScope;
}

export interface ValidationInventory {
  declared: boolean;
  projectCheckReferenceCount: number;
  applicableAttachedTestCount: number;
  checks: ResolvedValidation[];
  diagnostics: AcceptanceDiagnostic[];
}

export interface TestEvidenceProviderRequest {
  proof: TestSuiteProof;
  process: ProcessResult;
}

export interface TestEvidenceProvider {
  readonly id: string;
  extract(request: TestEvidenceProviderRequest): Promise<TestEvidence> | TestEvidence;
}

export interface AssertionEvaluator {
  readonly type: string;
  evaluate(
    declaration: AssertionDeclaration,
    process: ProcessResult,
    index: number
  ): Promise<AssertionResult> | AssertionResult;
}

export const SEMANTIC_REVIEW_BOUNDARY: SemanticReviewBoundary = {
  status: 'not_evaluated',
  message:
    'Deterministic acceptance does not establish semantic implementation conformance; use the adversarial agent review for that separate evidence layer.',
};
