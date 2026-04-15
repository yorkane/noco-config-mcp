# NocoBase MCP Server 部署指南

> 本项目提供 NocoBase 配置 MCP Server，通过标准 MCP 协议暴露 NocoBase REST API 操作，供 AI Agent 完成基础配置任务。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│  NocoBase (Docker)                                      │
│  http://<YOUR_HOST>:13000                               │
│  ├── PostgreSQL: <DB_HOST>:5432 / <DB_NAME>             │
│  └── REST API + Swagger                                 │
├─────────────────────────────────────────────────────────┤
│  MCP Server (独立 Node.js 进程, stdio 传输)              │
│  ├── 镜像: node:24-slim                                │
│  ├── SDK: @modelcontextprotocol/sdk                     │
│  └── 工具: collections / fields / records / routes ...  │
└─────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 前置条件

| 依赖 | 说明 |
|------|------|
| Docker + Compose | 运行 NocoBase 和 MCP Server |
| PostgreSQL 14+ | 外部数据库 |

### 2. 部署 NocoBase

参考 [noco-install.md](./noco-install.md) 完成部署。

### 3. 配置 MCP Server

参考 [noco-config-mcp/README.md](./noco-config-mcp/README.md) 配置 MCP 客户端。

---

## 项目结构

```
├── docker-compose.yml          # NocoBase 主服务模板
├── noco-install.md             # 安装部署指南
├── nocobase-integration.md     # 开发集成规范
├── noco-config-mcp/            # MCP Server
│   ├── index.js                # 入口
│   ├── Dockerfile
│   └── lib/
│       ├── api.js              # API 客户端
│       ├── constants.js        # 类型映射
│       ├── tool-definitions.js # 工具定义
│       └── handlers/           # 各操作处理器
├── skills/                     # NocoBase Skills
│   └── nocobase-ui-w/          # UI Builder Skill
└── .gitignore
```
