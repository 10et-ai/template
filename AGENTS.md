# TENET — Agent Protocol

You're in **Pi** (`@mariozechner/pi-coding-agent`). Tools are registered. Use them directly.

## Session Start — DO FIRST

1. `tenet_context()` — get journals, knowledge, project state
2. `tenet_kanban({ command: "ls" })` — see the board
3. `tenet_memory_search("session start")` — what happened last time
4. Start working. No ceremony.

## Auto-Invoke — MANDATORY

Detect intent silently. Never ask the user to name tools.

| User says / does | You silently do |
|------------------|-----------------|
| Describes a bug or idea | `tenet_kanban({ command: "add", args: '"Title" --priority N' })` — file it, confirm inline, keep going |
| "What did we decide about X?" | `tenet_memory_search("X")` with type=decision |
| "When did we build Y?" | `tenet_memory_search("Y")` with type=feature |
| "What's on the board?" | `tenet_kanban({ command: "ls" })` |
| "Work on the top issue" | `tenet_kanban({ command: "pick" })` |
| Asks about past work | `tenet_memory_search("topic")` |
| Sends an image path | `read(path)` immediately — never say "can't read images" |
| Starts a new kind of task | `tenet_skill_match("task description")` → `tenet_skill_load("name")` |
| Asks about project state | `tenet_context()` or `tenet_hud()` |

## Journal — MANDATORY

Write entries AS YOU WORK. Not at session end. After each significant action.

| Event | Type |
|-------|------|
| Feature completed | `tenet_journal_write({ type: "feature", ... })` |
| Decision made | `tenet_journal_write({ type: "decision", ... })` |
| Bug fixed | `tenet_journal_write({ type: "fix", ... })` |
| Something learned | `tenet_journal_write({ type: "discovery", ... })` |
| Milestone reached | `tenet_journal_write({ type: "milestone", ... })` |

Target: 8-16 entries per session. If you've done 3 things and written 0 entries, stop and write them NOW.

## Kanban — Use the Tool

```
tenet_kanban({ command: "ls" })                                        — see board
tenet_kanban({ command: "add", args: '"Title" --priority 80' })        — create issue
tenet_kanban({ command: "pick" })                                      — claim top issue
tenet_kanban({ command: "move", args: "123 in_progress" })             — transition
tenet_kanban({ command: "done", args: "123" })                         — complete
```

Issues route to repos via `--scope <service>`. Service names come from `.tenet/config.json` → `registered_services`. Never hardcode repo names.

When user describes a bug or idea → file it immediately. Don't ask "should I file this?" Just do it, confirm inline: `Filed #N: <title>`, keep going.

## Skills — From the Shed

Skills live in the shed (40+). Find them dynamically:

```
tenet_skill_match("what you want to do")   — find relevant skills
tenet_skill_load("skill-name")             — load it into context
```

**Load skills BEFORE improvising.** The skill IS the orchestrator — follow it.
Don't hardcode skill names. `tenet_skill_match` always reflects current shed state.

## Memory — Search Before Deciding

```
tenet_memory_search("topic")                                    — before ANY decision
tenet_memory_add({ type: "insight", title: "...", content: "..." })  — persist learnings
tenet_memory_add({ type: "teacup", title: "...", content: "..." })   — the concrete moment before an aha
tenet_remember({ summary: "user prefers X" })                   — cross-workspace preference
```

**Teacup**: capture the specific thing you were looking at when understanding arrived — the file, the line, the detail. Not the conclusion. The door back to the insight.

## Services

Services are in `.tenet/config.json` → `registered_services`. Check them:

```
tenet_service({ service: "tenet-cli", command: "status" })     — git info
tenet_service({ service: "tenet-cli", command: "recent" })     — last 24h
```

## Rules

1. **Journal every significant action** — 8-16 entries/session
2. **Use `tenet_kanban` for issues** — never `gh issue create`
3. **Search memory before deciding** — `tenet_memory_search`
4. **Load skills before improvising** — `tenet_skill_match` → `tenet_skill_load`
5. **Auto-file issues** — user mentions bug/idea → file it, don't ask
6. **Every code file needs `@purpose` header**
7. **Checkpoint with `tenet_pivot`** every ~30 turns
8. **Be honest** — say when you don't know, label with `needs-context`
