# PocketBase 基础用法（Forma）

本文面向第一次接触 PocketBase、需要维护 Forma 的开发者。示例以本项目固定的 **PocketBase 0.40.6** 和仓库安装的 JavaScript SDK 为准，核对日期为 2026-10-24。后端版本记录在 [`backend/version.json`](../backend/version.json)，SDK 版本由 `package-lock.json` 锁定，两者版本号不需要相同。

## 1. 先认识几个概念

PocketBase 把 SQLite 数据库、账号认证、记录 API、实时订阅和管理后台放在一个可执行程序中。Forma 构建后的前端也由它托管，无需单独部署数据库服务。概念与默认入口见 [PocketBase 官方入门](https://pocketbase.io/docs/)。

| 概念 | 含义 | Forma 中的例子 |
| --- | --- | --- |
| Collection（集合） | 定义字段、校验和访问规则，底层对应 SQLite 表 | `tasks` |
| Record（记录） | 集合中的一条数据 | 一个任务 |
| Auth collection | 带登录能力的账号集合 | `members` |
| Base collection | 存储普通业务记录的集合 | `projects`、`comments` |
| View collection | 由 SQL 查询生成的只读集合 | 当前未使用 |
| API Rules | 控制客户端能访问哪些记录、执行哪些操作 | 只有启用成员可读写任务 |
| Hooks | 服务端 JavaScript 扩展，用于校验、路由和业务流程 | 记录版本检查、操作动态 |
| Migration（迁移） | 可进入版本管理的数据结构或数据变更脚本 | `backend/pb_migrations/*.js` |

集合类型详见 [官方 Collections 文档](https://pocketbase.io/docs/collections/)。TypeScript 类型只帮助前端开发；真实字段、权限与业务约束由服务端执行。

## 2. 在 Forma 中启动

以下 Shell 命令均在仓库根目录执行，需要 Node.js 22.12+：

```sh
npm ci
npm run setup
npm run dev
```

`setup` 下载并校验固定版本的 PocketBase；没有 `.env` 时生成包含随机 `FORMA_SETUP_TOKEN` 的本机配置。`dev` 同时运行 Vite 和 PocketBase，读取 `.env`，并显式指定数据、迁移、Hook 与静态文件目录。

| 入口 | 默认地址 | 用途 |
| --- | --- | --- |
| 开发前端 | http://127.0.0.1:5173 | 日常开发，以 Vite 实际输出为准 |
| 后端 | http://127.0.0.1:8090 | PocketBase API；构建后也提供前端 |
| 运维后台 | http://127.0.0.1:8090/_/ | 使用 PocketBase 运维超级管理员登录 |
| 存活检查 | http://127.0.0.1:8090/api/health | 检查后端是否可访问 |
| 应用状态 | http://127.0.0.1:8090/api/forma/status | 查看 Forma 版本和初始化状态 |

首次打开 Forma，输入 `.env` 中的初始化密钥，自行创建第一个应用管理员。该流程只允许执行一次；应用没有默认账号或默认密码。

需要只启动后端或查看构建结果时：

```sh
npm run build
npm run dev:backend
```

此时通过后端地址访问完整应用。`FORMA_BIND` 和 `FORMA_PORT` 可在 `.env` 中调整；Vite 将 `/api`、`/_` 代理到本机配置的后端端口。

## 3. 目录与账号边界

```text
backend/
  .bin/pocketbase       下载的可执行程序，不提交
  pb_data/             本机数据库、附件等运行数据，不提交
  pb_migrations/       版本化结构与数据迁移，提交
  pb_hooks/
    main.pb.js         自定义路由与请求 Hook 入口
    lib.js             服务端校验、事务与审计逻辑
  version.json         固定后端版本与下载校验值
src/
  lib/api.ts           共用 SDK 客户端与 QueryClient
  lib/auth.tsx         登录恢复、身份检查与退出
  lib/types.ts         业务记录的 TypeScript 类型
  hooks/use-workspace.ts  查询、写入和实时刷新
```

Forma 应用管理员是 `members` 中 `role = "admin"` 的业务账号，负责管理工作空间成员。PocketBase 运维超级管理员属于 `_superusers`，用于 `/_/` 后台维护，拥有超出业务账号的权限。使用 Forma 不要求先创建运维超级管理员。

需要使用运维后台时，可按 [官方初始化说明](https://pocketbase.io/docs/) 使用服务端安装链接，或先查看固定版本 CLI 的命令：

```sh
backend/.bin/pocketbase superuser create --help
```

执行账号维护命令时，应显式指定 `--dir=backend/pb_data`，确保操作的是应用实际数据目录。不要把超级管理员账号、密码或令牌放入前端；也不要把 `.env`、运行数据和备份提交到仓库。

## 4. 连接、登录与退出

前端复用 [`src/lib/api.ts`](../src/lib/api.ts) 导出的 `pb`，不需要在每个组件中创建客户端：

```ts
import { pb, queryClient } from "@/lib/api"

// email 和 password 来自用户输入。
await pb.collection("members").authWithPassword(email, password)
const member = pb.authStore.record

// 恢复登录时向服务端重新确认身份。
await pb.collection("members").authRefresh()

// 退出时清理本地身份及查询缓存。
pb.authStore.clear()
queryClient.clear()
```

SDK 在登录成功后保存认证状态，并自动为后续请求附带令牌。默认认证存储在浏览器可用时使用 localStorage。`authStore.isValid` 仅用于本地判断令牌是否尚未过期，不能证明账号仍被允许访问；Forma 的 `AuthProvider` 会在启动、重新聚焦和每分钟向服务端刷新身份。基础接口见 [官方认证文档](https://pocketbase.io/docs/authentication/) 和 [官方 JS SDK](https://github.com/pocketbase/js-sdk#auth-store)。

Forma 使用 `members` 登录，关闭开放注册；后续成员由应用管理员创建。退出操作清除当前浏览器的认证状态，不等于撤销所有设备持有的令牌。

## 5. 查询记录、过滤与关联

下面的 TypeScript 示例可用于开发环境中的业务代码；`taskId`、`projectId` 等变量应来自真实记录。写入示例会修改数据，应在开发或临时验收实例中练习。

```ts
import { pb } from "@/lib/api"
import type { Task } from "@/lib/types"

// 分页查询：第 1 页，每页 20 条。
const page = await pb.collection<Task>("tasks").getList(1, 20, {
  filter: pb.filter("deleted_at = '' && project = {:project}", {
    project: projectId,
  }),
  sort: "position,-created",
})

console.log(page.items, page.totalItems, page.totalPages)

// 按 ID 查询一条记录。
const task = await pb.collection<Task>("tasks").getOne(taskId)

// 查询完整列表：SDK 会处理分页，最终返回记录数组。
const tasks = await pb.collection<Task>("tasks").getFullList({
  filter: pb.filter("deleted_at = '' && title ~ {:query}", {
    query: keyword,
  }),
  sort: "-created",
})
```

常用语法：`=` 相等、`!=` 不等、`~` 包含匹配、`&&` 同时满足、`||` 任一满足；排序字段前加 `-` 表示降序。动态值使用 `pb.filter()` 的占位参数，避免直接拼接用户输入。SDK 用法见 [官方过滤参数说明](https://github.com/pocketbase/js-sdk#binding-filter-parameters)。

Forma 当前按小团队规模全量加载工作空间记录，并在前端筛选。上面的分页查询是新增功能时可使用的基础能力，不代表现有列表已实现服务端分页。客户端过滤也不提供权限隔离。

关系字段保存记录 ID。需要一起读取关联记录时可使用 `expand`：

```ts
const task = await pb.collection<Task>("tasks").getOne(taskId, {
  expand: "project,assignee",
})

console.log(task.project)               // 项目 ID
console.log(task.expand?.project?.name) // 展开的项目名称
```

关联记录仍受自身的查看规则约束，不能假设 `expand` 总有值。详见 [官方关联查询文档](https://pocketbase.io/docs/working-with-relations/)。

## 6. 创建、更新与回收站

Forma 的业务集合如下：

| 集合 | 主要内容 | 应用侧写入约定 |
| --- | --- | --- |
| `members` | 姓名、邮箱、角色、启用状态 | 管理员管理成员；成员可修改自己的姓名和密码 |
| `projects` | 名称、说明、颜色、归档状态 | 启用成员可创建、修改；更新需要记录版本 |
| `tasks` | 标题、项目、状态、优先级、负责人、日期等 | 启用成员可创建、修改；更新需要记录版本 |
| `comments` | 任务讨论 | 可创建，作者由服务端填写；不能编辑或删除 |
| `activities` | 操作动态 | 由服务端生成，客户端只读 |

创建一个任务：

```ts
const task = await pb.collection<Task>("tasks").create({
  title: "补充部署说明",
  description: "记录首次启动与维护步骤。",
  project: projectId,
  status: "todo",
  priority: "medium",
  assignee: "", // 未分配；有负责人时填写成员 ID。
  due: "",      // 无截止日期；有日期时使用完整日期时间字符串。
  label: "文档",
})
```

状态可选 `todo`、`progress`、`review`、`done`；优先级可选 `high`、`medium`、`low`。服务端填写 `created_by`、`version`、初始 `position`，并根据状态维护 `completed_at`；客户端不用伪造这些字段。已归档项目不能接收新任务，也不能把任务改分配给停用成员。

**项目和任务更新必须携带 Forma 自定义的 `X-Record-Version` 请求头。** 这是本项目的并发保护约定，不是 PocketBase 默认要求：

```ts
const updated = await pb.collection<Task>("tasks").update(
  task.id,
  { status: "done" },
  { headers: { "X-Record-Version": String(task.version) } },
)

// 下一次写入使用返回记录的新版本。
const deleted = await pb.collection<Task>("tasks").update(
  updated.id,
  { deleted_at: new Date().toISOString() },
  { headers: { "X-Record-Version": String(updated.version) } },
)

await pb.collection<Task>("tasks").update(
  deleted.id,
  { deleted_at: "" },
  { headers: { "X-Record-Version": String(deleted.version) } },
)
```

服务端在事务中比较版本、写入记录和操作动态。过期版本返回 409，应刷新记录、保留用户草稿并重新核对后提交，不要自动覆盖他人的修改。普通客户端不能物理删除项目或任务；任务通过 `deleted_at` 进入或离开回收站，项目通过 `archived` 归档或恢复。

评论只需提交任务 ID 与正文：

```ts
await pb.collection("comments").create({
  task: taskId,
  body: "已完成第一轮检查。",
})
```

作者由服务端依据当前身份填写；回收站中的任务不能新增评论。上述约束可在 [`backend/pb_hooks/lib.js`](../backend/pb_hooks/lib.js) 中查看。

## 7. 在 React 中使用查询缓存与实时订阅

Forma 的服务端数据交给 TanStack Query。业务组件优先复用 `useWorkspace()`、`useActions()` 和 `useComments()`；新增查询也应沿用包含当前用户 ID 的查询键，并把取消信号传入 SDK：

```ts
const tasks = useQuery({
  queryKey: ["workspace", user?.id, "tasks"],
  enabled: !!user,
  queryFn: ({ signal }) =>
    pb.collection<Task>("tasks").getFullList({
      sort: "position,-created",
      signal,
    }),
})
```

此片段需在组件或自定义 Hook 中使用，并导入 `useQuery`；`user` 来自 `useAuth()`。不要把任务、项目、成员等业务记录持久化到 Zustand，它只保存界面偏好等客户端状态。

写入成功后使相关查询失效，等待服务端数据刷新。需要每次操作都执行后续逻辑时，分别 `await mutateAsync()` 并处理失败；连续调用同一个 mutation 的 `mutate(..., { onSuccess })`，每次调用附带的回调并不保证都会执行。

PocketBase 的实时能力基于 SSE。订阅整个集合使用 `"*"`，订阅单条记录使用该记录的 ID：

```ts
const unsubscribe = await pb.collection("tasks").subscribe("*", () => {
  void queryClient.invalidateQueries({ queryKey: ["workspace"] })
})

// 页面卸载或用户退出时，移除当前订阅。
await unsubscribe()
```

不要直接把异步函数作为 `useEffect` 回调。项目现有实现处理了“订阅尚未建立，组件就已卸载”的情况，可参考 [`useWorkspace()`](../src/hooks/use-workspace.ts)。实时消息触发重新查询，另有焦点刷新与定时查询作为补偿；它不代替写入请求的成功确认。订阅权限见 [官方 Realtime API](https://pocketbase.io/docs/api-realtime/)。

## 8. API Rules 与服务端 Hooks

集合分别配置 `listRule`、`viewRule`、`createRule`、`updateRule`、`deleteRule`，认证集合还有用于账号管理的 `manageRule`。

| 规则值 | 含义 |
| --- | --- |
| `null` | 锁定，仅运维超级管理员可执行 |
| `""` | 公开，匿名请求也可执行 |
| 非空表达式 | 仅允许满足表达式的请求或记录 |

Forma 常用的成员访问条件是：

```text
@request.auth.id != '' && @request.auth.active = true
```

规则也参与筛选记录：列表规则不满足时可能返回 200 和空列表；不满足查看或更新规则时可能返回 404；锁定操作通常返回 403。运维超级管理员绕过 API Rules，因此验证业务权限要使用真实 `members` 账号。详见 [官方规则说明](https://pocketbase.io/docs/api-rules-and-filters/)。

API Rules 处理访问权限；跨记录校验、版本检查、作者归属和操作动态由服务端 Hook 补充。入口在 `main.pb.js`，可复用逻辑通过 `require(__hooks + "/lib.js")` 加载。Hook 运行在 PocketBase 嵌入式 JavaScript 环境中，不是 Node.js，不能直接使用浏览器对象或依赖 Node API 的包；回调作用域及运行时限制见 [官方 JavaScript 扩展说明](https://pocketbase.io/docs/js-overview/)。

新增自定义 API 时也必须自行校验身份、权限和输入。前端隐藏按钮只控制交互，不能承担权限检查。

## 9. 使用迁移修改数据结构

Forma 启动时使用 `--automigrate=false`，关闭的是“后台修改结构后自动生成迁移”，**不是禁止启动时应用已有迁移**。尚未执行的新迁移仍会在启动时运行。迁移机制见 [官方 Migrations 文档](https://pocketbase.io/docs/js-migrations/)。

已经发布的迁移不能修改。需要新增字段时，新建一个迁移文件；例如，为任务增加可选的预计分钟数字段：

```sh
backend/.bin/pocketbase migrate create "add_task_estimate_minutes" \
  --dir=backend/pb_data \
  --migrationsDir=backend/pb_migrations \
  --hooksDir=backend/pb_hooks \
  --automigrate=false
```

在新生成的文件中编写升级逻辑，例如：

```js
migrate((app) => {
  const tasks = app.findCollectionByNameOrId("tasks")
  tasks.fields.add(new NumberField({
    name: "estimate_minutes",
    min: 0,
    onlyInt: true,
  }))
  app.save(tasks)
})
```

这是新增功能的教学示例，当前项目未添加该字段。集合与字段 API 见 [官方集合操作文档](https://pocketbase.io/docs/js-collections/)。迁移可选第二个回调作为降级逻辑；删除字段会损失数据，不能把降级脚本当作完整备份。

推荐流程：

1. 新建迁移，明确字段默认值、已有记录兼容方式与权限。
2. 同步更新 `src/lib/types.ts`、表单、服务端校验及相关测试。
3. 在临时数据目录和独立端口上验证从空库启动、从旧结构升级及权限行为；现有隔离测试可作为起点。
4. 运行 `npm run lint`、`npm run typecheck`、`npm run build`、`npm test`。
5. 部署前完成备份，在独立实例确认升级有效后，再更新实际服务。

如需手动执行迁移，停止后端后使用下列命令，完成后再启动服务以加载新结构：

```sh
backend/.bin/pocketbase migrate up \
  --dir=backend/pb_data \
  --migrationsDir=backend/pb_migrations \
  --hooksDir=backend/pb_hooks \
  --automigrate=false
```

不要只在后台手改结构却不提交迁移；在当前配置下，这种修改不会自动变成可复现的源码变更。备份与恢复步骤见 [运维说明](operations.md)。

## 10. 常见问题

| 现象 | 优先检查 |
| --- | --- |
| 登录失败 | 是否使用 `members` 身份、账号是否启用、密码是否正确、是否触发限流 |
| 修改任务或项目返回 400 | 是否缺少 `X-Record-Version`，或字段/业务校验不通过 |
| 返回 409 | 当前记录版本已过期，刷新后核对草稿再提交 |
| 返回 403 / 404 或空列表 | API Rules、当前身份、记录 ID；不能只凭状态码判断记录不存在 |
| 记录关联未展开 | 是否传入 `expand`，是否有权查看关联记录 |
| 数据没有实时刷新 | 浏览器 SSE 连接和代理是否正常；检查定时查询及手动刷新 |
| CLI 操作后数据“消失” | 是否遗漏 `--dir`，误操作了二进制旁的另一套数据目录 |
| 更新迁移后没有变化 | 是否新建了迁移；已执行的迁移不会因为修改旧文件而重跑 |

前端错误优先使用 [`errorMessage()`](../src/lib/api.ts) 和现有 mutation 错误处理展示。网络中断时保留用户输入；确认写入成功后再提示完成。
