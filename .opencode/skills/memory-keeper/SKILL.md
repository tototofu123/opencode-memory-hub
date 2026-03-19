---
name: memory-keeper
description: Save text to memory and load past memory with concise or full context
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
