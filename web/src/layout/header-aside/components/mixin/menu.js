import util from '@/libs/util.js'

export default {
  methods: {
    handleMenuSelect (index, indexPath) {
      if (/^d2-menu-empty-\d+$/.test(index) || index === undefined) {
        this.$message.warning('临时菜单')
      } else if (/^https:\/\/|http:\/\//.test(index)) {
        util.open(index)
      } else {
        // 查找当前点击的菜单项，判断是否为异常菜单
        const findMenuByPath = (menuList, path) => {
          for (const m of menuList) {
            if (m.path === path) return m
            if (m.children) {
              const found = findMenuByPath(m.children, path)
              if (found) return found
            }
          }
          return null
        }
        const asideMenu = this.$store.state.d2admin.menu.aside
        const targetMenu = findMenuByPath(asideMenu, index)
        if (targetMenu && targetMenu._error) {
          this.$notify({
            title: '菜单配置异常',
            message: targetMenu._errorMessage || '该菜单的组件路径配置有误，请检查后端菜单配置',
            type: 'warning',
            duration: 6000
          })
        }
        this.$router.push({
          path: index
        })
      }
    }
  }
}
