import type { Diagnostic } from "@/app/generated/prisma/client";

export type DiagnosticArea =
  | "leads"
  | "process"
  | "team"
  | "kpis"
  | "tools"
  | "value"
  | "retention"
  | "money";

export function getAreaScore(diagnostic: Diagnostic, area: string): number {
  switch (area) {
    case "leads": return diagnostic.scoreLeads;
    case "process": return diagnostic.scoreProcess;
    case "team": return diagnostic.scoreTeam;
    case "kpis": return diagnostic.scoreKpis;
    case "tools": return diagnostic.scoreTools;
    case "value": return diagnostic.scoreValue;
    case "retention": return diagnostic.scoreRetention;
    case "money": return diagnostic.scoreMoney;
    default: return 0;
  }
}

export function buildScoreUpdate(area: string, value: number) {
  switch (area) {
    case "leads": return { scoreLeads: value };
    case "process": return { scoreProcess: value };
    case "team": return { scoreTeam: value };
    case "kpis": return { scoreKpis: value };
    case "tools": return { scoreTools: value };
    case "value": return { scoreValue: value };
    case "retention": return { scoreRetention: value };
    case "money": return { scoreMoney: value };
    default: return {};
  }
}

export function recalcScoreTotal(diagnostic: Diagnostic): number {
  const divisor = diagnostic.diagnosticType === "EMPRESA" ? 8 : 7;
  const sum =
    diagnostic.scoreLeads +
    diagnostic.scoreProcess +
    diagnostic.scoreTeam +
    diagnostic.scoreKpis +
    diagnostic.scoreTools +
    diagnostic.scoreValue +
    diagnostic.scoreRetention +
    (diagnostic.diagnosticType === "EMPRESA" ? diagnostic.scoreMoney : 0);
  return Math.round(sum / divisor);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}
