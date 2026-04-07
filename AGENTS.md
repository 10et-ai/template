# TENET Workspace — Multiplayer AI

## Runtime: Pi (not Claude Code)

You are running inside **Pi** (`@mariozechner/pi-coding-agent`), the tenet agent runtime.
- Skills are loaded via `tenet_skill_load("<name>")` from the shed (10et-ai/skills)
- Journal entries via `tenet_journal_write` — WRITE AFTER EVERY SIGNIFICANT ACTION
- Memory via `tenet_memory_search` before decisions, `tenet_memory_add` after
- Session state auto-saves to `.tenet/journal/session-*.jsonl`
- Build agents run single-process via `tenet build --run <agent>` (no delegator since 1.11.1)
- All kanban labels use `tenet/` prefix
- Use `tenet brief` for 5-line org status, `tenet hud` for full dashboard

When fixing tenet CLI bugs, edit `~/CascadeProjects/jfl-cli/packages/pi/extensions/*.ts` and rebuild with `cd packages/pi && npm run build`.

## Session Protocol

### Journal — MANDATORY (target: 8-16 entries/session)

Write journal entries AS YOU WORK. After EACH significant action, not at session end.

| Event | Call |
|-------|------|
| Feature completed | `tenet_journal_write` type=feature |
| Decision made | `tenet_journal_write` type=decision |
| Bug fixed | `tenet_journal_write` type=fix |
| Something learned | `tenet_journal_write` type=discovery |
| Milestone reached | `tenet_journal_write` type=milestone |

**Teacup moments** — when you understand WHY something works (or doesn't), capture via `tenet_memory_add` with type `teacup`. Write the specific concrete thing you were looking at — the file, the line, the exact detail. NOT the conclusion. The door back to the insight.

### Kanban — Work off the board

1. Load kanban skill: `tenet_skill_load("kanban")`
2. Check P0/P1 issues: `gh issue list --state open --json number,title,labels`
3. Pick issue → `gh issue edit N --add-label "tenet/in-progress" --remove-label "tenet/backlog"`
4. Work → journal → commit with `Closes #N`
5. Close: `gh issue close N --comment "Fixed in commit X"`

### Skills — Load before doing

Match task → load skill → follow it. Don't improvise.
```
tenet_skill_match("what you want to do")
tenet_skill_load("skill-name")
```

Skills live at `10et-ai/skills` (public registry) and are bundled in `@10et/cli`. Critical skills: `build-agent`, `kanban`, `spec`, `startup`, `spawn-salon`, `debug`, `ci-setup`.

### Memory — Search before deciding

Before making any decision, search for prior art:
```
tenet_memory_search("topic")
```

### Context — Checkpoint often

- `tenet_pivot` every 30 turns or when switching topics
- `tenet_context` to reload project state after compaction

## Key Files

| File | What |
|------|------|
| `CLAUDE.md` | Full detailed instructions (read for deep context) |
| `knowledge/VISION.md` | What this workspace is building and why |
| `knowledge/ARCHITECTURE.md` | System design (if code workspace) |
| `knowledge/TOPOLOGY.md` | Service/dependency graph (if complex system) |
| `.tenet/journal/` | Session journals (JSONL) |
| `.tenet/config.json` | Project config — parent_slug, owner, scopes, trust_policy |
| `.tenet/recipes/` | Runnable sequential pipelines (build-cycle, ai-redteam, etc.) |

## Available Tools

- **tenet_journal_write** — WRITE AFTER EVERY SIGNIFICANT ACTION
- **tenet_memory_add** — persist insights (use type `teacup` for aha moments)
- **tenet_memory_search** — find past decisions before making new ones
- **tenet_context** — project context, journal entries, knowledge docs
- **tenet_hud** — project dashboard
- **tenet_skill_load** — load a skill before doing work
- **tenet_skill_match** — find the right skill for a task
- **tenet_skills_list** — browse what skills are available
- **tenet_pivot** — checkpoint work mid-session
- **tenet_eval_status** — eval scores and trends
- **tenet_synopsis** — summarize recent work
- **tenet_capabilities** — query what tenet can do (stable/beta/experimental)
- **tenet_events_publish** / **tenet_events_recent** — MAP event bus
- **tenet_training_buffer** / **tenet_policy_rank** — RL policy head
- **delegate** — run a build agent via `tenet build --run` (thin shellout, single process)
- **subway_send** / **subway_call** / **subway_broadcast** — P2P agent mesh

## Rules

1. **Journal every significant action** — 8-16 entries per session minimum
2. **Load skills before doing work manually** — the skill IS the orchestrator
3. **Search memory before deciding** — `tenet_memory_search`
4. **Work off the kanban board** — pick issues, close them, move cards
5. **Every code file needs `@purpose` header**
6. **Checkpoint with `tenet_pivot`** every 30 turns
7. **Use `tenet doctor`** when something feels off — runs freshness + orphan checks
8. **Build agents run single-process** — no delegator, no parallel router, no orphans
9. **Parallel dispatch is bash with setsid** — explicit process group cleanup, rare

## Build Agent Flow (the TOML+spec+eval pattern)

```
spec (what to build) → eval (binary checks) → TOML (agent config) → tenet build --run
  → single process, single log, single PID, killable
  → converges in 1-3 rounds with decomposed evals
  → writes build-journal.jsonl, results.tsv, git commits with Agent-Id trailer
  → training tuples flow to training-buffer.jsonl naturally
```

Freeze the spec before launching:
```bash
git add specs/my-feature.md eval/build/my-feature.ts .tenet/agents/build-my-feature.toml
git commit -m "spec freeze: my-feature"
tenet build --run my-feature
```

## Browser (Agent Eyes)

If `browser.relay` is on the Subway mesh:
```
subway_call("browser.relay", "navigate", '{"url":"https://..."}')
subway_call("browser.relay", "read", '{}')
subway_call("browser.relay", "click", '{"selector":"#btn"}')
```

## Troubleshooting

- **`tenet_memory_search` returns empty** → Context Hub not running, run `tenet context-hub start`
- **Skills look stale** → `npm update -g @10et/cli` + `tenet doctor` to verify freshness
- **Build agent converges but no PR** → check `tenet doctor-reap` for orphans, verify issue #94 fix is live
- **Orphan pi processes** → `tenet doctor-reap --force` to clean up
- **Session has no journal entries** → you're violating rule #1; write one NOW before continuing
