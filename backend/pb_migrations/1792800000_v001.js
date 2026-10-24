migrate(
  (app) => {
    const signedIn = "@request.auth.id != '' && @request.auth.active = true"
    const admin = signedIn + " && @request.auth.role = 'admin'"
    const dates = () => [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ]
    const members = new Collection({
      name: "members",
      type: "auth",
      listRule: signedIn,
      viewRule: signedIn,
      createRule: admin,
      updateRule: admin,
      deleteRule: null,
      manageRule: admin,
      authRule: "active = true",
      passwordAuth: { enabled: true, identityFields: ["email"] },
      authToken: { duration: 86400 },
      fields: [
        { name: "name", type: "text", required: true, max: 50 },
        {
          name: "role",
          type: "select",
          required: true,
          values: ["admin", "member"],
          maxSelect: 1,
        },
        { name: "active", type: "bool" },
        ...dates(),
      ],
    })
    app.save(members)
    const projects = new Collection({
      name: "projects",
      type: "base",
      listRule: signedIn,
      viewRule: signedIn,
      createRule: signedIn,
      updateRule: signedIn,
      deleteRule: null,
      fields: [
        { name: "name", type: "text", required: true, max: 100 },
        { name: "description", type: "text", max: 3000 },
        {
          name: "color",
          type: "select",
          required: true,
          values: ["orange", "green", "blue", "purple"],
          maxSelect: 1,
        },
        { name: "archived", type: "bool" },
        {
          name: "created_by",
          type: "relation",
          required: true,
          collectionId: members.id,
          maxSelect: 1,
        },
        {
          name: "version",
          type: "number",
          required: true,
          min: 1,
          onlyInt: true,
        },
        ...dates(),
      ],
    })
    app.save(projects)
    const tasks = new Collection({
      name: "tasks",
      type: "base",
      listRule: signedIn,
      viewRule: signedIn,
      createRule: signedIn,
      updateRule: signedIn,
      deleteRule: null,
      fields: [
        { name: "title", type: "text", required: true, max: 200 },
        { name: "description", type: "text", max: 10000 },
        {
          name: "project",
          type: "relation",
          required: true,
          collectionId: projects.id,
          maxSelect: 1,
        },
        {
          name: "status",
          type: "select",
          required: true,
          values: ["todo", "progress", "review", "done"],
          maxSelect: 1,
        },
        {
          name: "priority",
          type: "select",
          required: true,
          values: ["high", "medium", "low"],
          maxSelect: 1,
        },
        {
          name: "assignee",
          type: "relation",
          collectionId: members.id,
          maxSelect: 1,
        },
        { name: "due", type: "date" },
        { name: "completed_at", type: "date" },
        { name: "deleted_at", type: "date" },
        { name: "label", type: "text", max: 30 },
        { name: "position", type: "number" },
        {
          name: "created_by",
          type: "relation",
          required: true,
          collectionId: members.id,
          maxSelect: 1,
        },
        {
          name: "version",
          type: "number",
          required: true,
          min: 1,
          onlyInt: true,
        },
        ...dates(),
      ],
      indexes: [
        "CREATE INDEX idx_tasks_project ON tasks (project)",
        "CREATE INDEX idx_tasks_assignee ON tasks (assignee)",
        "CREATE INDEX idx_tasks_position ON tasks (position)",
      ],
    })
    app.save(tasks)
    app.save(
      new Collection({
        name: "comments",
        type: "base",
        listRule: signedIn,
        viewRule: signedIn,
        createRule: signedIn,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: "task",
            type: "relation",
            required: true,
            collectionId: tasks.id,
            maxSelect: 1,
          },
          {
            name: "author",
            type: "relation",
            required: true,
            collectionId: members.id,
            maxSelect: 1,
          },
          { name: "body", type: "text", required: true, max: 5000 },
          ...dates(),
        ],
        indexes: ["CREATE INDEX idx_comments_task ON comments (task)"],
      })
    )
    app.save(
      new Collection({
        name: "activities",
        type: "base",
        listRule: signedIn,
        viewRule: signedIn,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: "actor",
            type: "relation",
            required: true,
            collectionId: members.id,
            maxSelect: 1,
          },
          {
            name: "entity",
            type: "select",
            required: true,
            values: ["task", "project", "comment"],
            maxSelect: 1,
          },
          {
            name: "action",
            type: "select",
            required: true,
            values: [
              "created",
              "updated",
              "completed",
              "deleted",
              "restored",
              "archived",
              "commented",
            ],
            maxSelect: 1,
          },
          { name: "title", type: "text", required: true, max: 250 },
          {
            name: "task",
            type: "relation",
            collectionId: tasks.id,
            maxSelect: 1,
          },
          {
            name: "project",
            type: "relation",
            collectionId: projects.id,
            maxSelect: 1,
          },
          ...dates(),
        ],
      })
    )
    const settings = app.settings()
    settings.meta.appName = "Forma"
    settings.logs.maxDays = 7
    settings.rateLimits.enabled = true
    app.save(settings)
  },
  (app) => {
    for (const name of [
      "activities",
      "comments",
      "tasks",
      "projects",
      "members",
    ]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  }
)
