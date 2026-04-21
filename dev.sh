#!/usr/bin/env bash
# dev.sh — 热重载开发脚本
# 后端：Docker 容器中运行 uvicorn --reload（修改 Python 代码自动重启）
# 前端：本地 Vite 开发服务器（修改 React 代码浏览器即时刷新）
#
# 用法：./dev.sh
# 访问：http://localhost:5173  (前端 HMR)
#       http://localhost:8000  (后端 API + /docs)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 1. 启动 postgres + backend（后台运行）──────────────────────────
echo "▶ 启动后端服务（postgres + backend with hot-reload）..."
docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d --build postgres backend

echo "⏳ 等待后端就绪..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1 || \
     curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ 后端已启动 → http://localhost:8000/docs"
    break
  fi
  sleep 1
done

# ── 2. 启动前端 Vite 开发服务器（前台运行，Ctrl+C 退出）─────────────
echo ""
echo "▶ 启动前端开发服务器..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 安装前端依赖..."
  npm install
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  前端（HMR）：http://localhost:5173       ║"
echo "║  后端 API  ：http://localhost:8000        ║"
echo "║  API 文档  ：http://localhost:8000/docs   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "（按 Ctrl+C 停止前端；后端在后台继续运行）"
echo "（停止后端：docker compose -f docker-compose.dev.yml down）"
echo ""

npm run dev
