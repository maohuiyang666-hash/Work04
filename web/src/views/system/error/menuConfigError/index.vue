<template>
  <div class="menu-error-page">
    <el-card class="error-card">
      <div class="error-content">
        <div class="error-icon">
          <i class="el-icon-warning-outline"></i>
        </div>
        <h2 class="error-title">菜单配置错误</h2>
        <div class="error-info">
          <p><strong>菜单名称：</strong>{{ menuName }}</p>
          <p><strong>组件路径：</strong>{{ componentPath }}</p>
          <p><strong>错误原因：</strong>{{ errorMessage }}</p>
        </div>
        <div class="error-hint">
          <p>请联系系统管理员检查该菜单的组件路径配置是否正确。</p>
          <p>该错误不影响其他菜单的正常使用。</p>
        </div>
        <div class="error-actions">
          <el-button type="primary" @click="goBack">返回上一页</el-button>
          <el-button @click="goHome">返回控制台</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'MenuConfigError',
  data () {
    return {
      menuName: '',
      componentPath: '',
      errorMessage: ''
    }
  },
  created () {
    const { menuName, componentPath, errorMessage } = this.$route.query
    this.menuName = menuName || '未知'
    this.componentPath = componentPath || '未知'
    this.errorMessage = errorMessage || '组件加载失败，请检查配置'
  },
  methods: {
    goBack () {
      this.$router.back()
    },
    goHome () {
      this.$router.replace({ name: 'index' })
    }
  }
}
</script>

<style lang="scss" scoped>
.menu-error-page {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  .error-card {
    max-width: 600px;
    width: 90%;
    .error-content {
      text-align: center;
      .error-icon {
        font-size: 64px;
        color: #e6a23c;
        margin-bottom: 16px;
        i {
          font-style: normal;
        }
      }
      .error-title {
        font-size: 24px;
        color: #303133;
        margin-bottom: 24px;
      }
      .error-info {
        text-align: left;
        background: #fafafa;
        padding: 16px;
        border-radius: 4px;
        margin-bottom: 16px;
        p {
          margin: 8px 0;
          color: #606266;
          strong {
            color: #303133;
          }
        }
      }
      .error-hint {
        text-align: left;
        color: #909399;
        margin-bottom: 24px;
        p {
          margin: 4px 0;
        }
      }
      .error-actions {
        text-align: center;
        .el-button {
          margin: 0 8px;
        }
      }
    }
  }
}
</style>
