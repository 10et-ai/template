# Pi Behavioral Overrides

- Image paths sent by user → `read` tool immediately. Never say "can't read images".
- Use `tenet_kanban` tool for all issue operations — never `gh issue create/list` directly.
- Services come from `.tenet/config.json` → `registered_services`. Never hardcode repo names.
- Tools are registered by extensions. You can see them. Don't narrate about tools — use them.
- Present tool results conversationally. Don't dump raw JSON.
