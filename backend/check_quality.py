#!/usr/bin/env python3
import ast
import os
import sys
import compileall


def check_python_syntax():
    """检查 Python 语法错误"""
    print("🔍 [后端] 检查 Python 语法...")
    errors = []
    
    for root, _, files in os.walk("."):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        ast.parse(f.read(), file_path)
                except SyntaxError as e:
                    errors.append(f"❌ {file_path}: 第 {e.lineno} 行 - {e.msg}")
                except Exception as e:
                    errors.append(f"❌ {file_path}: {str(e)}")
    
    if errors:
        for err in errors:
            print(err)
        print(f"\n❌ [后端] 发现 {len(errors)} 个语法错误")
        return False
    else:
        print("✅ [后端] Python 语法检查通过")
        return True


def check_python_compile():
    """编译所有 Python 文件以发现导入错误"""
    print("🔍 [后端] 编译检查...")
    result = compileall.compile_dir(".", quiet=2, force=True, legacy=True)
    if result:
        print("✅ [后端] 编译检查通过")
        return True
    else:
        print("❌ [后端] 编译检查发现问题")
        return False


def main():
    print("=" * 60)
    print("后端代码质量检查")
    print("=" * 60)
    
    success = True
    if not check_python_syntax():
        success = False
    if not check_python_compile():
        success = False
    
    print("=" * 60)
    if success:
        print("✅ [后端] 所有检查通过")
        sys.exit(0)
    else:
        print("❌ [后端] 检查失败，请修复问题")
        sys.exit(1)


if __name__ == "__main__":
    main()
