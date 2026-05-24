<template>
  <div class="page">
    <div class="error-container">
      <div class="error-icon">
        <i class="el-icon-warning" style="font-size: 80px; color: #f56c6c;"></i>
      </div>
      <h1 class="page_title">菜单配置错误</h1>
      <div class="error-details">
        <el-alert
          title="错误信息"
          type="error"
          :closable="false"
          show-icon
        >
          <p>菜单名称: <strong>{{ menuName }}</strong></p>
          <p>组件路径: <code>{{ componentPath }}</code></p>
          <p>错误原因: {{ errorMessage }}</p>
        </el-alert>
      </div>
      <div class="error-suggestions">
        <el-alert
          title="请检查以下配置"
          type="warning"
          :closable="false"
          show-icon
        >
          <ul>
            <li>确认组件路径是否正确</li>
            <li>确认组件文件是否存在</li>
            <li>确认菜单配置是否完整</li>
          </ul>
        </el-alert>
      </div>
      <el-button class="d2-mt" type="primary" @click="$router.replace({ path: '/' })">
        返回控制台
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuErrorPage',
  computed: {
    menuName () {
      return this.$route.meta.menuName || '未知菜单'
    },
    componentPath () {
      return this.$route.meta.componentPath || '未知路径'
    },
    errorMessage () {
      return this.$route.meta.errorMessage || '未知错误'
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  background: #f5f7fa;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  .error-container {
    max-width: 600px;
    text-align: center;
    padding: 40px;
  }

  .error-icon {
    margin-bottom: 20px;
  }

  .page_title {
    font-size: 24px;
    color: #303133;
    margin-bottom: 30px;
  }

  .error-details, .error-suggestions {
    margin-bottom: 20px;
    text-align: left;

    ul {
      margin-top: 10px;
      padding-left: 20px;

      li {
        margin-bottom: 5px;
      }
    }
  }

  code {
    background: #f0f2f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
  }
}
</style>
