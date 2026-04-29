#!/usr/bin/env bash
# run-fleet.sh — run a fleet of smoke-fleet personas in parallel against a workspace.
# Aggregates per-persona scores into a composite + writes a summary table.
#
# Usage:
#   bash scripts/smoke-fleet/run-fleet.sh [workspace] [persona1 persona2 ...]
#
# Defaults:
#   workspace = $(pwd)
#   personas  = the four _workspace personas:
#               prompt-injection-auditor, startup-smoker, compaction-smoker
#               (skill-loader and tool-prober are visa-cli-scoped — different invocation)

set +e

WORKSPACE="${1:-$(pwd)}"
shift 2>/dev/null
PERSONAS=("$@")
if [ ${#PERSONAS[@]} -eq 0 ]; then
  PERSONAS=(prompt-injection-auditor startup-smoker compaction-smoker)
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RUN_PERSONA="$REPO_ROOT/scripts/smoke-fleet/run-persona.sh"
RUN_ID="$(date +%s)-fleet"
SUMMARY="/tmp/fleet-summary-$RUN_ID.json"
MD_SUMMARY="/tmp/fleet-summary-$RUN_ID.md"

if [ ! -x "$RUN_PERSONA" ]; then
  echo "ERROR: run-persona.sh not found or not executable at $RUN_PERSONA"; exit 2
fi

echo "================================================================"
echo " SMOKE FLEET — $RUN_ID"
echo "   workspace: $WORKSPACE"
echo "   personas:  ${PERSONAS[*]}"
echo "================================================================"

declare -a PIDS
declare -a OUTPUTS

# Launch in parallel
for PERSONA in "${PERSONAS[@]}"; do
  OUT="/tmp/fleet-runner-$RUN_ID-$PERSONA.out"
  OUTPUTS+=("$OUT")
  ( bash "$RUN_PERSONA" _workspace "$PERSONA" "$WORKSPACE" > "$OUT" 2>&1 ) &
  PIDS+=($!)
  echo "  spawned $PERSONA (PID ${PIDS[-1]}) → $OUT"
done

# Wait for all
echo
echo "--- waiting for fleet to converge (up to 3min) ---"
declare -a EXITS
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}"
  EXITS+=($?)
done

# Aggregate
echo
echo "--- per-persona results ---"
TOTAL=0
PASSED=0
declare -a TABLE
for i in "${!PERSONAS[@]}"; do
  PERSONA="${PERSONAS[$i]}"
  OUT="${OUTPUTS[$i]}"
  EXIT="${EXITS[$i]}"
  # Runner prints the transcript path (.jsonl) but not the report path (.report.json).
  # Derive report path by swapping the suffix.
  TRANSCRIPT=$(grep -oE '/tmp/fleet-_workspace-'"$PERSONA"'-[0-9]+-[0-9]+\.jsonl' "$OUT" | head -1)
  REPORT_FILE="${TRANSCRIPT%.jsonl}.report.json"
  if [ -n "$REPORT_FILE" ] && [ -f "$REPORT_FILE" ]; then
    SCORE=$(jq -r '.score' "$REPORT_FILE")
    FINDINGS=$(jq -r '.findings | length // 0' "$REPORT_FILE" 2>/dev/null || echo 0)
    THRESH=$(jq -r '.threshold' "$REPORT_FILE")
    FAILED=$(jq -r '.failed_checks | join(",")' "$REPORT_FILE")
    STATUS=$([ "$EXIT" = "0" ] && echo "PASS" || echo "FAIL")
    printf "  %-30s %s  score=%-5s threshold=%-5s findings=%s  failed=[%s]\n" \
      "$PERSONA" "$STATUS" "${SCORE:0:5}" "$THRESH" "$FINDINGS" "$FAILED"
    TABLE+=("$(jq -nc \
      --arg p "$PERSONA" --arg s "$STATUS" --argjson sc "$SCORE" \
      --argjson th "$THRESH" --argjson fc "$FINDINGS" --arg f "$FAILED" \
      --arg rf "$REPORT_FILE" \
      '{persona:$p, status:$s, score:$sc, threshold:$th, findings:$fc, failed_checks:$f, report:$rf}')")
    TOTAL=$((TOTAL + 1))
    [ "$EXIT" = "0" ] && PASSED=$((PASSED + 1))
  else
    printf "  %-30s ERROR (no report file — runner output below)\n" "$PERSONA"
    tail -10 "$OUT" | sed 's/^/    /'
    TOTAL=$((TOTAL + 1))
  fi
done

# Composite
COMPOSITE=$(echo "scale=3; $PASSED / $TOTAL" | bc 2>/dev/null || echo "0")
echo
echo "================================================================"
echo " COMPOSITE: $PASSED / $TOTAL = $COMPOSITE"
echo "================================================================"

# Write JSON summary
printf '{"run_id":"%s","workspace":"%s","composite":%s,"passed":%d,"total":%d,"results":[' \
  "$RUN_ID" "$WORKSPACE" "$COMPOSITE" "$PASSED" "$TOTAL" > "$SUMMARY"
printf '%s' "${TABLE[0]}" >> "$SUMMARY"
for i in "${!TABLE[@]}"; do
  [ "$i" -eq 0 ] && continue
  printf ',%s' "${TABLE[$i]}" >> "$SUMMARY"
done
printf ']}\n' >> "$SUMMARY"
echo "JSON summary: $SUMMARY"

# Write Markdown summary
{
  echo "# Smoke Fleet Run — $RUN_ID"
  echo
  echo "**Workspace:** \`$WORKSPACE\`"
  echo "**Composite:** $PASSED / $TOTAL = $COMPOSITE"
  echo
  echo "| Persona | Status | Score | Findings | Failed Checks |"
  echo "|---|---|---|---|---|"
  for entry in "${TABLE[@]}"; do
    P=$(echo "$entry" | jq -r '.persona')
    S=$(echo "$entry" | jq -r '.status')
    SC=$(echo "$entry" | jq -r '.score')
    F=$(echo "$entry" | jq -r '.findings')
    FC=$(echo "$entry" | jq -r '.failed_checks')
    echo "| $P | $S | $SC | $F | $FC |"
  done
} > "$MD_SUMMARY"
echo "MD summary: $MD_SUMMARY"

# Exit with composite-derived code
[ "$PASSED" -eq "$TOTAL" ] && exit 0 || exit 1
