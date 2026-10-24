import { spawn } from "node:child_process"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { randomBytes } from "node:crypto"
const root = resolve(import.meta.dirname, "..")
const directory = await mkdtemp(resolve(tmpdir(), "forma-browser-"))
const port = 8091,
  base = `http://127.0.0.1:${port}`
const accessFile = resolve(root, "test-results/ui-access.json")
const setupToken = randomBytes(32).toString("hex")
const child = spawn(
  resolve(root, "backend/.bin/pocketbase"),
  [
    "serve",
    `--http=127.0.0.1:${port}`,
    `--dir=${directory}`,
    `--hooksDir=${resolve(root, "backend/pb_hooks")}`,
    `--migrationsDir=${resolve(root, "backend/pb_migrations")}`,
    `--publicDir=${resolve(root, "dist")}`,
    "--automigrate=false",
    "--hooksWatch=false",
  ],
  {
    cwd: root,
    env: { ...process.env, FORMA_SETUP_TOKEN: setupToken },
    stdio: "ignore",
  }
)
async function stop() {
  child.kill("SIGTERM")
  await new Promise((resolve) => child.once("exit", resolve))
  await rm(directory, { recursive: true, force: true })
  await rm(accessFile, { force: true })
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
async function api(path, body, token, extra = {}) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Connection: "close",
      ...(token ? { Authorization: token } : {}),
      ...extra,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok)
    throw new Error(`UI fixture request failed: ${response.status}`)
  return response.json()
}
for (let i = 0; i < 100; i++) {
  try {
    const r = await fetch(base + "/api/forma/status")
    if (r.ok) break
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100))
}
// Disposable browser-test credentials. This script never writes into backend/pb_data.
const password = randomBytes(24).toString("base64url")
await api(
  "/api/forma/setup",
  { name: "验收管理员", email: "browser@forma.test", password },
  null,
  { "X-Forma-Setup-Token": setupToken }
)
const auth = await api("/api/collections/members/auth-with-password", {
  identity: "browser@forma.test",
  password,
})
const project = await api(
  "/api/collections/projects/records",
  {
    name: "Forma v0.0.1",
    description: "把想法推进为真正可以使用的生产力工具。",
    color: "green",
  },
  auth.token
)
await api(
  "/api/collections/tasks/records",
  {
    title: "验证真实任务协作",
    description: "确认任务可以创建、编辑、评论、移动和恢复。",
    project: project.id,
    status: "progress",
    priority: "high",
    assignee: auth.record.id,
    label: "验收",
  },
  auth.token
)
await api(
  "/api/collections/tasks/records",
  {
    title: "整理第一版交付说明",
    description: "为私有部署提供清晰的启动与维护说明。",
    project: project.id,
    status: "todo",
    priority: "medium",
    assignee: auth.record.id,
    label: "文档",
  },
  auth.token
)
await mkdir(resolve(root, "test-results"), { recursive: true })
await writeFile(
  accessFile,
  JSON.stringify({ url: base, email: "browser@forma.test", password }),
  { mode: 0o600 }
)
console.log(
  `Disposable UI fixture ready: ${base}; access details: test-results/ui-access.json`
)
