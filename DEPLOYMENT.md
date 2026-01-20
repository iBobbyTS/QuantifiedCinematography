# 部署指南

本文档说明如何从零开始配置自动化部署流程，以及如何确保后续的代码推送能够自动部署到服务器。

## 部署架构

本项目的部署采用以下架构：

- **GitHub Actions**: 仅作为触发器，当代码推送到 `deploy` 分支时触发部署
- **服务器**: 执行实际的构建和部署工作（拉取代码、构建、重启服务）

这种架构的优点：
- 节省 GitHub Actions 时间
- 构建环境与运行环境一致
- 避免网络问题（如镜像拉取）
- 调试更方便

## 一、服务器初始化（首次部署）

### 1. 连接到服务器

使用 SSH 连接到你的 Linux 服务器：

```bash
ssh username@your-server-ip
```

### 2. 运行服务器设置脚本

在服务器上下载或上传 `scripts/server-setup.sh` 脚本，然后运行：

```bash
# 如果是新服务器，先下载脚本
curl -fsSL https://raw.githubusercontent.com/iBobbyTS/QuantifiedCinematography/deploy/scripts/server-setup.sh -o ./server-setup.sh

# 或者手动上传脚本到服务器后执行
chmod +x server-setup.sh
./server-setup.sh
```

脚本会自动完成以下任务：

1. **安装 Docker 和 Docker Compose**
   - 检测系统类型（Ubuntu/Debian 或 CentOS/RHEL）
   - 安装 Docker 和相关工具
   - 配置 Docker 镜像加速器（中国大陆服务器）

2. **生成 SSH 密钥对**
   - 生成用于 GitHub Actions 认证的密钥对
   - 显示公钥和私钥位置

3. **创建项目目录**
   - 创建 `/opt/quantified-cinematography`（默认）
   - 创建备份目录 `/opt/backups/quantified-cinematography`
   - 设置正确的权限

4. **显示后续步骤说明**

### 3. 配置 SSH 密钥

脚本运行后，会显示生成的公钥和私钥。需要执行以下操作：

#### 3.1 将公钥添加到 authorized_keys（用于 GitHub Actions 连接）

```bash
# 查看生成的公钥
cat ~/.ssh/id_ed25519.pub

# 添加到 authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### 3.2 复制私钥内容用于 GitHub Secrets

```bash
# 查看私钥内容（复制完整内容）
cat ~/.ssh/id_ed25519
```

私钥内容应该类似：
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFw...
...（中间内容）...
-----END OPENSSH PRIVATE KEY-----
```

**重要**：复制完整的私钥内容（包括 `-----BEGIN` 和 `-----END` 行）

### 4. 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret** 添加以下 secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DEPLOY_HOST` | 服务器 IP 地址或域名 | `192.168.1.100` 或 `example.com` |
| `DEPLOY_USER` | SSH 用户名 | `ibobby` 或 `root` |
| `DEPLOY_SSH_KEY` | SSH 私钥（完整内容） | 从步骤 3.2 复制的私钥内容 |
| `DEPLOY_PORT` | SSH 端口（可选） | `22`（默认） |
| `DEPLOY_PATH` | 服务器项目路径 | `/opt/quantified-cinematography` |

#### 如何获取服务器信息：

```bash
# 在服务器上运行以下命令获取信息
echo "DEPLOY_HOST: $(hostname -I | awk '{print $1}')"
echo "DEPLOY_USER: $(whoami)"
echo "DEPLOY_PORT: 22"
echo "DEPLOY_PATH: /opt/quantified-cinematography"
```

### 5. 配置环境变量

首次部署时，服务器会自动从 `.env.example` 创建 `.env` 文件。但你需要编辑 `.env` 文件填入生产环境配置：

```bash
# 首次部署后，SSH 登录到服务器
ssh username@your-server-ip

# 进入项目目录（如果还未克隆，GitHub Actions 会自动克隆）
cd /opt/quantified-cinematography

# 编辑 .env 文件
nano .env
# 或使用 vim
# vim .env
```

