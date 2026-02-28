# JFL Template

Starter template for new JFL GTM workspaces. Used by `jfl init` to scaffold new projects.

## What This Is

This repo is the canonical template that gets cloned when running `jfl init -n my-project`. It includes:

- Pre-configured `.claude/settings.json` with session hooks (SessionStart, Stop, PreCompact)
- `.mcp.json` for Context Hub MCP server integration
- Knowledge doc templates (`knowledge/VISION.md`, `NARRATIVE.md`, `THESIS.md`, `ROADMAP.md`, etc.)
- Brand doc templates (`BRAND_BRIEF.md`, `BRAND_DECISIONS.md`, `VOICE_AND_TONE.md`)
- Session management scripts (`scripts/session/`)
- CRM CLI wrapper
- `CLAUDE.md` with full AI instructions
- `.jfl/config.json` base configuration

## Structure

```
jfl-template/
├── .claude/
│   ├── settings.json          # Claude Code hooks
│   ├── agents/                # Service agent definitions
│   └── skills/                # Pre-installed slash commands
├── .jfl/
│   └── config.json            # Project configuration
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
│   └── TASKS.md
├── content/                   # Generated marketing content
├── previews/                  # Asset previews
├── suggestions/               # Per-contributor workspaces
├── scripts/
│   └── session/               # Session management scripts
├── templates/                 # Doc templates for reference
└── crm                        # CRM CLI (Google Sheets)
```

## How It Gets Used

1. User runs `jfl init -n my-project`
2. CLI clones this template into `./my-project`
3. Replaces placeholder values in config
4. User starts working — `claude` fires SessionStart hooks automatically

## Updating the Template

Changes here propagate to new projects only. Existing projects update via `jfl update` which pulls skills, scripts, and templates while preserving user content.

## Related Repos

| Repo | Purpose |
|------|---------|
| [jfl-cli](https://github.com/402goose/jfl-cli) | CLI tool that uses this template |
| jfl-platform | Hosted platform (dashboard, auth, billing) |

## License

MIT License
