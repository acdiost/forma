import test from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
const root = resolve(import.meta.dirname, "..")
const binary = resolve(root, "backend/.bin/pocketbase")
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
test(
  "Forma v0.0.1 · isolated PocketBase integration",
  { timeout: 90_000 },
  async (t) => {
    assert.ok(existsSync(binary), "Run npm run setup before integration tests.")
    const directory = await mkdtemp(resolve(tmpdir(), "forma-v001-"))
    const socket = createServer()
    await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    const origin = `http://127.0.0.1:${port}`,
      setupToken = randomBytes(32).toString("hex")
    const adminPassword = randomBytes(18).toString("hex"),
      memberPassword = randomBytes(18).toString("hex")
    let processHandle, admin, member, project, task
    const api = async (
      path,
      { method = "GET", token, body, version, setup } = {}
    ) => {
      const response = await fetch(origin + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Connection: "close",
          ...(token ? { Authorization: token } : {}),
          ...(version ? { "X-Record-Version": String(version) } : {}),
          ...(setup ? { "X-Forma-Setup-Token": setup } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }).catch((error) => {
        throw new Error(
          `HTTP ${method} ${path}: ${error.cause?.code || error.message}; backend exit=${processHandle.exitCode}, signal=${processHandle.signalCode}`
        )
      })
      const data = await response.json().catch(() => null)
      return { status: response.status, data }
    }
    const login = async (email, password) =>
      api("/api/collections/members/auth-with-password", {
        method: "POST",
        body: { identity: email, password },
      })
    const start = async () => {
      processHandle = spawn(
        binary,
        [
          "serve",
          `--http=127.0.0.1:${port}`,
          `--dir=${resolve(directory, "data")}`,
          `--hooksDir=${resolve(directory, "hooks")}`,
          `--migrationsDir=${resolve(directory, "migrations")}`,
          `--publicDir=${resolve(root, "dist")}`,
          "--automigrate=false",
        ],
        {
          cwd: root,
          env: { ...process.env, FORMA_SETUP_TOKEN: setupToken },
          stdio: ["ignore", "pipe", "pipe"],
        }
      )
      processHandle.stdout.on("data", () => {})
      processHandle.once("exit", (code, signal) => {
        if (code) console.error("Test PocketBase exit", code, signal)
      })
      processHandle.stderr.on("data", (chunk) => {
        const message = String(chunk)
        if (!message.includes("pbinstall")) process.stderr.write(message)
      })
      for (let i = 0; i < 120; i++) {
        try {
          if ((await api("/api/forma/status")).status === 200) return
        } catch {
          /* Server is starting. */
        }
        if (processHandle.exitCode !== null)
          throw new Error(
            `PocketBase exited with code ${processHandle.exitCode}; verify migrations.`
          )
        await delay(100)
      }
      throw new Error("PocketBase did not start.")
    }
    const stop = async () => {
      if (processHandle && processHandle.exitCode === null) {
        const child = processHandle
        const closed = new Promise((resolve) => child.once("exit", resolve))
        child.kill("SIGTERM")
        await closed
      }
    }
    t.after(async () => {
      await stop()
      await rm(directory, { recursive: true, force: true })
    })
    await cp(resolve(root, "backend/pb_hooks"), resolve(directory, "hooks"), {
      recursive: true,
    })
    await cp(
      resolve(root, "backend/pb_migrations"),
      resolve(directory, "migrations"),
      { recursive: true }
    )
    await start()
    await t.test(
      "first-run setup requires the deployment secret and is one-time",
      async () => {
        assert.equal((await api("/api/forma/status")).data.setupRequired, true)
        const body = {
          name: "测试管理员",
          email: "admin@forma.test",
          password: adminPassword,
        }
        assert.equal(
          (
            await api("/api/forma/setup", {
              method: "POST",
              body,
              setup: "incorrect",
            })
          ).status,
          403
        )
        assert.equal(
          (
            await api("/api/forma/setup", {
              method: "POST",
              body,
              setup: setupToken,
            })
          ).status,
          201
        )
        assert.equal(
          (
            await api("/api/forma/setup", {
              method: "POST",
              body,
              setup: setupToken,
            })
          ).status,
          403
        )
        const auth = await login(body.email, body.password)
        assert.equal(auth.status, 200)
        admin = auth.data
        assert.equal(admin.record.role, "admin")
        assert.equal((await api("/api/forma/status")).data.setupRequired, false)
      }
    )
    await t.test(
      "closed registration and administrator-managed accounts",
      async () => {
        const body = {
          name: "协作成员",
          email: "member@forma.test",
          password: memberPassword,
          passwordConfirm: memberPassword,
          role: "member",
          active: true,
          emailVisibility: true,
        }
        assert.ok(
          [400, 403].includes(
            (
              await api("/api/collections/members/records", {
                method: "POST",
                body,
              })
            ).status
          )
        )
        assert.equal(
          (
            await api("/api/collections/members/records", {
              method: "POST",
              token: admin.token,
              body,
            })
          ).status,
          200
        )
        const auth = await login(body.email, body.password)
        assert.equal(auth.status, 200)
        member = auth.data
        const escalation = await api(
          `/api/collections/members/records/${member.record.id}`,
          { method: "PATCH", token: member.token, body: { role: "admin" } }
        )
        assert.ok([400, 403, 404].includes(escalation.status))
        assert.ok(
          [400, 403].includes(
            (
              await api("/api/collections/members/records", {
                method: "POST",
                token: member.token,
                body: { ...body, email: "another@forma.test" },
              })
            ).status
          )
        )
        const defaultRegistration = await api(
          "/api/collections/users/records",
          {
            method: "POST",
            body: {
              email: "unused@forma.test",
              password: memberPassword,
              passwordConfirm: memberPassword,
            },
          }
        )
        assert.ok([400, 403, 404].includes(defaultRegistration.status))
        const shortPassword = await api("/api/collections/members/records", {
          method: "POST",
          token: admin.token,
          body: {
            ...body,
            email: "short@forma.test",
            password: "12345678",
            passwordConfirm: "12345678",
          },
        })
        assert.equal(shortPassword.status, 400)
        const selfDisable = await api(
          `/api/collections/members/records/${admin.record.id}`,
          { method: "PATCH", token: admin.token, body: { active: false } }
        )
        assert.equal(selfDisable.status, 400)
      }
    )
    await t.test(
      "member can change own password only with the old password",
      async () => {
        const path = `/api/collections/members/records/${member.record.id}`
        const replacementPassword = randomBytes(18).toString("hex")
        const missing = await api(path, {
          method: "PATCH",
          token: member.token,
          body: {
            password: replacementPassword,
            passwordConfirm: replacementPassword,
          },
        })
        assert.equal(missing.status, 400)
        const valid = await api(path, {
          method: "PATCH",
          token: member.token,
          body: {
            oldPassword: memberPassword,
            password: memberPassword,
            passwordConfirm: memberPassword,
          },
        })
        assert.equal(valid.status, 200)
        await delay(3500)
        const renewed = await login("member@forma.test", memberPassword)
        assert.equal(renewed.status, 200)
        member = renewed.data
      }
    )
    await t.test(
      "real project and task creation with server-owned fields and validation",
      async () => {
        let result = await api("/api/collections/projects/records", {
          method: "POST",
          token: admin.token,
          body: { name: "生产化项目", color: "green", description: "真实协作" },
        })
        assert.equal(result.status, 200)
        project = result.data
        assert.equal(project.version, 1)
        assert.equal(project.created_by, admin.record.id)
        result = await api("/api/collections/tasks/records", {
          method: "POST",
          token: admin.token,
          body: {
            title: "落地第一个任务",
            project: project.id,
            status: "todo",
            priority: "high",
            assignee: member.record.id,
            due: "2026-11-01 00:00:00.000Z",
            created_by: member.record.id,
            version: 999,
          },
        })
        assert.equal(result.status, 200)
        task = result.data
        assert.equal(task.version, 1)
        assert.equal(task.created_by, admin.record.id)
        assert.equal(task.progress, 0)
        const forbiddenRead = await api(
          `/api/collections/tasks/records/${task.id}`
        )
        assert.ok([403, 404].includes(forbiddenRead.status))
        const invalid = await api("/api/collections/tasks/records", {
          method: "POST",
          token: member.token,
          body: {
            title: "  ",
            project: project.id,
            status: "todo",
            priority: "low",
          },
        })
        assert.equal(invalid.status, 400)
      }
    )
    await t.test(
      "stale and concurrent writes cannot silently overwrite a task",
      async () => {
        const path = `/api/collections/tasks/records/${task.id}`
        assert.equal(
          (
            await api(path, {
              method: "PATCH",
              token: member.token,
              body: { title: "缺少版本" },
            })
          ).status,
          400
        )
        const results = await Promise.all(
          ["并发编辑甲", "并发编辑乙"].map((title) =>
            api(path, {
              method: "PATCH",
              token: member.token,
              body: { title },
              version: task.version,
            })
          )
        )
        assert.deepEqual(
          results.map((r) => r.status).sort(),
          [200, 409],
          JSON.stringify(results)
        )
        task = (await api(path, { token: admin.token })).data
        assert.equal(task.version, 2)
        const done = await api(path, {
          method: "PATCH",
          token: member.token,
          body: { status: "done", completed_at: "" },
          version: task.version,
        })
        assert.equal(done.status, 200)
        task = done.data
        assert.ok(task.completed_at)
        assert.equal(task.progress, 100)
        assert.equal(task.version, 3)
      }
    )
    await t.test(
      "percentage progress validates and stays consistent with completion",
      async () => {
        const create = (body) =>
          api("/api/collections/tasks/records", {
            method: "POST",
            token: admin.token,
            body: {
              title: "进度验收",
              project: project.id,
              status: "todo",
              priority: "medium",
              ...body,
            },
          })
        for (const progress of [-1, 101, 12.5]) {
          assert.equal(
            (await create({ progress, status: "done" })).status,
            400,
            `Invalid progress accepted: ${JSON.stringify(progress)}`
          )
        }
        let result = await create({ progress: 25 })
        assert.equal(result.status, 200)
        let record = result.data
        assert.equal(record.progress, 25)
        assert.equal(record.status, "progress")
        const path = `/api/collections/tasks/records/${record.id}`
        const update = async (patch) => {
          const response = await api(path, {
            method: "PATCH",
            token: member.token,
            version: record.version,
            body: patch,
          })
          assert.equal(response.status, 200, JSON.stringify(response.data))
          record = response.data
        }
        for (const progress of [0, 1, 50, 99, 100]) {
          await update({ progress })
          assert.equal(record.progress, progress)
          assert.equal(record.status, progress === 100 ? "done" : "progress")
          assert.equal(!!record.completed_at, progress === 100)
        }
        const completedAt = record.completed_at
        await update({ priority: "high" })
        assert.equal(record.completed_at, completedAt)
        for (const progress of [-1, 101, 12.5]) {
          const invalid = await api(path, {
            method: "PATCH",
            token: member.token,
            version: record.version,
            body: { progress },
          })
          assert.equal(invalid.status, 400)
        }
        assert.equal(
          (await api(path, { token: admin.token })).data.version,
          record.version
        )
        await update({ progress: 60 })
        assert.equal(record.status, "progress")
        assert.equal(record.completed_at, "")
        const staleVersion = record.version
        await update({ status: "done" })
        assert.equal(record.progress, 100)
        assert.equal(
          (
            await api(path, {
              method: "PATCH",
              token: admin.token,
              version: staleVersion,
              body: { progress: 10 },
            })
          ).status,
          409
        )
        await update({ status: "review" })
        assert.equal(record.progress, 0)
        assert.equal(record.status, "review")
        assert.equal(record.completed_at, "")
        await update({ progress: 60 })
        assert.equal(record.status, "review")
        await update({ status: "todo" })
        assert.equal(record.progress, 0)
        await update({ progress: 60 })
        assert.equal(record.status, "progress")
        await update({ deleted_at: new Date().toISOString() })
        await update({ deleted_at: "" })
        assert.equal(record.progress, 60)
        assert.equal(record.status, "progress")
        result = await create({ status: "done", progress: 10 })
        assert.equal(result.status, 200)
        assert.equal(result.data.progress, 100)
        assert.ok(result.data.completed_at)
      }
    )
    await t.test(
      "comments are attributed by the server and activity is immutable",
      async () => {
        const result = await api("/api/collections/comments/records", {
          method: "POST",
          token: member.token,
          body: {
            task: task.id,
            author: admin.record.id,
            body: "真实的协作记录",
          },
        })
        assert.equal(result.status, 200)
        assert.equal(result.data.author, member.record.id)
        const log = await api(
          "/api/collections/activities/records?perPage=50",
          { token: admin.token }
        )
        assert.ok(log.data.items.some((item) => item.action === "commented"))
        assert.ok(log.data.items.some((item) => item.action === "completed"))
        const forged = await api("/api/collections/activities/records", {
          method: "POST",
          token: admin.token,
          body: {
            actor: admin.record.id,
            entity: "task",
            action: "created",
            title: "伪造日志",
          },
        })
        assert.ok([400, 403].includes(forged.status))
      }
    )
    await t.test(
      "soft delete, restore and archived project constraints",
      async () => {
        const path = `/api/collections/tasks/records/${task.id}`
        let result = await api(path, {
          method: "PATCH",
          token: member.token,
          version: task.version,
          body: { deleted_at: new Date().toISOString() },
        })
        assert.equal(result.status, 200)
        task = result.data
        assert.equal(
          (
            await api("/api/collections/comments/records", {
              method: "POST",
              token: member.token,
              body: { task: task.id, body: "不可评论" },
            })
          ).status,
          400
        )
        result = await api(path, {
          method: "PATCH",
          token: member.token,
          version: task.version,
          body: { deleted_at: "" },
        })
        assert.equal(result.status, 200)
        task = result.data
        assert.equal(task.deleted_at, "")
        assert.ok(
          [403, 404].includes(
            (await api(path, { method: "DELETE", token: admin.token })).status
          )
        )
        result = await api(`/api/collections/projects/records/${project.id}`, {
          method: "PATCH",
          token: admin.token,
          version: project.version,
          body: { archived: true },
        })
        assert.equal(result.status, 200)
        project = result.data
        assert.equal(
          (
            await api("/api/collections/tasks/records", {
              method: "POST",
              token: member.token,
              body: {
                title: "不应创建",
                project: project.id,
                status: "todo",
                priority: "medium",
              },
            })
          ).status,
          400
        )
      }
    )
    await t.test(
      "disabled member loses login and access with previously issued tokens",
      async () => {
        await delay(3500)
        const result = await api(
          `/api/collections/members/records/${member.record.id}`,
          { method: "PATCH", token: admin.token, body: { active: false } }
        )
        assert.equal(result.status, 200)
        const denied = await login("member@forma.test", memberPassword)
        assert.ok(
          [400, 401, 403].includes(denied.status),
          `inactive login status: ${denied.status}`
        )
        assert.ok(
          [403, 404].includes(
            (
              await api(`/api/collections/tasks/records/${task.id}`, {
                token: member.token,
              })
            ).status
          )
        )
      }
    )
    await t.test(
      "data survives restart and an offline backup can be restored",
      async () => {
        await stop()
        await cp(resolve(directory, "data"), resolve(directory, "backup"), {
          recursive: true,
        })
        await start()
        let result = await login("admin@forma.test", adminPassword)
        assert.equal(result.status, 200)
        admin = result.data
        result = await api(`/api/collections/tasks/records/${task.id}`, {
          token: admin.token,
        })
        assert.equal(result.data.version, task.version)
        assert.equal(result.data.progress, task.progress)
        result = await api(`/api/collections/tasks/records/${task.id}`, {
          method: "PATCH",
          token: admin.token,
          version: task.version,
          body: { title: "备份后修改" },
        })
        assert.equal(result.status, 200)
        await stop()
        await rm(resolve(directory, "data"), { recursive: true, force: true })
        await cp(resolve(directory, "backup"), resolve(directory, "data"), {
          recursive: true,
        })
        await start()
        admin = (await login("admin@forma.test", adminPassword)).data
        result = await api(`/api/collections/tasks/records/${task.id}`, {
          token: admin.token,
        })
        assert.equal(result.data.title, task.title)
        assert.equal(result.data.version, task.version)
        assert.equal(result.data.progress, task.progress)
      }
    )
  }
)