**必须配置的环境变量**：

```env
# 数据库配置（如果使用 Docker Compose，这些会自动从 .env 读取）
POSTGRES_USER="your_db_user"
POSTGRES_PASSWORD="your_secure_password"
POSTGRES_DB="your_database_name"

# 应用配置
NODE_ENV="production"
APP_PORT="5173"
PUBLIC_PRODUCTION_ENVIRONMENT="1"

# 数据库连接字符串（如果使用外部数据库）
DATABASE_URL="postgres://user:password@host:port/database"
```

### 6. 首次部署

有两种方式触发首次部署：

#### 方式 A：通过 GitHub Actions 自动部署（推荐）

1. 确保所有 GitHub Secrets 已配置
2. 将代码推送到 `deploy` 分支：
   ```bash
   # 在本地
   git checkout deploy
   git merge main  # 或直接推送已有内容
   git push origin deploy
   ```
3. GitHub Actions 会自动：
   - SSH 连接到服务器
   - 克隆仓库（如果不存在）
   - 执行部署脚本
   - 构建并启动 Docker 容器

#### 方式 B：手动首次部署

如果自动部署遇到问题，可以手动部署：

```bash
# SSH 登录到服务器
ssh username@your-server-ip

# 克隆仓库
cd /opt
git clone https://github.com/your-username/QuantifiedCinematography.git quantified-cinematography
cd quantified-cinematography
git checkout deploy

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 执行部署
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 7. 验证部署

部署完成后，验证服务是否正常运行：

```bash
# 检查容器状态
docker ps

# 查看应用日志
docker compose -f docker-compose.prod.yml logs -f app

# 访问应用（如果配置了域名或端口映射）
curl http://localhost:5173
```

## 二、后续自动部署流程

首次部署完成后，后续的部署流程非常简单：

### 1. 开发流程

1. 在本地开发完成后，提交到 `main` 分支：
   ```bash
   git checkout main
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. 合并到 `deploy` 分支以触发部署：
   ```bash
   git checkout deploy
   git merge main
   git push origin deploy
   ```

### 2. 自动部署流程

当代码推送到 `deploy` 分支后：

1. **GitHub Actions 触发**
   - 检测到 `deploy` 分支有新的推送
   - 通过 SSH 连接到服务器

2. **服务器执行部署**
   - 自动拉取最新代码（`git pull`）
   - 自动创建 `.env` 文件（如果不存在）
   - 备份当前部署
   - 使用 Docker Compose 重新构建并启动服务
   - 执行健康检查

3. **部署完成**
   - 查看 GitHub Actions 日志确认部署状态
   - 访问网站验证功能正常

## 三、部署脚本详解

### deploy.sh 脚本执行步骤

`scripts/deploy.sh` 脚本在服务器上执行以下步骤：

1. **备份当前部署**
   - 创建时间戳备份文件
   - 保存到 `/opt/backups/quantified-cinematography/`

2. **确保项目目录和 Git 仓库**
   - 如果目录不存在，自动克隆仓库
   - 如果已存在，拉取最新代码

3. **配置环境变量**
   - 检查 `.env` 文件是否存在
   - 如果不存在，从 `.env.example` 创建

4. **运行数据库迁移**（可选）
   - 如果需要，取消注释迁移命令

5. **构建和重启服务**
   - 检测可用的 Docker Compose 命令（V1 或 V2）
   - 使用 `docker-compose.prod.yml` 重新构建并启动
   - 如果构建失败，保留旧版本运行

6. **健康检查**
   - 等待服务启动
   - 检查应用是否正常响应

## 四、常用操作

### 查看应用日志

```bash
# 实时查看应用日志
docker compose -f docker-compose.prod.yml logs -f app

# 查看数据库日志
docker compose -f docker-compose.prod.yml logs -f db

# 查看最近 100 行日志
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

### 查看容器状态

```bash
# 查看所有容器
docker ps

