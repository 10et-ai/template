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

## SSF-004: Post-compact rehydrate

**Problem:** When Claude Code compacts context mid-session, the agent loses in-memory
state. The `PreCompact` hook saves to journal/git, but there is no `PostCompact` event
in Claude Code — the agent resumes and has no imperative to re-pull from the hub.
Result: `#2940` — sessions "forget" what they were doing after compaction.

**Fix:** Two-part marker pattern (no new hook type needed):
1. `PreCompact` hook `touch`es `/tmp/tenet-post-compact-${BRANCH}` before compaction
2. `UserPromptSubmit` hook (catch-all matcher="") checks for that marker on every prompt;
   if present, echoes a rehydrate banner telling the agent to call `context_get` +
   `memory_search` + read the session journal. Then `rm`s the marker so the banner
   only fires once per compaction.

**Files:**
- `.claude/settings.json` — adds 1 command to `PreCompact` hooks, adds 1 new
  `UserPromptSubmit` entry (matcher="", catch-all)

**Tests (grep-level):**
```bash
# marker-touch in PreCompact
grep -c 'tenet-post-compact' .claude/settings.json   # expect: at least 2 (PreCompact touches, UserPromptSubmit checks/removes)

# banner in UserPromptSubmit
grep -c 'POST-COMPACT \[SSF-004\]' .claude/settings.json   # expect: 1
```

**Runtime test (manual):**
1. Start a Claude Code session, let it accrue context until compaction triggers (or force with `/compact`)
2. After compaction, submit ANY next prompt
3. Expect the `POST-COMPACT [SSF-004]` banner in output
4. Expect agent's first tool call = `context_get` or journal read
5. Marker file `/tmp/tenet-post-compact-${BRANCH}` should be absent after the prompt

---

## SSF-005: Automated regression suite

**Problem:** SSF-001/002/003/004 fixes are easy to drift back: someone edits hooks,
deletes a marker comment, or rewrites CLAUDE.md and the regressions are silent.
Manual greps are not enforced.

**Fix:** `scripts/verify-startup-fixes.sh` — bash test runner with per-fix assertions.
Static mode runs free; `--live` mode spawns a real `claude --print` session and
verifies the SSF-001 banner reaches a sibling agent's hook_response stream.

**Files:**
- `scripts/verify-startup-fixes.sh` — assertion runner

**How to use:**
```bash
# fast — static checks only
bash scripts/verify-startup-fixes.sh

# full — also spawns a real claude session (~1¢)
bash scripts/verify-startup-fixes.sh --live
```

**Wire into CI** (recommended next step):
```yaml
- name: SSF regression
  run: bash scripts/verify-startup-fixes.sh
```

**Tests:**
```bash
bash scripts/verify-startup-fixes.sh         # PASS=23 FAIL=0 (current)
bash scripts/verify-startup-fixes.sh --live  # PASS=24 FAIL=0 if claude CLI present
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
