# 部署指南

本文档说明如何配置自动化部署流程。

## 概述

当 GitHub 的 `main` 分支合并到 `deploy` 分支后，会自动触发部署流程：
1. GitHub Actions 运行测试和构建
2. 通过 SSH 连接到服务器
3. 执行部署脚本拉取代码、构建并重启服务

## 前置要求

### 服务器端

1. **安装必要软件**
   ```bash
   # 安装 Bun
   curl -fsSL https://bun.sh/install | bash
   
   # 安装 Docker 和 Docker Compose
   # 参考: https://docs.docker.com/engine/install/
   ```

2. **克隆仓库**
   ```bash
   cd /opt
   git clone <your-repo-url> quantified-cinematography
   cd quantified-cinematography
   git checkout deploy
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入生产环境配置
   ```

4. **设置部署脚本权限**
   ```bash
   chmod +x scripts/deploy.sh
   ```

### GitHub 配置

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下 secrets：

1. **DEPLOY_HOST**: 服务器 IP 地址或域名
2. **DEPLOY_USER**: SSH 用户名（如 `root` 或 `deploy`）
3. **DEPLOY_SSH_KEY**: SSH 私钥（用于认证）
4. **DEPLOY_PORT**: SSH 端口（可选，默认 22）
5. **DEPLOY_PATH**: 服务器上项目路径（如 `/opt/quantified-cinematography`）

### 生成 SSH 密钥对

在服务器上生成 SSH 密钥对（如果还没有）：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
# 将公钥添加到 ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

然后将私钥（`~/.ssh/id_ed25519`）的内容复制到 GitHub Secrets 的 `DEPLOY_SSH_KEY`。

## 部署流程

### 自动部署

1. 在本地开发完成后，合并到 `main` 分支
2. 将 `main` 合并到 `deploy` 分支：
   ```bash
   git checkout deploy
   git merge main
   git push origin deploy
   ```
3. GitHub Actions 会自动触发部署

### 手动部署

如果需要手动部署，可以在服务器上直接运行：

```bash
cd /opt/quantified-cinematography
./scripts/deploy.sh
```

## 部署脚本说明

`scripts/deploy.sh` 脚本执行以下步骤：

1. **备份当前部署** - 创建时间戳备份
2. **拉取最新代码** - 从 GitHub 拉取 `deploy` 分支
3. **安装依赖** - 使用 `bun install`
4. **编译消息** - 运行 `paraglide-js` 编译国际化消息
5. **构建应用** - 运行 `bun run build`
6. **数据库迁移** - （可选）运行数据库迁移
7. **重启服务** - 使用 Docker Compose 重启应用
8. **健康检查** - 验证应用是否正常运行

## 使用 Docker Compose 部署

### 开发环境

```bash
docker compose up -d
```

### 生产环境

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 监控和日志

### 查看应用日志

```bash
# Docker Compose
docker compose logs -f app

# 生产环境
docker compose -f docker-compose.prod.yml logs -f app
```

### 查看数据库日志

```bash
docker compose logs -f db
```

## 回滚

如果需要回滚到之前的版本：

```bash
cd /opt/quantified-cinematography
cd /opt/backups/quantified-cinematography
# 列出备份
ls -la
# 解压备份
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz -C /opt/quantified-cinematography
# 重启服务
docker compose -f docker-compose.prod.yml restart
```

## 故障排查

### GitHub Actions 失败

1. 检查 GitHub Actions 日志
2. 确认所有 secrets 都已正确配置
3. 验证 SSH 连接是否正常：
   ```bash
   ssh -i <private-key> <user>@<host> -p <port>
   ```

### 服务器部署失败

1. 检查部署脚本权限：`chmod +x scripts/deploy.sh`
2. 检查项目路径是否正确
3. 查看部署日志：`./scripts/deploy.sh 2>&1 | tee deploy.log`
4. 检查 Docker 服务状态：`docker compose ps`

### 应用无法启动

1. 检查环境变量配置
2. 查看应用日志：`docker compose logs app`
3. 检查端口是否被占用：`netstat -tulpn | grep 5173`
4. 验证数据库连接

## 安全建议

1. **使用非 root 用户**：创建专用部署用户
2. **限制 SSH 访问**：使用密钥认证，禁用密码登录
3. **防火墙配置**：只开放必要端口
4. **定期更新**：保持系统和依赖包更新
5. **备份策略**：定期备份数据库和应用数据

## 环境变量

生产环境需要配置以下环境变量（在 `.env` 文件中）：

- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `POSTGRES_USER`: 数据库用户名
- `POSTGRES_PASSWORD`: 数据库密码
- `POSTGRES_DB`: 数据库名称
- `NODE_ENV`: 设置为 `production`
- `APP_PORT`: 应用端口（默认 5173）

其他应用特定的环境变量请参考 `.env.example`。
