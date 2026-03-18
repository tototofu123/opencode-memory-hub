# OpenCode Memory Hub

Simple local memory for OpenCode that works in terminal-based CLI/IDE sessions.

## 1) Title and Description

- **Title:** OpenCode Memory Hub
- **Description:** A project-local memory layer that lets you save and retrieve past session knowledge with `/memory-save`, `/memory-list`, and `/memory-setting`.

## 2) What It Does

- Stores memory entries locally in `.opencode/data/memory.json`.
- Retrieves relevant past entries by keyword/category (default: summary mode) with ranked top results.
- Supports full content mode when needed.
- Saves default load preference (`summary`, `all`, `mixed`, or `off`) in `.opencode/data/preferences.json`.
- Supports `mixed` mode: summary list + a few recent full entries within token budget.

`/memory-list` behavior:
- No args: sequential sections (global recent 10, current-dir recent 2, path-related recent 1).
- Query args: returns top ranked hits (default top 3, or best only).
- Each hit is formatted as two lines: header + summary/latest.
- Similar near-duplicate entries are collapsed automatically to reduce repeated output.

## 3) Tree Map

```text
opencode memory hub/
├─ README.md
├─ package.json
├─ .gitignore
├─ TEST-QUESTIONS.md
├─ opencode.json
├─ .opencode/
│  ├─ plugins/
│  │  └─ memory-plugin.js
│  ├─ commands/
│  │  ├─ memory-save.md
│  │  ├─ memory-list.md
│  │  └─ memory-setting.md
│  ├─ skills/
│  │  └─ memory-keeper/
│  │     └─ SKILL.md
│  └─ data/
│     └─ .gitkeep
└─ session-log/
   ├─ 2026-03-18-opencode-memory-hub-planning.md
   └─ 2026-03-18-full-conversation-transcript.md
```

## 4) Tech Stack

- JavaScript (ESM)
- OpenCode plugin API (`@opencode-ai/plugin`)
- Local JSON storage (no external DB required)
- OpenCode custom commands (`.opencode/commands/*.md`)
- OpenCode skills (`.opencode/skills/*/SKILL.md`)

## Quick Start

1. Install dependency:

```bash
bun install
```

2. Start OpenCode in this folder:

```bash
opencode
```

3. Try commands in chat:

- `/memory-save`
- `/memory-list auth`
- `/memory-list id:1`
- `/memory-setting summary`

## Command Reference

- `/memory-save title:<text> category:<text> tags:<comma,separated> content:<text>`
- `/memory-list` (global 10 + current-dir 2 + related 1)
- `/memory-list <query>` (ranked top 3)
- `/memory-list <query> --best`
- `/memory-list <query> --top 5`
- `/memory-list id:<n>`
- `/memory-list category:<name> --mode summary|all|mixed`
- `/memory-setting` (show current)
- `/memory-setting summary|all|mixed|off`
- `/memory-setting mixed recent:3 tokens:900`

## Before Git Push

1. Restart OpenCode once so latest command/plugin changes are loaded.
2. Smoke test commands:
   - `/memory-save title:Push Check category:ops tags:test content:ready to push`
   - `/memory-list`
   - `/memory-list push --best`
   - `/memory-setting`
3. Verify local files:
   - `.opencode/plugins/memory-plugin.js`
   - `.opencode/commands/memory-save.md`
   - `.opencode/commands/memory-list.md`
   - `.opencode/commands/memory-setting.md`
   - `README.md`
4. Push:

```bash
git add .
git commit -m "feat: add memory hub plugin and command workflow"
git push origin <your-branch>
```

## Versioning

- This repo uses `x.y.z`.
- Use `bun run version:check` to preview bump level.
- Use `bun run version:bump` to auto-bump version.
- See full policy in `VERSIONING.md`.

## Notes

- This implementation is project-local. If you want global memory across projects, we can add a global plugin/data path next.
