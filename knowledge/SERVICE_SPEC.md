# tenet-template - Service Specification

**Type:** library (template repository)
**Status:** Stable
**Repository:** git@github.com:402goose/tenet-template.git

## Purpose

tenet-template is the starter template repository that `tenet init` clones to bootstrap new TENET GTM (Go-To-Market) workspaces. It provides the complete directory structure, configuration files, session management scripts, Claude Code hooks, skills, and knowledge document templates that every new TENET project needs.

## Core Responsibilities

- Provide a consistent, functional starting point for every new TENET project
- Include all session management infrastructure (init, cleanup, sync, auto-commit, doctor)
- Ship with Claude Code hooks (`.claude/settings.json`) pre-configured for session lifecycle
- Deliver empty-but-structured knowledge document templates (VISION, NARRATIVE, ROADMAP, THESIS, brand docs)
- Include the CRM CLI wrapper (`./crm`) for configurable CRM backends
- Bundle all TENET skills (brand-architect, content-creator, hud, startup, etc.)
- Provide the `.mcp.json` configuration for the tenet-context MCP server
- Include service-agent templates for onboarding services under a GTM workspace

## What Ships in the Template

### Configuration Files
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full Claude Code instructions (~1200 lines) covering session protocol, journal requirements, decision capture, CRM usage, working modes, onboarding flows |
| `.claude/settings.json` | Claude Code hooks: SessionStart, PostToolUse, UserPromptSubmit, Stop, PreCompact |
| `.claude/service-settings.json` | Alternative hooks configuration for service agents (lighter-weight) |
| `.tenet/config.json` | Project configuration (name, type, team, CRM config, environments) |
| `.mcp.json` | MCP server configuration for tenet-context-hub |
| `.gitignore` | Ignores session metadata, memory database, node_modules, env files |

### Knowledge Templates (in `knowledge/`)
| File | Purpose |
|------|---------|
| `VISION.md` | Problem, solution, "why now", end state |
| `NARRATIVE.md` | Tagline, tweet, elevator pitch, full story arc, audience-specific narratives |
| `ROADMAP.md` | Launch date, phases, milestones, dependencies, success metrics |
| `THESIS.md` | Market opportunity, competitive landscape, moats, business model |
| `BRAND_BRIEF.md` | Identity, personality, visual direction, mark preferences |
| `BRAND_DECISIONS.md` | Selected mark, colors, typography, social assets, favicons |
| `VOICE_AND_TONE.md` | Voice attributes, tone spectrum, copy patterns, word list |

### Deeper Templates (in `templates/`)
| Directory | Contents |
|-----------|----------|
| `templates/strategic/` | Same strategic docs (VISION, NARRATIVE, ROADMAP, THESIS) as reference copies |
| `templates/brand/` | BRAND_BRIEF, BRAND_DECISIONS, BRAND_GUIDELINES, VOICE_AND_TONE, global.css |
| `templates/collaboration/` | CONTRIBUTOR.md (suggestions file), CRM.md (markdown CRM), TASKS.md |
| `templates/service-agent/` | CLAUDE.md for service agents, plus knowledge/ with SERVICE_SPEC, ARCHITECTURE, DEPLOYMENT, RUNBOOK templates |
| `templates/QUICKSTART_SKILL_TO_PRODUCT.md` | Guide for turning a Claude Code skill into a paid product |

### Scripts (in `scripts/`)
| Script | Purpose |
|--------|---------|
| `scripts/session/session-init.sh` | SessionStart hook: sync repos, health check, create session branch/worktree, start auto-commit |
| `scripts/session/session-cleanup.sh` | Stop hook: commit changes, merge session branch to working branch, clean up |
| `scripts/session/session-sync.sh` | Pull latest from all repos (main, product submodule, other submodules) |
| `scripts/session/auto-commit.sh` | Background daemon committing critical paths every 2 minutes |
| `scripts/session/tenet-doctor.sh` | Health checker: git status, submodules, stale sessions, orphaned branches, locks, memory |
| `scripts/session/test-context-preservation.sh` | Verify knowledge files, product specs, and git sync status |
| `scripts/session/session-end.sh` | Session end workflow (commit, merge, cleanup) |
| `scripts/session/test-critical-infrastructure.sh` | Test critical infrastructure components |
| `scripts/session/test-experience-level.sh` | Test experience level detection |
| `scripts/session/test-session-cleanup.sh` | Test session cleanup procedures |
| `scripts/session/test-session-sync.sh` | Test session sync functionality |
| `scripts/migrate-to-branch-sessions.sh` | Migration tool: worktree-based sessions to branch-based sessions |
| `scripts/commit-gtm.sh` | Commit changes to the GTM repo (excludes submodules) |
| `scripts/commit-product.sh` | Commit changes to the product submodule and update parent reference |
| `scripts/where-am-i.sh` | Show current directory context, branch, and uncommitted changes |

### Skills (in `.claude/skills/`)

18 bundled skills:
- `agent-browser` - Browser automation
- `brand-architect` - Brand identity creation workflow
- `campaign-hud` - Campaign overview
- `content-creator` - Content generation (threads, posts, articles)
- `debug` - Debugging assistance
- `end` - Session end workflow
- `fly-deploy` - Fly.io deployment
- `founder-video` - Founder video script generation
- `hud` - Project dashboard
- `ralph-tui` - TUI interface
- `react-best-practices` - React patterns reference
- `remotion-best-practices` - Remotion video patterns
- `search` - Search functionality
- `spec` - Specification writing
- `startup` - Startup guidance
- `viz` - Terminal data visualization via kuva
- `web-architect` - Web asset implementation
- `x-algorithm` - X/Twitter algorithm optimization

### Other Directories
| Directory | Purpose |
|-----------|---------|
| `content/` | Empty, for marketing content |
| `journal/` | Empty (with .gitkeep), for journal entries during non-session use |
| `previews/` | Empty, for brand/content previews |
| `suggestions/` | Empty, for contributor suggestion files |

## Dependencies

### Upstream (consumed by this template)
| Dependency | Purpose | Notes |
|-----------|---------|-------|
| `tenet` CLI | Clones this template via `tenet init` | Template is pulled from GitHub |
| `tenet-context-hub-mcp` | MCP server for context aggregation | Configured in `.mcp.json` |
| `tenet-services` API | Session coordination across concurrent sessions | Optional, runs on localhost:3401 |

### Downstream (consumes this template)
| Consumer | Purpose |
|----------|---------|
| Every new TENET project | Created by `tenet init`, which clones this repo and customizes it |

## Integration Points

- **tenet CLI** (`tenet init`): Clones this repo as the starting point for new projects
- **tenet CLI** (`tenet update`): Updates CLAUDE.md, skills, and scripts from this template
- **tenet-context-hub**: MCP server configured in `.mcp.json`, started by SessionStart hook
- **tenet-services**: Session coordination API, used by session-init.sh and session-cleanup.sh
- **GitHub**: Hosted at 402goose/tenet-template, pulled via git clone

## Status

**Last Updated:** 2026-02-16
**Current Version:** Latest commit b7dd40d
**Stability:** Stable (production use across multiple TENET projects)

## Open Questions

- How should template versioning work? Currently no tags or version numbers.
- Should skills be separated into a skills repo or remain bundled?
- How should breaking changes to CLAUDE.md be communicated to existing projects?
- Should the template support non-Claude AI agents (e.g., different CLAUDE.md equivalents)?
