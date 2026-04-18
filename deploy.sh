#!/bin/bash
# =============================================================================
# Robot Management System - 一键本地部署脚本
# =============================================================================
set -e

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

info()    { echo -e "${COLOR_GREEN}[INFO]${COLOR_RESET} $*"; }
warning() { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $*"; }
error()   { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*"; exit 1; }

# ── 检查依赖 ─────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "未找到 docker，请先安装 Docker Desktop"
docker compose version >/dev/null 2>&1 || error "未找到 docker compose (v2)，请升级 Docker Desktop"

# ── 生成 .env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  # 自动生成随机 SECRET_KEY（64字符）
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/change_me_to_random_64_char_string/${SECRET}/" .env
    else
      sed -i "s/change_me_to_random_64_char_string/${SECRET}/" .env
    fi
    info ".env 已创建，SECRET_KEY 已自动随机生成"
  else
    warning ".env 已创建，请手动修改 SECRET_KEY 为随机字符串"
  fi
else
  info ".env 已存在，跳过创建"
fi

# ── 读取端口 ──────────────────────────────────────────────────────────────────
HTTP_PORT=$(grep '^HTTP_PORT=' .env | cut -d= -f2 | tr -d ' ' || echo "80")
HTTP_PORT=${HTTP_PORT:-80}

# ── 检查端口是否被占用 ────────────────────────────────────────────────────────
if lsof -i ":${HTTP_PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  warning "端口 ${HTTP_PORT} 已被占用。"
  warning "请修改 .env 中的 HTTP_PORT，或停止占用该端口的进程后重试。"
  warning "示例：将 HTTP_PORT=80 改为 HTTP_PORT=8080"
  exit 1
fi

# ── 构建并启动 ────────────────────────────────────────────────────────────────
info "开始构建镜像并启动服务（首次运行约需 3-5 分钟）..."
docker compose up --build -d

# ── 等待后端健康检查 ──────────────────────────────────────────────────────────
info "等待服务就绪..."
MAX_WAIT=120
WAITED=0
until curl -sf "http://localhost:${HTTP_PORT}/health" >/dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    warning "服务启动超时，请运行 'docker compose logs' 查看日志"
    break
  fi
  sleep 3
  WAITED=$((WAITED + 3))
done

echo ""
echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  ✅  部署成功！${COLOR_RESET}"
echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
echo ""
echo "  🌐 系统地址:        http://localhost:${HTTP_PORT}"
echo "  📋 公开申请表单:    http://localhost:${HTTP_PORT}/request"
echo "  📖 API 文档:        http://localhost:${HTTP_PORT}/docs"
echo ""
echo "  🔑 初始管理员账号:"
ADMIN_USER=$(grep '^FIRST_ADMIN_USERNAME=' .env | cut -d= -f2 | tr -d ' ')
ADMIN_PASS=$(grep '^FIRST_ADMIN_PASSWORD=' .env | cut -d= -f2 | tr -d ' ')
echo "     用户名: ${ADMIN_USER:-admin}"
echo "     密  码: ${ADMIN_PASS:-admin123}"
echo ""
echo "  📦 常用命令:"
echo "     查看日志:  docker compose logs -f"
echo "     停止服务:  docker compose down"
echo "     清除数据:  docker compose down -v"
echo ""
