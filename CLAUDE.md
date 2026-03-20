# JFL - Claude Instructions

Your context layer. Any project. Any AI.

## Project Identity

Get project name from `.jfl/config.json` → `name`, or `knowledge/VISION.md` → first heading, or directory name.

## Philosophy

Vision emerges from doing, not declaring. Start immediately. Capture context into knowledge docs as you work — docs are a record, not a gate.

---

## Session Start — DO FIRST (before responding)

1. **Verify session branch:** `git branch --show-current` → should be `session-*`
2. **Run sync:** `./scripts/session/session-sync.sh`
3. **Get context:** Call `mcp__jfl-context__context_get` (returns journal entries + knowledge docs)
4. **Show dashboard:** Run `/hud`

**CRITICAL — Automatic Tool Invocation:**

| User asks about | Auto-invoke |
|-----------------|-------------|
| "What did we decide about X?" | `memory_search: X` with type=decision |
| "When did we implement Y?" | `memory_search: Y` with type=feature |
| "Why did we choose Z?" | `memory_search: Z` |
| "What files have X?" | `context_search: X` |
| "Current state of Y?" | `context_get` |
| Anything about past work | `memory_search` (hybrid search finds it) |

Never ask the user to use tool names. Detect intent and invoke silently.

**Verify session branch** — hook output shows `session-*`. If git shows `main`, the hook may not have run. The `jfl-platform` symlink in `product/` breaks silently if jfl-platform is out of sync — always run the sync script.

---

## Journal Protocol — MANDATORY

Write journal entries as you work. Not at session end — after each significant action.

**Write immediately when:**

| Event | Type |
|-------|------|
| Feature completed | `feature` |
| Decision made | `decision` |
| Bug fixed | `fix` |
| Something learned | `discovery` |
| Milestone reached | `milestone` |

**File:** `.jfl/journal/<session-branch>.jsonl` (one JSON per line)

```json
{
  "v": 1,
  "ts": "2026-01-25T10:30:00.000Z",
  "session": "session-goose-20260125-xxxx",
  "type": "feature",
  "status": "complete",
  "title": "What was built",
  "summary": "2-3 sentences of what this actually is",
  "detail": "Full description. Files created. What's stubbed. What's next.",
  "files": ["path/to/file.ts"],
  "incomplete": ["list of stubs"],
  "next": "what should happen next"
}
```

**Required:** `v`, `ts`, `session`, `type`, `title`, `summary` — **Strongly recommended:** `detail`, `files`

The session branch comes from `cat .jfl/current-session-branch.txt` (written by session init). Use this, not `git branch --show-current`, to avoid race conditions.

**File Headers — MANDATORY for code files:**

Every `.ts`, `.tsx`, `.js`, `.jsx` MUST have `@purpose`:
```typescript
/** @purpose One-line description of what this file does */
```
The PostToolUse hook will warn if missing. Add it immediately.

---

## Immediate Decision Capture

When a decision is made:
1. Update the relevant doc (`knowledge/BRAND_DECISIONS.md`, architecture spec, etc.)
2. Write journal entry with type=`decision` — include options considered and why this choice

---

## Core Architecture

**GTM workspace ≠ product code.** This repo is the context layer. Product code lives in separate repos:

```
jfl-gtm/          ← this repo (GTM context, sessions, knowledge)
  product/        ← symlink → jfl-platform OR submodule
  knowledge/      ← strategy, vision, brand
  content/        ← marketing
  .jfl/           ← journal, memory, config, sessions

jfl-cli/          ← CLI product (separate repo)
jfl-platform/     ← platform product (separate repo)
```

`jfl update` updates GTM toolkit (CLAUDE.md, skills/) without touching product repos.

---

## Knowledge Sources

| Doc | Purpose |
|-----|---------|
| `knowledge/VISION.md` | What we're building (check status: EMERGENT vs DECLARED) |
| `knowledge/NARRATIVE.md` | How we tell the story |
| `knowledge/THESIS.md` | Why we win |
| `knowledge/ROADMAP.md` | What ships when |
| `knowledge/BRAND_DECISIONS.md` | Finalized brand choices |
| `knowledge/TASKS.md` | Master task list |

Use `jfl_context` / `mcp__jfl-context__context_get` to get these — don't read files individually.

---

## Tools (Pi) / MCP (Claude Code)

Both runtimes expose the same capabilities under different names:

| Capability | Claude Code MCP | Pi tool |
|------------|-----------------|---------|
| Get project context | `mcp__jfl-context__context_get` | `jfl_context` |
| Search past work | `mcp__jfl-context__memory_search` | `jfl_memory_search` |
| Add memory | `mcp__jfl-context__memory_add` | `jfl_memory_add` |
| Project dashboard | `/hud` skill | `jfl_hud` |
| Publish event | `mcp__jfl-context__events_publish` | `jfl_publish_event` |

---

## Session End

Use `/end` skill for clean session close. It commits, merges session branch, and syncs.

If closing manually:
```bash
git add knowledge/ previews/ content/ suggestions/ .jfl/ CLAUDE.md
git commit -m "session: end $(date +%Y-%m-%d)"
```

The Stop/PreCompact hooks auto-commit as a safety net, but they can't push. Use `/end` to push.
