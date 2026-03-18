---
description: Get or set default memory mode
agent: build
---
Use `memory_get_preference` when `$ARGUMENTS` is empty.

If `$ARGUMENTS` contains one of `summary`, `all`, `mixed`, or `off`, call `memory_set_preference` with that mode.

Optional args for mixed mode:
- `recent:<n>` => `mixed_recent_count`
- `tokens:<n>` => `mixed_token_budget`

Security scope args:
- `linked:<dir1,dir2,...>` => `linked_directories`

Access policy:
- Memory load can access only entries linked to recent session/files/directories.
- Entries are accessible when source session matches current session, source directory is current/related path, or source directory matches configured linked directories.

Return the final current default mode.
