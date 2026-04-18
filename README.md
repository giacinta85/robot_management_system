# Robot Management System（机器人管理系统）

轻量化机器人管理平台，支持 PC 与手机访问，功能涵盖：机器管理、维修记录、市场需求申请、可用性甘特看板。

---

## 功能概览

| 模块 | 功能 |
|------|------|
| **机器管理** | 添加/编辑机器（序列号、型号、状态）、查看使用部门（研发/测试/市场） |
| **维修记录** | 记录每次损坏（地点、日期、原因、描述），追踪维修进度，标记修复完成 |
| **市场申请** | 公开链接无需登录，填写活动名称/地点/所需台数/起止日期 |
| **可用性看板** | 甘特日历视图，查看任意时间段所有机器的占用/空闲状态 |
| **用户管理** | 管理员可创建账号，支持四种角色（管理员/研发测试/维修技术员/市场） |

---

## 技术栈

- **后端**：Python · FastAPI · SQLAlchemy 2 (async) · Alembic
- **数据库**：PostgreSQL 16
- **前端**：React 18 · TypeScript · Ant Design 5 · FullCalendar（甘特图）
- **部署**：Docker Compose · Nginx（反向代理）

---

## 快速部署（本地）

### 前提条件

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（macOS / Windows / Linux 均可）

### 一键启动

```bash
git clone git@github.com:giacinta85/robot_management_system.git
cd robot_management_system
./deploy.sh
```

脚本会自动：
1. 从 `.env.example` 生成 `.env`（并随机生成 `SECRET_KEY`）
2. 检测端口占用
3. 构建镜像并启动所有服务
4. 等待服务就绪后打印访问信息

### 访问

| 地址 | 说明 |
|------|------|
| `http://localhost` | 后台管理界面（需登录） |
| `http://localhost/request` | 市场需求申请表单（**公开，无需登录**） |
| `http://localhost/docs` | FastAPI 自动 API 文档 |

默认管理员账号：`admin` / `admin123`（生产环境请在 `.env` 中修改）

---

## 配置说明（`.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `POSTGRES_USER` | 数据库用户名 | `rms_user` |
| `POSTGRES_PASSWORD` | 数据库密码 | ⚠️ 请修改 |
| `POSTGRES_DB` | 数据库名 | `robot_management` |
| `DATABASE_URL` | 后端数据库连接串（与上面保持一致） | — |
| `SECRET_KEY` | JWT 签名密钥（deploy.sh 自动随机生成） | ⚠️ 请修改 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token 有效期（分钟） | `10080`（7天） |
| `FIRST_ADMIN_USERNAME` | 初始管理员用户名 | `admin` |
| `FIRST_ADMIN_PASSWORD` | 初始管理员密码 | `admin123` |
| `HTTP_PORT` | 对外暴露的 HTTP 端口（80 被占用可改 8080） | `80` |

---

## 常用命令

```bash
# 查看实时日志
docker compose logs -f

# 仅查看后端日志
docker compose logs -f backend

# 停止服务（保留数据）
docker compose down

# 停止并清除所有数据（危险）
docker compose down -v

# 重新构建（代码更新后）
docker compose up --build -d
```

---

## 项目结构

```
robot_management_system/
├── deploy.sh               # 一键部署脚本
├── docker-compose.yml
├── .env.example            # 环境变量模板
├── nginx/
│   └── nginx.conf          # Nginx 反向代理配置
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/            # 数据库迁移
│   └── app/
│       ├── api/v1/         # 路由：auth / machines / maintenance / marketing
│       ├── core/           # 配置、数据库连接、安全工具
│       ├── models/         # SQLAlchemy ORM 模型
│       └── schemas/        # Pydantic 请求/响应模型
└── frontend/
    ├── Dockerfile
    └── src/
        ├── pages/          # 页面组件
        ├── components/     # 公共组件（布局等）
        ├── api/            # Axios 请求封装
        └── store/          # Zustand 状态管理
```

---

## 角色权限

| 角色 | 机器管理 | 维修记录 | 申请审批 | 甘特看板 |
|------|----------|----------|----------|----------|
| admin（管理员） | ✅ 读写 | ✅ 读写 | ✅ | ✅ |
| rd_test（研发/测试） | ✅ 只读 | ✅ 只读 | — | — |
| maintenance（维修技术员） | — | ✅ 读写 | — | — |
| marketing（市场） | — | — | — | — |
| 公开（无需登录） | — | — | 提交申请 | — |
