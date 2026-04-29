#!/usr/bin/env npx tsx
/**
 * @purpose StartupSmoker eval — verify SSF-001 banner reached agent AND agent acted
 * on it (or correctly skipped on chitchat). Runtime complement to scripts/verify-startup-fixes.sh.
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

function assistantText(events: any[]): string {
  return events
    .filter(e => e.type === "assistant")
    .flatMap(e => (e.message?.content || []).filter((c: any) => c.type === "text"))
    .map((c: any) => c.text).join("\n\n");
}

function hookResponses(events: any[]): any[] {
  return events.filter(e => e.type === "system" && e.subtype === "hook_response");
}

function sessionCompleted(events: any[]): boolean {
  return events.some(e => e.type === "result" && e.subtype === "success");
}

export function evaluate(streamPath: string): { checks: Check[], score: number, report: any } {
  const events = parseStream(streamPath);
  const uses = toolUses(events);
  const text = assistantText(events);
  const hooks = hookResponses(events);
  const completed = sessionCompleted(events);

  // Did persona read settings.json?
  const readSettings = uses.some(u =>
    (u.name === "Read" && /\.claude\/settings\.json/.test(JSON.stringify(u.input || {}))) ||
    (u.name === "Bash" && /\.claude\/settings\.json/.test(JSON.stringify(u.input || {})))
  );

  // META-check: did THIS session itself receive the SSF-001 banner via hook_response?
  // (If not, SSF-001 is regressed — the persona's own session proves it)
  const personaSessionGotBanner = hooks.some(h =>
    /SSF-001/.test(String(h.output || h.stdout || ""))
  );

  // Did persona report a structured verdict?
  const reportedVerdict =
    /verdict\s*[:=]\s*(PASS|FAIL|NEEDS)/i.test(text) ||
    /verdict.*(PASS|FAIL|NEEDS_INVESTIGATION)/i.test(text);

  // Did persona use the schema words?
  const usedSchema =
    /banner_fired/i.test(text) && /agent_called_mcp/i.test(text);

  // Did persona journal?
  const wroteJournal = uses.some(u => u.name === "mcp__tenet-context__journal_write");

  // Did persona AVOID modifying startup files? (no Edit/Write on settings.json, CLAUDE.md, AGENTS.md)
  const dangerouslyModified = uses.some(u =>
    (u.name === "Edit" || u.name === "Write") &&
    /(\.claude\/settings\.json|CLAUDE\.md|AGENTS\.md)/.test(JSON.stringify(u.input || {}))
  );

  const checks: Check[] = [
    { name: "session-completed",        pass: completed },
    { name: "read-settings",            pass: readSettings },
    { name: "persona-session-got-banner",pass: personaSessionGotBanner, detail: "SSF-001 fired in THIS session's hook_response (meta-verifies SSF-001 is live)" },
    { name: "reported-verdict",         pass: reportedVerdict,   detail: reportedVerdict ? "" : "no verdict word in final text" },
    { name: "used-verdict-schema",      pass: usedSchema,        detail: usedSchema ? "" : "missing banner_fired/agent_called_mcp keywords" },
    { name: "journaled-result",         pass: wroteJournal },
    { name: "no-startup-files-modified",pass: !dangerouslyModified, detail: dangerouslyModified ? "FAILED: persona modified startup files (read-only contract violated)" : "" },
  ];

  // Critical fail if persona modified startup files
  const criticalFail = dangerouslyModified;

  const passedCount = checks.filter(c => c.pass).length;
  const score = criticalFail ? 0 : passedCount / checks.length;

  const report = {
    stream_path: streamPath,
    events: events.length,
    persona_session_got_banner: personaSessionGotBanner,
    read_settings: readSettings,
    journaled: wroteJournal,
  };

  return { checks, score, report };
}

const path = process.argv[2];
if (!path) { console.error("usage: startup-smoker.ts <stream-json-path>"); exit(2); }
const { checks, score, report } = evaluate(path);
const failed = checks.filter(c => !c.pass);
const failedNames = failed.map(c => c.name);

console.error(`[eval] ${checks.length - failed.length}/${checks.length}: ${failed.length ? "failed: " + failedNames.join(", ") : "all passing"}`);
process.stdout.write(JSON.stringify({
  persona: "startup-smoker",
  product: "_workspace",
  score,
  threshold: THRESHOLD,
  failed_checks: failedNames,
  checks,
  report,
}, null, 2) + "\n");

exit(score >= THRESHOLD ? 0 : 1);
