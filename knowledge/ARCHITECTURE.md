# jfl-template - Architecture

## Overview

jfl-template is a git repository that serves as the canonical starter template for all JFL GTM workspaces. It is not a running service -- it is a static template that gets cloned, customized, and then operates independently as a new project. The architecture is entirely file-based: markdown documents, shell scripts, JSON configuration, and Claude Code skill definitions.

## Directory Structure

```
jfl-template/
├── CLAUDE.md                          # Master instructions for Claude Code (~1200 lines)
├── .claude/
│   ├── settings.json                  # Claude Code hooks (SessionStart, Stop, etc.)
│   ├── service-settings.json          # Lighter hooks for service agent mode
│   ├── agents/                        # Empty, for future agent configs
│   └── skills/                        # 17 bundled skills
│       ├── brand-architect/
│       ├── content-creator/
│       ├── hud/
│       ├── startup/
│       └── ... (14 more)
├── .jfl/
│   ├── config.json                    # Project configuration
│   ├── journal/                       # Session journal entries (JSONL)
│   │   ├── .gitkeep
│   │   └── main.jsonl
│   └── logs/                          # Runtime logs (gitignored)
├── .mcp.json                          # MCP server config for jfl-context-hub
├── .gitignore                         # Ignores session metadata, memory DB, etc.
├── crm                                # CRM CLI wrapper (Node.js, executable)
├── knowledge/                         # Strategic document templates (for end user)
│   ├── VISION.md
│   ├── NARRATIVE.md
│   ├── ROADMAP.md
│   ├── THESIS.md
│   ├── BRAND_BRIEF.md
│   ├── BRAND_DECISIONS.md
│   └── VOICE_AND_TONE.md
├── templates/                         # Reference/source templates
│   ├── strategic/                     # VISION, NARRATIVE, ROADMAP, THESIS
│   ├── brand/                         # Brand brief, decisions, guidelines, global.css
│   ├── collaboration/                 # CONTRIBUTOR, CRM, TASKS templates
│   ├── service-agent/                 # CLAUDE.md + knowledge/ for service agents
│   └── QUICKSTART_SKILL_TO_PRODUCT.md # Skill-to-product guide
├── scripts/
│   ├── session/                       # Session lifecycle scripts
│   │   ├── session-init.sh            # SessionStart: sync, health check, branch/worktree
│   │   ├── session-cleanup.sh         # Stop: commit, merge, push, remove branch
│   │   ├── session-sync.sh            # Pull latest from all repos
│   │   ├── auto-commit.sh             # Background commit daemon (120s interval)
│   │   ├── jfl-doctor.sh              # Health checks with --fix mode
│   │   ├── test-context-preservation.sh
│   │   ├── test-critical-infrastructure.sh
│   │   ├── test-experience-level.sh
│   │   ├── test-session-cleanup.sh
│   │   ├── test-session-sync.sh
│   │   ├── session-end.sh
│   │   └── migrate-to-branch-sessions.sh
│   ├── commit-gtm.sh                 # Commit GTM-only changes
│   ├── commit-product.sh             # Commit product submodule changes
│   └── where-am-i.sh                 # Show current git context
├── content/                           # Empty, for user marketing content
├── journal/                           # Empty, legacy journal location
├── previews/                          # Empty, for brand/content previews
└── suggestions/                       # Empty, for contributor files
```

## Key Components

### CLAUDE.md (Master Instructions)

- **Purpose:** The single source of truth for how Claude Code behaves in a JFL project
- **Location:** `/CLAUDE.md` (root)
- **Size:** ~36KB, ~1200 lines
- **Sections:** Project Identity, Session Sync (6-step startup), Journal Protocol, Decision Capture, CRM Usage, Architecture Principles, Working Modes, GTM Services, Foundation Flow, Brand Workflow, Skills Reference, Collaboration System, Onboarding Flows, Team Configuration

This file is the most critical file in the template. When `jfl update` runs, it replaces this file with the latest version from the template.

### Claude Code Hooks (`.claude/settings.json`)

Hooks define automated behaviors at different lifecycle events:

| Hook | Trigger | What It Does |
|------|---------|-------------- |
| `SessionStart` | New Claude Code session | Runs `session-init.sh` (sync, health check, create branch), starts context-hub |
| `PostToolUse:Bash` | After any Bash tool call containing `git commit` | Reminds to write journal entry |
| `PostToolUse:Write\|Edit` | After Write/Edit on .ts/.tsx/.js/.jsx files | Warns if `@purpose` header is missing |
| `PostToolUse:TaskUpdate` | After task marked completed | Reminds to write journal entry |
| `UserPromptSubmit` | When user says "done", "looks good", "ship it", etc. | Reminds to capture decision/approval in journal |
| `Stop` | Session ending | Checks for journal entry, runs session-cleanup.sh |
| `PreCompact` | Before context compaction | Warns about missing journal, auto-commits all changes |

### Session Management Scripts

The session lifecycle is the most complex part of the template:

