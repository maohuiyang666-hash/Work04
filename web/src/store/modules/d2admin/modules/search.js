import setting from '@/setting.js'

export default {
  namespaced: true,
  state: {
    active: false,
    hotkey: {
      open: setting.hotkey.search.open,
      close: setting.hotkey.search.close
    },
    pool: []
  },
  mutations: {
    toggle (state) {
      state.active = !state.active
    },
    set (state, active) {
      state.active = active
    },
    init (state, menu) {
      const pool = []
      const push = function (menu, titlePrefix = []) {
        menu.forEach(m => {
          if (m.menuIssue) {
            return
          }
          const currentTitle = m.title || m.name || '未命名菜单'
          if (m.children) {
            push(m.children, [...titlePrefix, currentTitle])
          } else if (m.path && !/^d2-menu-empty-\d+$/.test(m.path) && !/^d2-menu-error-/.test(m.path)) {
            pool.push({
              ...m,
              fullTitle: [...titlePrefix, currentTitle].join(' / ')
            })
          }
        })
      }
      push(menu)
      state.pool = pool
    }
  }
}
