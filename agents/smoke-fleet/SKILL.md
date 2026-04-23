---
name: product-smoke-fleet
description: "Run a fleet of agent personas against a product. Catches MCP injection, orphan tools, skill-shed bugs, SSF regressions, etc. Auto-files findings to right repo. Use when: you want to verify a product is healthy end-to-end via live agent behavior, not just unit tests."
disable-model-invocation: false
triggers:
  - smoke fleet
  - smoke test
  - test the product
  - verify product
  - run fleet
  - fleet run
  - product audit
  - check for regressions
  - /fleet
---

# Product Smoke Fleet

Run a fleet of agent personas against a product. Each persona is a SOUL.md
defining role + safety + operating loop. Each runs in a sibling `claude --print`
session, captures stream-json, scores via decomposed eval. Findings auto-route to
the right repo (jfl-gtm or external).

**Origin:** built session 2026-04-22 from SSF-001-006 + smoke-fleet design (.tenet/SMOKE_FLEET_DESIGN.md).
First 7 live runs found 11 real bugs across jfl-gtm + visa-cli for $0.85 total spend.

---

## On Skill Invoke

### Step 1 — Identify the product

Pick a product:
- `_workspace` = the workspace itself (jfl-gtm flows: SSF-001/004 verification, prompt-injection audit)
- `visa-cli` = the visa-cli MCP server + skill loader
- (Add more by creating `agents/smoke-fleet/<product>/<persona>.md` + matching eval)

### Step 2 — Pick the right command

| Want | Run |
|---|---|
| Default fleet for current workspace | `bash scripts/smoke-fleet/run-fleet.sh` |
| Single persona | `bash scripts/smoke-fleet/run-persona.sh <product> <persona> [workspace]` |
| Specific personas in parallel | `bash scripts/smoke-fleet/run-fleet.sh <workspace> persona1 persona2 ...` |
| Cross-product (against another workspace) | `bash scripts/smoke-fleet/run-persona.sh <product> <persona> /path/to/scratch` |

Recipe spec: `.tenet/recipes/product-smoke-fleet.yaml` (the canonical orchestrator definition).

### Step 3 — Before live runs (especially cross-product)

If the workspace under test has paid MCP tools (visa-cli, etc.), check the SOUL's NEVER-INVOKE blacklist:
```bash
grep -A30 "NEVER INVOKE" agents/smoke-fleet/<product>/<persona>.md
```

If the persona doesn't have a blacklist matching the product's paid surface area, **add it before running** — Run #5 paid $0.04 unintentionally because eval missed `fal-*` patterns.

### Step 4 — Run + observe

Live runs cost ~$0.10 per persona (Haiku) plus any real product paid calls (which the SOUL should prevent). Output:
- Stream-json transcript: `/tmp/fleet-<product>-<persona>-<run>.jsonl` (durable)
- Report: `/tmp/fleet-<product>-<persona>-<run>.report.json` (composite, findings, paid_unsafe)
- Eval entry: appended to `.tenet/eval.jsonl` (joins build-agent stream)
- Map event: `fleet:<persona>:result` (best-effort if hub up)

### Step 5 — Route findings

The recipe's `route-findings` step must do this. Manual workaround until automated:
- For tenet-cli scope: `mcp__tenet-context__kanban_add` with explicit `scope: tenet-cli`
- For external repos: `gh issue create` + manual labels (`bug`, `tenet/backlog`, `scope:<x>`, `source:agent`, `priority:high`)
- See persona's SOUL "Routing Table" (each persona must have one)

### Step 6 — Update DEPENDENCY_GRAPH.md

After every run, update `.tenet/DEPENDENCY_GRAPH.md`:
- Mark personas that now have coverage
- Add new gaps surfaced
- Cross-link issues filed

---

## How to add a new persona

1. **Choose an invariant** the product should hold (e.g. "API returns 200 within 1s")
2. **Write SOUL.md** at `agents/smoke-fleet/<product>/<persona>.md`:
   - Mission (1 paragraph)
   - What Must Be Protected (safety rules, blacklists)
   - Decision Principles (ranked)
   - Failure Modes To Avoid
   - Routing Table (which repo to file findings on)
   - Operating Loop (numbered steps)
   - Expected Stream-JSON Contract (what eval will check)
3. **Write eval.ts** at `eval/smoke-fleet/<product>/<persona>.ts`:
   - Parse stream-json (use the existing personas as templates)
   - Decomposed binary checks
   - CRITICAL FAIL gate for safety violations (sets score=0)
   - Output: `{persona, product, score, threshold, failed_checks, checks, report}`
