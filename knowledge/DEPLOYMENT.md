# tenet-template - Deployment & Distribution

## Distribution Model

tenet-template is not deployed as a running service. It is a **git repository template** that gets cloned by the `tenet init` command. Distribution happens through GitHub.

**Repository:** git@github.com:402goose/tenet-template.git
**Branch:** `main` (single branch, no staging/production split)
**Access:** TBD - needs investigation (currently appears to be private under 402goose org)

## How the Template Reaches Users

### New Projects (`tenet init`)

```
User runs: tenet init my-project
    │
    ├── tenet CLI clones 402goose/tenet-template
    ├── Strips .git, re-initializes
    ├── Customizes .tenet/config.json
    ├── Creates initial commit
    └── Result: my-project/ with full TENET structure
```

### Existing Projects (`tenet update`)

```
User runs: tenet update
    │
    ├── tenet CLI fetches latest from 402goose/tenet-template
    ├── Replaces CLAUDE.md
    ├── Updates scripts/session/*
    ├── Updates .claude/skills/*
    ├── Updates .claude/settings.json (hooks)
    ├── Does NOT touch knowledge/, content/, suggestions/
    └── Result: project updated with latest TENET infrastructure
```

## Publishing Changes

### Workflow for Template Updates

1. **Make changes** in the tenet-template repository
2. **Test locally** by running `tenet init test-project` from a clean directory and verifying the result
3. **Commit** with descriptive message (conventional commits used: `feat:`, `fix:`, etc.)
4. **Push to main**: `git push origin main`

That is the complete publishing process. There are no build steps, no CI/CD pipeline, no artifact packaging. The template is consumed directly from the git repository.

### What Gets Updated vs What Stays

When pushing changes to tenet-template, understand the impact on downstream projects:

| File/Directory | Updated by `tenet update`? | Risk Level |
|----------------|--------------------------|------------|
| `CLAUDE.md` | Yes - full replacement | High - behavioral changes |
| `scripts/session/*` | Yes | Medium - session lifecycle changes |
| `.claude/settings.json` | Yes (hooks) | Medium - hook behavior changes |
| `.claude/skills/*` | Yes | Low - additive |
| `.mcp.json` | TBD | Low |
| `knowledge/*.md` | No - user content | N/A |
| `.tenet/config.json` | No - user config | N/A |
| `content/`, `suggestions/` | No - user content | N/A |
| `templates/*` | TBD - needs investigation | Low |
| `crm` | TBD - needs investigation | Low |
| `.gitignore` | TBD - needs investigation | Low |

## Versioning

### Current State

There is **no formal versioning** in place:
- No git tags
- No version field in config
- No changelog
- Commit messages serve as the only version history

### Recommended Approach (TBD)

A versioning strategy should be established. Options:
1. **Semantic version tags** on git (e.g., `v1.0.0`) - allows `tenet update` to target specific versions
2. **Date-based versions** (e.g., `2026.02.16`) - simpler, matches the session-oriented workflow
3. **CLAUDE.md version header** - embed version in the instructions file itself

## Environment Variables

The template itself does not require environment variables to function. However, features enabled by the template may need:

| Variable | Purpose | Required By |
|----------|---------|-------------|
| `CRM_SHEET_ID` | Google Sheets ID for CRM | `./crm` (Google Sheets backend) |
| `AIRTABLE_API_KEY` | Airtable API key | `./crm` (Airtable backend) |
| `OPENAI_API_KEY` | OpenAI embeddings for memory search | tenet-context-hub (optional) |
| `NODE_ENV` | Node environment | Default in config.json |

## Prerequisites for Development

To work on tenet-template itself:

- **Git** 2.5+ (for worktree support in session scripts)
- **Bash** 3.2+ (macOS default; 4+ preferred for full feature set)
- **Node.js** 14+ (for `./crm` CLI, which uses ES modules)
- **jq** (used by several scripts for JSON parsing)
- **curl** (used by session scripts for tenet-services API)
- **openssl** (used for random session ID generation)

## Testing

### Manual Testing

There is no automated test suite for the template as a whole. Testing is manual:

```bash
# Test 1: Fresh init
tenet init test-project
cd test-project
# Verify directory structure, CLAUDE.md, hooks, config

# Test 2: Session lifecycle
# Open Claude Code in the test project
# Verify SessionStart hook runs
# Make changes, verify auto-commit
# End session, verify cleanup

# Test 3: Doctor check
./scripts/session/tenet-doctor.sh
# Should report clean state

# Test 4: Context preservation
./scripts/session/test-context-preservation.sh
# Should pass all checks
```

### Script-Level Tests

Several test scripts exist in `scripts/session/`:

| Script | Purpose |
|--------|---------|
| `test-context-preservation.sh` | Verifies knowledge files exist, product specs exist, git sync status |
| `test-critical-infrastructure.sh` | TBD - needs investigation |
| `test-experience-level.sh` | TBD - needs investigation |
| `test-session-cleanup.sh` | TBD - needs investigation |
| `test-session-sync.sh` | TBD - needs investigation |

## Rollback

If a template update causes problems in downstream projects:

1. **For `tenet update` issues:** The user's git history contains the pre-update state. `git diff HEAD~1 CLAUDE.md` shows what changed. `git checkout HEAD~1 -- CLAUDE.md` reverts.
2. **For `tenet init` issues:** Delete the broken project directory and re-init from a known-good commit: `tenet init my-project --ref <commit-hash>` (TBD - this flag may not exist yet).
3. **For template repo issues:** `git revert <commit>` on tenet-template, push to main.

## Monitoring

There is no monitoring for the template repository itself. Downstream projects have:

- `tenet-doctor.sh` for health checking
- `test-context-preservation.sh` for verifying file integrity
- Auto-commit daemon logs in `.tenet/auto-commit.log`
- Session cleanup logs in `.tenet/logs/session-cleanup.log`

## Last Updated

2026-02-16
