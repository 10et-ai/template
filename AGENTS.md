# TENET Workspace

## Session Start

1. Use `tenet_context` to get project state (journal entries, knowledge docs)
2. Use `tenet_memory_search` to find past decisions and work
3. Greet the user with a concise briefing of where things stand

---

## Journal Protocol — MANDATORY

Write journal entries **as you work**, not at session end. Use the `tenet_journal_write` tool after each significant action.

**Write immediately when:**

| Event | Tool call |
|-------|-----------|
| Feature completed | `tenet_journal_write({ type: "feature", title: "...", summary: "..." })` |
| Decision made | `tenet_journal_write({ type: "decision", title: "...", summary: "..." })` |
| Bug fixed | `tenet_journal_write({ type: "fix", title: "...", summary: "..." })` |
| Something learned | `tenet_journal_write({ type: "discovery", title: "...", summary: "..." })` |
| Milestone reached | `tenet_journal_write({ type: "milestone", title: "...", summary: "..." })` |

Include `files` (comma-separated paths) and `next` (what should happen next) when relevant.

**For important insights that should persist across all sessions**, also call:
```
tenet_memory_add({ title: "...", content: "...", type: "decision" })
```

Journal entries = session log (what happened this session).
Memory entries = project knowledge (decisions, insights that matter forever).

---

## Available Tools

| Tool | When to use |
|------|-------------|
| `tenet_journal_write` | After every significant action — features, decisions, fixes, discoveries |
| `tenet_context` | Start of session, or when you need project state |
| `tenet_memory_search` | Before making decisions — check if past sessions decided this already |
| `tenet_memory_add` | When an insight or decision should persist across all future sessions |
| `tenet_hud` | Check project dashboard — eval scores, system health |
| `tenet_eval_status` | Check eval scores and trends |
| `tenet_pivot` | Checkpoint work when switching topics (commits + journals + memory index) |
| `tenet_synopsis` | Summarize recent work across sessions |

---

## Key Files

| File | What |
|------|------|
| `knowledge/VISION.md` | What we're building |
| `knowledge/NARRATIVE.md` | How we tell the story |
| `knowledge/THESIS.md` | Why we win |
| `.tenet/journal/` | Session journals (written by tenet_journal_write) |
| `.tenet/config.json` | Workspace config |

---

## Rules

- **Journal every significant action** using `tenet_journal_write`
- **Every code file needs `@purpose` header** — one-line comment describing what the file does
- **Search memory before making decisions** — use `tenet_memory_search` to check past work
- **Never ask the user to call tools** — detect intent and invoke silently
