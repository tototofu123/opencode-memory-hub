# Maintainer Privacy Checklist

Use this before every public push.

## 1) Personal data scan

Run quick scans and confirm no personal paths/emails are in tracked files:

```bash
git grep -n "C:/Users/|/home/|@gmail.com|@outlook.com|totot" -- . ":(exclude).opencode/data/*"
```

Expected: no matches in tracked project files.

## 2) Keep runtime memory private

These must stay ignored and never be committed:

- `.opencode/data/memory.json`
- `.opencode/data/preferences.json`
- `.env`
- `.env.*`

## 3) Verify tracked set

```bash
git status --short
git ls-files
```

Confirm only intended files are tracked.

## 4) Optional clean release check

```bash
bun run version:check
```

Then bump + commit + push.
