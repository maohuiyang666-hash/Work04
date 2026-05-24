<template>
  <d2-container :class="{'page-compact':crud.pageOptions.compact}">

    <d2-crud-x
      ref="d2Crud"
      v-bind="_crudProps"
      v-on="_crudListeners"
      @onView="onView"
      @doDialogClosed="doDialogClosed"
    >
      <div slot="header">
        <crud-search ref="search" :options="crud.searchOptions" @submit="handleSearch"  />
        <el-button size="small" type="primary" @click="addRow" v-if="tabActivted === 'send'"><i class="el-icon-plus"/> 新增</el-button>
        <el-button size="small" type="success" @click="batchMarkRead" v-if="tabActivted === 'receive'" :disabled="!multipleSelection || multipleSelection.length === 0"><i class="el-icon-check"/> 批量标记已读</el-button>
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
export default {
  name: 'messageCenter',
  components: {},
  mixins: [d2CrudPlus.crud],
  data () {
    return {
      tabActivted: 'send'
    }
  },
  computed: {
  },
  methods: {
    getCrudOptions () {
      return crudOptions(this)
    },
    pageRequest (query) {
      if (this.tabActivted === 'receive') {
        return GetSelfReceive({ ...query })
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
      this.doRefresh()
    },
    // 关闭事件
    doDialogClosed (context) {
      this.doRefresh()
    },
    batchMarkRead () {
      if (!this.multipleSelection || this.multipleSelection.length === 0) {
        this.$message.warning('请选择要标记已读的消息')
        return
      }
      const ids = this.multipleSelection.map(item => item.id)
      BatchMarkRead(ids).then(() => {
        this.$message.success('操作成功')
        this.doRefresh()
        // 获取未读消息数量
        this.$store.dispatch('d2admin/messagecenter/setUnread')
      })
    }
  }
}
</script>
