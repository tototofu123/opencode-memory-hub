import path from "node:path"

function normalizeAbsolute(p) {
  const resolved = path.resolve(String(p || ""))
  return resolved.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase()
}

function isWithin(target, root) {
  const t = normalizeAbsolute(target)
  const r = normalizeAbsolute(root)
  return t === r || t.startsWith(`${r}/`)
}

function isDestructiveShell(command) {
  const c = String(command || "").toLowerCase()
  const patterns = [
    /(^|\s)rm\s+-rf\b/,
    /(^|\s)rm\s+-r\b/,
    /(^|\s)del\s+(\/s|\/q|\/f)\b/,
    /(^|\s)rmdir\s+(\/s|\/q)\b/,
    /(^|\s)rd\s+(\/s|\/q)\b/,
    /remove-item\s+.*-recurse/i,
    /remove-item\s+.*-force/i,
    /\bri\b\s+.*-recurse/i,
    /git\s+reset\s+--hard/,
    /git\s+checkout\s+--\s*\./,
    /git\s+clean\s+-fd/,
    /git\s+clean\s+-fdx/,
    /format\s+[a-z]:/,
  ]
  return patterns.some((re) => re.test(c))
}

export const SafetyGuardPlugin = async ({ directory, worktree }) => {
  const allowedRoots = [directory, worktree].filter(Boolean)

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const cmd = output.args?.command || ""
        if (isDestructiveShell(cmd)) {
          throw new Error("SafetyGuard: destructive shell command blocked")
        }
      }

      if (["write", "edit", "delete", "move", "rename"].includes(input.tool)) {
        const filePath = output.args?.filePath || ""
        if (filePath && !allowedRoots.some((root) => isWithin(filePath, root))) {
          throw new Error("SafetyGuard: file path is outside current project scope")
        }
      }

      if (input.tool === "write") {
        const content = String(output.args?.content || "")
        if (content.length > 20000) {
          throw new Error("SafetyGuard: large write blocked; use smaller incremental edits")
        }
      }
    },
  }
}