# 查看 Compose 管理的容器
docker compose -f docker-compose.prod.yml ps
```

### 手动重启服务

```bash
cd /opt/quantified-cinematography
docker compose -f docker-compose.prod.yml restart

# 或者完全重建
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### 回滚到之前的版本

```bash
# 查看备份列表
ls -la /opt/backups/quantified-cinematography/

# 解压备份
cd /opt/quantified-cinematography
tar -xzf /opt/backups/quantified-cinematography/backup_YYYYMMDD_HHMMSS.tar.gz

# 重启服务
docker compose -f docker-compose.prod.yml restart
```

### 进入容器调试

```bash
# 进入应用容器
docker compose -f docker-compose.prod.yml exec app sh

# 进入数据库容器
docker compose -f docker-compose.prod.yml exec db psql -U your_user -d your_database
```

## 五、故障排查

### GitHub Actions 失败

**症状**：GitHub Actions 显示失败

**排查步骤**：

1. 检查 Secrets 配置
   - 确认所有必需的 Secrets 都已配置
   - 验证私钥格式正确（包含完整内容）

2. 测试 SSH 连接
   ```bash
   # 使用私钥测试连接
   ssh -i ~/.ssh/private_key username@server-ip
   ```

3. 查看 GitHub Actions 日志
   - 在 Actions 页面查看详细错误信息
   - 检查 SSH 连接是否成功
   - 查看服务器端错误

### 部署脚本执行失败

**症状**：GitHub Actions 成功，但部署脚本失败

**排查步骤**：

1. 检查服务器日志
   ```bash
   # 在服务器上查看部署日志
   cd /opt/quantified-cinematography
   ./scripts/deploy.sh 2>&1 | tee deploy.log
   ```

2. 检查权限
   ```bash
   # 确保脚本有执行权限
   chmod +x scripts/deploy.sh
   
   # 确保目录权限正确
   ls -la /opt/quantified-cinematography
   ```

3. 检查 Docker 状态
   ```bash
   # 检查 Docker 服务
   sudo systemctl status docker
   
   # 检查 docker-compose 命令
   docker-compose --version
   # 或
   docker compose version
   ```

### 应用无法启动

**症状**：部署成功，但应用无法访问

**排查步骤**：

1. 查看容器日志
   ```bash
   docker compose -f docker-compose.prod.yml logs app
   ```

2. 检查环境变量
   ```bash
   # 确认 .env 文件存在且配置正确
   cat .env
   ```

3. 检查端口占用
   ```bash
   # 检查端口是否被占用
   netstat -tulpn | grep 5173
   # 或
   sudo lsof -i :5173
   ```

4. 检查数据库连接
   ```bash
   # 测试数据库连接
   docker compose -f docker-compose.prod.yml exec app bun run src/lib/server/db/test-connection.ts
   ```

5. 检查防火墙
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   
   # CentOS/RHEL
   sudo firewall-cmd --list-all
   ```

### Docker 镜像拉取失败

**症状**：`docker pull` 超时或失败

**解决方案**：

1. 配置 Docker 镜像加速器（已在 server-setup.sh 中配置）
   ```bash
   # 如果还没有配置，执行以下命令（使用当前可用的国内镜像源）
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json > /dev/null <<EOF
   {
     "registry-mirrors": [
       "https://docker.xuanyuan.me",
       "https://docker.m.daocloud.io",
       "https://mirror.ccs.tencentyun.com",
       "https://docker.1panel.live",
       "https://hub.rat.dev"
     ]
   }
   EOF
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   
   # 验证配置
   docker info | grep -A 10 "Registry Mirrors"
   ```
   
   **推荐镜像源说明**：
   - **轩辕镜像** (`docker.xuanyuan.me`): 免费，稳定，境内 CDN 加速
   - **DaoCloud** (`docker.m.daocloud.io`): 企业维护，稳定性高
   - **腾讯云** (`mirror.ccs.tencentyun.com`): 在腾讯云服务器上表现更佳
   - **1Panel** (`docker.1panel.live`): 社区维护，备用源
   - **Rat.dev** (`hub.rat.dev`): 个人维护，备用源
   
   **阿里云用户**：如果你有阿里云账号，可以获取专属的镜像加速器地址（速度更快）：
   - 登录 [阿里云控制台](https://cr.console.aliyun.com/)
   - 进入「容器镜像服务」→「镜像加速器」
   - 复制你的专属加速器地址（格式：`https://<你的ID>.mirror.aliyuncs.com`）
   - 将其添加到 `registry-mirrors` 数组的第一位

