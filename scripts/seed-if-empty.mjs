import { spawnSync } from "node:child_process"
import path from "node:path"
import Database from "better-sqlite3"

function sqlitePathFromUrl(url) {
  const value = url || "file:./dev.db"
  if (!value.startsWith("file:")) return value

  const rawPath = value.slice("file:".length)
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

function runSeed() {
  const result = spawnSync("npm", ["run", "seed"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
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
    if (count > 0) {
      console.log(`[startup] Existing herb data found (${count} rows); skipping seed.`)
    } else {
      console.log("[startup] HerbCard is empty; running seed.")
      runSeed()
    }
  }
} finally {
  db.close()
}
