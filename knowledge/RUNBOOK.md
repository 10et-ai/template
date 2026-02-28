# jfl-template - Operations Runbook

## Common Tasks

### Task: Update CLAUDE.md

**When:** Instructions need to change, new sections added, behavior modified

**Steps:**
1. Edit `CLAUDE.md` in the jfl-template repo
2. Test by reading through for consistency (no automated linting exists)
3. Pay attention to:
   - Section ordering (CRITICAL sections should remain near top)
   - Table formatting (markdown tables are used extensively)
   - Code block accuracy (bash commands must actually work)
   - Hook references matching `.claude/settings.json`
4. Commit: `git commit -m "docs: update CLAUDE.md - {what changed}"`
5. Push: `git push origin main`
6. Downstream projects pick up changes on next `jfl update`

**Risk:** High. CLAUDE.md controls agent behavior. Mistakes affect every project that runs `jfl update`. Test behavioral changes in a real project before pushing.

---

### Task: Add a New Skill

**When:** New `/skill` command needed across all JFL projects

**Steps:**
1. Create directory: `.claude/skills/{skill-name}/`
2. Add skill definition file (typically `{skill-name}.md` or similar)
3. If skill has sub-files, add those too (e.g., `react-best-practices/` has multiple files)
4. Update the skills table in `CLAUDE.md` if the skill should be documented:
   ```markdown
   ## Skills Available
   | Skill | Purpose | Key Commands |
   ```
5. Commit: `git commit -m "feat: add {skill-name} skill"`
6. Push: `git push origin main`

**Verify:** Open Claude Code in a project that has the skill, invoke it, check behavior.

---

### Task: Add a New Knowledge Template

**When:** A new type of knowledge document is needed in every project

**Steps:**
1. Create the template file in the appropriate `templates/` subdirectory:
   - Strategic docs: `templates/strategic/`
   - Brand docs: `templates/brand/`
   - Collaboration docs: `templates/collaboration/`
2. Also add a copy to `knowledge/` if it should exist by default in new projects
3. Update CLAUDE.md to reference the new document (add to the relevant table in Knowledge Sources section)
4. If the document is "critical" (should be checked at session start), add it to `test-context-preservation.sh`:
   ```bash
   CRITICAL_FILES=(
       ...
       "knowledge/YOUR_NEW_DOC.md"
   )
   ```
5. Commit and push

---

### Task: Update Session Hooks

**When:** Claude Code hook behavior needs to change

**Steps:**
1. Edit `.claude/settings.json`
2. Hooks follow this structure:
   ```json
   {
     "hooks": {
       "HookName": [
         {
           "matcher": "regex pattern or empty for all",
           "hooks": [
             {
               "type": "command",
               "command": "shell command here"
             }
           ]
         }
       ]
     }
   }
   ```
3. Available hook types: `SessionStart`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `PreCompact`
4. PostToolUse matchers: `Bash`, `Write|Edit`, `TaskUpdate`
5. **Important:** Hooks must exit 0 to not block Claude Code. Use `|| exit 0` or `|| true` for safety.
6. Test by opening Claude Code in a project with the updated hooks
7. Also update `.claude/service-settings.json` if the change applies to service agents

**Common pitfalls:**
- Hooks run in a subshell, not the interactive session
- `$TOOL_INPUT` is available in PostToolUse hooks (contains the tool call JSON)
- Long-running commands should use `&` and `async: true`
- Hooks cannot block operations -- they can warn but not prevent

---

### Task: Update Session Scripts

**When:** Session lifecycle behavior needs to change

**Steps:**
1. Edit the relevant script in `scripts/session/`
2. Key scripts and their roles:
   - `session-init.sh` - Called by SessionStart hook. Creates session branch, starts auto-commit.
   - `session-cleanup.sh` - Called by Stop hook. Merges session branch, cleans up.
   - `session-sync.sh` - Called by session-init.sh. Pulls latest from all repos.
   - `auto-commit.sh` - Background daemon. Commits every 120 seconds.
   - `jfl-doctor.sh` - Health checks. Run manually or by init.
