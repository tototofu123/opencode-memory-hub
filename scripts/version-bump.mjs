import { readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const root = process.cwd()
const pkgPath = path.join(root, "package.json")

function runGit(args) {
  const out = spawnSync("git", args, { cwd: root, encoding: "utf8" })
  if (out.status !== 0) return ""
  return out.stdout || ""
}

function getChangedFiles() {
  let files = runGit(["diff", "--name-only", "--cached"])
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)

  if (!files.length) {
    files = runGit(["diff", "--name-only"])
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return files
}

function getDiffText() {
  let text = runGit(["diff", "--cached"])
  if (!text.trim()) text = runGit(["diff"])
  return text
}

function detectLevel(files, diffText) {
  const forced = process.argv.find((x) => x.startsWith("--level="))
  if (forced) {
    const v = forced.split("=")[1]
    if (["major", "intermediate", "small"].includes(v)) return v
  }

  if (/BREAKING CHANGE/i.test(diffText)) return "major"

  const intermediatePatterns = [
    /^\.opencode\/plugins\//,
    /^\.opencode\/commands\//,
    /^\.opencode\/skills\//,
    /^opencode\.json$/,
    /^package\.json$/,
    /^scripts\//,
  ]

  if (files.some((f) => intermediatePatterns.some((p) => p.test(f)))) {
    return "intermediate"
  }

  return "small"
}

function bump(version, level) {
  const [x, y, z] = version.split(".").map((n) => Number(n) || 0)
  if (level === "major") return `${x + 1}.0.0`
  if (level === "intermediate") return `${x}.${y + 1}.0`
  return `${x}.${y}.${z + 1}`
}

const dryRun = process.argv.includes("--dry-run")
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
const files = getChangedFiles()
const diffText = getDiffText()
const level = detectLevel(files, diffText)
const current = pkg.version || "0.1.0"
const next = bump(current, level)

if (dryRun) {
  console.log(`current=${current}`)
  console.log(`detected=${level}`)
  console.log(`next=${next}`)
  console.log(`changed_files=${files.length}`)
  process.exit(0)
}

pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8")
console.log(`Version bumped: ${current} -> ${next} (${level})`)
