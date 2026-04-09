# TENET Workspace

## Runtime: Pi (not Claude Code)

You are running inside **Pi** (`@mariozechner/pi-coding-agent`), not Claude Code.
- Tools are Pi extensions — NOT MCP servers, NOT `.claude/settings.json`
- Skills load from the shed: `tenet_skill_load("name")`
- Build agents run via `tenet build --run <agent>`
- All labels use `tenet/` prefix

When fixing extension bugs, rebuild: `cd <extension-dir> && npm run build`.

## How to Work

**Just work.** Code lives across repos — `cd` wherever you need to go. Service paths are in `.tenet/config.json`. Fix things where they live, journal decisions here.

**Journal as you go.** Not at the end — as it happens:

| Event | Do |
|-------|-----|
| Made a decision | `tenet_journal_write` type=decision |
| Fixed something | `tenet_journal_write` type=fix |
| Learned something | `tenet_journal_write` type=discovery |
| Shipped a feature | `tenet_journal_write` type=feature |
| Hit a milestone | `tenet_journal_write` type=milestone |

**Teacup moments** — when you understand WHY something works (or doesn't), capture via `tenet_memory_add` with type `teacup`. Write the specific concrete thing you were looking at — the file, the line, the exact detail. NOT the conclusion. The door back to the insight.

**Search memory before deciding.** `tenet_memory_search("topic")` — someone may have already solved this or decided against it.

**Create issues as you find them.** See a bug while fixing something else? `gh issue create`. Don't stop — file it and keep going.

## Issue Flow

Issues live in this workspace. Work happens wherever the code is.

```
See problem → gh issue create --label "tenet/backlog,P2"
             (add P0/P1 if urgent, agent-ready if clear enough for build agents)

Backlog fills up → categorize, dependency graph, prioritize
                  → knock them out or run build agents

Pick work → gh issue edit N --add-label "tenet/in-progress"
Do work   → cd to whatever repo, fix it, commit with "Closes #N"
Done      → gh issue close N
```

One backlog. The issue describes what's wrong, the agent figures out where to fix it.

## Skills & Build Agents

Match task → load skill → follow it:
```
tenet_skill_match("what you want to do")
tenet_skill_load("skill-name")
```

For batching work — spec → eval → run: `tenet_skill_load("build-agent")`

## Rules

1. **Journal every significant action** — as it happens, not at session end
2. **Load skills before doing work manually** — the skill IS the orchestrator
3. **Search memory before deciding** — `tenet_memory_search`
4. **Work off the board** — pick issues, close them
5. **Every code file needs `@purpose` header**
6. **Checkpoint with `tenet_pivot`** every ~30 turns

## Key Files

| File | What |
|------|------|
| `AGENTS.md` | This file |
| `.tenet/config.json` | Service paths, project config |
| `.tenet/journal/` | Session history |
