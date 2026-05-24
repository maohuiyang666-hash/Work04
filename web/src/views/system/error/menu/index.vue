<template>
  <div class="page">
    <div class="error-container">
      <div class="icon">
        <d2-icon name="exclamation-triangle" />
      </div>
      <p class="page_title">菜单配置异常</p>
      <p class="page_desc">
        当前菜单关联的前端组件加载失败。<br/>
        可能是菜单配置中的组件路径错误或前端文件缺失，请联系管理员修复。
      </p>
      <el-button class="d2-mt" type="primary" @click="$router.replace({ path: '/' })">
        返回控制台
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page {
  background: #f0f2f5;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  .error-container {
    background: #fff;
    padding: 60px 80px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    text-align: center;
    .icon {
      font-size: 60px;
      color: #f56c6c;
      margin-bottom: 20px;
    }
    .page_title {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 16px;
    }
    .page_desc {
      font-size: 14px;
      color: #909399;
      line-height: 1.6;
      margin-bottom: 30px;
    }
  }
}
</style>
