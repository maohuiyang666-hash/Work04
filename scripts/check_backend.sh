#!/usr/bin/env bash
# 后端质量检查脚本
# 检查项：Django 系统检查 + Python 语法检查
# 退出码：0=通过，1=Django 检查失败，2=语法/导入错误

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  后端质量检查${NC}"
echo -e "${YELLOW}========================================${NC}"

# 检查 backend 目录是否存在
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}[错误] backend 目录不存在: $BACKEND_DIR${NC}"
  exit 1
fi

cd "$BACKEND_DIR"

# 1. Django 系统检查
echo ""
echo -e "${YELLOW}[1/2] 执行 Django 系统检查...${NC}"
if python manage.py check > /tmp/backend_django_check.log 2>&1; then
  echo -e "${GREEN}[通过] Django 系统检查通过${NC}"
else
  echo -e "${RED}[失败] Django 系统检查未通过，请查看以下问题：${NC}"
  cat /tmp/backend_django_check.log
  echo ""
  echo -e "${RED}[后端问题] 请修复 Django 配置或代码错误后重新提交${NC}"
  rm -f /tmp/backend_django_check.log
  exit 1
fi
rm -f /tmp/backend_django_check.log

# 2. Python 语法检查（仅检查最近修改的文件，避免全量扫描过慢）
echo ""
echo -e "${YELLOW}[2/2] 执行 Python 语法检查...${NC}"

# 收集需要检查的 Python 文件（排除 migrations 和 __pycache__）
PYTHON_FILES=$(find . -name "*.py" \
  -not -path "*/migrations/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/.venv/*" \
  -not -path "*/venv/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/static/*" \
  | head -200)

SYNTAX_ERROR=0
ERROR_COUNT=0

for file in $PYTHON_FILES; do
  if ! python -m py_compile "$file" 2>/tmp/backend_syntax_error.log; then
    if [ $SYNTAX_ERROR -eq 0 ]; then
      echo -e "${RED}[失败] 发现 Python 语法/导入错误：${NC}"
      SYNTAX_ERROR=1
    fi
    echo -e "${RED}  - $file${NC}"
    cat /tmp/backend_syntax_error.log | head -5
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi
done
rm -f /tmp/backend_syntax_error.log

if [ $SYNTAX_ERROR -eq 1 ]; then
  echo ""
  echo -e "${RED}[后端问题] 共发现 $ERROR_COUNT 个文件存在语法或导入错误，请修复后重新提交${NC}"
  exit 2
fi

echo -e "${GREEN}[通过] Python 语法检查通过${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  后端质量检查全部通过${NC}"
echo -e "${GREEN}========================================${NC}"
exit 0
