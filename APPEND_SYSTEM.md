# TENET Pi Session — System Rules

## TOOL USAGE — NON-NEGOTIABLE
Use the tools. Don't talk about using them. Don't narrate. Just invoke.

| Before doing X | Invoke this FIRST |
|----------------|-------------------|
| Any decision | `tenet_memory_search("topic")` |
| Any task | `tenet_skill_match("task")` → `tenet_skill_load("name")` |
| Kanban / issues | `tenet_kanban({ command: "ls" })` |
| After fix/feature/decision | `tenet_journal_write` IMMEDIATELY |
| After understanding WHY | `tenet_memory_add` type=teacup |
| Every 30 turns | `tenet_pivot` |
| Session start | `tenet_context` + `tenet_kanban({ command: "ls" })` |
| Image shared as path | `read` tool immediately — never say "can't read images" |

If you catch yourself explaining what tool you should use instead of calling it — STOP and call it.

## Registered Pi Tools — Use These, Not Bash

| Tool | When |
|------|------|
| `tenet_kanban({ command: "ls" })` | See open issues / board state |
| `tenet_kanban({ command: "add", args: "title --label P0,area:infra" })` | File new issue |
| `tenet_kanban({ command: "pick", args: "N" })` | Claim issue → moves to in-progress |
| `tenet_kanban({ command: "done", args: "N" })` | Close issue → moves to done |
| `tenet_linear({ command: "status" })` | Linear sync health |
| `tenet_linear({ command: "sync" })` | Sync Linear ↔ GitHub |
| `tenet_journal_write` | Journal after EVERY significant action |
| `tenet_memory_search("q")` | Search before any decision |
| `tenet_memory_add` | Persist insight (teacup = concrete moment before insight) |
| `tenet_skill_match("task")` | Find right skill before doing work manually |
| `tenet_skill_load("name")` | Load skill — it IS the orchestrator |
| `tenet_context` | Reload project state (use after compaction) |
| `tenet_pivot` | Checkpoint — commit + journal + index |
| `tenet_service({ service: "X", command: "status" })` | Check registered service |
| `visa_transact_image` | Generate AI image (Touch ID) |
| `visa_transact_music` | Generate music track (Touch ID) |
| `visa_transact_status` | Check Visa CLI spend |
| `tenet_capabilities` | Discover what tools/features exist + maturity |

**Never use raw `gh issue create` or `gh issue list` — use `tenet_kanban` tool.**
**Never use `tenet_transact_*` — it's `visa_transact_*` now.**

## Journal — MANDATORY (8-16 entries/session)
Write entries AS YOU WORK. After EACH significant action.
- Feature → `tenet_journal_write` type=feature
- Decision → `tenet_journal_write` type=decision  
- Bug fix → `tenet_journal_write` type=fix
- Learning → `tenet_journal_write` type=discovery
- Teacup → `tenet_memory_add` type=teacup (the concrete moment, not the conclusion)

## Skills — Load Before Doing
```
tenet_skill_match("what you want to do")   # find the right skill
tenet_skill_load("skill-name")             # load it — the skill IS the orchestrator
```
Skills: kanban, build-agent, spec, eval, debug, observe-ci, regression-run, spawn-salon, ci-setup, context, orchestrate, search, viz

## Services Model — Always Use It
Work targets registered services, NOT hardcoded paths.
```
tenet_service({ service: "tenet-cli", command: "status" })   # 10et-ai/cli
tenet_service({ service: "tenet-platform", command: "status" }) # 10et-ai/platform
tenet_service({ service: "tenet-template", command: "status" }) # 10et-ai/template
```
When creating issues or PRs, target the correct service repo — not this workspace.

## Kanban Flow
```
tenet_kanban({ command: "ls" })              # see board
tenet_kanban({ command: "add", args: "..." }) # file issue  
tenet_kanban({ command: "pick", args: "N" }) # claim it
# ... do the work ...
tenet_kanban({ command: "done", args: "N" }) # close with Closes #N
```
Linear auto-syncs on pick/done via the Linear bridge.

## Build Agent Flow (when work is complex)
```
tenet_skill_load("build-agent")   # load the recipe
# recipe handles: spec → eval → TOML → baseline → dispatch → converge → PR
```

## Performance
- Use `read` tool, NEVER `cat` via bash
- Keep bash output under 50 lines: `| head -20` or `| tail -20`
- Don't re-read files already read this session

## Git
- Sessions stay on `main` unless build agent creates a branch
- Commit msg: conventional (`fix:`, `feat:`, `chore:`) + `Closes #N`
- Auto-commit runs every 5 min — critical paths include `.tenet/` and `knowledge/`
