# TENET Workspace — Claude Code Instructions

You are operating inside a TENET workspace. **First read `AGENTS.md`** in this directory for the full protocol (Pi runtime, journaling, skills, kanban, memory, build agents). This file is the Claude Code wrapper; `AGENTS.md` is the canonical source.

## Quick Reference

**Start of every session:**
1. `tenet_context` → get project state, recent journals, team activity
2. `tenet_memory_search` → find past decisions before making new ones
3. Read `AGENTS.md` → load the runtime protocol
4. `tenet hud` (bash) or `tenet_hud` (tool) → show current dashboard

**As you work:**
- `tenet_journal_write` after every significant action — type: `feature | decision | fix | discovery | milestone`
- `tenet_memory_add` for insights (use type `teacup` for the concrete moment before an aha)
- `tenet_skill_load("<name>")` before doing manual work — the skill is the orchestrator
- `tenet_pivot` every 30 turns or when switching topics

**Skills available** (load with `tenet_skill_load`):
`build-agent`, `kanban`, `spec`, `startup`, `spawn-salon`, `debug`, `ci-setup`, `fly-deploy`, `brand-architect`, `content-creator`, `hud`, `search`, `visa-cli-transact`, `voice-ingest`, and more. Run `tenet_skills_list` to browse all 42+ in the shed.

**Build agents** (the TOML+spec+eval pattern):
```bash
# Single process, converges in 1-3 rounds with decomposed evals
tenet build --run <agent-name>
# or from pi: delegate(build_agent: "<name>", from_issue: N)
```
No delegator, no parallel router, no orphans (as of 1.11.1). Parallel dispatch is explicit bash with setsid.

## Rules

1. **Journal every significant action** — target 8-16 entries/session minimum
2. **Load skills before improvising** — `tenet_skill_load` or `tenet_skill_match`
3. **Search memory before deciding** — `tenet_memory_search`
4. **Work off the kanban board** — `tenet_skill_load("kanban")`, pick issue, journal, close
5. **Every code file gets `@purpose` header** — the PostToolUse hook warns if missing
6. **Checkpoint with `tenet_pivot`** every 30 turns

## Troubleshooting

- `tenet_memory_search` returns empty → Context Hub not running: `tenet context-hub start`
- Skills look stale → `npm update -g @10et/cli` + `tenet doctor` to verify freshness
- Build agent converged but no PR → `tenet doctor-reap` to check for orphans
- Session has no journal entries → you're violating rule #1; write one NOW

## What lives where

| File | What |
|------|------|
| `AGENTS.md` | **Canonical runtime protocol — read first** |
| `knowledge/VISION.md` | What this workspace is building |
| `.tenet/config.json` | Project config — parent_slug, owner, scopes, trust_policy |
| `.tenet/journal/` | Session journals (JSONL, one per session) |
| `.tenet/recipes/` | Runnable sequential pipelines (build-cycle, ai-redteam) |
| `specs/` | Product specs, agent specs, RFCs |

## Architecture note

TENET workspaces separate **governance** (tenets) from **code** (services):
- **Tenet** (`-gtm` suffix): governance, specs, policies, knowledge, reviews
- **Service** (bare name): actual code, package.json, src/, tests
- **Portfolio** (`type: portfolio`): registers child services + tenets in `.tenet/config.json`

Example: `visa-cyber-gtm` is the governance tenet (Nishant owns it, has architecture specs), `visa-cyber` is the service (empty scaffold for future code), both are children of `visa-crypto-labs` portfolio.

Do not ask the user about tool names. Detect intent, invoke silently, follow AGENTS.md.
