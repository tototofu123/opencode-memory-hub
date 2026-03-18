# Versioning Guide (Manager)

This repo uses `x.y.z`:

- `x` = major (breaking change)
- `y` = intermediate (new feature or workflow change)
- `z` = small (fix/docs/tuning)

## Decision Rules

Use this order:

1. **Major (`x`)** when behavior is breaking for existing usage.
   - Examples: command removal/rename, incompatible response format changes, plugin contract changes.
2. **Intermediate (`y`)** when adding or expanding capabilities without breaking old usage.
   - Examples: new command, new mode (`mixed`), security scope option, new skill behavior.
3. **Small (`z`)** for non-breaking fixes or maintenance.
   - Examples: docs updates, typo fixes, ranking tweak, tests, README only.

## Automation

Use the script to auto-classify and bump:

```bash
bun run version:check
bun run version:bump
```

Manual override (if needed):

```bash
bun run version:major
bun run version:intermediate
bun run version:small
```

## Notes

- Auto mode checks staged diff first, then unstaged diff.
- Major bump is only auto-detected when diff includes explicit `BREAKING CHANGE` marker.
- If unsure between intermediate/small, pick intermediate.
