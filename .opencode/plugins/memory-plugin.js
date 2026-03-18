import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"

const DEFAULT_MODE = "summary"
const DEFAULT_MIXED_RECENT = 2
const DEFAULT_MIXED_TOKEN_BUDGET = 600
const DEFAULT_LINKED_DIRECTORIES = []

function dataPaths(directory) {
  const dataDir = path.join(directory, ".opencode", "data")
  return {
    dataDir,
    memoryFile: path.join(dataDir, "memory.json"),
    prefFile: path.join(dataDir, "preferences.json"),
  }
}

async function ensureDataFiles(directory) {
  const { dataDir, memoryFile, prefFile } = dataPaths(directory)
  await mkdir(dataDir, { recursive: true })

  try {
    await readFile(memoryFile, "utf8")
  } catch {
    await writeFile(memoryFile, JSON.stringify({ entries: [] }, null, 2), "utf8")
  }

  try {
    await readFile(prefFile, "utf8")
  } catch {
    await writeFile(
      prefFile,
      JSON.stringify(
        {
          load_mode: DEFAULT_MODE,
          mixed_recent_count: DEFAULT_MIXED_RECENT,
          mixed_token_budget: DEFAULT_MIXED_TOKEN_BUDGET,
          linked_directories: DEFAULT_LINKED_DIRECTORIES,
        },
        null,
        2,
      ),
      "utf8",
    )
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8")
}

function normalizeTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) {
    return tags.map((x) => String(x).trim()).filter(Boolean)
  }
  return String(tags)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function summarize(text, max = 240) {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max)}...`
}

function lastLine(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
  return lines.length ? lines[lines.length - 1] : ""
}

function normalizePath(input) {
  return String(input || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase()
}

function safeRelative(baseDir, targetDir) {
  try {
    const rel = path.relative(baseDir, targetDir)
    return rel || "."
  } catch {
    return targetDir
  }
}

function pathRelationScore(sourceDir, currentDir) {
  const source = normalizePath(sourceDir)
  const current = normalizePath(currentDir)
  if (!source || !current) return 0
  if (source === current) return 3
  if (source.startsWith(`${current}/`) || current.startsWith(`${source}/`)) return 2
  const sourceParts = source.split("/")
  const currentParts = current.split("/")
  const overlap = sourceParts.filter((p) => currentParts.includes(p)).length
  return overlap >= 2 ? 1 : 0
}

function renderTwoLine(entry, currentDir, mode) {
  const relDir = safeRelative(currentDir, entry.source_directory || "")
  const body = mode === "all" ? String(entry.content || "") : summarize(String(entry.content || ""), 180)
  const latest = summarize(lastLine(entry.content || ""), 80)
  const tagStr = Array.isArray(entry.tags) && entry.tags.length ? ` tags=[${entry.tags.join(",")}]` : ""
  const dup = Number(entry._dup_count || 1)
  const dupLabel = dup > 1 ? ` ~${dup} similar` : ""
  const line1 = `#${entry.id} [${relDir}] ${entry.title}${tagStr}${dupLabel}`
  const line2 = `summary: ${body}${latest ? ` | latest: ${latest}` : ""}`
  return `${line1}\n${line2}`
}

