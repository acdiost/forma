# Forma 私有部署技术选型

日期：2026-10-24

状态：v0.0.1 已采用。当前交付范围与验收限制以 README.md 和 CHANGELOG.md 为准；本文保留后续功能路线。

## 目标与假设

服务个人或小团队的内部项目和任务管理。优先私有部署、单机运行、较少运维依赖。第一版采用一个部署对应一个工作空间，支持多个成员；暂不承担多租户 SaaS 和高可用集群的需求。

## 选型

| 层 | 选择 | 责任 |
| --- | --- | --- |
| 前端 | React + TypeScript + Vite | 保留现有 SPA，构建为静态文件 |
| UI | shadcn/ui Nova + Lucide | 沿用现有组件与图标 |
| 动效与布局 | Motion + react-resizable-panels + dnd-kit | 沿用现有动效、面板缩放和拖拽 |
| 客户端状态 | Zustand | 主题、筛选、面板、草稿等界面状态 |
| 服务端数据状态 | TanStack Query + PocketBase 官方 JS SDK | 查询、缓存、失效刷新、写入状态与错误处理 |
| 后端 | PocketBase | 内置 CRUD API、身份认证、实时订阅、文件与管理后台 |
| 数据库 | PocketBase 内置 SQLite | 由 PocketBase 管理，不增加独立数据库服务 |
| 权限与业务规则 | PocketBase API Rules + 必要的服务端 Hooks | 在服务端约束读写权限和关键业务流程 |
| 文件 | 初期使用本地持久化目录 | 随应用数据备份；出现实际容量需求再评估对象存储 |
| 部署 | 自建 Docker 镜像 + Docker Compose | 一个应用服务、持久化数据目录；前端由 PocketBase 托管 |

TanStack Query 与 Zustand 分工明确：任务、项目、成员等业务记录的权威数据在后端，不再由 Zustand persist 保存整份任务列表。

## 部署形态

```text
浏览器
  └─ HTTPS / 内网访问地址
      └─ Forma 应用容器
          ├─ PocketBase
          ├─ pb_public/      前端静态构建
          ├─ pb_hooks/       必要的业务约束
          ├─ pb_migrations/  版本化数据结构迁移
          └─ pb_data/        挂载的持久化数据与本地附件
```

运行环境只需容器运行时；Node.js 用于前端构建阶段。PocketBase 没有官方 Docker 镜像，因此使用官方发布的二进制构建自己的固定版本镜像。已有反向代理时复用；单独绑定域名时可以使用 PocketBase 的 HTTPS 能力。

第一版不引入独立缓存、队列、搜索服务或对象存储服务。简单搜索使用数据库查询，实时更新使用 PocketBase 内置订阅。

## 第一版业务边界

- 一个工作空间，管理员和普通成员两种角色。
- 关闭开放注册，由管理员创建或管理成员；初期使用账号密码登录，避免强制依赖邮件服务。
- 项目、任务完整增删改查；任务分配、截止日期、标签、排序和回收站。
- 我的任务、搜索筛选、列表与看板。
- 评论、真实操作记录与基础协作通知。
- 导出与可验证的备份恢复。

项目角色与数据规则必须由 API Rules 和服务端校验执行。应用普通管理员属于业务用户，不向浏览器提供 PocketBase 超级管理员凭据。

## 实施顺序

1. 建立固定版本的后端、数据结构迁移、Dockerfile、Compose、持久化目录与初始化说明。
2. 接入登录与服务端权限，移除固定当前用户和示例成员身份。
3. 将项目和任务迁移到真实 API，使用 TanStack Query 管理查询与写入，保留现有交互。
4. 接入真实统计、操作记录与成员变更订阅；完成保存失败、重试和冲突处理。
5. 验证重启、跨设备登录、越权访问拒绝、多人更新、备份恢复及版本升级。

## 运维与技术取舍

- 应用镜像与数据分离，升级容器不覆盖持久化目录。
- 固定依赖和 PocketBase 版本；迁移脚本进入版本管理，升级前备份。
- 使用 PocketBase 内置备份流程；运行中不直接复制 SQLite 文件充当一致性备份。
- 本机备份之外保留异机副本，并实际验证恢复。
- 此方案以单实例为目标；不承诺任意并发容量或直接水平扩展。
- PocketBase 官方说明：在达到 1.0 前不保证完全向后兼容，暂不推荐用于关键生产应用。若未来需要严格高可用、复杂事务或关键业务承载，需要重新评估后端方案。这里优先选择内部工具的低部署与维护成本。

## 配色约定

- 使用官方 `@radix-ui/colors` 包，随应用打包，不依赖运行时 CDN。
- 暖砂：Orange + Sand；靛蓝：Indigo + Slate；青玉：Jade + Sage。色板选择和深浅色模式分别保存到 Zustand UI 偏好。
- `src/themes.css` 将官方色阶映射为 shadcn 语义变量：1–2 背景，3–5 交互背景，6–8 边框与焦点，9–10 实色与悬停，11–12 文字。
- 组件、图表和项目颜色使用语义 CSS 变量；错误、警告、信息、成功分别使用 Red、Amber、Blue、Jade，避免业务含义随主题改变。提示消息也沿用相同规则。
- [Radix 色阶用途](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)与[配色搭配](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)。

## 官方依据

- [PocketBase 概览与版本兼容性说明](https://pocketbase.io/docs/)
- [PocketBase 部署、Docker 与备份恢复](https://pocketbase.io/docs/going-to-production/)
- [PocketBase API 权限规则](https://pocketbase.io/docs/api-rules-and-filters/)
- [PocketBase 身份认证](https://pocketbase.io/docs/authentication/)
- [TanStack Query 服务端状态管理](https://tanstack.com/query/latest/docs/framework/react/overview)
