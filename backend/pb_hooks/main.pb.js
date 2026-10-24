routerAdd("GET", "/api/forma/status", (e) => {
  const count = e.app.countRecords("members")
  return e.json(200, {
    version: "0.0.1",
    setupRequired: count === 0,
    setupEnabled: !!$os.getenv("FORMA_SETUP_TOKEN"),
  })
})
routerAdd("POST", "/api/forma/setup", (e) => {
  const expected = $os.getenv("FORMA_SETUP_TOKEN")
  if (
    !expected ||
    expected.length < 32 ||
    e.request.header.get("X-Forma-Setup-Token") !== expected
  ) {
    throw new ForbiddenError(
      "初始化密钥不正确，请检查服务器的 FORMA_SETUP_TOKEN 配置。"
    )
  }
  const body = e.requestInfo().body
  e.app.runInTransaction((tx) => {
    if (tx.countRecords("members") !== 0)
      throw new ForbiddenError("工作空间已初始化。")
    const user = new Record(tx.findCollectionByNameOrId("members"))
    user.set("name", String(body.name || "").trim())
    user.set("email", body.email)
    user.set("password", body.password)
    user.set("passwordConfirm", body.password)
    user.set("emailVisibility", true)
    user.set("role", "admin")
    user.set("active", true)
    user.set("verified", true)
    tx.save(user)
  })
  return e.json(201, { success: true })
})
onRecordCreateRequest(
  (e) => require(__hooks + "/lib.js").write(e, true),
  "projects",
  "tasks",
  "comments"
)
onRecordUpdateRequest(
  (e) => require(__hooks + "/lib.js").write(e, false),
  "projects",
  "tasks"
)
onRecordCreateRequest((e) => {
  if (e.auth && e.auth.isSuperuser()) return e.next()
  require(__hooks + "/lib.js").requireMember(e)
  if (e.auth.getString("role") !== "admin")
    throw new ForbiddenError("只有管理员可以创建成员。")
  e.record.set("name", e.record.getString("name").trim())
  e.record.set("verified", true)
  e.record.set("emailVisibility", true)
  e.next()
}, "members")
onRecordUpdateRequest((e) => {
  if (e.auth && e.auth.isSuperuser()) return e.next()
  require(__hooks + "/lib.js").requireMember(e)
  if (e.auth.getString("role") !== "admin") {
    const allowed = ["name", "oldPassword", "password", "passwordConfirm"]
    if (
      e.record.id !== e.auth.id ||
      Object.keys(e.requestInfo().body).some((key) => !allowed.includes(key))
    ) {
      throw new ForbiddenError("成员只能修改自己的姓名和密码。")
    }
  } else if (
    e.record.id === e.auth.id &&
    (!e.record.getBool("active") || e.record.getString("role") !== "admin")
  ) {
    throw new BadRequestError("不能停用自己或移除自己的管理员角色。")
  }
  e.record.set("name", e.record.getString("name").trim())
  e.next()
}, "members")
