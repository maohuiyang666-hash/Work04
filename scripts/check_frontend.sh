#!/usr/bin/env bash
# 前端质量检查脚本
# 检查项：lint 检查 + 构建验证
# 退出码：0=通过，1=lint 失败，2=构建失败

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PROJECT_ROOT/web"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  前端质量检查${NC}"
echo -e "${YELLOW}========================================${NC}"

# 检查 web 目录是否存在
if [ ! -d "$WEB_DIR" ]; then
  echo -e "${RED}[错误] web 目录不存在: $WEB_DIR${NC}"
  exit 1
fi

cd "$WEB_DIR"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[提示] node_modules 不存在，请先执行 npm install${NC}"
  exit 1
fi

# 1. Lint 检查
echo ""
echo -e "${YELLOW}[1/2] 执行前端 lint 检查...${NC}"
if npx vue-cli-service lint --no-fix > /tmp/frontend_lint.log 2>&1; then
  echo -e "${GREEN}[通过] 前端 lint 检查通过${NC}"
else
  echo -e "${RED}[失败] 前端 lint 检查未通过，请查看以下问题：${NC}"
  cat /tmp/frontend_lint.log
  echo ""
  echo -e "${RED}[前端问题] 请修复 lint 错误后重新提交${NC}"
  rm -f /tmp/frontend_lint.log
  exit 1
fi
rm -f /tmp/frontend_lint.log

# 2. 构建验证
echo ""
echo -e "${YELLOW}[2/2] 执行前端构建验证...${NC}"
if npx vue-cli-service build --mode production > /tmp/frontend_build.log 2>&1; then
  echo -e "${GREEN}[通过] 前端构建验证通过${NC}"
else
  echo -e "${RED}[失败] 前端构建失败，请查看以下问题：${NC}"
  cat /tmp/frontend_build.log
  echo ""
  echo -e "${RED}[前端问题] 请修复构建错误后重新提交${NC}"
  rm -f /tmp/frontend_build.log
  exit 2
fi
rm -f /tmp/frontend_build.log

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  前端质量检查全部通过${NC}"
echo -e "${GREEN}========================================${NC}"
exit 0
