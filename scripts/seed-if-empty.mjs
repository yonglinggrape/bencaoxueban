import { spawnSync } from "node:child_process"
import path from "node:path"
import Database from "better-sqlite3"

function sqlitePathFromUrl(url) {
  const value = url || "file:./dev.db"
  if (!value.startsWith("file:")) return value

  const rawPath = value.slice("file:".length)
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

function runSeed() {
  runCommand("npm", ["run", "seed"])
  runCommand("npx", ["tsx", "prisma/seed-mnemonics.ts"])
}

const dbPath = sqlitePathFromUrl(process.env.DATABASE_URL)
const db = new Database(dbPath)

try {
  const table = db
    .prepare("select name from sqlite_master where type = 'table' and name = 'HerbCard'")
    .get()

  if (!table) {
    console.log("[startup] HerbCard table not found after db push; running seed.")
    runSeed()
  } else {
    const { count } = db.prepare("select count(*) as count from HerbCard").get()
    const { incomplete } = db
      .prepare(`
        select count(*) as incomplete
        from HerbCard
        where latinName is null
          or properties is null
          or effects is null
          or usage is null
      `)
      .get()

    if (count < 400 || incomplete > 0) {
      console.log(`[startup] Herb data incomplete (${count} rows, ${incomplete} incomplete); running seed.`)
      runSeed()
    } else {
      console.log(`[startup] Existing herb data found (${count} rows); skipping seed.`)
    }
  }
} finally {
  db.close()
}
