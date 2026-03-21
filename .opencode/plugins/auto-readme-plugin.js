import { readdir, readFile, writeFile, stat } from "node:fs/promises"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"

const SKIP_DIRS = ["node_modules", ".git", "data"]
const SKIP_FILES = [".lock", ".DS_Store", "Thumbs.db"]

function shouldSkip(name, isDir) {
  if (isDir) return SKIP_DIRS.includes(name)
  return SKIP_FILES.includes(name)
}

async function buildTree(dir, parentPrefix = "") {
  const items = await readdir(dir, { withFileTypes: true })
  const lines = []

  for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dir, item.name)

    if (shouldSkip(item.name, item.isDirectory())) continue

    if (item.isDirectory()) {
      const dirPrefix = parentPrefix ? `${parentPrefix}/${item.name}` : item.name
      lines.push(`${dirPrefix}/`)
      const subTree = await buildTree(fullPath, dirPrefix)
      lines.push(...subTree.map((l) => `   ${l}`))
    } else {
      const filePath = parentPrefix ? `${parentPrefix}/${item.name}` : item.name
      lines.push(filePath)
    }
  }

  return lines
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  const fm = {}
  const lines = match[1].split("\n")

  for (const line of lines) {
    const [key, ...rest] = line.split(":")
    if (key && rest.length) {
      fm[key.trim()] = rest.join(":").trim()
    }
  }

  return fm
}

function extractDescription(skillContent) {
  const lines = skillContent.split("\n")
  let capture = false
  const descLines = []

  for (const line of lines) {
    if (line.startsWith("## What I do")) {
      capture = true
      continue
    }
    if (capture && line.startsWith("##") && !line.startsWith("###")) break
    if (capture && line.trim()) {
      descLines.push(line.replace(/^-\s*/, "").trim())
    }
  }

  return descLines.slice(0, 2).join(" ").substring(0, 120)
}

async function detectCommands(commandsDir) {
  const commands = []

  try {
    const files = await readdir(commandsDir)
    for (const file of files) {
      if (!file.endsWith(".md")) continue

      const fullPath = path.join(commandsDir, file)
      const content = await readFile(fullPath, "utf8")
      const fm = extractFrontmatter(content)

      commands.push({
        name: file.replace(".md", ""),
        description: fm.description || `Command: ${file}`,
      })
    }
  } catch {
    // Commands dir doesn't exist
  }

  return commands
}

async function detectSkills(skillsDir) {
  const skills = []

  try {
    const dirs = await readdir(skillsDir, { withFileTypes: true })
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue

      const skillPath = path.join(skillsDir, dir.name, "SKILL.md")
      try {
        const content = await readFile(skillPath, "utf8")
        const fm = extractFrontmatter(content)

        skills.push({
          name: dir.name,
          description: fm.description || extractDescription(content),
        })
      } catch {
        // No SKILL.md in this dir
      }
    }
  } catch {
    // Skills dir doesn't exist
  }

  return skills
}

function generateReadmeContent(repoName, packageJson, tree, commands, skills, latestCommit) {
  const version = packageJson?.version || "0.0.0"
  const description = packageJson?.description || `${repoName} - OpenCode plugin`

  let content = `# ${repoName}\n\n${description}\n\nCurrent Version: \`${version}\`\n`

  if (commands.length > 0) {
    content += "\n## Commands\n\n"
    for (const cmd of commands) {
      const cmdName = cmd.name.replace(/-/g, "-")
      content += `- \`/${cmd.name}\` - ${cmd.description}\n`
    }
  }

  if (skills.length > 0) {
    content += "\n## Skills\n\n"
    for (const skill of skills) {
      content += `- **${skill.name}**: ${skill.description}\n`
    }
  }

  content += "\n## File Structure\n\n```text\n"
  content += `${repoName}/\n`
  for (const line of tree) {
    content += `${line}\n`
  }
  content += "```\n"

  if (packageJson?.scripts && Object.keys(packageJson.scripts).length > 0) {
    content += "\n## Scripts\n\n"
    for (const [name, cmd] of Object.entries(packageJson.scripts)) {
      content += `- \`${name}\`: \`${cmd}\`\n`
    }
  }

  content += "\n## Quick Start\n\n"
  content += "```bash\n"
  if (packageJson?.dependencies?.["@opencode-ai/plugin"]) {
    content += "bun install\n"
  }
  content += "opencode\n"
  content += "```\n"

  if (latestCommit) {
    const [hash, ...msgParts] = latestCommit.split(" ")
    content += "\n## Latest Update\n\n"
    content += `\`${hash.substring(0, 7)}\` - ${msgParts.join(" ")}\n`
  }

  return content
}

export const AutoReadmePlugin = async () => {
  return {
    tool: {
      generate_readme: tool({
        description: "Auto-generate or update README.md based on repo structure, skills, commands, and git changes",
        args: {
          dry_run: tool.schema.boolean().optional(),
        },
        async execute(args, context) {
          const commandsDir = path.join(context.directory, ".opencode", "commands")
          const skillsDir = path.join(context.directory, ".opencode", "skills")
          const packageJsonPath = path.join(context.directory, "package.json")

          let packageJson = null
          try {
            const pkgContent = await readFile(packageJsonPath, "utf8")
            packageJson = JSON.parse(pkgContent)
          } catch {
            // No package.json
          }

          const repoName = path.basename(context.directory)

          const tree = await buildTree(context.directory)
          const commands = await detectCommands(commandsDir)
          const skills = await detectSkills(skillsDir)

          let latestCommit = null
          try {
            const { execSync } = await import("node:child_process")
            latestCommit = execSync("git log -1 --format=%H_%s", {
              cwd: context.directory,
              encoding: "utf8",
            }).trim().replace(/_/g, " ")
          } catch {
            // Not a git repo or git not available
          }

          const content = generateReadmeContent(repoName, packageJson, tree, commands, skills, latestCommit)

          if (args.dry_run) {
            return `DRY RUN - README would be:\n\n${content}`
          }

          const readmePath = path.join(context.directory, "README.md")
          await writeFile(readmePath, content, "utf8")

          return `README.md generated/updated at ${readmePath}\n\nCommands documented: ${commands.length}\nSkills documented: ${skills.length}`
        },
      }),
    },
  }
}
