---
name: auto-readme
description: Auto-generate and update README.md based on repo structure, skills, commands, and git changes
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: documentation
---

## What I do

Automatically generate/update README.md when pushing to GitHub by:
1. Scanning repo structure (files, folders, skills, commands, plugins)
2. Detecting git changes since last commit
3. Reading version info from package.json
4. Detecting available commands from `.opencode/commands/`
5. Detecting skills from `.opencode/skills/*/SKILL.md`
6. Generating clean markdown documentation

## When to trigger

**Trigger conditions (any of):**
- Before `git push` when README.md exists and needs updating
- When `/update-readme` command is invoked
- After version bump (package.json changes)
- When new skills/commands are added

**Skip conditions:**
- Repo has no `.opencode/` directory
- No significant changes detected
- README.md was manually updated recently (<5 min ago)

## Generation rules

### 1. Title block
```
# [Repo Name]

[Description from opencode.json or package.json description field]

Current Version: `[version from package.json]`
```

### 2. Auto-detect sections

**For skills:** Extract from each `SKILL.md`:
- Skill name
- Description
- Key features

**For commands:** Extract from each `.opencode/commands/*.md`:
- Command name (from filename)
- Description
- Usage template

**For plugins:** Detect from `.opencode/plugins/*.js`:
- Plugin name (from filename)
- Auto-describe based on exports

### 3. Tree map generation

Generate directory tree excluding:
- `node_modules/`
- `.git/`
- `.opencode/data/*`
- `*.lock` files
- OS-specific files

### 4. Command reference

Auto-list all commands from `.opencode/commands/`:
```
## Commands
- `/[command-name]` - [description]
```

### 5. Skill reference

Auto-list all skills from `.opencode/skills/`:
```
## Skills
- **[skill-name]**: [description]
```

### 6. Git workflow section

Detect and document if:
- Version bump scripts exist
- Git hooks are configured
- Maintainer checklists exist
- Auto-commit workflows are present

### 7. Changelog generation

Compare git log to detect:
- Latest commit message
- Changes since last version tag
- Breaking changes marker

## Generation format

```markdown
# [Repo Name]

[Description - 1-2 sentences]

Current Version: `[version]`

## Quick Start
[Auto-generated from package.json scripts and README patterns]

## Commands
[Auto-list from .opencode/commands/]

## Skills
[Auto-list from .opencode/skills/]

## Features
[Auto-detect from skills and plugins]

## File Structure
[Auto-generated tree map]

## Git Workflows
[Auto-detect from scripts/ and hooks/]

## Contributing
[Standard section or skip if exists]
```

## Tool usage

### For file detection
- `glob` - Find all skills, commands, plugins
- `read` - Get content from SKILL.md files for auto-description

### For version info
- `read` package.json for version field
- `read` VERSIONING.md for policy

### For git info
- `Bash git log -1 --format="%H %s"` - Get latest commit
- `Bash git diff --name-only HEAD~1` - Get changed files

### For writing
- `write` - Create/update README.md
- `edit` - Update specific sections (prefer write for full refresh)

## Edge cases

- If multiple SKILL.md have same name, disambiguate by path
- If no description found, use filename-based fallback
- Preserve existing README sections that aren't auto-generated
- Keep README under 200 lines; link to detailed docs
- If repo is empty (no meaningful files), skip README generation

## Integration with task-workflow

This skill complements task-workflow by:
- Triggering before git push operations
- Using version bump info from versioning scripts
- Including git commit history in documentation
- Auto-updating after meaningful changes

## Example output

Given this structure:
```
repo/
├─ package.json (version: 1.2.0)
├─ .opencode/
│  ├─ commands/
│  │  ├─ memory-save.md
│  │  └─ memory-list.md
│  └─ skills/
│     └─ memory-keeper/
│        └─ SKILL.md
```

Generates:
```markdown
# Memory Hub

Local memory storage for OpenCode CLI sessions.

Current Version: `1.2.0`

## Commands
- `/memory-save` - Save a memory entry
- `/memory-list` - List memory entries

## Skills
- **memory-keeper**: Save and load past memory with concise context
```
