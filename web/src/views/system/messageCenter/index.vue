<template>
  <d2-container :class="{'page-compact':crud.pageOptions.compact}">

    <d2-crud-x
      ref="d2Crud"
      v-bind="_crudProps"
      v-on="_crudListeners"
      @onView="onView"
      @doDialogClosed="doDialogClosed"
      @selection-change="handleSelectionChange"
    >
      <div slot="header">
        <crud-search ref="search" :options="crud.searchOptions" @submit="handleSearch"  />
        <el-button size="small" type="primary" @click="addRow" v-if="tabActivted === 'send'"><i class="el-icon-plus"/> 新增</el-button>
        <div v-if="tabActivted === 'receive'" style="display: inline-block; margin-left: 10px;">
          <el-radio-group v-model="isReadFilter" size="small" @change="handleFilterChange">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="false">未读</el-radio-button>
            <el-radio-button label="true">已读</el-radio-button>
          </el-radio-group>
          <el-button size="small" type="success" @click="handleBatchMarkRead" :disabled="selectedRows.length === 0" style="margin-left: 10px;">
            <i class="el-icon-check"/> 批量标记已读
          </el-button>
        </div>
        <el-tabs v-model="tabActivted" @tab-click="onTabClick">
          <el-tab-pane label="我的发布" name="send"></el-tab-pane>
          <el-tab-pane label="我的接收" name="receive"></el-tab-pane>
        </el-tabs>
        <crud-toolbar :search.sync="crud.searchOptions.show"
                      :compact.sync="crud.pageOptions.compact"
                      :columns="crud.columns"
                      @refresh="doRefresh()"
                      @columns-filter-changed="handleColumnsFilterChanged"/>
      </div>

    </d2-crud-x>
  </d2-container>
</template>

<script>
import { AddObj, GetObj, GetList, UpdateObj, DelObj, GetSelfReceive, BatchMarkRead } from './api'
import { crudOptions } from './crud'
import { d2CrudPlus } from 'd2-crud-plus'
import viewTemplate from './viewTemplate.js'
import { mapActions } from 'vuex'
export default {
  name: 'messageCenter',
  components: {},
  mixins: [d2CrudPlus.crud],
  data () {
    return {
      tabActivted: 'send',
      isReadFilter: '',
      selectedRows: []
    }
  },
  computed: {
  },
  methods: {
    ...mapActions('d2admin/messagecenter', ['setUnread']),
    getCrudOptions () {
      return crudOptions(this)
    },
    pageRequest (query) {
      if (this.tabActivted === 'receive') {
        const params = { ...query }
        if (this.isReadFilter) {
          params.is_read = this.isReadFilter
        }
        return GetSelfReceive(params)
      }
      return GetList(query)
    },
    infoRequest (query) {
      return GetObj(query)
    },
    addRequest (row) {
      return AddObj(row)
    },
    updateRequest (row) {
      return UpdateObj(row)
    },
    delRequest (row) {
      return DelObj(row.id)
    },
    onView ({ row, index }) {
      this.getD2Crud().showDialog({
        mode: 'view',
        rowIndex: index,
        template: viewTemplate
      })
      this.infoRequest(row)
    },
    onTabClick (tab) {
      const { name } = tab
      this.tabActivted = name
      this.selectedRows = []
      this.doRefresh()
    },
    // 关闭事件
    doDialogClosed (context) {
      this.doRefresh()
    },
    // 状态筛选变化
    handleFilterChange () {
      this.doRefresh()
    },
    // 多选变化
    handleSelectionChange (selection) {
      this.selectedRows = selection
    },
    // 批量标记已读
    async handleBatchMarkRead () {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请选择要标记的消息')
        return
      }
      try {
        const messageIds = this.selectedRows.map(row => row.id)
        await BatchMarkRead({ message_ids: messageIds })
        this.$message.success('标记成功')
        // 刷新列表
        this.doRefresh()
        // 刷新未读数
        this.setUnread()
        // 清空选择
        this.selectedRows = []
      } catch (error) {
        this.$message.error('标记失败')
      }
    }
  },
  watch: {
    tabActivted: {
      handler () {
        // 当标签切换时，重新生成表格配置
        this.crud = this.getCrudOptions()
      },
      immediate: true
    }
  }
}
</script>
