#!/usr/bin/env bash
# 项目代码质量门禁 - 统一入口
# 用法: ./check.sh [--frontend|--backend|--help]
#
# 默认行为：同时检查前端和后端
# --frontend: 仅检查前端
# --backend:  仅检查后端
# --help:     显示帮助信息

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
  echo -e "${BLUE}用法: $0 [选项]${NC}"
  echo ""
  echo "选项:"
  echo "  --frontend    仅检查前端"
  echo "  --backend     仅检查后端"
  echo "  --help        显示此帮助信息"
  echo ""
  echo "不传参数时，将同时执行前端和后端检查。"
  echo ""
  echo "退出码说明:"
  echo "  0  - 所有检查通过"
  echo "  1  - 前端 lint 检查失败"
  echo "  2  - 前端构建失败"
  echo "  3  - 后端 Django 检查失败"
  echo "  4  - 后端 Python 语法/导入错误"
  echo "  5  - 前端和后端均有问题"
}

# 解析参数
CHECK_FRONTEND=true
CHECK_BACKEND=true

case "${1:-}" in
  --frontend)
    CHECK_BACKEND=false
    ;;
  --backend)
    CHECK_FRONTEND=false
    ;;
  --help|-h)
    usage
    exit 0
    ;;
  "")
    # 默认：都检查
    ;;
  *)
    echo -e "${RED}未知参数: $1${NC}"
    usage
    exit 1
    ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  项目代码质量门禁${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

FRONTEND_EXIT=0
BACKEND_EXIT=0

# 执行前端检查
if [ "$CHECK_FRONTEND" = true ]; then
  echo ""
  bash "$SCRIPT_DIR/scripts/check_frontend.sh" || FRONTEND_EXIT=$?
  echo ""
fi

# 执行后端检查
if [ "$CHECK_BACKEND" = true ]; then
  echo ""
  bash "$SCRIPT_DIR/scripts/check_backend.sh" || BACKEND_EXIT=$?
  echo ""
fi

# 汇总结果
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  检查结果汇总${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$CHECK_FRONTEND" = true ]; then
  if [ $FRONTEND_EXIT -eq 0 ]; then
    echo -e "  前端: ${GREEN}通过${NC}"
  else
    echo -e "  前端: ${RED}失败 (退出码: $FRONTEND_EXIT)${NC}"
  fi
fi

if [ "$CHECK_BACKEND" = true ]; then
  if [ $BACKEND_EXIT -eq 0 ]; then
    echo -e "  后端: ${GREEN}通过${NC}"
  else
    echo -e "  后端: ${RED}失败 (退出码: $BACKEND_EXIT)${NC}"
  fi
fi

echo ""

# 决定最终退出码
if [ $FRONTEND_EXIT -eq 0 ] && [ $BACKEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  所有质量检查通过，可以提交代码${NC}"
  echo -e "${GREEN}========================================${NC}"
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}  质量检查未通过，请修复上述问题后再提交${NC}"
  echo -e "${RED}========================================${NC}"

  # 如果前后端都失败，用 5 表示
  if [ $FRONTEND_EXIT -ne 0 ] && [ $BACKEND_EXIT -ne 0 ]; then
    exit 5
  elif [ $FRONTEND_EXIT -ne 0 ]; then
    exit $FRONTEND_EXIT
  else
    exit $BACKEND_EXIT
  fi
fi
