#!/usr/bin/env bash
# verify-startup-fixes.sh — SSF-005
# Regression test for session-startup fixes (SSF-001 through SSF-004).
# Static checks run anywhere. Live checks (--live) spawn a real `claude --print` session.
#
# Usage:
#   bash scripts/verify-startup-fixes.sh           # static only (free, fast)
#   bash scripts/verify-startup-fixes.sh --live    # spawns sibling claude session (costs ~1¢)
#
# Exit code: 0 if all PASS, 1 if any FAIL.

set +e
LIVE=0
[ "$1" = "--live" ] && LIVE=1

PASS=0
FAIL=0
WARN=0

assert() {
  local name="$1"; shift
  if eval "$@" >/dev/null 2>&1; then
    echo "  PASS  $name"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $name"
    echo "        cmd: $*"
    FAIL=$((FAIL+1))
  fi
}

warn() {
  echo "  WARN  $1"
  WARN=$((WARN+1))
}

echo "===================================================="
echo " SSF Regression Suite"
echo " Workspace: $(pwd)"
echo " Mode: $([ $LIVE -eq 1 ] && echo 'STATIC + LIVE' || echo 'STATIC (use --live for full)')"
echo "===================================================="

# ----- Prerequisites -----
echo
echo "[prereqs]"
assert "settings.json exists"            "test -f .claude/settings.json"
assert "settings.json valid JSON"        "jq -e . .claude/settings.json >/dev/null"
[ -f CLAUDE.md ] && assert "CLAUDE.md exists" "test -f CLAUDE.md" || warn "CLAUDE.md not found (skip SSF-002 checks)"
assert ".tenet/STARTUP_FIXES.md exists"  "test -f .tenet/STARTUP_FIXES.md"

# ----- SSF-001: SessionStart imperative banner -----
echo
echo "[SSF-001 SessionStart imperative banner]"
assert "marker present in settings.json" "[ \$(grep -c 'SSF-001' .claude/settings.json) -ge 1 ]"
assert "SessionStart has >=3 hooks"      "[ \$(jq '.hooks.SessionStart[0].hooks | length' .claude/settings.json) -ge 3 ]"
# Dynamic: actually run the banner command and verify text
SS_CMD=$(jq -r '.hooks.SessionStart[0].hooks[] | select(.command | contains("SSF-001")) | .command' .claude/settings.json | head -1)
if [ -n "$SS_CMD" ]; then
  OUT=$(bash -c "$SS_CMD" 2>&1)
  assert "banner output renders"           "echo '$OUT' | grep -q 'SESSION START'"
  assert "banner mentions ToolSearch"      "echo '$OUT' | grep -q 'ToolSearch'"
  assert "banner mentions context_get"     "echo '$OUT' | grep -q 'context_get'"
else
  warn "no SSF-001 command found in settings.json"
fi

# ----- SSF-002: CLAUDE.md self-contained -----
echo
echo "[SSF-002 CLAUDE.md self-contained]"
if [ -f CLAUDE.md ]; then
  assert "no 'First read' cross-ref"        "[ \$(grep -c 'First read' CLAUDE.md) -eq 0 ]"
  assert "no 'canonical source' phrase"     "[ \$(grep -c 'canonical source' CLAUDE.md) -eq 0 ]"
  assert "SSF-002 marker present"           "[ \$(grep -c 'SSF-002' CLAUDE.md) -ge 1 ]"
fi

# ----- SSF-003: Test index document -----
echo
echo "[SSF-003 Test index document]"
assert "covers SSF-001"                  "grep -q 'SSF-001' .tenet/STARTUP_FIXES.md"
assert "covers SSF-002"                  "grep -q 'SSF-002' .tenet/STARTUP_FIXES.md"
assert "covers SSF-003"                  "grep -q 'SSF-003' .tenet/STARTUP_FIXES.md"
assert "covers SSF-004"                  "grep -q 'SSF-004' .tenet/STARTUP_FIXES.md"

# ----- SSF-004: Post-compact rehydrate -----
echo
echo "[SSF-004 Post-compact rehydrate marker pattern]"
assert "PreCompact has tenet-post-compact touch" "[ \$(jq '[.hooks.PreCompact[0].hooks[].command] | map(select(contains(\"tenet-post-compact\"))) | length' .claude/settings.json) -ge 1 ]"
assert "UserPromptSubmit has POST-COMPACT banner" "[ \$(jq '[.hooks.UserPromptSubmit[].hooks[].command] | map(select(contains(\"POST-COMPACT\"))) | length' .claude/settings.json) -ge 1 ]"
# Lifecycle simulation
BRANCH="ssf-005-test-$$"
echo "$BRANCH" > .tenet/.current-session-branch.test.bak 2>/dev/null
ORIG=$(cat .tenet/current-session-branch.txt 2>/dev/null)
echo "$BRANCH" > .tenet/current-session-branch.txt 2>/dev/null
TOUCH=$(jq -r '.hooks.PreCompact[0].hooks[] | select(.command | contains("tenet-post-compact")) | .command' .claude/settings.json | head -1)
PROMPT=$(jq -r '.hooks.UserPromptSubmit[] | select(.matcher == "") | .hooks[0].command' .claude/settings.json | head -1)
bash -c "$TOUCH" >/dev/null 2>&1
assert "marker created by PreCompact"          "test -f /tmp/tenet-post-compact-$BRANCH"
BANNER_OUT=$(bash -c "$PROMPT" 2>&1)
assert "POST-COMPACT banner printed on prompt" "echo '$BANNER_OUT' | grep -q 'POST-COMPACT \[SSF-004\]'"
assert "marker removed after prompt"            "[ ! -f /tmp/tenet-post-compact-$BRANCH ]"
SECOND=$(bash -c "$PROMPT" 2>&1)
assert "second prompt silent (idempotent)"      "[ -z '$SECOND' ]"
[ -n "$ORIG" ] && echo "$ORIG" > .tenet/current-session-branch.txt
rm -f .tenet/.current-session-branch.test.bak 2>/dev/null

# ----- SSF-005 (this script) -----
echo
echo "[SSF-005 This regression suite]"
assert "verify-startup-fixes.sh exists"  "test -f scripts/verify-startup-fixes.sh"

# ----- Live check (opt-in) -----
if [ $LIVE -eq 1 ]; then
  echo
  echo "[LIVE: spawning sibling claude session — ~1¢ cost]"
  if ! command -v claude >/dev/null 2>&1; then
    warn "claude CLI not found, skipping live check"
  else
    LIVE_OUT=$(mktemp)
    timeout 90 claude --print "List 1 in-progress kanban item, brief." \
      --output-format stream-json --include-hook-events --verbose \
      --permission-mode bypassPermissions --model claude-haiku-4-5-20251001 \
      > "$LIVE_OUT" 2>/dev/null
    assert "live: SessionStart hook_response includes SSF-001"  "grep -q 'SSF-001' '$LIVE_OUT'"
    TOOLS=$(jq -r 'select(.type == \"assistant\") | .message.content[]? | select(.type == \"tool_use\") | .name' "$LIVE_OUT" 2>/dev/null | head -1)
    if [ -n "$TOOLS" ]; then
      echo "  INFO  agent first tool: $TOOLS"
    fi
    rm -f "$LIVE_OUT"
  fi
fi

# ----- Summary -----
echo
echo "===================================================="
echo "  PASS=$PASS  FAIL=$FAIL  WARN=$WARN"
echo "===================================================="
[ $FAIL -eq 0 ]
