# memory-hub

memory-hub - OpenCode plugin

Current Version: `0.6.0`

## Commands

- `/memory-list` - List or load memory entries
- `/memory-save` - Save a memory entry (title/category/tags/content)
- `/memory-setting` - Get or set default memory mode
- `/task-save` - Save current task progress to memory (auto-save)
- `/update-readme` - Auto-generate or update README.md based on repo structure

## Skills

- **auto-readme**: Auto-generate and update README.md based on repo structure, skills, commands, and git changes
- **build-mode-reminder**: Save and load the exact build mode system-reminder text in memory
- **memory-keeper**: Save text to memory and load past memory with concise or full context. Includes auto-save for long tasks and numbered task progress tracking.
- **task-workflow**: Smart task tracking with auto-commit, progress notifications, and dynamic memory saves

## File Structure

```text
memory-hub/
.gitignore
.opencode/
   .opencode/commands/
      .opencode/commands/memory-list.md
      .opencode/commands/memory-save.md
      .opencode/commands/memory-setting.md
      .opencode/commands/task-save.md
      .opencode/commands/update-readme.md
   .opencode/plugins/
      .opencode/plugins/auto-readme-plugin.js
      .opencode/plugins/memory-plugin.js
      .opencode/plugins/safety-guard.js
   .opencode/skills/
      .opencode/skills/auto-readme/
         .opencode/skills/auto-readme/SKILL.md
      .opencode/skills/build-mode-reminder/
         .opencode/skills/build-mode-reminder/SKILL.md
      .opencode/skills/memory-keeper/
         .opencode/skills/memory-keeper/SKILL.md
      .opencode/skills/task-workflow/
         .opencode/skills/task-workflow/SKILL.md
bun.lock
MAINTAINER-CHECKLIST.md
opencode.json
package.json
README.md
scripts/
   scripts/version-bump.mjs
TEST-QUESTIONS.md
VERSIONING.md
```

## Scripts

- `version:check`: `node ./scripts/version-bump.mjs --dry-run`
- `version:bump`: `node ./scripts/version-bump.mjs`
- `version:major`: `node ./scripts/version-bump.mjs --level=major`
- `version:intermediate`: `node ./scripts/version-bump.mjs --level=intermediate`
- `version:small`: `node ./scripts/version-bump.mjs --level=small`

## Quick Start

```bash
bun install
opencode
```

## Latest Update

`affa4a7` - feat: add auto-readme skill and plugin for auto-generating README.md
