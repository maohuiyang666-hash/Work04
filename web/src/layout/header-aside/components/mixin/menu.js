import util from '@/libs/util.js'
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState('d2admin/menu', [
      'aside'
    ])
  },
  methods: {
    findMenuItemByPath (menus, path) {
      for (const menu of menus) {
        if (menu.path === path) {
          return menu
        }
        if (menu.children && menu.children.length > 0) {
          const found = this.findMenuItemByPath(menu.children, path)
          if (found) return found
        }
      }
      return null
    },
    handleMenuSelect (index, indexPath) {
      if (/^d2-menu-empty-\d+$/.test(index) || index === undefined) {
        this.$message.warning('临时菜单')
      } else if (/^https:\/\/|http:\/\//.test(index)) {
        util.open(index)
      } else {
        // 查找菜单项，检查是否是错误菜单
        const menuItem = this.findMenuItemByPath(this.aside, index)
        if (menuItem && menuItem._error) {
          this.$message.warning({
            message: `菜单【${menuItem.title || '未命名菜单'}】配置错误，请检查组件路径`,
            duration: 5000,
            showClose: true
          })
        }
        // 无论是否是错误菜单，都允许跳转（会显示错误提示页）
        this.$router.push({
          path: index
        })
      }
    }
  }
}
