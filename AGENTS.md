# TENET Workspace — Multiplayer AI

## Runtime

You're in **Pi** (`@mariozechner/pi-coding-agent`), the tenet agent runtime. NOT Claude Code.
- Extensions: `packages/pi/extensions/*.ts` in `10et-ai/cli` → shipped via `npm publish @10et/cli`
- Skills: `tenet_skill_load("<name>")` from the shed (10et-ai/skills, bundled in @10et/cli)
- Kanban labels use `tenet/` prefix — managed by `tenet_kanban` tool
- Build agents: `tenet build --run <agent>` (single process, no delegator since v1.11.1)

Fix tenet CLI bugs in `10et-ai/cli`, NOT in workspace copies. Clone → fix → rebuild → publish.

## How You Work — The Loop

Every session follows this loop. The tools ARE the workflow — use them, don't improvise.

### 1. Start — understand the state

Call ALL of these at session start, in order:

```
tenet_capabilities()               → discover available tools + maturity levels
tenet_context()                    → journals, knowledge, code headers
tenet_hud()                        → dashboard: metrics, phase, pipeline
tenet_kanban({ command: "ls" })    → see the board: what's open, what's hot
tenet_memory_search("topic")       → what did we decide last time?
```

**Do this EVERY session start. No exceptions.**

`tenet_capabilities()` is critical — it tells you exactly which tools exist right now and which are stable vs experimental. Tools change between npm versions. Don't assume — discover. Call it first.

### 2. Pick work — from the board

```
tenet_skill_load("kanban")                → loads the full kanban workflow protocol
tenet_kanban({ command: "ls" })           → see the board
tenet_kanban({ command: "pick" })         → claim top backlog issue
tenet_skill_match("what you need to do")  → find the right skill for the task
tenet_skill_load("skill-name")            → the skill IS the orchestrator — follow it
```

**Match ceremony to task:**
- User says "fix this" → just fix it + journal. No kanban overhead.
- Multi-step or autonomous work → `tenet_skill_load("kanban")` then follow the skill.
- Don't gate-keep with process when the user is in flow.

**Auto-backlog rule — no asking:**
When the user describes a bug, broken thing, or feature idea in conversation → immediately file it:
```
tenet_kanban({ command: "add", args: '"<title>" --priority <0-100> --scope <service>' })
```
Then confirm inline: `Filed #N: <title>` — one line, no big block. Keep the conversation flowing.
- Bug described → file it, confirm, keep going
- Idea mentioned → file it, confirm, keep going
- Never ask "should I file this?" — just do it

**Service-aware kanban — target the right repo:**
Issues route to the right service repo via the `service` param. Check `.tenet/config.json` → `registered_services`:
```
tenet_kanban({ command: "add", args: '"Fix zombie spawns"', service: "tenet-cli" })
tenet_kanban({ command: "ls", service: "tenet-platform" })
```
When talking about CLI bugs → `service: "tenet-cli"`. Platform issues → `service: "tenet-platform"`. Template → `service: "tenet-template"`. Current repo (default) → omit `service`.

**Service status check:**
```
tenet_service({ service: "tenet-cli", command: "status" })   → git info, recent commits
tenet_service({ service: "tenet-cli", command: "recent" })   → 24h changes
```

### 3. Work — journal AS you go

After EVERY significant action, write a journal entry. Not at session end. NOW.

| Event | Tool call |
|-------|-----------|
| Feature completed | `tenet_journal_write({ type: "feature", title: "...", summary: "..." })` |
| Decision made | `tenet_journal_write({ type: "decision", title: "...", summary: "..." })` |
| Bug fixed | `tenet_journal_write({ type: "fix", title: "...", summary: "..." })` |
| Something learned | `tenet_journal_write({ type: "discovery", title: "...", summary: "..." })` |
| Milestone reached | `tenet_journal_write({ type: "milestone", title: "...", summary: "..." })` |

**Target: 8-16 journal entries per session.** If you've done 3 significant things and written 0 entries, stop and write them NOW.

### 4. Remember — capture insights and search before deciding

```
tenet_memory_search("zombies spawning")      → find prior art before deciding
tenet_memory_add({ title: "...", content: "...", type: "insight" })  → persist what you learned
tenet_memory_add({ title: "...", content: "...", type: "teacup" })   → the concrete moment before an aha
tenet_remember({ summary: "user prefers X" }) → cross-workspace preference
```

