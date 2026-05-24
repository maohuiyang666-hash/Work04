# 轻量级代码质量门禁方案

## 概述

本方案为 django-vue-admin 项目提供了一套轻量级的代码质量检查工具，帮助开发者在提交代码前快速发现并修复问题。

## 检查内容

### 前端检查
- ✅ ESLint 代码风格检查（复用现有 `npm run lint`）
- ✅ 构建检查（复用现有 `npm run build:preview`）

### 后端检查
- ✅ Python 语法错误检查
- ✅ Python 编译检查（发现导入错误等问题）

## 使用方法

### 1. 完整检查（推荐提交前运行）

在项目根目录下执行：

```bash
npm run check
```

这会依次运行前端检查和后端检查，两者都通过才会成功。

### 2. 单独检查前端

```bash
npm run check:frontend
```

或者：

```bash
npm run check:frontend-only
```

### 3. 单独检查后端

```bash
npm run check:backend
```

或者：

```bash
npm run check:backend-only
```

## 结果说明

- ✅ 绿色勾选图标表示检查通过
- ❌ 红色叉号图标表示检查失败
- 如果检查失败，会明确标识是「前端」还是「后端」的问题，方便定位修复

## 轻量设计原则

1. **复用现有工具**：不引入新的复杂依赖，完全使用项目已有的 ESLint、Vue CLI、Python 标准库
2. **无强制 Git Hook**：开发者可以选择在合适的时候手动运行，不会在 git commit 时强制阻塞
3. **清晰的输出**：用简单的图标和标签区分前端和后端问题
4. **无需修改现有代码**：不会因为引入本方案而要求修改现有代码风格

## 开发建议

1. 建议在每天下班前、提交 PR/MR 前运行一次 `npm run check`
2. 如果只修改了前端或后端，可以单独运行对应的检查
3. 检查失败时，请优先修复问题再提交代码

## 文件说明

- `/package.json`：根目录统一入口，定义检查命令
- `/web/check_quality.js`：前端检查脚本
- `/backend/check_quality.py`：后端检查脚本
