import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
const root = resolve(import.meta.dirname, "..")
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"))
if (!existsSync(resolve(root, "backend/.bin/pocketbase")))
  throw new Error("请先执行 npm run setup。")
const backendOnly = process.argv.includes("--backend-only")
const children = []
let stopping = false
const stop = (code = 0) => {
  if (stopping) return
  stopping = true
  for (const c of children) c.kill("SIGTERM")
  process.exitCode = code
}
function run(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  })
  children.push(child)
  child.on("error", (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1)
  })
}
const host = process.env.FORMA_BIND || "127.0.0.1"
const port = process.env.FORMA_PORT || "8090"
run(
  resolve(root, "backend/.bin/pocketbase"),
  [
    "serve",
    `--http=${host}:${port}`,
    "--automigrate=false",
    `--dir=${resolve(root, "backend/pb_data")}`,
    `--hooksDir=${resolve(root, "backend/pb_hooks")}`,
    `--migrationsDir=${resolve(root, "backend/pb_migrations")}`,
    `--publicDir=${resolve(root, "dist")}`,
  ],
  resolve(root, "backend")
)
if (!backendOnly)
  run(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
    root
  )
process.on("SIGINT", () => stop())
process.on("SIGTERM", () => stop())
