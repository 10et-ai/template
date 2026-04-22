# Session Startup Fixes — Test Index

Each fix carries a grep-verifiable marker. If startup regresses ("sessions don't pick up
where we left off," "Claude Code doesn't call tenet tools on its own"), run the tests
below. A missing marker = that fix got reverted/drifted.

Run all tests: `bash scripts/verify-startup-fixes.sh` (future — see SSF-003 follow-up).

---

## SSF-001: SessionStart imperative banner

**Problem:** `SessionStart` hook printed status output only (session branch, hub ensure)
with no nudge telling Claude Code to call `context_get` before turn 1. Imperative hook
banners (like `JOURNAL REQUIRED` on commit) work empirically — passive CLAUDE.md context
does not. Result: fresh Claude Code sessions ignored the hub.

**Fix:** Added a third hook command to `SessionStart` that echoes an imperative banner
listing the exact MCP calls to make (ToolSearch + context_get + memory_search + kanban_ls
for Claude Code; `tenet_context()` / `tenet_memory_search()` for Pi, which auto-loads).

**Files:**
- `.claude/settings.json` — adds third command to `hooks.SessionStart[0].hooks[]`

**Tests (grep-level):**
```bash
# banner present
grep -c 'SESSION START \[SSF-001\]' .claude/settings.json   # expect: 1

# three commands in SessionStart hooks
jq '.hooks.SessionStart[0].hooks | length' .claude/settings.json  # expect: 3
```

**Runtime test (manual):**
1. Start a fresh Claude Code session in the workspace with any prompt
2. Expect banner output in first turn
3. Expect first tool call = `ToolSearch` or `mcp__tenet-context__context_get`

---

## SSF-002: CLAUDE.md self-contained (workspace drift)

**Problem:** Older `CLAUDE.md` files from workspaces initialized before `init.ts:500-525`
programmatic-CLAUDE.md-overwrite landed would say *"First read AGENTS.md... AGENTS.md is
the canonical source"*. Claude Code then read `AGENTS.md:3` which says *"Runtime: Pi
(not Claude Code) — Tools are Pi extensions — NOT MCP servers"* and dutifully ignored
its own MCP toolkit. This only affects legacy workspaces; new `tenet init` runs produce
a clean programmatic CLAUDE.md.

**Fix:** Removed cross-reference lines so CLAUDE.md is authoritative for Claude Code;
AGENTS.md is explicitly labeled as Pi-only. One-time workspace-drift patch, not a
template change.

**Files:**
- `CLAUDE.md` — removes "First read AGENTS.md" / "canonical source" lines; adds
  `<!-- SSF-002: ... -->` marker

**Tests (grep-level):**
```bash
# cross-reference is gone
grep -c 'First read' CLAUDE.md          # expect: 0
grep -c 'canonical source' CLAUDE.md    # expect: 0

# marker present
grep -c 'SSF-002' CLAUDE.md             # expect: 1
```

---

## SSF-003: This index

**Purpose:** makes drift detectable. Each fix has a marker future greps can verify.
`tenet doctor` should eventually read this file and run the tests automatically.

**Test:** this file exists.
```bash
test -f .tenet/STARTUP_FIXES.md && echo OK || echo MISSING
```

---

## Related open work (kanban)

- Deprecate/delete `jfl-cli/template/` — orphan copy, not used by `tenet init`;
  agents kept editing it believing they were fixing the real template.
  Real template: `10et-ai/template` on GitHub, local clone: `jfl-template`.
- `#2940` P0 — compaction regression; needs post-compact rehydration hook (SSF-004?)
- `#2926` P2 — file-level presence / conflict warnings
- `#2854` P0 — local embeddings fallback
- `#2927` P2 — JSONL-first session model (Pi parity)
- `#2902` P0 — full MCP lifecycle epic
