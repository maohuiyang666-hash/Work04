#!/usr/bin/env bash
# =============================================================================
# 提交前质量检查脚本 (Pre-commit Quality Check)
# =============================================================================
# 用法:
#   bash scripts/check.sh              # 运行全部检查
#   bash scripts/check.sh --frontend   # 仅前端检查
#   bash scripts/check.sh --backend    # 仅后端检查
#
# 检查项:
#   前端: ESLint 代码风格检查 + 测试构建 (vue-cli-service build --mode test)
#   后端: Python 语法编译检查 (compileall) + Django 系统检查 (manage.py check)
# =============================================================================

set -euo pipefail

# -------------------- 颜色定义 --------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -------------------- 路径 --------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/web"
BACKEND_DIR="$PROJECT_ROOT/backend"

PASSED=0
FAILED=0

# -------------------- 参数解析 --------------------
RUN_FRONTEND=true
RUN_BACKEND=true

case "${1:-}" in
    --frontend) RUN_BACKEND=false ;;
    --backend)  RUN_FRONTEND=false ;;
esac

# -------------------- 工具函数 --------------------
check_step() {
    local category="$1"  # "frontend" or "backend"
    local name="$2"
    shift 2

    printf "${YELLOW}  >>> [%s] %s${NC}\n" "$category" "$name"
    if "$@" 2>&1; then
        printf "${GREEN}      PASSED${NC}\n"
        PASSED=$((PASSED + 1))
    else
        printf "${RED}      FAILED${NC}\n"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# -------------------- 打印标题 --------------------
echo ""
echo "=============================================="
echo "  Pre-commit Quality Check"
echo "=============================================="
echo ""

# =============================================================================
# 前端检查
# =============================================================================
if $RUN_FRONTEND; then
    echo -e "${CYAN}[1/2] Frontend Checks${NC} (${FRONTEND_DIR})"
    echo "----------------------------------------------"

    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${RED}  ERROR: node_modules/ not found in web/. Please run 'npm install' first.${NC}"
        echo ""
        FAILED=$((FAILED + 1))
    else
        cd "$FRONTEND_DIR"

        # 1) ESLint 代码风格检查（不带 --fix，仅报告问题）
        check_step "frontend" "ESLint (code style)" \
            npx vue-cli-service lint

        # 2) 前端构建检查 (test 模式，比生产构建快)
        check_step "frontend" "Build (test mode)" \
            npx vue-cli-service build --mode test
    fi
    echo ""
fi

# =============================================================================
# 后端检查
# =============================================================================
if $RUN_BACKEND; then
    echo -e "${CYAN}[2/2] Backend Checks${NC} (${BACKEND_DIR})"
    echo "----------------------------------------------"

    cd "$BACKEND_DIR"

    # 1) Python 语法编译检查（不依赖 Django settings，不需要数据库）
    #    -q 静默模式，只输出错误；-x 排除 venv 等目录
    check_step "backend" "Python syntax (compileall)" \
        python -m compileall -q -x '\.git|__pycache__|venv|\.venv|static|migrations' .

    # 2) Django 系统检查（需要 conf/env.py 已配置；未配置时跳过而非报错）
    if python -c "import sys; sys.path.insert(0,'.'); from conf.env import *" 2>/dev/null; then
        check_step "backend" "Django system check (manage.py check)" \
            python manage.py check
    else
        echo -e "${YELLOW}  >>> [backend] Django system check${NC}"
        echo -e "${YELLOW}      SKIPPED: conf/env.py not configured.${NC}"
        echo -e "${YELLOW}      Run 'cp conf/env.example.py conf/env.py' and set DATABASES to enable.${NC}"
        echo ""
    fi
    echo ""
fi

# =============================================================================
# 汇总
# =============================================================================
TOTAL=$((PASSED + FAILED))
echo "=============================================="
if [ "$FAILED" -eq 0 ]; then
    echo -e "  ${GREEN}All checks passed (${PASSED}/${TOTAL})${NC}"
else
    echo -e "  ${RED}${FAILED} check(s) FAILED, ${PASSED} passed (total ${TOTAL})${NC}"
fi
echo "=============================================="
echo ""

exit "$FAILED"