function normalizeDirList(input) {
  if (!input) return []
  if (Array.isArray(input)) return input.map((x) => String(x).trim()).filter(Boolean)
  return String(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function isEntryAccessible(entry, context, linkedDirs) {
  if (entry.source_session && entry.source_session === context.sessionID) return true
  if (pathRelationScore(entry.source_directory, context.directory) >= 1) return true
  for (const dir of linkedDirs) {
    if (pathRelationScore(entry.source_directory, dir) >= 2) return true
  }
  return false
}

function scoreEntry(entry, query) {
  if (!query) return 0
  const q = query.toLowerCase()
  let score = 0
  if ((entry.title || "").toLowerCase().includes(q)) score += 4
  if ((entry.category || "").toLowerCase().includes(q)) score += 3
  if ((entry.content || "").toLowerCase().includes(q)) score += 2
  if ((entry.tags || []).some((t) => t.toLowerCase().includes(q))) score += 2
  return score
}

function similarityTokens(entry) {
  const raw = `${entry.title || ""} ${entry.content || ""}`.toLowerCase()
  return raw
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  if (!a.size && !b.size) return 1
  let inter = 0
  for (const t of a) {
    if (b.has(t)) inter += 1
  }
  const union = a.size + b.size - inter
  return union ? inter / union : 0
}

function collapseSimilarEntries(entries, threshold = 0.82) {
  const unique = []
  for (const entry of entries) {
    const tokens = similarityTokens(entry)
    let match = null
    for (const candidate of unique) {
      const score = jaccard(tokens, candidate._sim_tokens || [])
      if (score >= threshold) {
        match = candidate
        break
      }
    }
    if (match) {
      match._dup_count = Number(match._dup_count || 1) + 1
      match._merged_ids = [...(match._merged_ids || [match.id]), entry.id]
      continue
    }
    unique.push({ ...entry, _dup_count: 1, _merged_ids: [entry.id], _sim_tokens: tokens })
  }
  return unique
}

function collapseRankedEntries(ranked, threshold = 0.82) {
  const unique = []
  for (const item of ranked) {
    const tokens = similarityTokens(item.e)
    let match = null
    for (const candidate of unique) {
      const score = jaccard(tokens, candidate._sim_tokens || [])
      if (score >= threshold) {
        match = candidate
        break
      }
    }
    if (match) {
      match.e._dup_count = Number(match.e._dup_count || 1) + 1
      match.e._merged_ids = [...(match.e._merged_ids || [match.e.id]), item.e.id]
      continue
    }
    unique.push({ ...item, _sim_tokens: tokens, e: { ...item.e, _dup_count: 1, _merged_ids: [item.e.id] } })
  }
  return unique
}

function validateMode(mode) {
  return mode === "summary" || mode === "all" || mode === "mixed" || mode === "off"
}

function approxTokens(text) {
  const chars = String(text || "").length
  return Math.ceil(chars / 4)
}

export const MemoryPlugin = async () => {
  return {
    tool: {
      memory_add: tool({
        description: "Save a memory entry with title/category/tags/content",
        args: {
          title: tool.schema.string().min(1),
          category: tool.schema.string().optional(),
          tags: tool.schema.union([tool.schema.array(tool.schema.string()), tool.schema.string()]).optional(),
          content: tool.schema.string().min(1),
        },
        async execute(args, context) {
          await ensureDataFiles(context.directory)
          const { memoryFile } = dataPaths(context.directory)
          const db = await readJson(memoryFile, { entries: [] })
          const entries = Array.isArray(db.entries) ? db.entries : []
          const nextID = entries.length ? Math.max(...entries.map((e) => Number(e.id) || 0)) + 1 : 1
          const now = new Date().toISOString()

          const entry = {
            id: nextID,
            title: args.title.trim(),
            category: (args.category || "general").trim(),
            tags: normalizeTags(args.tags),
            content: args.content.trim(),
            source_session: context.sessionID,
            source_directory: context.directory,
            created_at: now,
            updated_at: now,
          }

          entries.push(entry)
          await writeJson(memoryFile, { entries })
          return `Saved memory #${entry.id}: ${entry.title}`
        },
      }),

      memory_search: tool({
        description: "Search memory entries by query/category and return summary or full content",
        args: {
          id: tool.schema.number().int().min(1).optional(),
          query: tool.schema.string().optional(),
          category: tool.schema.string().optional(),
          mode: tool.schema.enum(["summary", "all", "mixed"]).optional(),
          limit: tool.schema.number().int().min(1).max(50).optional(),
        },
        async execute(args, context) {
          await ensureDataFiles(context.directory)
          const { memoryFile, prefFile } = dataPaths(context.directory)
          const db = await readJson(memoryFile, { entries: [] })
          const pref = await readJson(prefFile, {
            load_mode: DEFAULT_MODE,
            mixed_recent_count: DEFAULT_MIXED_RECENT,
            mixed_token_budget: DEFAULT_MIXED_TOKEN_BUDGET,
            linked_directories: DEFAULT_LINKED_DIRECTORIES,
          })
          const configuredMode = validateMode(pref.load_mode) ? pref.load_mode : DEFAULT_MODE
          const linkedDirs = normalizeDirList(pref.linked_directories)

          if (configuredMode === "off" && !args.mode) {
            return "Memory loading is currently off (preferences). Use memory_set_preference to change it."
          }

          const entries = Array.isArray(db.entries) ? db.entries : []
          const scopedEntries = entries.filter((e) => isEntryAccessible(e, context, linkedDirs))
          const limit = args.limit ?? 8
          const mode = args.mode ?? configuredMode
          const byID = args.id
          const query = (args.query || "").trim()
          const category = (args.category || "").trim().toLowerCase()

          if (byID !== undefined) {
            const found = scopedEntries.find((e) => Number(e.id) === byID)
            if (!found) return `Memory #${byID} not found.`
            const body = mode === "all" ? found.content : summarize(found.content)
            const tagLine = found.tags?.length ? ` tags=[${found.tags.join(", ")}]` : ""
            return `mode=${mode}, results=1\n\n#${found.id} | ${found.title} | category=${found.category}${tagLine}\n${body}`
          }

          let filtered = scopedEntries
          if (category) filtered = filtered.filter((e) => (e.category || "").toLowerCase() === category)

          if (query) {
            filtered = filtered
              .map((e) => ({ e, score: scoreEntry(e, query) }))
              .filter((x) => x.score > 0)
              .sort((a, b) => b.score - a.score || String(b.e.updated_at).localeCompare(String(a.e.updated_at)))
              .map((x) => x.e)
          } else {
            filtered = [...filtered].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
          }

          const top = filtered.slice(0, limit)
          if (!top.length) return "No accessible memory entries found for that query/category."

          const lines = top.map((e) => {
            const body = mode === "all" ? e.content : summarize(e.content)
            const tagLine = e.tags?.length ? ` tags=[${e.tags.join(", ")}]` : ""
            return `#${e.id} | ${e.title} | category=${e.category}${tagLine}\n${body}`
          })

          return `mode=${mode}, results=${top.length}\n\n${lines.join("\n\n")}`
        },
      }),

      memory_list: tool({
        description: "List or load memory with ranked query and directory-aware sections",
        args: {
          query: tool.schema.string().optional(),
          category: tool.schema.string().optional(),
          mode: tool.schema.enum(["summary", "all", "mixed"]).optional(),
          limit: tool.schema.number().int().min(1).max(100).optional(),
          top_k: tool.schema.number().int().min(1).max(20).optional(),
          best_only: tool.schema.boolean().optional(),
          id: tool.schema.number().int().min(1).optional(),
        },
        async execute(args, context) {
          await ensureDataFiles(context.directory)
          const { memoryFile, prefFile } = dataPaths(context.directory)
          const db = await readJson(memoryFile, { entries: [] })
          const pref = await readJson(prefFile, {
            load_mode: DEFAULT_MODE,
            mixed_recent_count: DEFAULT_MIXED_RECENT,
            mixed_token_budget: DEFAULT_MIXED_TOKEN_BUDGET,
            linked_directories: DEFAULT_LINKED_DIRECTORIES,
          })
          const configuredMode = validateMode(pref.load_mode) ? pref.load_mode : DEFAULT_MODE
          const mode = args.mode ?? configuredMode
          const mixedRecentCount = Number(pref.mixed_recent_count) || DEFAULT_MIXED_RECENT
          const mixedTokenBudget = Number(pref.mixed_token_budget) || DEFAULT_MIXED_TOKEN_BUDGET
          const linkedDirs = normalizeDirList(pref.linked_directories)
          const entries = Array.isArray(db.entries) ? db.entries : []
          const scopedEntries = entries.filter((e) => isEntryAccessible(e, context, linkedDirs))
          if (!scopedEntries.length) return "No accessible memory entries yet."

          if (configuredMode === "off" && !args.mode) {
            return "Memory loading is off by default. Use /memory-setting summary or pass --mode summary/all."
          }

          if (args.id !== undefined) {
            const found = scopedEntries.find((e) => Number(e.id) === args.id)
            if (!found) return `Memory #${args.id} not found.`
            return renderTwoLine(found, context.directory, "all")
          }

          const category = (args.category || "").trim().toLowerCase()
          const query = (args.query || "").trim()

          let filtered = scopedEntries
          if (category) {
            filtered = filtered.filter((e) => (e.category || "").toLowerCase() === category)
          }

          if (query) {
            let ranked = filtered
              .map((e) => {
                const base = scoreEntry(e, query)
                const dirBias = pathRelationScore(e.source_directory, context.directory)
                const score = base + dirBias
                return { e, score }
              })
              .filter((x) => x.score > 0)
              .sort((a, b) => b.score - a.score || String(b.e.updated_at).localeCompare(String(a.e.updated_at)))

            ranked = collapseRankedEntries(ranked)

            if (!ranked.length) {
              return `NO_DB_MATCH query=${query}`
            }

            const topK = args.best_only ? 1 : args.top_k ?? 3
            const picked = ranked.slice(0, topK)
            const confidence = picked.length > 1 ? picked[0].score / Math.max(1, picked[1].score) : picked[0].score
            const confident = confidence >= 1.4

            const listMode = mode === "mixed" ? "summary" : mode
            const out = picked.map((x) => renderTwoLine(x.e, context.directory, listMode)).join("\n\n")
            if (mode !== "mixed") {
              return `RANKED_RESULTS top=${picked.length} confident=${confident}\n\n${out}`
            }

            let usedTokens = 0
            const mixedLines = []
            for (const item of picked.slice(0, mixedRecentCount)) {
              const full = String(item.e.content || "")
              const cost = approxTokens(full)
              if (usedTokens + cost > mixedTokenBudget) break
              usedTokens += cost
              mixedLines.push(`#${item.e.id} full-context\n${full}`)
            }
            const mixedBlock = mixedLines.length ? mixedLines.join("\n\n") : "None"
            return `RANKED_RESULTS top=${picked.length} confident=${confident} mode=mixed\n\n${out}\n\nMIXED_RECENT_CONTEXT used_tokens=${usedTokens}/${mixedTokenBudget} recent_limit=${mixedRecentCount}\n${mixedBlock}`
          }

          const globalLimit = args.limit ?? 10
          const sorted = [...filtered].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
          const uniqueSorted = collapseSimilarEntries(sorted)
          const globalRecent = uniqueSorted.slice(0, globalLimit)

          const exactDir = uniqueSorted.filter(
            (e) => normalizePath(e.source_directory) === normalizePath(context.directory),
          )
          const currentDirRecent = exactDir.slice(0, 2)

          const related = uniqueSorted
            .filter((e) => pathRelationScore(e.source_directory, context.directory) >= 1)
            .filter((e) => normalizePath(e.source_directory) !== normalizePath(context.directory))
          const relatedRecent = related.slice(0, 1)

          const listMode = mode === "mixed" ? "summary" : mode
          const sectionA = globalRecent.map((e) => renderTwoLine(e, context.directory, listMode)).join("\n\n")
          const sectionB = currentDirRecent.length
            ? currentDirRecent.map((e) => renderTwoLine(e, context.directory, listMode)).join("\n\n")
            : "None"
          const sectionC = relatedRecent.length
            ? relatedRecent.map((e) => renderTwoLine(e, context.directory, listMode)).join("\n\n")
            : "None"

          if (mode !== "mixed") {
            return `SEQ1 GLOBAL_RECENT_${globalLimit}\n${sectionA}\n\nSEQ2 CURRENT_DIR_RECENT_2\n${sectionB}\n\nSEQ3 PATH_RELATED_RECENT_1\n${sectionC}`
          }

          const mixedSource = [...currentDirRecent, ...relatedRecent, ...globalRecent]
          const dedup = []
          const seen = new Set()
          for (const e of mixedSource) {
            if (seen.has(e.id)) continue
            seen.add(e.id)
            dedup.push(e)
          }

          let usedTokens = 0
          const mixedLines = []
          for (const e of dedup.slice(0, mixedRecentCount)) {
            const full = String(e.content || "")
            const cost = approxTokens(full)
            if (usedTokens + cost > mixedTokenBudget) break
            usedTokens += cost
            mixedLines.push(`#${e.id} full-context\n${full}`)
          }
          const mixedBlock = mixedLines.length ? mixedLines.join("\n\n") : "None"
          return `SEQ1 GLOBAL_RECENT_${globalLimit}\n${sectionA}\n\nSEQ2 CURRENT_DIR_RECENT_2\n${sectionB}\n\nSEQ3 PATH_RELATED_RECENT_1\n${sectionC}\n\nSEQ4 MIXED_RECENT_CONTEXT used_tokens=${usedTokens}/${mixedTokenBudget} recent_limit=${mixedRecentCount}\n${mixedBlock}`
        },
      }),

      memory_update: tool({
        description: "Update title/category/tags/content for a memory entry by ID",
        args: {
          id: tool.schema.number().int().min(1),
          title: tool.schema.string().optional(),
          category: tool.schema.string().optional(),
          tags: tool.schema.union([tool.schema.array(tool.schema.string()), tool.schema.string()]).optional(),
          content: tool.schema.string().optional(),
        },
        async execute(args, context) {
          await ensureDataFiles(context.directory)
          const { memoryFile } = dataPaths(context.directory)
          const db = await readJson(memoryFile, { entries: [] })
          const entries = Array.isArray(db.entries) ? db.entries : []
          const idx = entries.findIndex((e) => Number(e.id) === args.id)
          if (idx < 0) return `Memory #${args.id} not found.`

          const current = entries[idx]
          if (args.title !== undefined) current.title = args.title.trim()
          if (args.category !== undefined) current.category = args.category.trim()
          if (args.tags !== undefined) current.tags = normalizeTags(args.tags)
          if (args.content !== undefined) current.content = args.content.trim()
          current.updated_at = new Date().toISOString()

          entries[idx] = current
          await writeJson(memoryFile, { entries })
          return `Updated memory #${args.id}.`
        },
      }),

      memory_set_preference: tool({
        description: "Set default memory load mode (summary, all, mixed, off)",
        args: {
          mode: tool.schema.enum(["summary", "all", "mixed", "off"]),
          mixed_recent_count: tool.schema.number().int().min(1).max(20).optional(),
          mixed_token_budget: tool.schema.number().int().min(100).max(12000).optional(),
          linked_directories: tool.schema.union([tool.schema.array(tool.schema.string()), tool.schema.string()]).optional(),
        },
        async execute(args, context) {
          await ensureDataFiles(context.directory)
          const { prefFile } = dataPaths(context.directory)
          const current = await readJson(prefFile, {
            load_mode: DEFAULT_MODE,
            mixed_recent_count: DEFAULT_MIXED_RECENT,
            mixed_token_budget: DEFAULT_MIXED_TOKEN_BUDGET,
            linked_directories: DEFAULT_LINKED_DIRECTORIES,
          })
          const next = {
            load_mode: args.mode,
            mixed_recent_count:
              args.mixed_recent_count ?? (Number(current.mixed_recent_count) || DEFAULT_MIXED_RECENT),
            mixed_token_budget:
              args.mixed_token_budget ??
              (Number(current.mixed_token_budget) || DEFAULT_MIXED_TOKEN_BUDGET),
            linked_directories:
              args.linked_directories !== undefined
                ? normalizeDirList(args.linked_directories)
                : normalizeDirList(current.linked_directories),
          }
          await writeJson(prefFile, next)
          return `Default mode='${next.load_mode}', mixed_recent_count=${next.mixed_recent_count}, mixed_token_budget=${next.mixed_token_budget}, linked_directories=${next.linked_directories.length}`
        },
      }),

      memory_get_preference: tool({
        description: "Get current default memory load mode",
        args: {},
        async execute(_args, context) {
          await ensureDataFiles(context.directory)
          const { prefFile } = dataPaths(context.directory)
          const pref = await readJson(prefFile, {
            load_mode: DEFAULT_MODE,
            mixed_recent_count: DEFAULT_MIXED_RECENT,
            mixed_token_budget: DEFAULT_MIXED_TOKEN_BUDGET,
            linked_directories: DEFAULT_LINKED_DIRECTORIES,
          })
          const mode = validateMode(pref.load_mode) ? pref.load_mode : DEFAULT_MODE
          return `Current default load mode: ${mode}; mixed_recent_count=${Number(pref.mixed_recent_count) || DEFAULT_MIXED_RECENT}; mixed_token_budget=${Number(pref.mixed_token_budget) || DEFAULT_MIXED_TOKEN_BUDGET}; linked_directories=${normalizeDirList(pref.linked_directories).length}`
        },
      }),
    },
  }
}
