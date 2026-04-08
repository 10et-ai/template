# TENET — Session Protocol (Pi)

> You are running inside **Pi** (`@mariozechner/pi-coding-agent`).
> Tools are pre-registered. Call them. Don't narrate. Don't plan out loud then do nothing.
> Image paths sent by user → `read` tool immediately. Never say "can't read images".

---

## Session Start Checklist (do these silently on first turn)

```
tenet_context()                          # project state, journals, knowledge
tenet_capabilities()                     # discover what tools exist + maturity
tenet_memory_search("session start")     # what was left from last session
```

Then show the board:
```
bash: tenet kanban ls                    # open issues by priority
```

---

## Tools — Use These, Not Bash

### Context & Memory
| Call | When |
|------|------|
| `tenet_context()` | Session start + after compaction |
| `tenet_capabilities()` | Unsure if a feature/tool exists |
| `tenet_memory_search("topic")` | BEFORE any decision or implementation |
| `tenet_memory_add({ type: "teacup", ... })` | When you understand WHY — write the concrete thing you saw, not the conclusion |
| `tenet_hud()` | Project dashboard — timeline, phase, pipeline |

### Skills
```
tenet_skill_match("what you want to do")   # ALWAYS before doing work manually
tenet_skill_load("skill-name")             # load it — the skill IS the orchestrator
```
Key skills: `kanban`, `build-agent`, `spec`, `eval`, `debug`, `observe-ci`, `spawn-salon`, `ci-setup`

### Journal — MANDATORY
Write AFTER every significant action. Target 8-16 entries/session.
```
tenet_journal_write({ type: "fix",       title: "...", summary: "..." })
tenet_journal_write({ type: "feature",   title: "...", summary: "..." })
tenet_journal_write({ type: "decision",  title: "...", summary: "..." })
tenet_journal_write({ type: "discovery", title: "...", summary: "..." })
```
If you haven't journaled in 10 turns, you're behind.

### Kanban
Load the skill first: `tenet_skill_load("kanban")`

The kanban skill tells you exactly how to use issues. Short version:
```bash
# See board
tenet kanban ls

# File issue (targets the right service repo automatically)  
tenet kanban add "title" --priority P0 --area infra --service tenet-cli

# Claim + work
tenet kanban pick N

# Close
tenet kanban done N    # creates PR with Closes #N
```

**Never use raw `gh issue create` — use `tenet kanban add` so service routing works.**

### Services — Always Target the Right Repo
```
tenet_service({ service: "tenet-cli",      command: "status" })  # 10et-ai/cli
tenet_service({ service: "tenet-platform", command: "status" })  # 10et-ai/platform  
tenet_service({ service: "tenet-template", command: "status" })  # 10et-ai/template
```
When filing issues or PRs: check which service owns the code, target that repo.
Services are defined in `.tenet/config.json` → `registered_services`.

### Transactions (Touch ID required)
```
visa_transact_image({ prompt: "..." })    # generate image ~$0.04-0.06
visa_transact_music({ prompt: "..." })    # generate music ~$0.10
visa_transact_status()                    # check spend + enrollment
```
Never use `tenet_transact_*` — renamed to `visa_transact_*`.

### Build Agents (complex multi-file work)
```
tenet_skill_load("build-agent")
# skill handles: issue → spec → eval → TOML → baseline → dispatch → converge → PR
```

---

## Behavioral Rules

1. **Search memory before deciding** — `tenet_memory_search("topic")`
2. **Load skill before doing manually** — `tenet_skill_match` → `tenet_skill_load`
3. **Journal after every significant action** — not at end of session, AS YOU GO
4. **Teacup the moment of insight** — write WHAT YOU WERE LOOKING AT, not the conclusion
5. **Target services, not hardcoded paths** — code goes to the right repo via service model
6. **Checkpoint every 30 turns** — `tenet_pivot()`
7. **Read images immediately** — `read({ path: "/path/to/image.jpg" })` when user shares path

---

## Git
- Sessions stay on `main` — build agents create feature branches
- Commit format: `fix: description (Closes #N)`
- Auto-commit every 5 min covers `.tenet/`, `knowledge/`, `.pi/`, `AGENTS.md`

---

## Claude Code Users
If you are running in Claude Code (not Pi), this file still applies except:
- Tools like `tenet_journal_write`, `tenet_memory_search` etc. are MCP tools
- Run `tenet mcp` to see registered MCP tools
- `tenet kanban` CLI works the same
- Build agents: `tenet build --run <name>` from terminal
- See `.claude/skills/` for skill files (equivalent to Pi skill shed)