**Teacup moments**: when you understand WHY something works (or doesn't), capture the specific concrete thing you were looking at — the file, the line, the exact detail. NOT the conclusion. The door back to the insight.

### 5. Kanban — load the skill, use the tool

```
tenet_skill_load("kanban")   → loads full workflow (when to use ceremony, labels, loop)
tenet_kanban({ command: "ls" })                                         → show board
tenet_kanban({ command: "add", args: '"title" --priority 80 --scope X' }) → create issue
tenet_kanban({ command: "pick" })                                       → claim top issue
tenet_kanban({ command: "move", args: "123 in_progress" })              → transition
tenet_kanban({ command: "done", args: "123" })                          → complete
tenet_kanban({ command: "bootstrap" })                                  → create labels
```

Present the board naturally. Don't dump raw JSON or `gh issue` walls.

### 6. Checkpoint — don't lose work

```
tenet_pivot({ summary: "what I was working on" })  → commit + journal + index memory
```

Do this every ~30 turns or when switching topics. Prevents context loss on compaction.

## Epistemic Honesty

When you hit unknowns that block progress, **say so**:
- `epistemic-boundary` label on issues you can't fully scope
- `needs-context` when you need human input to proceed
- Don't guess and ship. Ask.

When you're uncertain about a decision, search memory first: `tenet_memory_search("topic")`. If no prior art, state your reasoning and confidence level.

## Workspace Topology

Workspaces separate **governance** (tenets) from **code** (services). Check `.tenet/config.json` → `type`:

| Type | Suffix | Contains | Example |
|------|--------|----------|---------|
| **Tenet** (governance) | `-gtm` | specs, policies, knowledge, roadmaps | `visa-cyber-gtm` |
| **Service** (code) | bare name | `src/`, tests, CI, Dockerfile | `10et-ai/cli` |
| **Portfolio** (aggregator) | varies | registers children in `scopes[]` | `visa-crypto-labs` |

**Rule**: Don't edit source files from a governance workspace. Clone the service repo, fix there, publish. The governance workspace journals the decision and links to the service PR.

## Key Files

| File | What |
|------|------|
| `AGENTS.md` | **This file — canonical runtime protocol** |
| `knowledge/VISION.md` | What this workspace is building and why |
| `.tenet/journal/` | Session journals (JSONL, one per session) |
| `.tenet/config.json` | Workspace type, parent, scopes, trust policy |
| `.tenet/kanban/` | Kanban state (managed by `tenet_kanban`) |

## All Tools Reference

Use these silently — they're plumbing. Present results in natural language.

### Core workflow (use every session)
| Tool | When |
|------|------|
| `tenet_context` | Session start — get project state |
| `tenet_hud` | Dashboard — metrics, phase, pipeline |
| `tenet_kanban` | Board — ls, add, pick, move, done, bootstrap |
| `tenet_journal_write` | After EVERY significant action |
| `tenet_memory_search` | Before ANY decision |
| `tenet_memory_add` | After learning something (use `teacup` for aha moments) |
| `tenet_pivot` | Every ~30 turns or topic switch |

### Skills
| Tool | When |
|------|------|
| `tenet_skill_match` | Start of any task — find the right skill |
| `tenet_skill_load` | Load it — the skill IS the orchestrator |
| `tenet_skills_list` | Browse available skills (42+ in shed) |

### Eval & RL
| Tool | When |
|------|------|
| `tenet_eval_status` | Check quality scores and trends |
| `tenet_eval_compare` | Diff two eval snapshots |
| `tenet_policy_score` | Score a candidate action via RL policy head |
| `tenet_policy_rank` | Rank multiple candidate actions |
| `tenet_training_buffer` | Record outcome after completing a task |

### CRM & Services
| Tool | When |
|------|------|
| `tenet_crm` | Query/update CRM pipeline (Google Sheets) |
| `tenet_service` | Query onboarded service repos (status, logs, health) |

### Memory & context
| Tool | When |
|------|------|
| `tenet_memory_status` | Memory index health |
| `tenet_remember` | Save cross-workspace preference/learning |
| `tenet_experiment_history` | Search past experiments before repeating |
| `tenet_context_status` | Context Hub health |
| `tenet_context_sessions` | See other active sessions |
| `tenet_capabilities` | Query feature maturity (stable/beta/experimental) |
| `tenet_synopsis` | Summarize recent work across sessions |

### Paid transactions (Visa CLI, Touch ID required)
| Tool | When |
|------|------|
| `visa_transact_status` | Check enrollment + daily spend (free) |
| `visa_transact_image` | Generate AI image (~$0.04-0.06) |
| `visa_transact_music` | Generate music track (~$0.10) |
| `visa_transact_price` | Real-time token price (~$0.02) |
| `visa_transact_run` | Multi-step paid transaction cart |

### Subway P2P mesh (agent ↔ agent)
| Tool | When |
|------|------|
| `subway_send` / `subway_call` | Direct message / RPC to another agent |
| `subway_resolve` / `subway_inbox` | Check agent online / read messages |
| `subway_subscribe` / `subway_broadcast` | Pub/sub topics |
| `subway_rpc_respond` | Reply to inbound RPC (use `correlation_id`) |

### Events (MAP bus)
| Tool | When |
|------|------|
| `tenet_events_publish` | Signal state change or completion |
| `tenet_events_recent` | Inspect recent bus events |

## Build Agent Flow

```
spec (what to build) → eval (binary checks) → TOML (agent config) → tenet build --run
  → single process, single log, killable
  → converges in 1-3 rounds with decomposed evals
  → writes build-journal.jsonl, results.tsv, git commits with Agent-Id trailer
```

Freeze the spec before launching: `git add specs/ eval/ .tenet/agents/ && git commit -m "spec freeze"`

## Browser (Agent Eyes)

If `browser.relay` is on the Subway mesh:
```
subway_call("browser.relay", "navigate", '{"url":"https://..."}')
subway_call("browser.relay", "read", '{}')
subway_call("browser.relay", "click", '{"selector":"#btn"}')
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `tenet_memory_search` empty | `tenet context-hub start` |
| Skills look stale | `npm update -g @10et/cli` + `tenet doctor` |
| Build agent converges but no PR | `tenet doctor-reap` for orphans |
| Orphan pi processes | `tenet doctor-reap --force` |
| Session has 0 journal entries | **Stop. Write one NOW.** |
| Kanban labels missing | `tenet_kanban({ command: "bootstrap" })` |

## Rules (non-negotiable)

1. **Journal every significant action** — 8-16 entries/session minimum
2. **Use `tenet_kanban`** for issues — never raw `gh issue create`
3. **Search memory before deciding** — `tenet_memory_search`
4. **Load skills before improvising** — `tenet_skill_match` → `tenet_skill_load`
5. **Every code file needs `@purpose` header**
6. **Checkpoint with `tenet_pivot`** every ~30 turns
7. **Tools are silent plumbing** — present results conversationally, not raw output
8. **Epistemic honesty** — say when you don't know, use `epistemic-boundary`
9. **Match ceremony to task** — quick fix = just do it; multi-step = kanban flow
