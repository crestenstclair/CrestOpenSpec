import type {
  AcceptanceGateStatus,
  AcceptanceReport,
  OpenSpecValidationItem,
} from './types.js';

function gateLabel(status: AcceptanceGateStatus): string {
  if (status === 'passed') return 'PASS';
  if (status === 'failed') return 'FAIL';
  return 'NOT APPLICABLE';
}

function renderValidationItem(item: OpenSpecValidationItem): string[] {
  const lines = [`  ${item.valid ? 'PASS' : 'FAIL'} ${item.type}:${item.id} (${item.path})`];
  for (const issue of item.issues) {
    const location = issue.line === undefined ? issue.path : `${issue.path}:${issue.line}`;
    lines.push(`    ${issue.level} ${location}: ${issue.message}`);
  }
  return lines;
}

export function renderAcceptanceHuman(report: AcceptanceReport): string {
  const lines: string[] = [];
  const outcome = !report.applicable ? 'NOT APPLICABLE' : report.passed ? 'PASS' : 'FAIL';
  lines.push(`Acceptance ${outcome}`);
  lines.push(
    `Scope: ${report.scope.mode}${report.scope.change ? ` (${report.scope.change})` : ''}`
  );
  lines.push(
    `Root: ${report.root ? `${report.root.path} [${report.root.source}]` : 'unresolved'}`
  );
  lines.push('');
  lines.push('Deterministic gates');
  lines.push(
    `  ${gateLabel(report.gates.architecture.status)} CUE architecture${
      report.gates.architecture.root ? ` (${report.gates.architecture.files.length} source file(s))` : ''
    }`
  );
  for (const diagnostic of report.gates.architecture.diagnostics) {
    lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
  }
  lines.push(
    `  ${gateLabel(report.gates.openspec.status)} strict OpenSpec validation (${report.gates.openspec.items.length} item(s))`
  );
  for (const item of report.gates.openspec.items) {
    lines.push(...renderValidationItem(item));
  }
  for (const diagnostic of report.gates.openspec.diagnostics) {
    lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
  }
  lines.push(
    `  ${gateLabel(report.gates.validations.status)} executable validations (${report.gates.validations.executed}/${report.gates.validations.resolved} executed; ${report.gates.validations.declaredProjectChecks} project check(s), ${report.gates.validations.applicableAttachedTests} attached test(s))`
  );
  for (const diagnostic of report.gates.validations.diagnostics) {
    lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
  }

  if (report.checks.length > 0) {
    lines.push('');
    lines.push('Execution evidence');
  }
  for (const check of report.checks) {
    lines.push(`  ${check.passed ? 'PASS' : 'FAIL'} ${check.id}`);
    lines.push(
      `    declaration: ${check.declaration.kind}, owner=${check.declaration.owner}, location=${check.declaration.location}`
    );
    lines.push(`    argv: ${JSON.stringify(check.process.argv)}`);
    lines.push(`    cwd: ${check.process.cwd}`);
    lines.push(
      `    process: ${check.process.termination}, exit=${check.process.exitCode ?? 'none'}, signal=${check.process.signal ?? 'none'}, duration=${check.process.durationMs}ms`
    );
    lines.push(
      `    limits: timeout=${check.process.limits.timeoutMs}ms, stdout=${check.process.limits.stdoutBytes}B, stderr=${check.process.limits.stderrBytes}B`
    );
    for (const assertion of check.assertions) {
      const evidence = [
        assertion.expected !== undefined
          ? `expected=${JSON.stringify(assertion.expected)}`
          : undefined,
        assertion.observed !== undefined
          ? `observed=${JSON.stringify(assertion.observed)}`
          : undefined,
      ].filter((value): value is string => value !== undefined);
      lines.push(
        `    ${assertion.passed ? 'PASS' : 'FAIL'} assertion ${assertion.index} (${assertion.type})${evidence.length > 0 ? `: ${evidence.join(', ')}` : ''}`
      );
    }
    if (check.testEvidence) {
      lines.push(
        `    ${check.testEvidence.status === 'passed' ? 'PASS' : 'FAIL'} test evidence (${check.testEvidence.provider}, minimum=${check.testEvidence.minimumExecuted})`
      );
      lines.push(`      declared selector: ${JSON.stringify(check.testEvidence.selector)}`);
      if (check.testEvidence.evidence) {
        lines.push(`      evidence selector: ${JSON.stringify(check.testEvidence.evidence.selector)}`);
        lines.push(`      ${JSON.stringify(check.testEvidence.evidence)}`);
      }
    }
    if (check.process.stdout || check.process.stdoutTruncated) {
      lines.push(
        `    stdout${check.process.stdoutTruncated ? ' (truncated)' : ''}: ${JSON.stringify(check.process.stdout)}`
      );
    }
    if (check.process.stderr || check.process.stderrTruncated) {
      lines.push(
        `    stderr${check.process.stderrTruncated ? ' (truncated)' : ''}: ${JSON.stringify(check.process.stderr)}`
      );
    }
    for (const diagnostic of check.diagnostics) {
      lines.push(`    ${diagnostic.code}: ${diagnostic.message}`);
    }
  }

  lines.push('');
  lines.push(`Semantic review: ${report.semanticReview.status}`);
  lines.push(`  ${report.semanticReview.message}`);
  return lines.join('\n');
}
