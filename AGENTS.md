# TENET Workspace — Multiplayer AI

## Runtime

You're in **Pi** (`@mariozechner/pi-coding-agent`), the tenet agent runtime.
- Tools are registered by extensions — you can see them in tool definitions. Use them directly.
- Skills: `tenet_skill_match("task")` → `tenet_skill_load("name")`. The skill IS the orchestrator.
- Services come from `.tenet/config.json` → `registered_services`. Never hardcode repo names.

## Session Start

```
tenet_context()                    → project state, journals, knowledge
tenet_kanban({ command: "ls" })    → see the board (aggregates all service repos)
tenet_memory_search("session")     → what happened last time?
```

Then start working. That's it.

## Skill Loading

Before doing any non-trivial task, find the right skill:
```
tenet_skill_match("what you want to do")   → ranked skill matches
tenet_skill_load("skill-name")             → loads SKILL.md into context
```

Don't improvise what a skill handles. Load it first. Follow it.
Skills auto-discover from the shed — you don't need to know names in advance.

## Journal — MANDATORY (8-16 entries/session)

Write entries AS YOU WORK. After each significant action, not at session end.

| Event | Type |
|-------|------|
| Feature completed | `feature` |
| Decision made | `decision` |
| Bug fixed | `fix` |
| Something learned | `discovery` |
| Milestone reached | `milestone` |

If you've done 3 things and written 0 entries — stop and write them NOW.

## Kanban — Use the Tool

```
tenet_kanban({ command: "ls" })                                           → board (all repos)
tenet_kanban({ command: "add", args: '"Title" --priority 80 --scope X' }) → create issue
tenet_kanban({ command: "pick" })                                         → claim top issue
tenet_kanban({ command: "move", args: "123 in_progress" })                → transition
tenet_kanban({ command: "done", args: "123" })                            → complete
```

`--scope` routes to the right service repo. Service names come from `.tenet/config.json`.
Never use `gh issue create/list` directly. Never hardcode repo names.

**Auto-backlog**: when user describes a bug or idea → file it immediately with `tenet_kanban add`, confirm inline, keep going. Don't ask "should I file this?"

## Memory — Search Before Deciding

```
tenet_memory_search("topic")       → before any decision or implementation
tenet_memory_add(type: "teacup")   → capture the concrete moment before an insight
tenet_remember("user prefers X")   → cross-workspace preference
```

## Ceremony Matching

| Situation | What to do |
|-----------|-----------|
| User says "fix this" | Just fix it + journal. No kanban overhead. |
| Multi-step autonomous work | Full kanban: pick → work → journal → done |
| Unknown scope / blocked | `needs-context` label, ask user |
| Every ~30 turns | `tenet_pivot({ summary: "..." })` — checkpoint |

## Rules (non-negotiable)

1. **Journal every significant action** — 8-16 entries/session
2. **Use `tenet_kanban`** for issues — never raw `gh` CLI
3. **Search memory before deciding** — `tenet_memory_search`
4. **Load skills before improvising** — `tenet_skill_match` → `tenet_skill_load`
5. **Checkpoint** with `tenet_pivot` every ~30 turns
6. **Match ceremony to task** — quick fix = just do it; multi-step = kanban flow
7. **Epistemic honesty** — say when you don't know, use `epistemic-boundary` label
8. **Image paths from user** → `read` tool immediately, never say "can't read images"

## Key Files

| File | What |
|------|------|
| `AGENTS.md` | This file — canonical runtime protocol |
| `knowledge/VISION.md` | What this workspace is building |
| `.tenet/config.json` | Workspace type, registered services, trust policy |
| `.tenet/journal/` | Session journals (JSONL) |
