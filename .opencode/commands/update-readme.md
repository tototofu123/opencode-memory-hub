---
description: Auto-generate or update README.md based on repo structure
agent: build
---
Use the `generate_readme` tool to create/update README.md.

Scan the repo structure and document:
- All commands from `.opencode/commands/`
- All skills from `.opencode/skills/`
- File tree structure
- Package.json scripts and version
- Latest git commit

If `--dry-run` is in arguments, return the content without writing.

Report what was detected and generated.
