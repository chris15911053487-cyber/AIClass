#!/usr/bin/env bash
# AI 实践学堂 - Docker 重启脚本
#
# 用途：正确加载 .env.docker 并重启容器。
# 背景：本目录存在旧的 .env 文件，Docker Compose v5 会自动加载它，
#       与 `--env-file .env.docker` 冲突导致 "OTP_SECRET missing" 报错。
#       这里改用「导出环境变量后再执行」的方式，绕开该冲突。
#
# 用法：
#   ./restart.sh          # 重启（不重新构建）
#   ./restart.sh --build  # 修改源码后，重新构建并重启

set -euo pipefail

# 切换到脚本所在目录（保证无论从哪里调用都能找到配置文件）
cd "$(dirname "$0")"

ENV_FILE=".env.docker"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "错误：未找到 $ENV_FILE" >&2
  exit 1
fi

# 将 .env.docker 中的变量导出为环境变量，供 compose 插值使用
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

# 是否重新构建
BUILD_FLAG=""
if [[ "${1:-}" == "--build" ]]; then
  BUILD_FLAG="--build"
  echo ">> 将重新构建镜像"
fi

echo ">> 启动/更新容器..."
docker compose up -d $BUILD_FLAG

echo ">> 等待健康检查..."
sleep 6

echo ">> 当前状态："
docker compose ps

echo ">> 端口监听："
ss -tlnp 2>/dev/null | grep ":${PORT:-8060} " || true

echo ">> 本机健康检查："
curl -s -o /dev/null -w "  /api/health -> HTTP %{http_code}\n" "http://127.0.0.1:${PORT:-8060}/api/health" || true

echo ">> 完成。访问地址：${APP_ORIGIN}"
