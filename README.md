# TENET Template

Starter template for new TENET GTM workspaces. Used by `tenet init` to scaffold new projects.

## What This Is

This repo is the canonical template that gets cloned when running `tenet init -n my-project`. It includes:

- Pre-configured `.claude/settings.json` with session hooks (SessionStart, PostToolUse, UserPromptSubmit, Stop, PreCompact)
- `.mcp.json` for Context Hub MCP server integration
- Knowledge doc templates (`knowledge/VISION.md`, `NARRATIVE.md`, `THESIS.md`, `ROADMAP.md`, etc.)
- Brand doc templates (`BRAND_BRIEF.md`, `BRAND_DECISIONS.md`, `VOICE_AND_TONE.md`)
- Session management scripts (`scripts/session/`)
- CRM CLI wrapper
- `CLAUDE.md` with full AI instructions
- `.tenet/config.json` base configuration

## Structure

```
tenet-template/
├── .claude/
│   ├── settings.json          # Claude Code hooks
│   ├── service-settings.json  # Lighter-weight hooks for service agents
│   ├── agents/                # Service agent definitions (scaffolded empty)
│   └── skills/                # Pre-installed slash commands
├── .tenet/
│   ├── config.json            # Project configuration
│   ├── journal/               # Session journal entries
│   └── logs/                  # Session logs
├── .mcp.json                  # Context Hub MCP config
├── CLAUDE.md                  # AI instructions (main artifact)
├── knowledge/                 # Strategy docs (templates)
│   ├── VISION.md
│   ├── NARRATIVE.md
│   ├── THESIS.md
│   ├── ROADMAP.md
│   ├── BRAND_BRIEF.md
│   ├── BRAND_DECISIONS.md
│   ├── VOICE_AND_TONE.md
│   ├── SERVICE_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── RUNBOOK.md
├── content/                   # Generated marketing content
├── journal/                   # Journal entries (non-session use)
├── previews/                  # Asset previews
├── suggestions/               # Per-contributor workspaces
├── scripts/
│   └── session/               # Session management scripts
├── templates/                 # Doc templates for reference
└── crm                        # CRM CLI (Google Sheets)
```

## How It Gets Used

1. User runs `tenet init -n my-project`
2. CLI clones this template into `./my-project`
3. Replaces placeholder values in config
4. User starts working — `claude` fires SessionStart hooks automatically

## Updating the Template

Changes here propagate to new projects only. Existing projects update via `tenet update` which pulls skills, scripts, and templates while preserving user content.

## Related Repos

| Repo | Purpose |
|------|---------|
| [tenet-cli](https://github.com/402goose/tenet-cli) | CLI tool that uses this template |
| tenet-platform | Hosted platform (dashboard, auth, billing) |

## License

MIT License
