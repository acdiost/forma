function requireMember(e) {
  if (
    !e.auth ||
    e.auth.collection().name !== "members" ||
    !e.auth.getBool("active")
  ) {
    throw new ForbiddenError("请使用有效的工作空间账号登录。")
  }
}
function validateTask(app, record, original) {
  record.set("title", record.getString("title").trim())
  const project = app.findRecordById("projects", record.getString("project"))
  if (
    project.getBool("archived") &&
    (!original || original.getString("project") !== project.id)
  ) {
    throw new BadRequestError("不能向已归档项目添加任务。")
  }
  const assignee = record.getString("assignee")
  if (assignee && (!original || original.getString("assignee") !== assignee)) {
    if (!app.findRecordById("members", assignee).getBool("active"))
      throw new BadRequestError("负责人账号已停用。")
  }
  const wasDone = original && original.getString("status") === "done"
  record.set(
    "completed_at",
    record.getString("status") === "done"
      ? wasDone
        ? original.getString("completed_at")
        : new Date().toISOString()
      : ""
  )
}
function audit(app, actor, entity, action, record) {
  const activity = new Record(app.findCollectionByNameOrId("activities"))
  activity.set("actor", actor.id)
  activity.set("entity", entity)
  activity.set("action", action)
  if (entity === "task") {
    activity.set("task", record.id)
    activity.set("project", record.getString("project"))
    activity.set("title", record.getString("title"))
  } else if (entity === "project") {
    activity.set("project", record.id)
    activity.set("title", record.getString("name"))
  } else {
    const task = app.findRecordById("tasks", record.getString("task"))
    activity.set("task", task.id)
    activity.set("project", task.getString("project"))
    activity.set("title", task.getString("title"))
  }
  app.save(activity)
}
function write(e, create) {
  if (e.auth && e.auth.isSuperuser()) return e.next()
  requireMember(e)
  const collection = e.record.collection().name
  const entity =
    collection === "tasks"
      ? "task"
      : collection === "projects"
        ? "project"
        : "comment"
  const baseApp = e.app
  return baseApp.runInTransaction((tx) => {
    e.app = tx
    try {
      let original = null
      if (!create) {
        original = tx.findRecordById(collection, e.record.id)
        const expected = Number(e.requestInfo().headers["x_record_version"])
        if (!Number.isInteger(expected) || expected < 1)
          throw new BadRequestError("缺少记录版本，请刷新后重试。")
        if (expected !== original.getInt("version"))
          throw new ApiError(409, "这条记录已被其他成员修改，请刷新后重试。")
        e.record.set("created_by", original.getString("created_by"))
        e.record.set("version", expected + 1)
      } else if (entity !== "comment") {
        e.record.set("created_by", e.auth.id)
        e.record.set("version", 1)
      }
      if (entity === "task") {
        validateTask(tx, e.record, original)
        if (create) {
          e.record.set("deleted_at", "")
          e.record.set("position", -Date.now())
        }
      }
      if (entity === "project")
        e.record.set("name", e.record.getString("name").trim())
      if (entity === "comment") {
        const task = tx.findRecordById("tasks", e.record.getString("task"))
        if (task.getString("deleted_at"))
          throw new BadRequestError("回收站中的任务无法评论。")
        e.record.set("author", e.auth.id)
        e.record.set("body", e.record.getString("body").trim())
      }
      e.next()
      let action = create ? "created" : "updated"
      if (entity === "comment") action = "commented"
      if (entity === "task" && original) {
        if (
          !original.getString("deleted_at") &&
          e.record.getString("deleted_at")
        )
          action = "deleted"
        else if (
          original.getString("deleted_at") &&
          !e.record.getString("deleted_at")
        )
          action = "restored"
        else if (
          original.getString("status") !== "done" &&
          e.record.getString("status") === "done"
        )
          action = "completed"
      }
      if (
        entity === "project" &&
        original &&
        !original.getBool("archived") &&
        e.record.getBool("archived")
      )
        action = "archived"
      audit(tx, e.auth, entity, action, e.record)
    } finally {
      e.app = baseApp
    }
  })
}
module.exports = { requireMember, write }
