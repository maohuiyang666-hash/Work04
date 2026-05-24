import argparse
import os
import subprocess
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Iterable, List

ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"
BACKEND_DIR = ROOT_DIR / "backend"


@dataclass
class StepResult:
    area: str
    name: str
    ok: bool
    skipped: bool = False
    message: str = ""


def print_title(area: str, name: str) -> None:
    print(f"\n=== [{area}] {name} ===")


def run_command(area: str, name: str, command: Iterable[str], cwd: Path) -> StepResult:
    command = list(command)
    print_title(area, name)
    print(f"cwd: {cwd}")
    print("$ " + " ".join(command))
    try:
        completed = subprocess.run(command, cwd=str(cwd), check=False)
    except FileNotFoundError:
        traceback.print_exc()
        return StepResult(area=area, name=name, ok=False, message=f"缺少命令：{command[0]}")
    if completed.returncode == 0:
        print(f"✅ [{area}] {name}通过")
        return StepResult(area=area, name=name, ok=True)
    print(f"❌ [{area}] {name}失败，退出码：{completed.returncode}")
    return StepResult(area=area, name=name, ok=False, message=f"退出码：{completed.returncode}")


def ensure_backend_env_module() -> None:
    env_file = BACKEND_DIR / "conf" / "env.py"
    if env_file.exists():
        return
    conf_package = sys.modules.get("conf")
    if conf_package is None:
        conf_package = ModuleType("conf")
        conf_package.__path__ = [str(BACKEND_DIR / "conf")]
        sys.modules["conf"] = conf_package
    env_module = ModuleType("conf.env")
    env_module.DATABASE_ENGINE = "django.db.backends.sqlite3"
    env_module.DATABASE_NAME = str(BACKEND_DIR / "db.sqlite3")
    env_module.DATABASE_HOST = "127.0.0.1"
    env_module.DATABASE_PORT = 3306
    env_module.DATABASE_USER = "root"
    env_module.DATABASE_PASSWORD = "123456"
    env_module.TABLE_PREFIX = "dvadmin_"
    env_module.DEBUG = True
    env_module.ENABLE_LOGIN_ANALYSIS_LOG = False
    env_module.LOGIN_NO_CAPTCHA_AUTH = True
    env_module.API_LOG_ENABLE = True
    env_module.API_LOG_METHODS = ["POST", "UPDATE", "DELETE", "PUT"]
    env_module.ENVIRONMENT = "local"
    env_module.ALLOWED_HOSTS = ["*"]
    env_module.DISPATCH_DB_TYPE = "memory"
    sys.modules["conf.env"] = env_module


def run_backend_django_check() -> StepResult:
    area = "后端"
    name = "Django 启动诊断"
    print_title(area, name)
    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "application.settings")
    original_listdir = os.listdir
    plugins_dir = BACKEND_DIR / "plugins"

    def safe_listdir(path):
        try:
            return original_listdir(path)
        except FileNotFoundError:
            if Path(path) == plugins_dir:
                return []
            raise

    os.listdir = safe_listdir
    try:
        ensure_backend_env_module()
        import django
        from django.core.management import call_command

        django.setup()
        call_command("check", fail_level="ERROR")
    except Exception:
        traceback.print_exc()
        print(f"❌ [{area}] {name}失败")
        return StepResult(area=area, name=name, ok=False, message="Django 启动或系统检查失败")
    finally:
        os.listdir = original_listdir
    print(f"✅ [{area}] {name}通过")
    return StepResult(area=area, name=name, ok=True)


def summarize(results: List[StepResult]) -> int:
    print("\n=== 检查汇总 ===")
    exit_code = 0
    for result in results:
        if result.skipped:
            print(f"- [{result.area}] {result.name}: 跳过（{result.message}）")
            continue
        status = "通过" if result.ok else "失败"
        detail = f"（{result.message}）" if result.message else ""
        print(f"- [{result.area}] {result.name}: {status}{detail}")
        if not result.ok:
            exit_code = 1
    if exit_code == 0:
        print("\n最小质量检查已全部通过。")
    else:
        print("\n最小质量检查未通过，请根据上面的前端/后端分区结果修复后再提交。")
    return exit_code


def main() -> int:
    parser = argparse.ArgumentParser(description="运行前后端提交前的最小质量检查")
    parser.add_argument("--frontend", action="store_true", help="仅运行前端检查")
    parser.add_argument("--backend", action="store_true", help="仅运行后端检查")
    args = parser.parse_args()

    run_frontend = args.frontend or not args.backend
    run_backend = args.backend or not args.frontend
    results = []

    if run_frontend:
        lint_result = run_command("前端", "Lint 检查", ["npm", "run", "lint:check"], WEB_DIR)
        results.append(lint_result)
        if lint_result.ok:
            results.append(run_command("前端", "构建检查", ["npm", "run", "build"], WEB_DIR))
        else:
            results.append(StepResult(area="前端", name="构建检查", ok=False, skipped=True, message="前端 Lint 未通过"))

    if run_backend:
        syntax_result = run_command(
            "后端",
            "基础语法检查",
            [sys.executable, "-m", "compileall", str(BACKEND_DIR / "application"), str(BACKEND_DIR / "dvadmin"), str(BACKEND_DIR / "manage.py")],
            ROOT_DIR,
        )
        results.append(syntax_result)
        if syntax_result.ok:
            results.append(run_backend_django_check())
        else:
            results.append(StepResult(area="后端", name="Django 启动诊断", ok=False, skipped=True, message="后端语法检查未通过"))

    return summarize(results)


if __name__ == "__main__":
    raise SystemExit(main())
