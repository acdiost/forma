# 运维说明

## 数据与配置

- Docker 数据：Compose 命名卷 `forma_data`，容器内 `/app/pb_data`。
- 本机开发数据：`backend/pb_data`；原生程序使用显式目录参数，和 `backend/.bin` 分开。
- 首次初始化密钥：`.env` 的 `FORMA_SETUP_TOKEN`，生成后妥善保存。
- 数据结构：`backend/pb_migrations`；业务约束：`backend/pb_hooks`。
- 后端固定版本与下载校验：`backend/version.json`、Dockerfile。

勿将 `.env`、数据卷、数据库或备份提交到源码仓库。备份包含账号信息和业务内容，应存放于受控位置。

## Docker 离线一致性备份

以下操作先停止应用，再将完整数据卷打包；暂停期间无法访问应用。

```sh
mkdir -p backups
docker compose stop forma
docker compose run --rm --no-deps -T --entrypoint tar forma -czf - -C /app/pb_data . > backups/forma-backup.tar.gz
docker compose start forma
```

使用有日期的文件名保留多份副本，另保存一份到其他设备。不要运行 `docker compose down -v`，该参数会删除持久化卷。

## 恢复到独立实例

先确认原备份文件可读，使用相同版本镜像，在新的 Compose 项目数据卷中恢复。此流程保留原实例，便于核对。

```sh
COMPOSE_PROJECT_NAME=forma-restore docker compose run --rm --no-deps -T --entrypoint tar forma -xzf - -C /app/pb_data < backups/forma-backup.tar.gz
COMPOSE_PROJECT_NAME=forma-restore FORMA_PORT=8092 docker compose up -d --no-build
```

通过 http://127.0.0.1:8092 验证原有账号登录、项目、任务、评论和记录版本。确认恢复有效后再决定是否切换服务入口。新项目名称必须未用于其他部署。

## 原生备份

停止原生 PocketBase 后，完整复制或打包 `backend/pb_data`。恢复前停止服务，优先在独立测试目录用相同二进制验证备份；不要在运行中直接复制数据库文件。

PocketBase 另提供内置在线备份/恢复，可由运维超级管理员通过 `/_/` 后台使用。具体行为见 [官方备份文档](https://pocketbase.io/docs/going-to-production/#backup-and-restore)。

## 升级

1. 记录当前版本和镜像，完成一致性备份并验证可恢复。
2. 阅读 Forma 版本说明及 PocketBase 的兼容性变更。
3. 在独立实例应用新版本，检查迁移、登录、权限与主要任务流程。
4. 更新生产实例；运行数据卷保持不变，迁移在启动时事务执行。
5. 升级后的数据库不保证能直接交给旧程序；需要回滚时使用对应旧版本镜像和升级前备份，在独立实例恢复。

## 排查

- `docker compose logs --tail=100 forma`：查看服务启动/迁移问题。
- `/api/health`：PocketBase 存活检查。
- `/api/forma/status`：Forma 版本和首次初始化状态。
- 出现 409：记录被其他成员修改，重新打开编辑窗口，以最新版本核对并提交。
- 多次登录失败可能触发 PocketBase 默认限流，请稍后重试。
- 前端断网会显示连接失败；恢复后可点击刷新，不会把未保存的修改伪装成已保存。

默认只绑定本机。需要网络访问时明确配置绑定地址，并通过部署环境的 HTTPS 入口访问。
