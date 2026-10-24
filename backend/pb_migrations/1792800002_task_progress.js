migrate(
  (app) => {
    const tasks = app.findCollectionByNameOrId("tasks")
    tasks.fields.add(
      new NumberField({ name: "progress", min: 0, max: 100, onlyInt: true })
    )
    app.save(tasks)
    // Invalidate snapshots taken before the schema upgrade as well as backfilling progress.
    app
      .db()
      .newQuery(
        "UPDATE tasks SET progress = CASE WHEN status = 'done' THEN 100 ELSE 0 END, version = version + 1"
      )
      .execute()
  },
  (app) => {
    const tasks = app.findCollectionByNameOrId("tasks")
    tasks.fields.removeByName("progress")
    app.save(tasks)
  }
)
