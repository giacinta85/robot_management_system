# 机器人管理系统 (Robot Management System)

> 面向多角色团队的机器人全生命周期管理平台，覆盖机器出借、维修记录、市场申请、发货追踪与售后反馈，管理员操作全程可审计回退。

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)

---

## 目录

- [系统角色](#系统角色)
- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [快速启动（生产模式）](#快速启动生产模式)
- [快速刷新（修改后一键更新）](#快速刷新修改后一键更新)
- [开发模式（热重载）](#开发模式热重载)
- [默认账号](#默认账号)
- [环境变量](#环境变量env)
- [项目结构](#项目结构)

---

## 系统角色

| 角色 | 标识 | 说明 |
|------|------|------|
| **管理员** | `admin` | 全部功能权限，含审批、操作日志回退、资源库管理 |
| **研发/测试** | `rd_test` | 管理机器、维修记录、查看可用性看板 |
| **维修工程师** | `maintenance` | 创建和查看维修记录 |
| **市场人员** | `marketing` | 通过公开页面提交机器借用申请（无需登录） |
| **公众用户** | — | 公开表单：市场申请 · 发货申请 · 售后反馈（均无需登录） |

---

## 功能概览

### 管理员（admin）

- **概览看板**：机器状态统计、待处理申请提醒
- **机器管理**：增删改查、状态/用途/型号管理、使用记录
- **维修记录**：全部维修单查看与管理
- **市场申请审批**：
  - 查看 待审批 / 已拒绝 / 已审批 申请
  - 选择空闲市场机器并审批（含日期冲突检测）
  - 已拒绝的申请可重新提交审批
- **可用性看板**：Gantt 图展示各机器时间线占用情况
- **发货管理**：查看发货申请、更新状态、管理附件
- **售后管理**：查看售后反馈、更新处理进度
- **资源库管理**：机器型号、舞蹈策略、动作集、语音包、功能开关、部门标签
- **操作日志（审计）**：记录所有管理员的增/改/删操作，支持**一键回退**至操作前状态

### 研发/测试（rd_test）

- 机器管理（增删改、分配记录）
- 维修记录查看与创建
- 可用性看板查看

### 维修工程师（maintenance）

- 维修记录（创建、查看、更新）

### 公开用户（无需登录）

| 页面 | 路径 | 说明 |
|------|------|------|
| 市场借机申请 | `/request` | 填写活动信息提交借机申请 |
| 发货申请 | `/shipping-request` | 发货需求表单 |
| 售后反馈 | `/after-sales-request` | 售后问题上报 |

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | React 18 · TypeScript · Ant Design 5 · Vite · React Router 6 |
| 后端 | FastAPI 0.115 · SQLAlchemy 2 (async) · Alembic · Pydantic v2 |
| 数据库 | PostgreSQL 16 |
| 认证 | JWT (OAuth2 Password Flow) |
| 容器 | Docker Compose |
| 反向代理 | Nginx |

---

## 快速启动（生产模式）

### 前提条件

- Docker ≥ 24 + Docker Compose v2

```bash
# 1. 克隆项目
git clone https://github.com/giacinta85/robot_management_system.git
cd robot_management_system

# 2. （可选）调整配置
cp .env.example .env   # 修改密码等敏感配置

# 3. 一键启动
./run.sh
# 等价于：docker compose up --build -d

# 4. 访问系统
# 管理后台：http://localhost:8080
# API 文档： http://localhost:8080/api/v1/docs
```

停止服务（保留数据）：

```bash
docker compose down
```

清除所有数据（危险）：

```bash
docker compose down -v
```

---

## 快速刷新（修改后一键更新）

在容器已运行时，若修改了前端代码或后端代码，可用 `refresh.sh` 快速重新构建并热更新，无需重跑完整的 `run.sh`：

```bash
./refresh.sh
# 执行内容：npm run build → docker cp → alembic upgrade → restart backend/nginx
# 耗时约 15–20 秒
```

> **适用场景**：日常开发时每次改完代码后快速部署到本地生产环境验证效果。

---

## 开发模式（热重载）

修改后端 Python 代码自动重载；修改前端代码浏览器即时刷新，无需重建容器。

### 前提条件

- Node.js ≥ 20
- Docker Compose v2

```bash
./dev.sh
```

| 服务 | 地址 |
|------|------|
| 前端（Vite HMR） | `http://localhost:5173` |
| 后端 API | `http://localhost:8000` |
| API 文档 | `http://localhost:8000/docs` |

Vite 开发服务器已将 `/api` 请求代理到后端，前后端独立热重载互不干扰。

单独重启后端：

```bash
docker compose -f docker-compose.dev.yml restart backend
```

---

## 默认账号

> ⚠️ 首次部署后请立即修改密码。

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `admin123` |

其他账号由管理员在系统内创建（`资源库管理 → 用户管理` 或 API `/api/v1/auth/users`）。

---

## 环境变量（.env）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HTTP_PORT` | `8080` | 对外 HTTP 端口 |
| `POSTGRES_DB` | `robot_management` | 数据库名 |
| `POSTGRES_USER` | `rms_user` | 数据库用户 |
| `POSTGRES_PASSWORD` | `change_me_strong_password` | 数据库密码（**生产请修改**） |
| `SECRET_KEY` | `change_me_in_production` | JWT 密钥（**生产请修改**） |
| `FIRST_ADMIN_USERNAME` | `admin` | 首次启动创建的管理员 |
| `FIRST_ADMIN_PASSWORD` | `admin123` | 首次启动管理员密码 |

---

## 项目结构

```
robot_management_system/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # 路由模块（machines, marketing, audit_log…）
│   │   ├── core/             # DB 连接、配置、JWT
│   │   ├── models/           # SQLAlchemy ORM 模型
│   │   └── schemas/          # Pydantic 请求/响应模型
│   ├── alembic/versions/     # 数据库迁移文件
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios 封装
│   │   ├── components/       # 公共组件（MainLayout…）
│   │   ├── pages/            # 功能页面
│   │   └── store/            # Zustand 状态
│   └── Dockerfile
├── nginx/nginx.conf           # 反向代理配置
├── docker-compose.yml         # 生产环境
├── docker-compose.dev.yml     # 开发环境（热重载）
├── dev.sh                     # 开发启动脚本
├── run.sh                     # 生产启动脚本
└── .env                       # 环境变量
```

---

## 数据库迁移

```bash
# 查看当前版本
docker compose exec backend alembic current

# 升级至最新
docker compose exec backend alembic upgrade head

# 回退一步
docker compose exec backend alembic downgrade -1
```

---

## 角色权限一览

| 功能 | admin | rd_test | maintenance | 公开 |
|------|:-----:|:-------:|:-----------:|:----:|
| 机器管理 | ✅ 读写 | ✅ 读写 | — | — |
| 维修记录 | ✅ 读写 | ✅ 只读 | ✅ 读写 | — |
| 市场申请审批 | ✅ | — | — | 提交 |
| 可用性看板 | ✅ | ✅ | — | — |
| 发货管理 | ✅ | — | — | 提交 |
| 售后管理 | ✅ | — | — | 提交 |
| 资源库管理 | ✅ | — | — | — |
| 操作日志 & 回退 | ✅ | — | — | — |

---

## License

MIT
