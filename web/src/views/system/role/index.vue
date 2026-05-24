<!--
 * @创建文件时间: 2021-06-01 22:41:21
 * @Auther: 猿小天
 * @最后修改人: 猿小天
 * @最后修改时间: 2021-07-29 19:27:29
 * 联系Qq:1638245306
 * @文件介绍:角色管理
--><template>
  <d2-container :class="{ 'page-compact': crud.pageOptions.compact }">
    <d2-crud-x
      ref="d2Crud"
      v-bind="_crudProps"
      v-on="_crudListeners"
      @createPermission="createPermission"
      @copyRole="copyRole"
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
      copyingRoleId: null // 标记是否正在复制角色
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
      if (this.copyingRoleId) {
        // 如果是复制角色，使用复制接口
        const copyData = {
          name: row.name,
          key: row.key,
          sort: row.sort,
          status: row.status,
          admin: row.admin,
          data_range: row.data_range,
          remark: row.remark
        }
        return api.CopyRole(this.copyingRoleId, copyData).then(res => {
          this.copyingRoleId = null // 重置
          return res
        })
      } else {
        // 普通新增
        return api.createObj(row)
      }
    },
    updateRequest (row) {
      return api.UpdateObj(row)
    },
    delRequest (row) {
      return api.DelObj(row.id)
    },
    // 复制角色
    copyRole (scope) {
      const originalId = scope.row.id
      api.GetRoleDetail(originalId).then(res => {
        const originalData = res.data.data
        this.copyingRoleId = originalId // 标记正在复制
        // 准备复制的数据
        const copyData = {
          name: originalData.name + '_副本',
          key: originalData.key + '_copy',
          sort: originalData.sort,
          status: originalData.status,
          admin: originalData.admin,
          data_range: originalData.data_range,
          remark: originalData.remark
        }
        // 打开新增表单并填充数据
        this.addRow(copyData)
      })
    },
    // 授权
    createPermission (scope) {
      console.log(scope)
      this.roleObj = scope.row
      this.rolePermissionShow = true
      // this.$router.push({
      //   name: 'rolePermission',
      //   params: { id: scope.row.id }
      // })
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
