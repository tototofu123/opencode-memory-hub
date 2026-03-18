---
description: List or load memory entries
agent: build
---
Use `memory_list` only.

Rules:
- Empty args => call `memory_list` with `limit: 10`.
- If args contain `id:<number>`, call `memory_list` with that `id`.
- If args contain `--mode all` or `--mode summary`, pass `mode`.
- If args contain `category:<name>`, pass `category`.
- If args contain `--best`, pass `best_only: true`.
- If args contain `--top <n>`, pass `top_k: <n>`.
- Remaining text becomes `query`.

Output expectation:
- Two-line format per hit.
- Line 1: id + relative directory + title.
- Line 2: one-line summary + latest line.
- For empty args, return sequential sections: global recent 10, current-dir recent 2, path-related recent 1.
