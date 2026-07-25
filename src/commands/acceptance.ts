import {
  isRootSelectionError,
  resolveOpenSpecRoot,
  toRootOutput,
  type ResolvedOpenSpecRoot,
} from '../core/root-selection.js';
import {
  AcceptanceService,
  createAcceptanceFailureReport,
  renderAcceptanceHuman,
  type AcceptanceDiagnostic,
  type AcceptanceReport,
  type AcceptanceScope,
} from '../core/acceptance/index.js';

export interface AcceptanceOptions {
  project?: boolean;
  release?: boolean;
  json?: boolean;
  store?: string;
  storePath?: string;
}

function scopeFor(changeName: string | undefined, options: AcceptanceOptions): AcceptanceScope {
  return options.project || options.release
    ? { mode: 'project' }
    : { mode: 'change', ...(changeName ? { change: changeName } : {}) };
}

function rootDiagnostic(error: unknown): AcceptanceDiagnostic {
  if (isRootSelectionError(error)) {
    return {
      severity: 'error',
      code: error.diagnostic.code,
      message: error.diagnostic.message,
      ...(error.diagnostic.target ? { path: error.diagnostic.target } : {}),
      ...(error.diagnostic.fix ? { fix: error.diagnostic.fix } : {}),
    };
  }
  return {
    severity: 'error',
    code: 'acceptance_root_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

export class AcceptanceCommand {
  constructor(private readonly service = new AcceptanceService()) {}

  async execute(
    changeName: string | undefined,
    options: AcceptanceOptions = {}
  ): Promise<void> {
    const scope = scopeFor(changeName, options);
    let report: AcceptanceReport;

    if (changeName && (options.project || options.release)) {
      report = createAcceptanceFailureReport(scope, {
        severity: 'error',
        code: 'acceptance_scope_conflict',
        message: 'Choose either a change name or project/release scope, not both.',
        path: 'scope',
      });
      this.emit(report, options.json);
      return;
    }
    if (!changeName && !options.project && !options.release) {
      report = createAcceptanceFailureReport(scope, {
        severity: 'error',
        code: 'acceptance_scope_required',
        message: 'Provide a change name or select --project/--release scope.',
        path: 'scope',
        fix: 'Run openspec acceptance <change-name> or openspec acceptance --project.',
      });
      this.emit(report, options.json);
      return;
    }

    let root: ResolvedOpenSpecRoot;
    try {
      root = await resolveOpenSpecRoot({
        ...(options.store !== undefined ? { store: options.store } : {}),
        ...(options.storePath !== undefined ? { storePath: options.storePath } : {}),
      });
    } catch (error) {
      report = createAcceptanceFailureReport(scope, rootDiagnostic(error));
      this.emit(report, options.json);
      return;
    }

    try {
      report = await this.service.run(root, { scope });
    } catch (error) {
      report = createAcceptanceFailureReport(
        scope,
        {
          severity: 'error',
          code: 'acceptance_internal_error',
          message: error instanceof Error ? error.message : String(error),
        },
        toRootOutput(root)
      );
    }
    this.emit(report, options.json);
  }

  private emit(report: AcceptanceReport, json = false): void {
    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderAcceptanceHuman(report));
    }
    process.exitCode = report.passed ? 0 : 1;
  }
}