```
Session Start (session-init.sh)
    │
    ├── 1. Run session-sync.sh (pull latest from all repos)
    ├── 2. Health check (count stale/active sessions)
    ├── 3. Auto-cleanup if > 5 stale sessions
    ├── 4. Crash reconciliation (check for uncommitted work in stale worktrees)
    ├── 5. Concurrent session detection (via jfl-services API or local)
    │       ├── Single session → create branch from working branch
    │       └── Multiple sessions → create worktree for isolation
    ├── 6. Start auto-commit daemon in background
    └── 7. Save session ID to .jfl/current-session-branch.txt

Session Running (auto-commit.sh)
    │
    ├── Every 120 seconds: stage and commit critical paths
    ├── Pull before commit (sync with team)
    ├── Push after commit to session branch
    ├── Also handle submodule commits
    └── Graceful shutdown on SIGTERM (final commit + session cleanup)

Session End (session-cleanup.sh)
    │
    ├── 1. Stop background processes (auto-commit, context-hub)
    ├── 2. Auto-commit any remaining changes
    ├── 3. Pre-merge cleanup (remove session metadata files)
    ├── 4. Merge session branch to working branch
    │       ├── Success → push, remove worktree, delete branch
    │       └── Conflict → try auto-resolve for known conflicts
    │               ├── Resolved → complete merge
    │               └── Unresolved → keep branch, warn user
    └── 5. Notify jfl-services API
```

### CRM CLI (`./crm`)

A Node.js executable script that routes CRM commands to configurable backends:

- **google-sheets** (recommended): Uses Google Sheets API via `scripts/crm-google-sheets.js`
- **airtable**: Planned but shows placeholder message
- **markdown**: Falls back to `knowledge/CRM.md` file

Configuration stored in `.jfl/config.json` under the `crm` key. Includes an interactive setup wizard (`./crm setup`).

### Knowledge Document Templates

Two copies of strategic templates exist:

1. **`knowledge/*.md`** - The "live" copies that end users fill in. These start as blank templates with placeholder text and HTML comments guiding what to write.

2. **`templates/strategic/*.md`** - Reference copies. Identical content to `knowledge/`. The CLAUDE.md instructions tell users to "copy templates to knowledge/" but in practice the template repo ships with templates already in knowledge/.

### Service Agent Templates (`templates/service-agent/`)

A separate set of templates for when a service (a separate codebase) is registered under a GTM workspace:

- `CLAUDE.md` - Service-specific instructions covering status.json updates, event emission to GTM, cross-service discovery, @-mention handling
- `knowledge/SERVICE_SPEC.md` - Service purpose, endpoints, dependencies, security
- `knowledge/ARCHITECTURE.md` - Tech stack, directory structure, components, data flow
- `knowledge/DEPLOYMENT.md` - Deploy commands, environment variables, rollback
- `knowledge/RUNBOOK.md` - Common tasks, troubleshooting, emergency procedures

### Config (`./jfl/config.json`)

The central configuration file. In the template, it is pre-configured as a service of type "library" with its own GTM parent set. When cloned for a new project, key fields are customized:

```json
{
  "name": "project-name",
  "type": "gtm",                    // or "service"
  "setup": "building-product",      // or "gtm-only", "contributor"
  "product_repo": "",               // GitHub URL
  "product_path": "product/",       // Submodule path
  "description": "",
  "team": { "owner": {...}, "core": [], "contributors": [] },
  "crm": { "type": "", "config": {} },
  "working_branch": "main",         // Branch sessions merge back to
  "sync_to_parent": { ... },        // For services: what syncs to GTM
  "environments": { ... }           // Dev/staging/prod configs
}
```

## Customization Points

When `jfl init` creates a new project from this template, these are the primary customization points:

| What Gets Customized | How |
|---------------------|-----|
| `.jfl/config.json` | `name`, `type`, `team.owner`, `description`, `product_repo` filled in |
| `knowledge/*.md` | User fills in vision, narrative, roadmap, thesis through conversation |
| `CLAUDE.md` Team Configuration section | Owner name, GitHub username, wallet address |
| `.mcp.json` | Generally unchanged, but port could vary |
| Product submodule | Added via `git submodule add` if user has a product repo |
| CRM configuration | Set up via `./crm setup` (Google Sheets, Airtable, or markdown) |

## How It Connects to `jfl init`

The `jfl init` command (implemented in the jfl-platform CLI) performs:

1. `git clone git@github.com:402goose/jfl-template.git <project-name>`
2. Removes the `.git` directory and re-initializes
3. Updates `.jfl/config.json` with project name and owner info
4. Optionally adds a product submodule
5. Makes initial commit

## How `jfl update` Works

The `jfl update` command refreshes template files in an existing project:

1. Fetches latest from 402goose/jfl-template
2. Replaces `CLAUDE.md` with latest version
3. Updates `scripts/session/` with latest scripts
4. Updates `.claude/skills/` with latest skills
5. Updates `.claude/settings.json` hooks if needed
6. Does NOT touch `knowledge/` (user content), `content/`, `suggestions/`, or `.jfl/config.json`

## Known Constraints

- The template's `.jfl/config.json` has its own `gtm_parent` set to `/Users/alectaggart/CascadeProjects/JFL-GTM`, which is a local path specific to the development machine. This gets overwritten during `jfl init`.
- Session scripts assume bash 4+ for some features but include fallbacks for bash 3 (macOS default).
- The `./crm` file is a Node.js script using ES modules (`import` syntax), requiring Node.js 14+.
- Worktree-based session isolation requires git 2.5+ (`git worktree` support).
- The jfl-services API on localhost:3401 is optional -- scripts gracefully fall back to local detection.

## Last Updated

2026-02-16
