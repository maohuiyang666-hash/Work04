import os
import sys
import subprocess
import time

def print_header(text):
    print(f"\n{'='*50}")
    print(f" {text}")
    print(f"{'='*50}")

def print_success(text):
    print(f"✅ \033[92m{text}\033[0m")

def print_error(text):
    print(f"❌ \033[91m{text}\033[0m")

def print_info(text):
    print(f"▶ \033[94m{text}\033[0m")

def run_command(command, cwd, error_message):
    print_info(f"Running: {' '.join(command)} in {cwd}")
    try:
        # Use shell=True for npm commands on Windows
        is_windows = sys.platform.startswith('win')
        use_shell = is_windows and command[0] == 'npm'
        
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=use_shell
        )
        if result.returncode != 0:
            print_error(error_message)
            return False
        return True
    except Exception as e:
        print_error(f"{error_message} (Error: {str(e)})")
        return False

def main():
    start_time = time.time()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    web_dir = os.path.join(base_dir, 'web')
    backend_dir = os.path.join(base_dir, 'backend')

    print_header("Starting Code Quality Pre-commit Check")

    # ==========================================
    # 1. Frontend Checks
    # ==========================================
    print_header("1. Frontend Checks (Vue)")
    if not os.path.exists(web_dir):
        print_error(f"Frontend directory not found: {web_dir}")
        sys.exit(1)

    # 1.1 Lint
    if not run_command(['npm', 'run', 'lint'], web_dir, "Frontend Check Failed: Lint issues found."):
        sys.exit(1)
    
    # 1.2 Build (test mode for faster build verification)
    if not run_command(['npm', 'run', 'test'], web_dir, "Frontend Check Failed: Build process failed."):
        sys.exit(1)
    
    print_success("Frontend checks passed!")

    # ==========================================
    # 2. Backend Checks
    # ==========================================
    print_header("2. Backend Checks (Django)")
    if not os.path.exists(backend_dir):
        print_error(f"Backend directory not found: {backend_dir}")
        sys.exit(1)

    # 2.1 Django Check (verifies syntax, imports, and configuration)
    python_cmd = 'python' if sys.platform.startswith('win') else 'python3'
    if not run_command([python_cmd, 'manage.py', 'check'], backend_dir, "Backend Check Failed: Syntax, import, or configuration errors found."):
        sys.exit(1)
    
    print_success("Backend checks passed!")

    # ==========================================
    # Summary
    # ==========================================
    elapsed = time.time() - start_time
    print_header(f"All checks passed successfully in {elapsed:.1f}s! 🎉 You are good to commit.")
    sys.exit(0)

if __name__ == '__main__':
    main()
