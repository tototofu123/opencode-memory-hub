---
name: task-workflow
description: Smart task tracking with auto-commit, progress notifications, and dynamic memory saves
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: task-management
---

## What I do

- Track numbered task lists (1., 2., 3. or 1) 2) 3) format) and commit after each completion
- Send emoji notifications when tasks are completed
- Trigger memory auto-save during long-duration tasks via token-efficient subagent
- Auto-commit and push for significant code changes during extended sessions

## Trigger detection

### Numbered tasks pattern
Recognize these formats in user input:
- `1. First task` / `2. Second task` / `3. Third task`
- `1) First task` / `2) Second task`
- `1: First task` / `2: Second task`
- Lines starting with single digits followed by punctuation

### Long task detection
Recognize long tasks by:
- Multiple sub-items in todo list (3+ items)
- Keywords: "implement", "refactor", "update all", "migrate", "bulk", "large"
- Explicit requests for comprehensive changes

## Behavior rules

### 1. Numbered task completion
When user lists numbered items and I complete one:
1. Output progress emoji (see emoji map below)
2. Git commit the changes with descriptive message
3. Git push if it's a meaningful completion point

Emoji map:
- Task started: `:rocket:` 
- Task 1 complete: `:one:`
- Task 2 complete: `:two:`
- Task 3 complete: `:three:`
- Task 4 complete: `:four:`
- Task 5+ complete: `:white_check_mark:`
- All done: `:tada:`

### 2. Auto-save memory (token-efficient subagent)
Trigger auto-save when:
- Long-duration task detected (3+ sub-tasks)
- Explicit "long task" or "this will take a while" signals
- After ~2 minutes of continuous work (estimate based on token usage)

**Token-efficient subagent invocation:**
Use the `general` subagent type with minimal prompt:
```
Save memory for current task progress.
Category: session-state
Tags: auto-save, task-progress, [current-phase]
Content: Brief summary of completed work and remaining tasks.
```
- Do NOT include full context
- Keep prompt under 500 chars
- Use memory_add tool directly if subagent overhead is too high

**Dynamic timing heuristics:**
- Simple task (1-2 items): No auto-save needed
- Medium task (3-4 items): Auto-save after 1st completion
- Complex task (5+ items): Auto-save every 2 completions
- Very complex: Auto-save every completion with brief summaries

### 3. Long task git workflow
For extended coding sessions with multiple changes:
- Auto-save progress to memory at dynamic intervals
- Commit with descriptive messages after significant milestones
- Push when task is fully complete or user requests

## Commit message format

For numbered tasks:
```
[<number>] <brief description of completed work>

<optional details>
```

Examples:
```
[1] Add user authentication module
[2] Update database schema and migrations
[3] Fix authentication flow edge cases
```

For auto-saves:
```
wip: <task-name> - progress save
```

## Tool usage

### For memory saves
- `memory_add(title, content, category?, tags?)` - primary for auto-saves

### For commits (via Bash)
- `git add .` / `git add <specific-files>`
- `git commit -m "<message>"`
- `git push` (only when explicitly safe or requested)

## Integration with memory-keeper

This skill complements memory-keeper by:
- Triggering memory saves at optimal moments
- Keeping summaries concise for future retrieval
- Using session-state category for task progress saves

## Edge cases

- If user explicitly says "don't commit", skip commits
- If memory save fails, continue task (don't block on save)
- For rapid completions (<30s apart), batch commits or skip notifications
- If subagent is unavailable, use direct memory_add call
