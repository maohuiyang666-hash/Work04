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
      @copyRole="copyRole"
      @createPermission="createPermission"
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
    <el-dialog
      title="复制角色"
      :visible.sync="copyDialogVisible"
      width="520px"
      append-to-body
      :close-on-click-modal="false"
      @closed="handleCopyDialogClosed"
    >
      <div v-loading="copyLoading">
        <el-alert
          v-if="copySourceRole"
          title="将继承源角色的菜单、按钮权限、数据权限范围和自定义部门"
          :description="'复制源角色：' + copySourceRole.name + '。保存后将直接生成新角色，并可继续进入权限页面核对结果。'"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form
          ref="copyForm"
          :model="copyForm"
          :rules="copyRules"
          label-width="100px"
          class="copy-form"
        >
          <el-form-item label="角色名称" prop="name">
            <el-input v-model="copyForm.name" clearable maxlength="50" />
          </el-form-item>
          <el-form-item label="权限标识" prop="key">
            <el-input v-model="copyForm.key" clearable maxlength="50" />
          </el-form-item>
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="copyForm.sort" :min="1" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="copyForm.status">
              <el-radio :label="true">启用</el-radio>
              <el-radio :label="false">停用</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="info.is_superuser" label="是否管理员" prop="admin">
            <el-radio-group v-model="copyForm.admin">
              <el-radio :label="true">是</el-radio>
              <el-radio :label="false">否</el-radio>
            </el-radio-group>
            <div v-if="copySourceRole && copySourceRole.admin" class="copy-form-tip">
              源角色带有管理员属性，请显式确认新角色是否保留该属性
            </div>
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="copyForm.remark" type="textarea" :rows="3" maxlength="255" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer">
        <el-button @click="copyDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="copySubmitting" @click="submitCopyRole">保 存</el-button>
      </span>
    </el-dialog>
    <div>
      <el-drawer
        title="角色授权"
        :visible.sync="rolePermissionShow"
        direction="rtl"
        size="70%"
      >
        <template slot="title">
          <div>
            当前角色<el-tag>{{ roleObj ? roleObj.name : '无' }}</el-tag>
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
      copyDialogVisible: false,
      copyLoading: false,
      copySubmitting: false,
      copySourceRole: undefined,
      copyForm: {
        name: '',
        key: '',
        sort: 1,
        status: true,
        admin: false,
        remark: '',
        data_range: 0,
        menu: [],
        permission: [],
        dept: []
      },
      copyRules: {
        name: [
          { required: true, message: '请输入角色名称', trigger: 'blur' }
        ],
        key: [
          { required: true, message: '请输入权限标识', trigger: 'blur' }
        ],
        sort: [
          { required: true, message: '请输入排序', trigger: 'change' }
        ],
        admin: [
          {
            validator: (rule, value, callback) => {
              if (this.info.is_superuser && this.copySourceRole && this.copySourceRole.admin && value !== true && value !== false) {
                callback(new Error('请明确选择是否管理员'))
                return
              }
              callback()
            },
            trigger: 'change'
          }
        ]
      }
    }
  },
  methods: {
    getDefaultCopyForm () {
      return {
        name: '',
        key: '',
        sort: 1,
        status: true,
        admin: false,
        remark: '',
        data_range: 0,
        menu: [],
        permission: [],
        dept: []
      }
    },
    getCrudOptions () {
      return crudOptions(this)
    },
    pageRequest (query) {
      return api.GetList(query)
    },
    addRequest (row) {
      return api.createObj(row)
    },
    updateRequest (row) {
      return api.UpdateObj(row)
    },
    delRequest (row) {
      return api.DelObj(row.id)
    },
    buildCopyName (name) {
      return (name || '角色') + '-副本'
    },
    buildCopyKey (key) {
      const normalizedKey = String(key || 'role').replace(/[^A-Za-z0-9_:-]/g, '_')
      return normalizedKey + '_copy'
    },
    normalizeArray (value) {
      return Array.isArray(value) ? value.slice() : []
    },
    buildCopyForm (sourceRole) {
      return {
        name: this.buildCopyName(sourceRole.name),
        key: this.buildCopyKey(sourceRole.key),
        sort: sourceRole.sort || 1,
        status: typeof sourceRole.status === 'boolean' ? sourceRole.status : true,
        admin: sourceRole.admin ? null : false,
        remark: sourceRole.remark || '',
        data_range: typeof sourceRole.data_range === 'number' ? sourceRole.data_range : 0,
        menu: this.normalizeArray(sourceRole.menu),
        permission: this.normalizeArray(sourceRole.permission),
        dept: this.normalizeArray(sourceRole.dept)
      }
    },
    openPermissionDrawer (role) {
      this.rolePermissionShow = false
      this.roleObj = undefined
      this.$nextTick(() => {
        this.roleObj = role
        this.rolePermissionShow = true
      })
    },
    createPermission (scope) {
      api.GetObj({ id: scope.row.id }).then(res => {
        this.openPermissionDrawer(res.data.data)
      })
    },
    copyRole (scope) {
      this.copyLoading = true
      this.copyDialogVisible = true
      api.GetObj({ id: scope.row.id }).then(res => {
        const sourceRole = res.data.data
        this.copySourceRole = sourceRole
        this.copyForm = this.buildCopyForm(sourceRole)
        this.$nextTick(() => {
          if (this.$refs.copyForm) {
            this.$refs.copyForm.clearValidate()
          }
        })
      }).catch(() => {
        this.copyDialogVisible = false
      }).finally(() => {
        this.copyLoading = false
      })
    },
    submitCopyRole () {
      this.$refs.copyForm.validate(valid => {
        if (!valid) {
          return
        }
        const payload = Object.assign({}, this.copyForm)
        if (!this.info.is_superuser) {
          delete payload.admin
        }
        this.copySubmitting = true
        api.createObj(payload).then(res => {
          const roleId = res.data.data.id
          this.copyDialogVisible = false
          this.doRefresh()
          return api.GetObj({ id: roleId })
        }).then(res => {
          this.$message.success('复制成功')
          this.openPermissionDrawer(res.data.data)
        }).finally(() => {
          this.copySubmitting = false
        })
      })
    },
    handleCopyDialogClosed () {
      this.copySourceRole = undefined
      this.copyForm = this.getDefaultCopyForm()
      if (this.$refs.copyForm) {
        this.$refs.copyForm.clearValidate()
      }
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

.copy-form {
  margin-top: 20px;
}

.copy-form-tip {
  margin-top: 8px;
  color: #e6a23c;
  line-height: 20px;
}
</style>
