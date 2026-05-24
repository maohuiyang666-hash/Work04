import Vue from 'vue'
import VueRouter from 'vue-router'
// 进度条
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

import store from '@/store/index'
import util from '@/libs/util.js'
// 路由数据
import routes from './routes'
import { getMenu, handleAsideMenu, handleRouter, checkRouter, invalidMenus } from '@/menu'
import { request } from '@/api/service'

// 菜单错误页面组件
const MenuErrorPage = () => import('@/views/system/error/menu-error.vue')

// fix vue-router NavigationDuplicated
const VueRouterPush = VueRouter.prototype.push
VueRouter.prototype.push = function push (location) {
  return VueRouterPush.call(this, location).catch(err => err)
}
const VueRouterReplace = VueRouter.prototype.replace
VueRouter.prototype.replace = function replace (location) {
  return VueRouterReplace.call(this, location).catch(err => err)
}

Vue.use(VueRouter)
console.log(routes)
// 导出路由 在 main.js 里使用
const router = new VueRouter({
  routes
})

// 添加通用的菜单错误路由（用于处理直接访问异常路径）
router.addRoute({
  path: '/menu-error',
  name: 'menuError',
  component: MenuErrorPage,
  meta: {
    title: '菜单配置异常',
    auth: false
  }
})

/**
 * 路由拦截
 * 权限验证
 */
router.beforeEach(async (to, from, next) => {
  // 白名单
  const whiteList = ['/login', '/auth-redirect', '/bind', '/register', '/clientRenew', '/oauth2']
  // 确认已经加载多标签页数据 https://github.com/d2-projects/d2-admin/issues/201
  await store.dispatch('d2admin/page/isLoaded')
  // 确认已经加载组件尺寸设置 https://github.com/d2-projects/d2-admin/issues/198
  await store.dispatch('d2admin/size/isLoaded')
  // 进度条
  NProgress.start()
  // 关闭搜索面板
  store.commit('d2admin/search/set', false)
  // 验证当前路由所有的匹配中是否需要有登录验证的
  // 这里暂时将cookie里是否存有token作为验证是否登录的条件
  // 请根据自身业务需要修改
  const token = util.cookies.get('token')
  if (token && token !== 'undefined') {
    if (!store.state.d2admin.user.info.name) {
      var res = await request({
        url: '/api/system/user/user_info/',
        method: 'get',
        params: {}
      })
      await store.dispatch('d2admin/user/set', res.data, { root: true })
      await store.dispatch('d2admin/account/load')
      store.dispatch('d2admin/settings/init')
    }
    if (!store.state.d2admin.menu || store.state.d2admin.menu.aside.length === 0) {
      await store.dispatch('d2admin/permission/load', routes)
      await store.dispatch('d2admin/dept/load')
      // 动态添加路由
      getMenu().then(ret => {
        // 校验路由是否有效
        ret = checkRouter(ret)
        const { routes, frameOut } = handleRouter(ret)
        // 处理路由 得到每一级的路由设置
        store.commit('d2admin/page/init', routes)
        routes.map((r) => {
          router.addRoute(r)
        })
        frameOut.map((r) => {
          router.addRoute(r)
          router.options.routes.push(r)
        })

        // 为异常菜单注册错误页面路由，让用户点击时能看到明确的错误提示
        invalidMenus.forEach(menu => {
          const errorRoute = {
            path: menu.path,
            name: `menu_error_${menu.path}`,
            component: MenuErrorPage,
            meta: {
              title: `菜单配置异常 - ${menu.name}`,
              auth: true,
              menuError: menu
            }
          }
          router.addRoute(errorRoute)
          router.options.routes.push(errorRoute)
        })

        console.log('router', router, routes, frameOut)

        const menu = handleAsideMenu(ret)
        const aside = handleAsideMenu(ret.filter(value => value.visible === true))
        store.commit('d2admin/menu/asideSet', aside) // 设置侧边栏菜单
        store.commit('d2admin/search/init', menu) // 设置搜索
        next({ path: to.fullPath, replace: true, params: to.params })
      })
    } else {
      const childrenPath = window.qiankunActiveRule || []
      // 判断，是否是租户模式
      if (to.path !== '/clientRenew' && store.state.d2admin.user.info.tenant_id) {
        // 如果租户到期，跳转到续费页面
        if (store.state.d2admin.user.info.tenant_expire) {
          next({ path: '/clientRenew' })
          // 取消当前导航
          NProgress.done()
          return
        // 如果是普通租户，如果没有试用套餐，且是试用阶段
        } else if (store.state.d2admin.user.info.tenant_id !== 100000 && !store.state.d2admin.user.info.package_manage && store.state.d2admin.user.info.tenant_experience) {
          next({ path: '/clientRenew' })
          // 取消当前导航
          NProgress.done()
          return
        }
      }
      if (to.name) {
        if (to.meta.openInNewWindow && ((from.query.newWindow && to.query.newWindow !== '1') || from.path === '/')) {
          to.query.newWindow = '1'
        }

        // 有 name 属性，说明是主应用的路由
        if (to.meta.openInNewWindow && !to.query.newWindow && !from.query.newWindow && from.path !== '/') {
          // 在新窗口中打开路由
          const { href } = router.resolve({
            path: to.path + '?newWindow=1'
          })
          window.open(href, '_blank')
          // 取消当前导航
          NProgress.done()
          next(false)
        } else {
          // 取消当前导航
          NProgress.done()
          next()
        }
      } else if (childrenPath.some((item) => to.path.includes(item))) {
        next()
      } else {
        next({ name: '404' })
      }
    }
  } else {
    // 没有登录的时候跳转到登录界面
    // 携带上登陆成功之后需要跳转的页面完整路径
    // https://github.com/d2-projects/d2-admin/issues/138
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
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
  // 进度条
  NProgress.done()
  // 多页控制 打开新的页面
  store.dispatch('d2admin/page/open', to)
  // 更改标题
  util.title(to.meta.title)
})

// 全局路由错误处理：捕获异步组件加载失败的情况
router.onError((error) => {
  const pattern = /Loading chunk (\S)+ failed/g
  const isChunkLoadFailed = pattern.test(error.message)
  if (isChunkLoadFailed) {
    console.error('[路由错误] 页面组件加载失败:', error.message)
    // 跳转到错误提示页面
    const currentPath = router.currentRoute.path
    router.replace({
      path: '/menu-error',
      query: { redirect: currentPath },
      meta: {
        menuError: {
          name: '未知菜单',
          component: '加载失败',
          reason: '页面组件加载失败，可能是网络问题或组件已被删除'
        }
      }
    })
  } else {
    console.error('[路由错误]', error)
  }
})

export default router
