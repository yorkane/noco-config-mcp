# NocoBase 安装部署指南

基于 Docker Compose + 外部 PostgreSQL，快速部署 NocoBase 最新稳定版。

## 前置条件

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 20.10+ | [安装文档](https://docs.docker.com/engine/install/) |
| Docker Compose | v2.0+ | 通常随 Docker 一起安装，验证：`docker compose version` |
| PostgreSQL | 14+ | 外部数据库，需提前准备 |

### PostgreSQL 准备

确保外部 PostgreSQL 已就绪，并创建专用数据库：

```sql
-- 连接到 PostgreSQL 后执行
CREATE DATABASE nocobase ENCODING 'UTF8';

-- 如需限制权限，创建专用用户
CREATE USER nocobase WITH PASSWORD 'your_db_password';
GRANT ALL PRIVILEGES ON DATABASE nocobase TO nocobase;
```

## 快速安装

### 1. 创建项目目录

```bash
mkdir -p /opt/nocobase && cd /opt/nocobase
```

### 2. 创建 docker-compose.yml

```yaml
services:
  app:
    image: nocobase/nocobase:latest-full
    restart: always
    environment:
      - APP_KEY=请替换为随机密钥
      - DB_DIALECT=postgres
      - DB_HOST=你的数据库地址
      - DB_PORT=5432
      - DB_DATABASE=nocobase
      - DB_USER=nocobase
      - DB_PASSWORD=你的数据库密码
      - TZ=Asia/Shanghai
    volumes:
      - ./storage:/app/nocobase/storage
    ports:
      - '13000:80'
```

> **APP_KEY 必须修改**。生成随机密钥：
> ```bash
> openssl rand -hex 32
> ```

### 3. 启动服务

```bash
docker compose pull
docker compose up -d
```

### 4. 验证安装

浏览器访问 `http://<你的服务器IP>:13000`，使用初始账号登录：

- 账号：`admin@nocobase.com`
- 密码：`admin123`

> 首次启动需要约 1-3 分钟进行数据库初始化，期间页面可能无响应，属正常现象。可通过 `docker compose logs -f app` 查看启动进度。

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `APP_KEY` | **是** | 应用密钥，用于加密 token。**修改后所有已登录用户会登出** |
| `DB_DIALECT` | **是** | 数据库类型，固定为 `postgres` |
| `DB_HOST` | **是** | PostgreSQL 地址 |
| `DB_PORT` | **是** | PostgreSQL 端口，默认 `5432` |
| `DB_DATABASE` | **是** | 数据库名 |
| `DB_USER` | **是** | 数据库用户 |
| `DB_PASSWORD` | **是** | 数据库密码 |
| `TZ` | 否 | 时区，默认跟随系统。建议设为 `Asia/Shanghai` |

## 镜像版本说明

### 版本标签

| 标签 | 说明 | 适用场景 |
|------|------|---------|
| `latest` | 最新稳定版（标准） | 基础使用 |
| `latest-full` | 最新稳定版（完整） | **推荐**，包含数据库客户端和 LibreOffice |
| `2.0.36` | 指定稳定版（标准） | 锁定版本 |
| `2.0.36-full` | 指定稳定版（完整） | 生产环境锁定版本 |
| `beta-full` | 最新测试版（完整） | 体验新功能 |

### 标准版 vs 完整版

| | 标准版 | 完整版 (`-full`) |
|--|--------|-----------------|
| 数据库客户端 | 无 | 有（支持备份、迁移插件） |
| LibreOffice | 无 | 有（支持模板打印导出 PDF） |
| 镜像体积 | ~275MB | ~605MB |

> **生产环境建议**：使用具体版本号（如 `2.0.36-full`）而非 `latest`，避免自动升级导致兼容性问题。

### 锁定版本

在 `docker-compose.yml` 中将 `image` 改为具体版本号即可：

```yaml
image: nocobase/nocobase:2.0.36-full
```

## 安装后配置

### 1. 修改默认密码

登录后立即修改管理员密码：

1. 点击右上角头像 → **个人中心**
2. 修改密码
3. 保存

### 2. 基本系统设置

进入 **系统管理**（左下角齿轮图标）：

- **插件管理**：按需启用插件（推荐先开启：文件管理、用户管理）
- **通用设置**：配置系统名称、Logo
- **区域设置**：确认时区和语言

### 3. 防火墙放行

```bash
# firewalld
firewall-cmd --permanent --add-port=13000/tcp
firewall-cmd --reload

# 或 ufw
ufw allow 13000/tcp
```

## 升级

```bash
# 1. 备份数据库（重要！）
pg_dump -h <DB_HOST> -U nocobase nocobase > backup_$(date +%Y%m%d).sql

# 2. 修改 docker-compose.yml 中的镜像版本号
# 例如：2.0.36-full → 2.0.37-full

# 3. 拉取新镜像并重启
docker compose pull
docker compose up -d

# 4. 查看日志，确认升级成功
docker compose logs -f app
```

> 版本号**只升不降**，不可回退。升级前务必备份数据库。

## 常用运维命令

```bash
# 查看实时日志
docker compose logs -f app

# 重启服务
docker compose restart app

# 停止服务
docker compose down

# 停止并清除容器（数据保留在 storage 目录和外部数据库）
docker compose down -v
```

## 参考链接

- 官方文档：https://docs.nocobase.com/cn/get-started/installation/docker
- Docker Hub：https://hub.docker.com/r/nocobase/nocobase
