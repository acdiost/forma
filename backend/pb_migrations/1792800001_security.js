migrate(
  (app) => {
    const members = app.findCollectionByNameOrId("members")
    members.fields.getByName("password").min = 12
    members.updateRule =
      "@request.auth.id != '' && @request.auth.active = true && (@request.auth.role = 'admin' || id = @request.auth.id)"
    app.save(members)
    let unused
    try {
      unused = app.findCollectionByNameOrId("users")
    } catch {
      return
    }
    unused.listRule = null
    unused.viewRule = null
    unused.createRule = null
    unused.updateRule = null
    unused.deleteRule = null
    unused.authRule = null
    app.save(unused)
  },
  (app) => {
    const members = app.findCollectionByNameOrId("members")
    members.updateRule =
      "@request.auth.id != '' && @request.auth.active = true && @request.auth.role = 'admin'"
    members.fields.getByName("password").min = 8
    app.save(members)
  }
)
