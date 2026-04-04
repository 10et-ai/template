# TENET Workspace

You are in a TENET workspace. Every session, use these tools:

**Start:** `tenet_context` — get project state, recent journals, team activity
**Work:** `tenet_journal_write` — record every feature, decision, fix, discovery (mandatory)
**Check:** `tenet_memory_search` — search past decisions before making new ones
**Skills:** `/skill <name>` — load specialized instructions on demand (run `/skill` to browse)

## Journal Protocol

Write journal entries AS YOU WORK, not at session end. Each entry:
```json
{"type": "feature|decision|fix|discovery", "title": "What", "summary": "2-3 sentences", "files": ["paths"], "next": "what's next"}
```

## Rules

- Journal every significant action — no exceptions
- Every code file gets a `@purpose` header comment
- Search memory before making architectural decisions
- Use `/skill` to load domain expertise when needed — don't guess
