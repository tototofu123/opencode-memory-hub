---
description: Save a memory entry (title/category/tags/content)
agent: build
---
Use the `memory_add` tool to store a memory entry.

Parse `$ARGUMENTS` with this format when possible:
`title:<text> category:<text> tags:<comma,separated> content:<text>`

If some fields are missing, ask the user only for missing essentials and then save.