2. 手动拉取镜像
   ```bash
   docker pull postgres:16-alpine
   docker pull oven/bun:1
   ```

## 六、安全建议

### 1. 使用非 root 用户

创建专用部署用户：

```bash
# 创建部署用户
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# 使用该用户运行部署
```

### 2. 配置 SSH 安全

```bash
# 禁用密码登录（仅使用密钥）
sudo nano /etc/ssh/sshd_config

# 设置以下选项：
# PasswordAuthentication no
# PubkeyAuthentication yes

# 重启 SSH 服务
sudo systemctl restart sshd
```

### 3. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5173/tcp  # 应用端口（如果需要外部访问）
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

### 4. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# 或
sudo yum update -y  # CentOS/RHEL

# 更新 Docker
sudo apt install --upgrade docker.io  # Ubuntu/Debian
```

### 5. 备份策略

- 定期备份数据库
- 保留部署备份（已自动创建）
- 考虑使用自动化备份工具

## 七、环境变量参考

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `POSTGRES_USER` | 数据库用户名 | `root` |
| `POSTGRES_PASSWORD` | 数据库密码 | `your_secure_password` |
| `POSTGRES_DB` | 数据库名称 | `local` |
| `NODE_ENV` | 环境类型 | `production` |
| `PUBLIC_PRODUCTION_ENVIRONMENT` | 生产模式标志 | `1`（生产）或 `0`（开发） |
| `APP_PORT` | 应用端口 | `5173` |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | 自动从 POSTGRES_* 构建 |

## 八、常见问题

### Q: 如何跳过自动部署，手动部署？

A: 可以手动在服务器上执行部署脚本：

```bash
cd /opt/quantified-cinematography
./scripts/deploy.sh
```

### Q: 如何回滚到特定版本？

A: 可以使用 Git 回滚：

```bash
cd /opt/quantified-cinematography
git log  # 查看提交历史
git checkout <commit-hash>  # 切换到特定提交
docker compose -f docker-compose.prod.yml restart
```

### Q: 如何查看部署历史？

A: 查看备份目录和 Git 提交历史：

```bash
# 查看备份
ls -la /opt/backups/quantified-cinematography/

# 查看 Git 提交
cd /opt/quantified-cinematography
git log --oneline
```

### Q: 如何同时部署到多个服务器？

A: 可以：
1. 为每个服务器创建不同的 Secrets（如 `DEPLOY_HOST_1`, `DEPLOY_HOST_2`）
2. 在 workflow 中并行执行多个部署步骤
3. 或使用不同的部署路径

### Q: 部署脚本执行很慢怎么办？

A: 可能的原因：
- 网络问题（拉取 Docker 镜像慢）
- 构建时间长（首次构建会慢）
- 服务器资源不足

建议：
- 使用镜像加速器
- 增加服务器资源
- 优化 Dockerfile 构建步骤

## 九、技术支持

如果遇到问题：

1. 查看本文档的故障排查部分
2. 检查 GitHub Actions 日志
3. 查看服务器部署日志
4. 检查 Docker 容器日志

---

**最后更新**：2026-01-19
