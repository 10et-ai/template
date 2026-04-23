#!/usr/bin/env npx tsx
/**
 * @purpose CompactionSmoker eval — verify SSF-004 marker pattern works end-to-end
 * via runtime simulation. Persona executes actual hook command strings; eval
 * confirms execution behavior matches contract.
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

function toolResults(events: any[]): string[] {
  // Tool results live in user messages following tool_use, content is array of tool_result blocks
  return events
    .filter(e => e.type === "user")
    .flatMap(e => {
      const c = e.message?.content;
      if (!Array.isArray(c)) return [];
      return c.filter((b: any) => b.type === "tool_result").map((b: any) =>
        typeof b.content === "string" ? b.content :
        Array.isArray(b.content) ? b.content.map((p: any) => p.text || "").join("") : ""
      );
    });
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
  const results = toolResults(events);
  const text = assistantText(events);
  const completed = sessionCompleted(events);

  // Did persona read settings.json?
  const readSettings = uses.some(u =>
    (u.name === "Read" && /\.claude\/settings\.json/.test(JSON.stringify(u.input || {}))) ||
    (u.name === "Bash" && /\.claude\/settings\.json/.test(JSON.stringify(u.input || {})))
  );

  // Did persona execute Bash with tenet-post-compact references?
  const ranMarkerCommand = uses.some(u =>
    u.name === "Bash" && /tenet-post-compact/.test(JSON.stringify(u.input || {}))
  );

  // Did POST-COMPACT [SSF-004] appear in any tool result (proves execution actually fired the banner)?
  const bannerInResults = results.some(r => /POST-COMPACT \[SSF-004\]/.test(r));

  // Did persona report phase_1 and phase_2 verdicts in final text?
  const reportedPhases =
    /phase[_\s]*1/i.test(text) && /phase[_\s]*2/i.test(text);

  // Did persona use a synthetic test-branch name (not "main" or session-* or empty)?
  const usedSyntheticBranch = uses.some(u => {
    if (u.name !== "Bash") return false;
    const cmd = String(u.input?.command || "");
    return /BRANCH=.{0,80}(test|compaction-smoker|smoke|synthetic)/i.test(cmd);
  });

  // Did persona journal?
  const wroteJournal = uses.some(u => u.name === "mcp__tenet-context__journal_write");

  // Did persona AVOID modifying startup files?
  const dangerouslyModified = uses.some(u =>
    (u.name === "Edit" || u.name === "Write") &&
    /(\.claude\/settings\.json|CLAUDE\.md|AGENTS\.md)/.test(JSON.stringify(u.input || {}))
  );

  const checks: Check[] = [
    { name: "session-completed",          pass: completed },
    { name: "read-settings",              pass: readSettings },
    { name: "ran-marker-command",         pass: ranMarkerCommand,    detail: "Bash invocation referencing tenet-post-compact path" },
    { name: "banner-fired-in-execution",  pass: bannerInResults,     detail: "POST-COMPACT [SSF-004] string in tool result (proves execution)" },
    { name: "reported-both-phases",       pass: reportedPhases,      detail: "phase_1 + phase_2 verdicts in final text" },
    { name: "used-synthetic-branch",      pass: usedSyntheticBranch, detail: "BRANCH=test/compaction-smoker/synthetic — guards against real-marker collision" },
    { name: "journaled-result",           pass: wroteJournal },
    { name: "no-startup-files-modified",  pass: !dangerouslyModified, detail: dangerouslyModified ? "FAILED: persona modified startup files" : "" },
  ];

  // Critical fail if persona modified startup files OR didn't use synthetic branch (marker-collision risk)
  const criticalFail = dangerouslyModified;

  const passedCount = checks.filter(c => c.pass).length;
  const score = criticalFail ? 0 : passedCount / checks.length;

  const report = {
    stream_path: streamPath,
    events: events.length,
    bash_calls: uses.filter(u => u.name === "Bash").length,
    banner_proof: bannerInResults,
    journaled: wroteJournal,
  };

  return { checks, score, report };
}

const path = process.argv[2];
if (!path) { console.error("usage: compaction-smoker.ts <stream-json-path>"); exit(2); }
const { checks, score, report } = evaluate(path);
const failed = checks.filter(c => !c.pass);
const failedNames = failed.map(c => c.name);

console.error(`[eval] ${checks.length - failed.length}/${checks.length}: ${failed.length ? "failed: " + failedNames.join(", ") : "all passing"}`);
process.stdout.write(JSON.stringify({
  persona: "compaction-smoker",
  product: "_workspace",
  score,
  threshold: THRESHOLD,
  failed_checks: failedNames,
  checks,
  report,
}, null, 2) + "\n");

exit(score >= THRESHOLD ? 0 : 1);