3. Ensure scripts are executable: `chmod +x scripts/session/*.sh`
4. Test the script manually before pushing:
   ```bash
   # For session-init.sh: manually run in a test project
   cd /path/to/test-project
   ./scripts/session/session-init.sh

   # For doctor:
   ./scripts/session/jfl-doctor.sh --verbose
   ```
5. Commit and push

**Important considerations:**
- Scripts must handle both interactive and non-interactive modes (hook context is non-interactive)
- Scripts must be idempotent where possible
- Error handling: scripts should warn and continue, not fail hard
- macOS uses bash 3.2 by default -- test bash 3 compatibility

---

### Task: Update CRM CLI

**When:** CRM wrapper needs new commands or backend support

**Steps:**
1. Edit `crm` (the root-level executable Node.js script)
2. The script uses ES modules (`import`), requires Node.js 14+
3. Three backends:
   - `google-sheets`: Routes to `scripts/crm-google-sheets.js` (may not exist in template)
   - `airtable`: Placeholder only
   - `markdown`: Reads/writes `knowledge/CRM.md`
4. Test: `./crm setup` (interactive), `./crm list` (with markdown backend)
5. Commit and push

---

### Task: Add Service Agent Template Files

**When:** Service agent onboarding needs new default files

**Steps:**
1. Edit files in `templates/service-agent/`
2. `CLAUDE.md` - Service-specific Claude instructions
3. `knowledge/` subdirectory contains:
   - `SERVICE_SPEC.md` - Service purpose/interface template
   - `ARCHITECTURE.md` - Tech stack/structure template
   - `DEPLOYMENT.md` - Deploy procedures template
   - `RUNBOOK.md` - Operations template
4. These templates use `{PLACEHOLDER}` syntax for values filled in during service onboarding
5. Commit and push

---

### Task: Test Template with `jfl init`

**When:** After making changes, verify the template produces a working project

**Steps:**
```bash
# 1. Push your changes
git push origin main

# 2. Init a test project
cd /tmp
jfl init test-template-$(date +%s)

# 3. Verify structure
cd test-template-*
ls -la
ls knowledge/
ls scripts/session/
ls .claude/skills/
cat .jfl/config.json

# 4. Verify session lifecycle
# Open Claude Code here and check:
# - SessionStart hook runs session-init.sh
# - Session branch is created
# - Auto-commit starts
# - On exit: cleanup merges and pushes

# 5. Verify doctor
./scripts/session/jfl-doctor.sh

# 6. Verify context test
./scripts/session/test-context-preservation.sh

# 7. Cleanup
cd /tmp && rm -rf test-template-*
```

---

## Troubleshooting

### Problem: Session Init Fails in Hook Context

**Symptoms:** SessionStart hook errors, session branch not created

**Investigation:**
```bash
# Check if session-init.sh is executable
ls -la scripts/session/session-init.sh

# Check for syntax errors
bash -n scripts/session/session-init.sh

# Run manually to see errors
./scripts/session/session-init.sh
```

**Common Causes:**
- Script not executable (`chmod +x` needed)
- Bash syntax incompatible with macOS bash 3.2
- `jq` not installed (used for config parsing)
- Git not initialized (running in non-git directory)

**Resolution:**
- Ensure `#!/usr/bin/env bash` shebang
- Test with `/bin/bash` (not `/usr/bin/env bash` which may pick up homebrew bash)
- Add guards: `if ! git rev-parse --git-dir &>/dev/null; then exit 0; fi`

---

### Problem: Hooks Not Firing

**Symptoms:** SessionStart/Stop hooks don't seem to run

**Investigation:**
```bash
# Check settings.json is valid JSON
python3 -c "import json; json.load(open('.claude/settings.json'))"

# Check hook format (must be array of objects with matcher + hooks)
cat .claude/settings.json | jq '.hooks'
```

**Common Causes:**
- Invalid JSON in settings.json (trailing commas, missing quotes)
- Wrong hook name (e.g., `SessionStart:service` instead of `SessionStart`)
- Matcher regex is too restrictive or has syntax errors
- Hook command fails silently

**Resolution:**
- Validate JSON with `jq`
- Use `jfl services validate --fix` for service-specific hook issues
- Test hook commands manually in the terminal

---

### Problem: Auto-commit Not Working

**Symptoms:** Changes not being saved, no commits appearing

