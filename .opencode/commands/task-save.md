---
description: Save current task progress to memory (auto-save)
agent: build
---
Use the `memory_add` tool to save current task progress.

Extract from `$ARGUMENTS` or current context:
- title: Brief task name
- category: session-state
- tags: auto-save, task-progress, plus any relevant context tags
- content: Concise summary (max 500 chars) of completed work and remaining tasks

Keep content brief - this is for session recovery, not detailed documentation.
