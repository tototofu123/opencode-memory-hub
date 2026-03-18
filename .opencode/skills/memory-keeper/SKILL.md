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

## When to use me

- Use when the user asks to remember context across sessions.
- Use when building ongoing features where decisions should not be lost.

## Working style

- Prefer concise summaries unless user asks for full details.
- Keep titles specific and categories consistent.

## Tool usage

- Save text: call `memory_add`.
- Load memory: call `memory_list` with query/category/id and mode.
