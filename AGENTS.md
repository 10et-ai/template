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

When fixing tenet CLI bugs, the source lives in the **`10et-ai/cli`** repo at `packages/pi/extensions/*.ts`. Clone that repo anywhere on disk (e.g. `git clone git@github.com:10et-ai/cli.git`), fix there, rebuild with `cd packages/pi && npm run build`, then `npm publish` from the repo root. **Never edit a per-workspace copy** — those are consumers of `@10et/cli`, not the source.

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

## Workspace Topology — governance vs service vs portfolio

TENET workspaces separate **governance** (tenets) from **code** (services). Every workspace is one of three types, declared in `.tenet/config.json`:

| Type | Suffix | Contains | Example |
|------|--------|----------|---------|
| **Tenet** (governance) | `-gtm` | specs, policies, knowledge, reviews, roadmaps, journals | `visa-cyber-gtm`, `tenet-gtm` |
| **Service** (code) | bare name | `package.json`, `src/`, tests, CI, Dockerfile | `visa-cyber`, `10et-ai/cli`, `10et-ai/platform` |
| **Portfolio** (aggregator) | varies | registers children in `scopes[]`, no code of its own | `visa-crypto-labs`, `10et` |

**Rules this implies:**
1. When you're in a `-gtm` workspace, the **code for that product lives in a sibling repo**. Don't edit source files from a governance workspace — clone the service repo separately and work there. The governance workspace journals the decision and links to the service PR.
2. When you're in a service workspace, read the parent tenet's `knowledge/` docs for product context. The service repo should not carry its own vision/strategy — that lives upstream in the `-gtm` tenet.
3. A portfolio workspace has no code or `src/`. It exists to roll up metrics, route dispatches, and federate trust across its children listed in `scopes`.
4. **The `@10et/cli` source is a service repo** (`10et-ai/cli`). Bugs in Pi extensions, CLI commands, or bundled skills are fixed THERE and shipped via `npm publish`. Workspaces consume the published package; they never patch it in place.

Look at `.tenet/config.json` → `type` + `parent_slug` + `scopes` to confirm which role the current workspace plays before deciding where changes go.

## Key Files

| File | What |
|------|------|
| `AGENTS.md` | **This file — canonical runtime protocol** |
| `CLAUDE.md` | Claude Code wrapper (points here) |
| `knowledge/VISION.md` | What this workspace is building and why |
| `knowledge/ARCHITECTURE.md` | System design (if code workspace) |
| `knowledge/TOPOLOGY.md` | Service/dependency graph (if complex system) |
| `.tenet/journal/` | Session journals (JSONL, one per session) |
| `.tenet/config.json` | `type`, `parent_slug`, `owner`, `scopes`, `trust_policy` |
| `.tenet/recipes/` | Runnable sequential pipelines (build-cycle, ai-redteam, etc.) |
| `specs/` | Product specs, agent specs, RFCs |

## Available Tools

All tools are Pi extensions registered by `@10et/cli` — available in every tenet workspace. Do not ask the user which to call; detect intent and invoke silently.

### Context & project state
- **tenet_context** — unified context: journals, knowledge, code headers (call at session start)
- **tenet_hud** — full project dashboard (metrics, phase, pipeline, next action)
- **tenet_context_status** — Context Hub health (semantic index, memory, sources)
- **tenet_context_sessions** — see what other sessions/agents are working on
- **tenet_capabilities** — query stable/beta/experimental features
- **tenet_synopsis** — summarize recent work across sessions

### Journal — MANDATORY after every significant action
- **tenet_journal_write** — structured entry: feature | decision | fix | discovery | milestone
- **tenet_pivot** — checkpoint mid-session (commit + handoff entry, stays on branch)

### Memory — search before deciding, capture after learning
- **tenet_memory_search** — find past decisions, features, learnings
- **tenet_memory_add** — persist insights (use type `teacup` for the concrete moment before an aha)
- **tenet_memory_status** — memory index health
- **tenet_remember** — save a cross-workspace preference/learning about how the user works
- **tenet_experiment_history** — search past experiments and their outcomes

### Skills — load before improvising
- **tenet_skill_match** — match a task description to relevant skills + recipes
- **tenet_skill_load** — pull a skill into the current session (the skill IS the orchestrator)
- **tenet_skills_list** — browse available skills (42+ in the shed)
- **tenet_skills_status** — usage stats, success rate, learnings count per skill
- **tenet_skills_depth** — how deeply a skill is being used (sections, checklists, anti-patterns)
- **tenet_preset_create** — package the current workspace into a reusable template

### Kanban & CRM
- **tenet_crm** — query/update CRM pipeline (contacts, deals) via Google Sheets
- Kanban is `gh` CLI against issue labels: `tenet/backlog`, `tenet/in-progress`, `tenet/done`

### Eval, RL & training
- **tenet_eval_status** — latest eval scores and trends
- **tenet_eval_compare** — diff two eval snapshots
- **tenet_policy_score** — score one candidate action via the RL policy head
- **tenet_policy_rank** — rank multiple candidate actions by predicted reward
- **tenet_training_buffer** — record a (state, action, reward) tuple for policy training
- **tenet_mine_tuples** — extract training tuples from journals/flows/sessions/evals

### Events (MAP bus)
- **tenet_events_publish** — fire an event (`task:completed`, `eval:scored`, custom)
- **tenet_events_recent** — inspect recent bus events (filter by type prefix)

### Services — onboarding repos + querying them

Service repos are registered in a workspace via `tenet onboard <path-or-git-url>`. This creates a skill file at `.claude/skills/<service-name>/SKILL.md` with `type: service` frontmatter including the `service_path` (local clone path). Pi reads that directory at session start and dynamically registers `tenet_service` with the correct `service` enum for THIS workspace.

- **tenet_service** — query any registered service: `status` (git branch + last commit), `logs` (recent commits), `recent` (24h changes), `health` (package.json info), `start`/`stop`/`restart`. The available `service` values are whatever has been onboarded in THIS workspace — run `ls .claude/skills/` to see them, or call `tenet_service` and the schema will list them.
- **How to find a service's code**: check `.claude/skills/<name>/SKILL.md` → `service_path` field — that's the absolute path to the cloned repo on disk.
- **How to onboard a new service**: `tenet onboard git@github.com:10et-ai/<repo>.git` or `tenet onboard ../relative/path`. Creates the skill, clones if needed, adds to `.tenet/config.json` scopes.
- **To run a build agent**: `tenet build --run <agent-name>` via Bash (no dedicated Pi tool — the delegator was removed in v1.11.1).

### Paid transactions (Visa CLI → fal.ai / Suno / Allium, Touch ID required)
- **tenet_transact_status** — enrollment + daily spend (free, no Touch ID)
- **tenet_transact_image** — fal.ai image (~$0.04–0.06)
- **tenet_transact_music** — Suno track (~$0.10)
- **tenet_transact_price** — real-time token price via Allium (~$0.02)
- **tenet_transact_run** — auto-decompose a prompt into a cart, execute atomically

### Subway P2P mesh (agent ↔ agent)
- **subway_resolve** / **subway_send** / **subway_call** / **subway_inbox** — direct messaging + RPC
- **subway_subscribe** / **subway_unsubscribe** / **subway_broadcast** — pub/sub topics
- **subway_rpc_respond** — reply to an inbound RPC call (use the `correlation_id` from the call)

### Pi built-ins (always available)
- **Read** / **Write** / **Edit** — files (prefer Edit for surgical changes)
- **Bash** — shell commands (use for `ls`, `grep`, `find`, `gh`, `git`, `npm`)

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
