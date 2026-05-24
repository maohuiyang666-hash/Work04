import { uniqueId } from 'lodash'
import { request } from '@/api/service'
import XEUtils from 'xe-utils'
import { frameInRoutes, frameOutRoutes } from '@/router/routes'
const _import = require('@/libs/util.import.' + process.env.NODE_ENV)
const pluginImport = require('@/libs/util.import.plugin')

/**
 * @description 给菜单数据补充上 path 字段
 * @description https://github.com/d2-projects/d2-admin/issues/209
 * @param {Array} menu 原始的菜单数据
 */
function supplementPath (menu) {
  return menu.map(e => ({
    ...e,
    path: e.path || uniqueId('d2-menu-empty-'),
    ...e.children ? {
      children: supplementPath(e.children)
    } : {}
  }))
}

export const menuHeader = supplementPath([])

export const menuAside = supplementPath([])

/**
 * 错误页面组件导入
 */
const errorPageComponent = () => import('@/views/system/error/menu-error/index.vue')

// 请求菜单数据,用于解析路由和侧边栏菜单
export const getMenu = function () {
  return request({
    url: '/api/system/menu/web_router/',
    method: 'get',
    params: {}
  }).then((res) => {
    // 设置动态路由
    const menuData = res.data.data
    sessionStorage.setItem('menuData', JSON.stringify(menuData))
    return menuData
  })
}

/**
 * 校验路由是否有效，并标记错误菜单
 */
export const checkRouter = function (menuData) {
  const result = []
  for (const item of menuData) {
    try {
      if (item.path !== '' && item.component) {
        (item.component && item.component.substr(0, 8) === 'plugins/') ? pluginImport(item.component.replace('plugins/', '')) : _import(item.component)
      }
      result.push({
        ...item,
        _error: false
      })
    } catch (err) {
      console.error(`[菜单配置错误] 菜单名称: ${item.name}, 组件路径: ${item.component}, 错误:`, err)
      result.push({
        ...item,
        _error: true,
        _errorMessage: err.message || '组件导入失败，请检查路径是否正确'
      })
    }
  }
  return result
}

/**
 * 将获取到的后端菜单数据,解析为前端路由
 */
export const handleRouter = function (menuData) {
  const result = []
  for (const item of menuData) {
    if (item.path !== '' && item.component) {
      let routeObj
      if (item._error) {
        // 错误菜单指向错误提示页面
        routeObj = {
          path: item.path,
          name: item.component_name || `menu-error-${item.id}`,
          component: errorPageComponent,
          meta: {
            title: item.name,
            auth: true,
            cache: false,
            openInNewWindow: item.frame_out,
            menuName: item.name,
            componentPath: item.component,
            errorMessage: item._errorMessage
          }
        }
      } else {
        // 正常菜单正常处理
        routeObj = {
          path: item.path,
          name: item.component_name,
          component: (item.component && item.component.substr(0, 8) === 'plugins/') ? pluginImport(item.component.replace('plugins/', '')) : _import(item.component),
          meta: {
            title: item.name,
            auth: true,
            cache: item.cache,
            openInNewWindow: item.frame_out
          }
        }
      }
      if (item.frame_out) {
        frameOutRoutes.push(routeObj)
      } else {
        result.push(routeObj)
      }
    } else {
      if (item.is_link === 0) {
        delete item.path
      }
    }
  }
  frameInRoutes[0].children = [...result]
  return { routes: frameInRoutes, frameOut: frameOutRoutes }
}

/**
 * 将前端的侧边菜单进行处理，为错误菜单添加标记
 */
export const handleAsideMenu = function (menuData) {
  // 将列表数据转换为树形数据
  const data = XEUtils.toArrayTree(menuData, {
    parentKey: 'parent',
    strict: true
  })
  const menu = [
    { path: '/index', title: '控制台', icon: 'home' },
    ...data
  ]
  return supplementPath(menu)
}
