import setting from '@/setting.js'

export default {
  namespaced: true,
  state: {
    header: [],
    aside: [],
    issues: [],
    issuesByKey: {},
    issuesByOriginalPath: {},
    asideCollapse: setting.menu.asideCollapse,
    asideTransition: setting.menu.asideTransition
  },
  actions: {
    async asideCollapseSet ({ state, dispatch }, collapse) {
      state.asideCollapse = collapse
      await dispatch('d2admin/db/set', {
        dbName: 'sys',
        path: 'menu.asideCollapse',
        value: state.asideCollapse,
        user: true
      }, { root: true })
    },
    async asideCollapseToggle ({ state, dispatch }) {
      state.asideCollapse = !state.asideCollapse
      await dispatch('d2admin/db/set', {
        dbName: 'sys',
        path: 'menu.asideCollapse',
        value: state.asideCollapse,
        user: true
      }, { root: true })
    },
    async asideTransitionSet ({ state, dispatch }, transition) {
      state.asideTransition = transition
      await dispatch('d2admin/db/set', {
        dbName: 'sys',
        path: 'menu.asideTransition',
        value: state.asideTransition,
        user: true
      }, { root: true })
    },
    async asideTransitionToggle ({ state, dispatch }) {
      state.asideTransition = !state.asideTransition
      await dispatch('d2admin/db/set', {
        dbName: 'sys',
        path: 'menu.asideTransition',
        value: state.asideTransition,
        user: true
      }, { root: true })
    },
    async asideLoad ({ state, dispatch }) {
      const menu = await dispatch('d2admin/db/get', {
        dbName: 'sys',
        path: 'menu',
        defaultValue: setting.menu,
        user: true
      }, { root: true })
      state.asideCollapse = menu.asideCollapse !== undefined ? menu.asideCollapse : setting.menu.asideCollapse
      state.asideTransition = menu.asideTransition !== undefined ? menu.asideTransition : setting.menu.asideTransition
    }
  },
  mutations: {
    headerSet (state, menu) {
      state.header = menu
    },
    asideSet (state, menu) {
      state.aside = menu
    },
    issuesSet (state, issues = {}) {
      state.issues = issues.list || []
      state.issuesByKey = issues.byKey || {}
      state.issuesByOriginalPath = issues.byOriginalPath || {}
    }
  }
}
