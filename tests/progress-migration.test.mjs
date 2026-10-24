import test from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { cp, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "node:net"
import { randomBytes } from "node:crypto"

const root = resolve(import.meta.dirname, "..")
test(
  "progress migration upgrades existing tasks and supports rollback",
  { timeout: 30000 },
  async (t) => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "forma-progress-upgrade-")
    )
    const migrations = resolve(directory, "migrations")
    const hooks = resolve(directory, "hooks")
    await mkdir(migrations)
    await mkdir(hooks)
    const socket = createServer()
    await new Promise((done) => socket.listen(0, "127.0.0.1", done))
    const port = socket.address().port
    await new Promise((done) => socket.close(done))
    const origin = `http://127.0.0.1:${port}`
    const fixturePassword = randomBytes(24).toString("hex")
    let child
    const stop = async () => {
      if (!child || child.exitCode !== null) return
      const exited = new Promise((done) => child.once("exit", done))
      child.kill("SIGTERM")
      await exited
    }
    t.after(async () => {
      await stop()
      await rm(directory, { recursive: true, force: true })
    })
    const binary = resolve(root, "backend/.bin/pocketbase")
    const flags = [
      `--dir=${resolve(directory, "data")}`,
      `--hooksDir=${hooks}`,
      `--migrationsDir=${migrations}`,
    ]
    const start = async () => {
      child = spawn(
        binary,
        ["serve", `--http=127.0.0.1:${port}`, ...flags, "--automigrate=false"],
        { stdio: "ignore" }
      )
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin + "/api/health")).ok) return
        } catch {
          /* Starting. */
        }
        if (child.exitCode !== null)
          throw new Error(`Migration server exited: ${child.exitCode}`)
        await new Promise((done) => setTimeout(done, 100))
      }
      throw new Error("Migration server did not start")
    }
    const snapshot = async () => {
      const authResponse = await fetch(
        origin + "/api/collections/members/auth-with-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity: "migration@forma.test",
            password: fixturePassword,
          }),
        }
      )
      assert.equal(authResponse.status, 200)
      const { token } = await authResponse.json()
      const response = await fetch(
        origin + "/api/collections/tasks/records?sort=title",
        { headers: { Authorization: token } }
      )
      assert.equal(response.status, 200)
      return (await response.json()).items
    }
    for (const name of ["1792800000_v001.js", "1792800001_security.js"])
      await cp(
        resolve(root, "backend/pb_migrations", name),
        resolve(migrations, name)
      )
    await writeFile(
      resolve(migrations, "1792800001_zz_fixture.js"),
      `migrate((app) => {
    const member = new Record(app.findCollectionByNameOrId("members"))
    member.set("name", "迁移测试")
    member.set("email", "migration@forma.test")
    member.set("password", ${JSON.stringify(fixturePassword)})
    member.set("role", "admin")
    member.set("active", true)
    app.save(member)
    const project = new Record(app.findCollectionByNameOrId("projects"))
    project.set("name", "原有项目")
    project.set("color", "green")
    project.set("created_by", member.id)
    project.set("version", 1)
    app.save(project)
    for (const status of ["todo", "done"]) {
      const record = new Record(app.findCollectionByNameOrId("tasks"))
      record.set("title", status)
      record.set("description", "保留原有任务内容")
      record.set("project", project.id)
      record.set("status", status)
      record.set("priority", "high")
      record.set("created_by", member.id)
      record.set("version", 3)
      if (status === "done") record.set("completed_at", "2026-10-24 00:00:00.000Z")
      app.save(record)
    }
  }, () => {})`
    )
    await start()
    const before = await snapshot()
    assert.equal(before.length, 2)
    assert.equal(before[0].progress, undefined)
    await stop()
    await cp(
      resolve(root, "backend/pb_migrations/1792800002_task_progress.js"),
      resolve(migrations, "1792800002_task_progress.js")
    )
    await start()
    const after = await snapshot()
    for (let i = 0; i < after.length; i++) {
      assert.equal(after[i].progress, after[i].status === "done" ? 100 : 0)
      assert.equal(after[i].version, 4)
      for (const field of [
        "id",
        "title",
        "description",
        "project",
        "status",
        "priority",
        "completed_at",
        "created_by",
      ])
        assert.equal(after[i][field], before[i][field])
    }
    await stop()
    const rollback = spawn(binary, ["migrate", "down", "1", ...flags], {
      stdio: ["pipe", "ignore", "ignore"],
    })
    rollback.stdin.end("y\n")
    assert.equal(await new Promise((done) => rollback.once("exit", done)), 0)
    await rm(resolve(migrations, "1792800002_task_progress.js"))
    await start()
    const reverted = await snapshot()
    assert.equal(reverted.length, 2)
    assert.equal(reverted[0].progress, undefined)
    assert.deepEqual(
      reverted.map((record) => record.id),
      before.map((record) => record.id)
    )
  }
)
