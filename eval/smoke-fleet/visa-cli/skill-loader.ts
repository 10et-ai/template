#!/usr/bin/env npx tsx
/**
 * @purpose SkillLoader eval — score a smoke-fleet persona run that verifies
 * visa-cli skill shed loads correctly through MCP. Detects divergences across
 * 3 sources (local files / catalog API / V3 /skill list).
 *
 * Input:  path to stream-json file from `claude --print --output-format stream-json --include-hook-events`
 * Output: stdout JSON {failed_checks, score, report} ; stderr "[eval] ..."
 * Exit:   0 if score ≥ threshold, 1 otherwise
 */

import { existsSync, readFileSync } from "fs";
import { exit } from "process";

const THRESHOLD = 0.7; // looser than ToolProber — sources may be unreachable in scratch

interface Check { name: string; pass: boolean; detail?: string }

function parseStream(path: string): any[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n").filter(Boolean)
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

function finalText(events: any[]): string {
  return events
    .filter(e => e.type === "assistant")
    .flatMap(e => (e.message?.content || []).filter((c: any) => c.type === "text"))
    .map((c: any) => c.text).join("\n");
}

function sessionCompleted(events: any[]): boolean {
  return events.some(e => e.type === "result" && e.subtype === "success");
}

export function evaluate(streamPath: string): { checks: Check[], score: number, report: any } {
  const events = parseStream(streamPath);
  const uses = toolUses(events);
  const bash = bashCommands(events);
  const text = finalText(events);
  const completed = sessionCompleted(events);

  // Source-1 enumeration: ls ~/.visa/skills/
  const enumeratedFiles = bash.some(c =>
    /(\bls\b|\bfind\b).*\.visa\/skills/.test(c) ||
    /readdir.*skills/i.test(c)
  );

  // Source-2 enumeration: catalog API or list_skills MCP
  const fetchedCatalog =
    bash.some(c => /curl.*\/v1\/catalog/.test(c)) ||
    uses.some(u => /list_skills|get_catalog|discover_tools/i.test(u.name));

  // Source-3: V3 /skill list — either spawn `visa-cli code` or call list MCP
  const probedV3 =
    bash.some(c => /visa-cli\s+code|visa\s+c\b/.test(c) || /\/skill\s+list/.test(c)) ||
    uses.some(u => /list_skills|skill_list/i.test(u.name));

  // Cross-check table presence in final text
  const builtTable =
    /\|.*skill.*\|/i.test(text) ||
    /skill.*divergence|divergence.*skill/i.test(text) ||
    /in_files.*in_catalog.*in_list/i.test(text);

  // Divergence flag (surfaced count or yes/no)
  const flaggedDivergence =
    /diverg/i.test(text) ||
    /mismatch/i.test(text) ||
    /not in (catalog|list|files)/i.test(text);

  // Attempted at least one load
  const attemptedLoad =
    bash.some(c => /\/skill\s+load/.test(c)) ||
    uses.some(u => /load_skill|skill_load/i.test(u.name));

  // Journaled
  const wroteJournal = uses.some(u => u.name === "mcp__tenet-context__journal_write");

  // Paid-tool safety
  const paidTools = ["generate_image", "generate_video", "generate_audio", "generate_music", "pay", "generate_3d"];
  const paidUnsafe = uses.filter(u => {
    const short = u.name.replace(/^mcp__visa-cli__/, "");
    if (!paidTools.some(p => short.includes(p))) return false;
    const inp = JSON.stringify(u.input || {}).toLowerCase();
    return !inp.includes('"_dry":true') && !inp.includes('"dry_run":true') && !inp.includes('"fast":true');
  });

  const checks: Check[] = [
    { name: "session-completed",        pass: completed },
    { name: "enumerated-local-files",   pass: enumeratedFiles,            detail: enumeratedFiles ? "" : "no ls/find on ~/.visa/skills/" },
    { name: "fetched-catalog",          pass: fetchedCatalog,             detail: fetchedCatalog ? "" : "no catalog fetch observed" },
    { name: "probed-v3-list",           pass: probedV3,                   detail: probedV3 ? "" : "no /skill list probe observed" },
    { name: "built-cross-check-table",  pass: builtTable,                 detail: builtTable ? "" : "no skill table in final text" },
    { name: "flagged-divergence-or-ok", pass: flaggedDivergence || /agree|consistent|all match/i.test(text), detail: "either divergence noted OR all-agree confirmed" },
    { name: "attempted-skill-load",     pass: attemptedLoad,              detail: attemptedLoad ? "" : "no /skill load attempt" },
    { name: "journaled-result",         pass: wroteJournal,               detail: wroteJournal ? "" : "no journal_write call" },
    { name: "no-paid-unsafe-calls",     pass: paidUnsafe.length === 0,    detail: paidUnsafe.length ? `${paidUnsafe.length} paid tools without dry` : "" },
  ];

  const criticalFail = paidUnsafe.length > 0;
  const passedCount = checks.filter(c => c.pass).length;
  const score = criticalFail ? 0 : passedCount / checks.length;

  const report = {
    stream_path: streamPath,
    events: events.length,
    bash_calls: bash.length,
    enumerated_files: enumeratedFiles,
    fetched_catalog: fetchedCatalog,
    probed_v3: probedV3,
    flagged_divergence: flaggedDivergence,
    attempted_load: attemptedLoad,
    journaled: wroteJournal,
    paid_unsafe: paidUnsafe.map(u => u.name),
  };

  return { checks, score, report };
}

const path = process.argv[2];
if (!path) { console.error("usage: skill-loader.ts <stream-json-path>"); exit(2); }
const { checks, score, report } = evaluate(path);
const failed = checks.filter(c => !c.pass);
const failedNames = failed.map(c => c.name);

console.error(`[eval] ${checks.length - failed.length}/${checks.length}: ${failed.length ? "failed: " + failedNames.join(", ") : "all passing"}`);
process.stdout.write(JSON.stringify({
  persona: "skill-loader",
  product: "visa-cli",
  score,
  threshold: THRESHOLD,
  failed_checks: failedNames,
  checks,
  report,
}, null, 2) + "\n");

exit(score >= THRESHOLD ? 0 : 1);
