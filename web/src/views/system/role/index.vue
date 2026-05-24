<!--
 * @创建文件时间: 2021-06-01 22:41:21
 * @Auther: 猿小天
 * @最后修改人: 猿小天
 * @最后修改时间: 2021-07-29 19:27:29
 * 联系Qq:1638245306
 * @文件介绍:角色管理
-->
<template>
  <d2-container :class="{ 'page-compact': crud.pageOptions.compact }">
    <d2-crud-x
      ref="d2Crud"
      v-bind="_crudProps"
      v-on="_crudListeners"
      @createPermission="createPermission"
      @copyRole="copyRole"
      @dialog-closed="onDialogClosed"
    >
      <div slot="header">
        <crud-search
          ref="search"
          :options="crud.searchOptions"
          @submit="handleSearch"
        />
        <el-button-group>
          <el-button
            size="small"
            v-permission="'Create'"
            type="primary"
            @click="addRow"
            ><i class="el-icon-plus" /> 新增</el-button
          >
        </el-button-group>
        <crud-toolbar
          :search.sync="crud.searchOptions.show"
          :compact.sync="crud.pageOptions.compact"
          :columns="crud.columns"
          @refresh="doRefresh()"
          @columns-filter-changed="handleColumnsFilterChanged"
        />
      </div>
    </d2-crud-x>
<!--  角色授权  -->
    <div>
      <el-drawer
        title="角色授权"
        :visible.sync="rolePermissionShow"
        direction="rtl"
        size="70%"
        >
        <template slot="title">
          <div>
            当前角色<el-tag>{{roleObj?roleObj.name:'无'}}</el-tag>
          </div>
        </template>
        <div>
          <rolePermission v-if="rolePermissionShow" :role-obj="roleObj"></rolePermission>
        </div>
      </el-drawer>
    </div>
  </d2-container>
</template>

<script>
import * as api from './api'
import { crudOptions } from './crud'
import { d2CrudPlus } from 'd2-crud-plus'
import rolePermission from '../rolePermission'
import { mapState } from 'vuex'

export default {
  name: 'role',
  mixins: [d2CrudPlus.crud],
  components: {
    rolePermission
  },
  computed: {
    ...mapState('d2admin/user', ['info'])
  },
  data () {
    return {
      rolePermissionShow: false,
      roleObj: undefined,
      copySourceRoleId: null,
      isCopyMode: false
    }
  },
  methods: {
    getCrudOptions () {
      return crudOptions(this)
    },
    pageRequest (query) {
      return api.GetList(query)
    },
    addRequest (row) {
      if (this.copySourceRoleId) {
        return api.copyRole(this.copySourceRoleId, row).then(res => {
          this.copySourceRoleId = null
          this.isCopyMode = false
          // 复制成功后自动打开权限页面查看结果
          const newRole = res.data
          if (newRole && newRole.id) {
            this.$nextTick(() => {
              this.roleObj = newRole
              this.rolePermissionShow = true
            })
          }
          return res
        })
      }
      return api.createObj(row)
    },
    updateRequest (row) {
      return api.UpdateObj(row)
    },
    delRequest (row) {
      return api.DelObj(row.id)
    },
    // 授权
    createPermission (scope) {
      console.log(scope)
      this.roleObj = scope.row
      this.rolePermissionShow = true
    },
    // 复制角色
    copyRole ({ row }) {
      this.copySourceRoleId = row.id
      this.isCopyMode = true
      // 如果原角色是管理员角色，提示用户确认
      if (row.admin) {
        this.$confirm('原角色为管理员角色，复制后新角色默认不继承管理员属性，如需设置请在表单中手动开启。', '复制角色提示', {
          confirmButtonText: '知道了',
          cancelButtonText: '取消复制',
          type: 'warning'
        }).then(() => {
          this._showCopyDialog(row)
        }).catch(() => {
          this.copySourceRoleId = null
          this.isCopyMode = false
        })
      } else {
        this._showCopyDialog(row)
      }
    },
    _showCopyDialog (row) {
      // 设置复制模式的对话框标题
      this.crud.formOptions.title = '复制角色'
      this.getD2Crud().showDialog({
        mode: 'add',
        row: {
          name: row.name + '_副本',
          key: '',
          sort: row.sort,
          status: row.status,
          admin: false,
          data_range: row.data_range,
          remark: row.remark || ''
        }
      })
    },
    // 对话框关闭时清理复制状态
    onDialogClosed () {
      this.copySourceRoleId = null
      this.isCopyMode = false
      // 恢复默认对话框标题
      this.crud.formOptions.title = undefined
    }
  }
}
</script>

<style lang="scss">
.yxtInput {
  .el-form-item__label {
    color: #49a1ff;
  }
}
</style>
