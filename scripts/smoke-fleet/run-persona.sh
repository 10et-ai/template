#!/usr/bin/env bash
# run-persona.sh — spawn a sibling claude --print session for a smoke-fleet persona,
# capture stream-json, score via the matching eval, journal the result.
#
# Usage:
#   bash scripts/smoke-fleet/run-persona.sh <product> <persona> [<workspace>]
#
# Example:
#   bash scripts/smoke-fleet/run-persona.sh visa-cli tool-prober /tmp/visa-cli-scratch

set +e

PRODUCT="${1:?product required (e.g. visa-cli)}"
PERSONA="${2:?persona required (e.g. tool-prober)}"
WORKSPACE="${3:-$(pwd)}"
MODEL="${MODEL:-claude-haiku-4-5-20251001}"
TIMEOUT="${TIMEOUT:-120}"

# SOUL/eval files live with the runner script, NOT with the workspace under test.
# Derive from script's own location so cross-workspace runs work.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOUL="$REPO_ROOT/agents/smoke-fleet/$PRODUCT/$PERSONA.md"
EVAL="$REPO_ROOT/eval/smoke-fleet/$PRODUCT/$PERSONA.ts"
RUN_ID="$(date +%s)-$$"
TRANSCRIPT="/tmp/fleet-$PRODUCT-$PERSONA-$RUN_ID.jsonl"
REPORT="/tmp/fleet-$PRODUCT-$PERSONA-$RUN_ID.report.json"

echo "====================================================="
echo " SMOKE FLEET RUNNER"
echo "   product:   $PRODUCT"
echo "   persona:   $PERSONA"
echo "   workspace: $WORKSPACE"
echo "   model:     $MODEL"
echo "   run:       $RUN_ID"
echo "====================================================="

for p in "$SOUL" "$EVAL"; do
  if [ ! -f "$p" ]; then echo "MISSING: $p"; exit 2; fi
done
if ! command -v claude >/dev/null 2>&1; then echo "claude CLI not installed"; exit 2; fi
if ! command -v npx >/dev/null 2>&1; then echo "npx required"; exit 2; fi

TASK=$(cat <<EOF
You are the "$PERSONA" persona in the smoke-fleet for $PRODUCT. Read your SOUL file for role, mission, and rules; then execute your operating loop.

SOUL: $SOUL

Start by reading the SOUL file. Follow it exactly. Report findings at the end and call mcp__tenet-context__journal_write with type=discovery summarizing the run.
EOF
)

echo "--- spawning sibling claude session (timeout ${TIMEOUT}s) ---"
# Per peter.ts pattern: unset CLAUDECODE so spawned claude doesn't detect nesting.
# Auth: uses local OAuth (no ANTHROPIC_API_KEY required). Set the key only if you
# want API-mode for speed (no subprocess spawn). For first-N tests, OAuth is fine.
unset CLAUDECODE CLAUDE_CODE
cd "$WORKSPACE" && timeout "$TIMEOUT" claude \
  --print "$TASK" \
  --output-format stream-json \
  --include-hook-events \
  --permission-mode bypassPermissions \
  --model "$MODEL" \
  --add-dir "$REPO_ROOT" \
  --verbose \
  > "$TRANSCRIPT" 2>/tmp/fleet-err-$RUN_ID.log

RC_SPAWN=$?
SIZE=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)
echo "spawn exit: $RC_SPAWN ; transcript: $TRANSCRIPT ($SIZE bytes)"

echo "--- scoring with eval: $EVAL ---"
npx tsx "$EVAL" "$TRANSCRIPT" > "$REPORT" 2>/tmp/fleet-eval-err-$RUN_ID.log
RC_EVAL=$?

echo "--- report ---"
cat "$REPORT"
echo
echo "eval exit: $RC_EVAL"
echo "eval stderr:"; cat /tmp/fleet-eval-err-$RUN_ID.log

if [ $RC_EVAL -eq 0 ]; then
  echo "PASS: persona $PERSONA passed threshold"
else
  echo "FAIL: persona $PERSONA below threshold"
fi

# Append to .tenet/eval.jsonl (canonical eval stream — joins build-agent results)
SCORE=$(jq -r '.score // 0' "$REPORT" 2>/dev/null)
FINDINGS=$(jq -r '.findings | length // 0' "$REPORT" 2>/dev/null || echo 0)
EVAL_DIR="$REPO_ROOT/.tenet"
mkdir -p "$EVAL_DIR"
jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg agent "smoke-fleet/$PERSONA" \
  --arg runid "fleet-$PRODUCT-$PERSONA-$RUN_ID" \
  --arg persona "$PERSONA" \
  --arg product "$PRODUCT" \
  --arg transcript "$TRANSCRIPT" \
  --argjson score "$SCORE" \
  --argjson findings "$FINDINGS" \
  '{v:1, ts:$ts, agent:$agent, run_id:$runid, metrics:{composite:$score, findings_count:$findings}, composite:$score, persona:$persona, product:$product, transcript:$transcript}' \
  >> "$EVAL_DIR/eval.jsonl"

# Emit to MAP event bus (best-effort; no-op if hub down)
PORT=$(jq -r '.contextHub.port // empty' .tenet/config.json 2>/dev/null || echo 4345)
if [ -n "$PORT" ]; then
  curl -s -X POST "http://localhost:$PORT/api/events" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg p "$PERSONA" --arg prod "$PRODUCT" --slurpfile r "$REPORT" \
      '{type:("fleet:" + $p + ":result"), source:"smoke-fleet", data:{product:$prod, persona:$p, report:$r[0]}}')" \
    --connect-timeout 2 >/dev/null 2>&1
fi

exit $RC_EVAL
