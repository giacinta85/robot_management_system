#!/bin/bash
# =============================================================================
# Robot Management System - 快速刷新脚本
# 用途：代码修改后快速更新，无需重建 Docker 镜像
#
#   前端变更：本地 npm build → docker cp 到 nginx 容器（无需重启）
#   后端变更：docker cp Python 文件 → 重启 backend 服务（5 秒内完成）
#   Alembic  ：同步迁移文件并在容器内执行 upgrade head
#
# 用法：
#   ./refresh.sh          # 前端 + 后端全部刷新
#   ./refresh.sh frontend # 只刷新前端
#   ./refresh.sh backend  # 只刷新后端
# =============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_CYAN='\033[0;36m'
COLOR_RESET='\033[0m'

info()    { echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $*"; }
step()    { echo -e "${COLOR_CYAN}[STEP]${COLOR_RESET} $*"; }
warning() { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $*"; }

# ── 获取容器名 ────────────────────────────────────────────────────────────────
get_container() {
  docker compose -f "$PROJECT_DIR/docker-compose.yml" ps -q "$1" 2>/dev/null | head -1
}

FRONTEND_CTR=$(get_container frontend)
BACKEND_CTR=$(get_container backend)

# ── 刷新前端 ──────────────────────────────────────────────────────────────────
refresh_frontend() {
  step "构建前端..."
  cd "$FRONTEND_DIR"

  if [ ! -d "node_modules" ]; then
    info "首次运行，安装前端依赖..."
    npm install
  fi

  npm run build 2>&1 | grep -E "✓|error|ERROR|warn|WARN|built in" || true

  if [ -z "$FRONTEND_CTR" ]; then
    warning "前端容器未运行，跳过部署"
    return
  fi

  step "复制静态文件到 nginx 容器..."
  docker cp "$FRONTEND_DIR/dist/." "${FRONTEND_CTR}:/usr/share/nginx/html/"
  info "前端已更新（无需重启 nginx）"
}

# ── 刷新后端 ──────────────────────────────────────────────────────────────────
refresh_backend() {
  if [ -z "$BACKEND_CTR" ]; then
    warning "后端容器未运行，跳过部署"
    return
  fi

  step "复制后端代码到容器..."
  docker cp "$BACKEND_DIR/app/." "${BACKEND_CTR}:/app/app/"

  step "同步 alembic 迁移文件..."
  docker cp "$BACKEND_DIR/alembic/." "${BACKEND_CTR}:/app/alembic/"

  step "执行数据库迁移..."
  docker exec "$BACKEND_CTR" alembic upgrade head 2>&1 | grep -E "Running|INFO|ERROR" || true

  step "重启 backend 服务（不重建镜像）..."
  docker compose -f "$PROJECT_DIR/docker-compose.yml" restart backend
  info "后端已更新"
}

# ── 主流程 ────────────────────────────────────────────────────────────────────
MODE="${1:-all}"
START_TIME=$SECONDS

echo ""
echo -e "${COLOR_CYAN}============================================${COLOR_RESET}"
echo -e "${COLOR_CYAN}  Robot Management System - 快速刷新${COLOR_RESET}"
echo -e "${COLOR_CYAN}============================================${COLOR_RESET}"
echo ""

case "$MODE" in
  frontend)
    refresh_frontend
    ;;
  backend)
    refresh_backend
    ;;
  all|"")
    refresh_frontend
    echo ""
    refresh_backend
    ;;
  *)
    echo "用法: $0 [frontend|backend|all]"
    exit 1
    ;;
esac

ELAPSED=$((SECONDS - START_TIME))

HTTP_PORT=$(grep '^HTTP_PORT=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d ' ')
HTTP_PORT=${HTTP_PORT:-8080}
BASE="http://localhost:${HTTP_PORT}"

echo ""
echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  ✅  刷新完成（耗时 ${ELAPSED}s）${COLOR_RESET}"
echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
echo ""
echo "  ── 管理后台 ─────────────────────────────"
echo "  首页 / 看板:      ${BASE}/"
echo "  机器列表:         ${BASE}/machines"
echo "  维修管理:         ${BASE}/maintenance"
echo "  市场申请审批:     ${BASE}/requests"
echo "  可用性看板:       ${BASE}/calendar"
echo "  资源管理:         ${BASE}/resources"
echo "  发货管理:         ${BASE}/shipping-list"
echo "  售后管理:         ${BASE}/after-sales-list"
echo "  审计日志:         ${BASE}/audit-logs"
echo ""
echo "  ── 公开表单 ─────────────────────────────"
echo "  市场申请表单:     ${BASE}/request"
echo "  发货申请表单:     ${BASE}/shipping-request"
echo "  售后申请表单:     ${BASE}/after-sales-request"
echo ""
echo "  ── 开发者 ───────────────────────────────"
echo "  API 文档:         ${BASE}/docs"
echo ""
