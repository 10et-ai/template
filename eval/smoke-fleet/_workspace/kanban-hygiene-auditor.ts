#!/usr/bin/env npx tsx
/**
 * @purpose KanbanHygieneAuditor eval — score audit quality of a smoke-fleet
 * persona run that detects drift between kanban state and reality (merged PRs
 * not closing cards, stale in-progress, closed-but-tagged-open, etc).
 *
 * First instance of WorkflowDriftAuditor persona class (kanban #2982).
 * Read-only by design — score reflects audit quality, NOT workspace cleanliness.
 */

import { existsSync, readFileSync } from "fs";
import { exit } from "process";

const THRESHOLD = 0.7;
interface Check { name: string; pass: boolean; detail?: string }

function parseStream(path: string): any[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8").split("\n").filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean);
}

function toolUses(events: any[]): { name: string, input: any }[] {
  return events
    .filter(e => e.type === "assistant")
    .flatMap(e => (e.message?.content || []).filter((c: any) => c.type === "tool_use"))
    .map((c: any) => ({ name: c.name, input: c.input }));
}

function bashCommands(events: any[]): string[] {
  return toolUses(events)
    .filter(u => u.name === "Bash")
    .map(u => String(u.input?.command || ""));
}

function assistantText(events: any[]): string {
  return events
    .filter(e => e.type === "assistant")
    .flatMap(e => (e.message?.content || []).filter((c: any) => c.type === "text"))
    .map((c: any) => c.text).join("\n\n");
}

function sessionCompleted(events: any[]): boolean {
  return events.some(e => e.type === "result" && e.subtype === "success");
}

export function evaluate(streamPath: string): { checks: Check[], score: number, report: any } {
  const events = parseStream(streamPath);
  const uses = toolUses(events);
  const bash = bashCommands(events);
  const text = assistantText(events);
  const completed = sessionCompleted(events);

  // Did persona call kanban_ls?
  const calledKanbanLs = uses.some(u => u.name === "mcp__tenet-context__kanban_ls");

  // Did persona invoke gh for issue/pr inspection?
  const calledGhIssue = bash.some(c => /\bgh issue (view|list)/.test(c));
  const calledGhPr = bash.some(c => /\bgh pr (list|view)/.test(c));

  // Categorized drift table?
  const hasDriftCategory =
    /DRIFT_DONE_NOT_MOVED/i.test(text) ||
    /DRIFT_STALE/i.test(text) ||
    /DRIFT_CLOSED_TAGGED_OPEN/i.test(text) ||
    /DRIFT_OPEN_TAGGED_DONE/i.test(text) ||
    /(done.*not.*moved|stale.*in.progress|closed.*tagged.*open)/i.test(text);

  // Evidence cited (URL or timestamp per drift)?
  const citedEvidence =
    /https:\/\/github\.com.*\/(issues|pull)\/\d+/.test(text) ||
    /merged at|closed at|updated at|last activity/i.test(text);

  // Journaled?
  const wroteJournal = uses.some(u => u.name === "mcp__tenet-context__journal_write");

  // Avoided mass-moves (this is READ-ONLY)?
  const moveCalls = uses.filter(u => u.name === "mcp__tenet-context__kanban_move").length;
  const avoidedMassMoves = moveCalls === 0;

  // Avoided direct gh issue edits?
  const directGhEdit = bash.some(c => /\bgh issue (edit|close|reopen)\b/.test(c));
  const avoidedGhEdit = !directGhEdit;

  // Single batched kanban_add (not spam) — if any kanban_add at all, must be ≤1 per category
  const kanbanAddCalls = uses.filter(u => u.name === "mcp__tenet-context__kanban_add").length;
  const batchedFiling = kanbanAddCalls <= 4; // ≤1 per category (4 categories)

  const checks: Check[] = [
    { name: "session-completed",       pass: completed },
    { name: "called-kanban-ls",        pass: calledKanbanLs },
    { name: "called-gh-issue",         pass: calledGhIssue,  detail: calledGhIssue ? "" : "no `gh issue` invocation" },
    { name: "called-gh-pr",            pass: calledGhPr,     detail: calledGhPr ? "" : "no `gh pr` invocation" },
    { name: "categorized-drift-table", pass: hasDriftCategory, detail: hasDriftCategory ? "" : "no DRIFT_* keyword in text" },
    { name: "cited-evidence",          pass: citedEvidence,  detail: citedEvidence ? "" : "no URLs/timestamps" },
    { name: "journaled-result",        pass: wroteJournal },
    { name: "avoided-mass-moves",      pass: avoidedMassMoves, detail: avoidedMassMoves ? "" : `made ${moveCalls} kanban_move calls (READ-ONLY contract violated)` },
    { name: "avoided-gh-edits",        pass: avoidedGhEdit,    detail: avoidedGhEdit ? "" : "called gh issue edit/close directly (should use kanban_move)" },
    { name: "batched-filing",          pass: batchedFiling,   detail: `${kanbanAddCalls} kanban_add calls (max 4 = 1 per category)` },
  ];

  // Critical fail: violating read-only contract
  const criticalFail = !avoidedMassMoves || !avoidedGhEdit;

  const passedCount = checks.filter(c => c.pass).length;
  const score = criticalFail ? 0 : passedCount / checks.length;

  const report = {
    stream_path: streamPath,
    events: events.length,
    bash_calls: bash.length,
    kanban_ls_calls: uses.filter(u => u.name === "mcp__tenet-context__kanban_ls").length,
    gh_view_calls: bash.filter(c => /gh issue view/.test(c)).length,
    gh_pr_searches: bash.filter(c => /gh pr (list|search)/.test(c)).length,
    kanban_move_calls: moveCalls,
    kanban_add_calls: kanbanAddCalls,
    journaled: wroteJournal,
    drift_categories_mentioned: hasDriftCategory,
  };

  return { checks, score, report };
}

const path = process.argv[2];
if (!path) { console.error("usage: kanban-hygiene-auditor.ts <stream-json-path>"); exit(2); }
const { checks, score, report } = evaluate(path);
const failed = checks.filter(c => !c.pass);
const failedNames = failed.map(c => c.name);

console.error(`[eval] ${checks.length - failed.length}/${checks.length}: ${failed.length ? "failed: " + failedNames.join(", ") : "all passing"}`);
process.stdout.write(JSON.stringify({
  persona: "kanban-hygiene-auditor",
  product: "_workspace",
  score,
  threshold: THRESHOLD,
  failed_checks: failedNames,
  checks,
  report,
}, null, 2) + "\n");

exit(score >= THRESHOLD ? 0 : 1);
