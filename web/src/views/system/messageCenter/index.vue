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
        <crud-search ref="search" :options="crud.searchOptions" @submit="handleSearch" />
        <el-button v-if="tabActivted === 'send'" size="small" type="primary" @click="addRow"><i class="el-icon-plus"/> 新增</el-button>
        <el-tabs v-model="tabActivted" @tab-click="onTabClick">
          <el-tab-pane label="我的发布" name="send"></el-tab-pane>
          <el-tab-pane label="我的接收" name="receive"></el-tab-pane>
        </el-tabs>
        <div v-if="tabActivted === 'receive'" class="receive-toolbar">
          <div class="receive-toolbar__left">
            <span class="receive-toolbar__label">消息状态</span>
            <el-radio-group v-model="receiveStatus" size="small" @change="onReceiveStatusChange">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="unread">未读</el-radio-button>
              <el-radio-button label="read">已读</el-radio-button>
            </el-radio-group>
          </div>
          <el-button
            size="small"
            type="primary"
            :loading="batchLoading"
            :disabled="batchLoading || receiveSelection.length === 0"
            @click="onBatchMarkRead"
          >
            批量标记已读
          </el-button>
        </div>
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
import { AddObj, GetObj, GetList, UpdateObj, DelObj, GetSelfReceive, MarkSelfReceiveRead } from './api'
import { crudOptions } from './crud'
import { d2CrudPlus } from 'd2-crud-plus'
import viewTemplate from './viewTemplate.js'

export default {
  name: 'messageCenter',
  components: {},
  mixins: [d2CrudPlus.crud],
  data () {
    return {
      tabActivted: 'send',
      receiveStatus: 'all',
      receiveSelection: [],
      batchLoading: false
    }
  },
  methods: {
    getCrudOptions () {
      return crudOptions(this)
    },
    pageRequest (query) {
      if (this.tabActivted === 'receive') {
        return GetSelfReceive({ ...query, status: this.receiveStatus })
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
    doSelectionChange (selection) {
      this.receiveSelection = this.tabActivted === 'receive' ? selection : []
    },
    onTabClick (tab) {
      this.tabActivted = tab.name
      this.clearReceiveSelection()
      this.doRefresh()
    },
    onReceiveStatusChange () {
      this.clearReceiveSelection()
      this.doRefresh()
    },
    async onBatchMarkRead () {
      if (this.receiveSelection.length === 0) {
        this.$message.warning('请先选择消息')
        return
      }
      this.batchLoading = true
      try {
        await MarkSelfReceiveRead(this.receiveSelection.map(item => item.id))
        this.$message.success('批量标记已读成功')
        this.clearReceiveSelection()
        await this.$store.dispatch('d2admin/messagecenter/setUnread')
        this.doRefresh()
      } finally {
        this.batchLoading = false
      }
    },
    clearReceiveSelection () {
      this.receiveSelection = []
      this.$nextTick(() => {
        const table = this.getD2CrudTable && this.getD2CrudTable()
        if (!table) {
          return
        }
        if (typeof table.clearSelection === 'function') {
          table.clearSelection()
        }
        if (typeof table.clearCheckboxRow === 'function') {
          table.clearCheckboxRow()
        }
        if (typeof table.clearCheckboxReserve === 'function') {
          table.clearCheckboxReserve()
        }
        if (typeof table.clearCheckboxAll === 'function') {
          table.clearCheckboxAll()
        }
      })
    },
    doAfterRefresh () {
      this.clearReceiveSelection()
    },
    doDialogClosed () {
      this.clearReceiveSelection()
      this.doRefresh()
      if (this.tabActivted === 'receive') {
        this.$store.dispatch('d2admin/messagecenter/setUnread')
      }
    }
  }
}
</script>

<style scoped>
.receive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.receive-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.receive-toolbar__label {
  font-size: 14px;
  color: #606266;
}
</style>
