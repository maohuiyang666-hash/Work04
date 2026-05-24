<template>
  <div class="menu-error-page">
    <div class="error-content">
      <d2-icon name="exclamation-triangle" class="error-icon" />
      <p class="error-title">菜单配置异常</p>
      <div class="error-info">
        <p><strong>菜单名称：</strong>{{ errorInfo.name || '未知' }}</p>
        <p><strong>组件路径：</strong>{{ errorInfo.component || '未配置' }}</p>
        <p><strong>错误原因：</strong>{{ errorInfo.reason || '组件加载失败' }}</p>
      </div>
      <p class="error-hint">请联系管理员检查后台菜单配置</p>
      <el-button type="primary" @click="$router.replace({ path: '/' })">
        返回控制台
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuError',
  data () {
    return {
      errorInfo: {}
    }
  },
  created () {
    // 从路由 meta 中获取错误信息
    this.errorInfo = this.$route.meta.menuError || {}
  }
}
</script>

<style lang="scss" scoped>
.menu-error-page {
  background: #f5f7fa;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  .error-content {
    text-align: center;
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    max-width: 500px;

    .error-icon {
      font-size: 64px;
      color: #e6a23c;
      margin-bottom: 20px;
    }

    .error-title {
      font-size: 24px;
      color: #303133;
      margin-bottom: 24px;
      font-weight: bold;
    }

    .error-info {
      text-align: left;
      background: #fef0f0;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 16px;

      p {
        margin: 8px 0;
        color: #606266;
        font-size: 14px;
        word-break: break-all;
      }

      strong {
        color: #303133;
      }
    }

    .error-hint {
      color: #909399;
      font-size: 14px;
      margin-bottom: 24px;
    }
  }
}
</style>