4. **Test against a mock transcript** first (cheap):
   ```bash
   cat > /tmp/mock.jsonl <<EOF
   ...minimal stream-json with expected events...
   EOF
   npx tsx eval/smoke-fleet/<product>/<persona>.ts /tmp/mock.jsonl
   ```
5. **Live run** with `bash scripts/smoke-fleet/run-persona.sh <product> <persona>`
6. **Append findings** to `.tenet/SMOKE_FLEET_RESULTS.md`

---

## SOUL pattern (template)

Every SOUL must include these sections:

```markdown
# SOUL — <Persona> (<product>)

## Core Mission
One paragraph: why this persona exists.

## Why This Role Exists
What breaks without it. What makes it un-test-able by unit tests.

## What Must Be Protected
- Safety rules
- NEVER-INVOKE blacklist (especially for paid-tool products)
- "PROJECT-LOCAL ONLY" if reading config files
- Hard budget cap (transaction_history before+after)

## Decision Principles (ranked)
1-N rules ordered by priority

## Failure Modes To Avoid
Bullet list of "do not do these things"

## Routing Table (REQUIRED)
| Endpoint / source | Owner | File on |
|---|---|---|
| <pattern> | <team> | <repo> |

## Escalation Philosophy
When findings warrant human attention.

## Operating Loop
Numbered steps the agent follows.

## Expected Stream-JSON Contract
What the eval will check for.
```

---

## Common pitfalls (from real runs)

| Pitfall | Mitigation |
|---|---|
| **Eval misses paid tool patterns** (Run #5 cost $0.04) | Mirror SOUL's NEVER-INVOKE list as eval regex array. Audit eval blacklist matches SOUL blacklist. |
| **Persona reads user-global config instead of project-local** (Run #3 false positive) | SOUL must say "PROJECT-LOCAL ONLY — `./.claude/settings.json`, NEVER `~/.claude/...`" |
| **Findings filed to wrong repo** (#136 misroute) | Persona must classify `bug_owner:` before filing. Routing table in SOUL. |
| **Banner-vs-SOUL tension** (Run #2) | Add Step 0 to every SOUL: "Satisfy SSF-001 banner imperative (call context_get) before role-specific work." |
| **MCP server prompt-injection appears in agent output** (every run) | PromptInjectionAuditor persona catches; cross-post finding to product team. |
| **Sibling spawns clobber `current-session-branch.txt`** (#2974) | Known issue; runs work anyway. Don't rely on session-branch file across spawns. |
| **`tenet_kanban_add` scope=jfl-gtm only** | Until cross-repo fix lands, use `gh issue create` with discovered labels for external repos. |

---

## Examples

**Verify all SSF (startup, compaction, prompt-injection) hold in this workspace:**
```bash
bash scripts/smoke-fleet/run-fleet.sh
# → 3 personas in parallel, ~$0.30, ~80s wall-clock
```

**Check visa-cli for orphan tools + skill-shed bugs:**
```bash
SCRATCH=/tmp/visa-fleet-$(date +%s)
mkdir -p "$SCRATCH/.tenet/logs" "$SCRATCH/.claude"
echo '{"mcpServers":{"visa-cli":{"command":"node","args":["/path/to/visa-mono/packages/cli/dist/mcp-server/index.js"]}}}' > "$SCRATCH/.mcp.json"
echo '{"contextHub":{"port":4345}}' > "$SCRATCH/.tenet/config.json"
echo "scratch-test" > "$SCRATCH/.tenet/current-session-branch.txt"
echo '{"hooks":{}}' > "$SCRATCH/.claude/settings.json"

bash scripts/smoke-fleet/run-persona.sh visa-cli tool-prober "$SCRATCH"
bash scripts/smoke-fleet/run-persona.sh visa-cli skill-loader "$SCRATCH"
```

**Add a new persona for a specific invariant:**
```bash
cp agents/smoke-fleet/_workspace/startup-smoker.md agents/smoke-fleet/myproduct/myinvariant.md
cp eval/smoke-fleet/_workspace/startup-smoker.ts eval/smoke-fleet/myproduct/myinvariant.ts
# Edit both. Test against mock. Then live run.
```

---

## See also

- `.tenet/SMOKE_FLEET_DESIGN.md` — full architecture
- `.tenet/SMOKE_FLEET_RESULTS.md` — run log
- `.tenet/recipes/product-smoke-fleet.yaml` — declarative recipe spec
- `scripts/smoke-fleet/run-fleet.sh` + `scripts/smoke-fleet/run-persona.sh` — runners
- `.tenet/DEPENDENCY_GRAPH.md` — what's covered, what's gap, what's queued
