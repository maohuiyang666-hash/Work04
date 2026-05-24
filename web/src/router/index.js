import Vue from 'vue'
import VueRouter from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { Message } from 'element-ui'

import store from '@/store/index'
import util from '@/libs/util.js'
import routes from './routes'
import { getMenu, handleAsideMenu, parseMenuData, formatMenuIssueMessage } from '@/menu'
import { frameOutRoutes } from '@/router/routes'
import { request } from '@/api/service'

const VueRouterPush = VueRouter.prototype.push
VueRouter.prototype.push = function push (location) {
  return VueRouterPush.call(this, location).catch(err => err)
}
const VueRouterReplace = VueRouter.prototype.replace
VueRouter.prototype.replace = function replace (location) {
  return VueRouterReplace.call(this, location).catch(err => err)
}

Vue.use(VueRouter)
const router = new VueRouter({
  routes
})

function isMenuVisible (menu) {
  return menu.visible === true || menu.visible === 1
}

function routeExists (targetRoutes, route) {
  const routePath = route && route.path
  const routeName = route && route.name
  const check = (routes) => {
    return routes.some(item => {
      const sameName = routeName && item.name === routeName
      const samePath = routePath && item.path === routePath
      if (sameName || samePath) {
        return true
      }
      if (item.children && item.children.length) {
        return check(item.children)
      }
      return false
    })
  }
  return check(targetRoutes)
}

function syncMenuSession (parsed) {
  sessionStorage.setItem('menuData', JSON.stringify(parsed.asideMenus))
  if (parsed.invalidMenus.length) {
    sessionStorage.setItem('menuIssues', JSON.stringify(parsed.invalidMenus))
  } else {
    sessionStorage.removeItem('menuIssues')
  }
}

function resetMenuSession () {
  sessionStorage.removeItem('menuData')
  sessionStorage.removeItem('menuIssues')
}

function showMenuIssue (issue) {
  Message.error({
    message: formatMenuIssueMessage(issue),
    duration: 7000,
    showClose: true
  })
}

function showMenuIssueSummary (issues) {
  if (!issues.length) {
    return
  }
  Message.warning({
    message: `检测到 ${issues.length} 个异常菜单，已从路由、搜索和已打开页签中隔离，可在侧边栏点击异常菜单查看详情。`,
    duration: 7000,
    showClose: true
  })
}

function applyMenuState (parsed) {
  store.commit('d2admin/menu/issuesSet', parsed.menuIssues)
  store.commit('d2admin/page/init', parsed.routes)
  parsed.routes.forEach(route => {
    router.addRoute(route)
  })
  parsed.frameOut.slice(frameOutRoutes.length).forEach(route => {
    if (!routeExists(router.options.routes, route)) {
      router.addRoute(route)
      router.options.routes.push(route)
    }
  })
  const menu = handleAsideMenu(parsed.searchMenus)
  const aside = handleAsideMenu(parsed.asideMenus.filter(isMenuVisible))
  store.commit('d2admin/menu/asideSet', aside)
  store.commit('d2admin/search/init', menu)
}

function applyMenuFallback () {
  store.commit('d2admin/menu/issuesSet', {
    list: [],
    byKey: {},
    byOriginalPath: {}
  })
  const menu = handleAsideMenu([])
  store.commit('d2admin/menu/asideSet', menu)
  store.commit('d2admin/search/init', menu)
}

async function loadDynamicMenus (to, next) {
  await store.dispatch('d2admin/permission/load', routes)
  await store.dispatch('d2admin/dept/load')
  try {
    const menuData = await getMenu()
    const parsed = parseMenuData(menuData)
    syncMenuSession(parsed)
    applyMenuState(parsed)
    await store.dispatch('d2admin/page/openedLoad')
    showMenuIssueSummary(parsed.invalidMenus)
    next({ path: to.fullPath, replace: true, params: to.params })
  } catch (error) {
    resetMenuSession()
    applyMenuFallback()
    await store.dispatch('d2admin/page/openedLoad')
    Message.error({
      message: '动态菜单加载失败，请刷新后重试或联系管理员检查菜单配置。',
      duration: 6000,
      showClose: true
    })
    next({ name: 'index', replace: true })
  }
}

router.beforeEach(async (to, from, next) => {
  const whiteList = ['/login', '/auth-redirect', '/bind', '/register', '/clientRenew', '/oauth2']
  await store.dispatch('d2admin/page/isLoaded')
  await store.dispatch('d2admin/size/isLoaded')
  NProgress.start()
  store.commit('d2admin/search/set', false)
  const token = util.cookies.get('token')
  if (token && token !== 'undefined') {
    if (!store.state.d2admin.user.info.name) {
      const res = await request({
        url: '/api/system/user/user_info/',
        method: 'get',
        params: {}
      })
      await store.dispatch('d2admin/user/set', res.data, { root: true })
      await store.dispatch('d2admin/account/load')
      store.dispatch('d2admin/settings/init')
    }
    if (!store.state.d2admin.menu || store.state.d2admin.menu.aside.length === 0) {
      await loadDynamicMenus(to, next)
      return
    }

    const invalidMenuIssue = store.state.d2admin.menu.issuesByOriginalPath[to.path]
    if (invalidMenuIssue) {
      showMenuIssue(invalidMenuIssue)
      NProgress.done()
      next({ name: 'index', replace: true })
      return
    }

    const childrenPath = window.qiankunActiveRule || []
    if (to.path !== '/clientRenew' && store.state.d2admin.user.info.tenant_id) {
      if (store.state.d2admin.user.info.tenant_expire) {
        next({ path: '/clientRenew' })
        NProgress.done()
        return
      } else if (store.state.d2admin.user.info.tenant_id !== 100000 && !store.state.d2admin.user.info.package_manage && store.state.d2admin.user.info.tenant_experience) {
        next({ path: '/clientRenew' })
        NProgress.done()
        return
      }
    }
    if (to.name) {
      if (to.meta.openInNewWindow && ((from.query.newWindow && to.query.newWindow !== '1') || from.path === '/')) {
        to.query.newWindow = '1'
      }

      if (to.meta.openInNewWindow && !to.query.newWindow && !from.query.newWindow && from.path !== '/') {
        const { href } = router.resolve({
          path: to.path + '?newWindow=1'
        })
        window.open(href, '_blank')
        NProgress.done()
        next(false)
      } else {
        NProgress.done()
        next()
      }
    } else if (childrenPath.some((item) => to.path.includes(item))) {
      next()
    } else {
      next({ name: '404' })
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next({
        name: 'login',
        query: {
          redirect: to.fullPath
        }
      })
      NProgress.done()
    }
  }
})

router.afterEach(to => {
  NProgress.done()
  store.dispatch('d2admin/page/open', to)
  util.title(to.meta.title)
})

export default router