**Investigation:**
```bash
# Check if daemon is running
./scripts/session/auto-commit.sh status

# Check PID file
cat .jfl/auto-commit.pid

# Check log
tail -20 .jfl/auto-commit.log

# Check if critical paths exist
ls knowledge/ content/ suggestions/
```

**Common Causes:**
- Daemon died (parent process check killed it)
- PID file is stale
- No changes in critical paths to commit
- Git push failing (auth issues)

**Resolution:**
- Restart: `./scripts/session/auto-commit.sh stop && ./scripts/session/auto-commit.sh start`
- Check git auth: `git push origin $(git branch --show-current)`
- Check log for specific errors

---

### Problem: Session Cleanup Merge Conflicts

**Symptoms:** Session branch not merging back to working branch, branch persists

**Investigation:**
```bash
# Check what branches exist
git branch | grep session-

# Check if branch has diverged
git log main..session-xxx --oneline

# Check for conflicts
git merge --no-commit session-xxx
git diff --name-only --diff-filter=U
git merge --abort
```

**Common Causes:**
- Two sessions modified the same file
- Session metadata files (`.jfl/current-session-branch.txt`) conflicting
- Product submodule reference conflicts

**Resolution:**
- Session cleanup auto-resolves known conflicts (session metadata, submodule refs)
- For real content conflicts, manually merge: `git merge session-xxx`, resolve, commit
- Or discard the branch if work is already on main: `git branch -D session-xxx`
- Run doctor to clean up: `./scripts/session/jfl-doctor.sh --fix`

---

### Problem: Template Changes Not Reaching Projects

**Symptoms:** `jfl update` doesn't pick up latest changes

**Investigation:**
```bash
# In the downstream project
git log --oneline CLAUDE.md | head -5

# Check when last update was
git log -1 --format=%ci -- CLAUDE.md

# Check jfl update behavior
jfl update --verbose  # (flag may not exist)
```

**Common Causes:**
- Changes pushed to wrong branch (not main)
- `jfl update` not implemented for all file types
- Network issue (can't reach github.com)
- `jfl update` caches or uses a stale reference

**Resolution:**
- Verify changes are on main: `git -C /path/to/jfl-template log --oneline -5`
- Manual update: copy files directly from template to project
- Check jfl CLI source code for update behavior

---

### Problem: Doctor Reports Stale Sessions

**Symptoms:** `jfl-doctor.sh` shows stale sessions with uncommitted work

**Investigation:**
```bash
./scripts/session/jfl-doctor.sh --verbose

# Check specific worktree
ls worktrees/
cd worktrees/session-xxx
git status
git log --oneline -5
```

**Resolution:**
```bash
# Auto-fix (commits uncommitted work, removes merged branches)
./scripts/session/jfl-doctor.sh --fix

# Or migrate to branch sessions (removes all worktrees)
./scripts/migrate-to-branch-sessions.sh
```

---

## Regular Maintenance

### After Major Changes
- [ ] Test `jfl init` with new template
- [ ] Test `jfl update` in an existing project
- [ ] Verify hooks fire correctly in Claude Code
- [ ] Run doctor in a test project
- [ ] Check bash 3.2 compatibility on macOS

### Periodically
- [ ] Review git log for consistency of commit messages
- [ ] Check for accumulation of stale test branches
- [ ] Review CLAUDE.md for outdated instructions
- [ ] Verify all skills still load in Claude Code
- [ ] Check if any template files reference hardcoded paths (like gtm_parent)

---

## Useful Commands Reference

```bash
# View template structure
ls -R /path/to/jfl-template

# Check for hardcoded paths
grep -r "/Users/" /path/to/jfl-template --include="*.json" --include="*.sh"

# Validate JSON configs
cat .jfl/config.json | jq .
cat .claude/settings.json | jq .
cat .mcp.json | jq .

# Count CLAUDE.md lines
wc -l CLAUDE.md

# Check script permissions
ls -la scripts/session/*.sh

# View git history
git log --oneline --all

# Check what a fresh clone looks like
git clone git@github.com:402goose/jfl-template.git /tmp/template-test
ls -la /tmp/template-test
rm -rf /tmp/template-test
```

---

## Last Updated

2026-02-16
