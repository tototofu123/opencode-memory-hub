---
name: memory-keeper
description: Save text to memory and load past memory with concise or full context. Includes auto-save for long tasks and numbered task progress tracking.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: memory
---

## What I do

- Save user-provided text into memory entries.
- Load past memory by query, category, or id.
- Return concise summaries by default, and full context when requested.
- Auto-compress large content (>5000 chars) on save.
- Auto-extract compressed content on load when viewing full content.
- Auto-save memory during long-duration tasks via token-efficient subagent.
- Track numbered task completions with emoji notifications and git commits.

## When to use me

- Use when the user asks to remember context across sessions.
- Use when building ongoing features where decisions should not be lost.

## Working style

- Prefer concise summaries unless user asks for full details.
- Keep titles specific and categories consistent.

## Auto-compression rules

- Content >5000 chars is automatically compressed using gzip before saving.
- When loading with `mode:all`, compressed entries are automatically extracted.
- Compressed entries show `[compressed]` marker in summaries.

## Tool usage

### Save (auto-compress enabled)
- `memory_add(title, content, tags?, category?)` - compresses if >5000 chars

### Load (auto-extract enabled)
- `memory_list(query?, category?, mode?)` - extracts compressed in full modes
- `memory_search(id, mode:all)` - extracts compressed content

### Explicit compress/extract (rarely needed)
- `memory_compress(text)` - get compressed base64 string
- `memory_extract(compressed)` - restore original text

## Dynamic auto-save integration

When `task-workflow` skill triggers auto-save:
- Save location: current session context
- Category: `session-state` (for task progress)
- Tags should include: `auto-save`, `task-progress`, current phase name
- Content: Concise summary (max 500 chars) of:
  - What was completed
  - What remains to do
  - Current file/changes being worked on

### Auto-save triggers
- After ~2 minutes of continuous work on multi-item tasks
- After completing each significant sub-task in a numbered list
- When user explicitly requests "save progress"

### Dynamic timing rules
- Simple task (1-2 items): Skip auto-save
- Medium task (3-4 items): Save after 1st completion
- Complex task (5+ items): Save every 2 completions
- Task complexity affects save frequency

## Integration with task-workflow

task-workflow triggers memory saves at optimal moments:
- Prefers concise summaries (180 chars default)
- Uses session-state category for task progress
- Provides tags that enable easy retrieval via memory_list
