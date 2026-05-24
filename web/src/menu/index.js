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

let viewsContext = null
try {
  // Use lazy to avoid bundling all views into the main chunk synchronously
  viewsContext = require.context('@/views', true, /\.(vue|js)$/, 'lazy')
} catch (e) {}

let cachedKeys = null

const checkComponentExists = (componentPath) => {
  if (!viewsContext) return true // Fallback
  if (!componentPath) return false
  
  if (componentPath.startsWith('plugins/')) return true // Plugins are handled differently

  let p = componentPath
  if (p.startsWith('/')) p = p.slice(1)
  
  const possiblePaths = [
    `./${p}`,
    `./${p}.vue`,
    `./${p}.js`,
    `./${p}/index.vue`,
    `./${p}/index.js`
  ]
  
  if (!cachedKeys) {
    cachedKeys = viewsContext.keys()
  }
  
  for (const path of possiblePaths) {
    if (cachedKeys.includes(path)) {
      return true
    }
  }
  return false
}

/**
 * 校验路由是否有效
 */
export const checkRouter = function (menuData) {
  const result = []
  for (const item of menuData) {
    if (item.path !== '' && item.component) {
      if (!checkComponentExists(item.component)) {
        console.log(`导入菜单错误，会导致页面无法访问，请检查文件是否存在：${item.component}`)
        item.is_invalid = true
      }
    }
    result.push(item)
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
      const obj = {
        path: item.path,
        name: item.component_name,
        component: item.is_invalid 
          ? () => import('@/views/system/error/menu/index.vue')
          : ((item.component && item.component.substr(0, 8) === 'plugins/') 
            ? pluginImport(item.component.replace('plugins/', '')) 
            : _import(item.component)),
        meta: {
          title: item.name,
          auth: true,
          cache: item.is_invalid ? false : item.cache,
          openInNewWindow: item.frame_out,
          is_invalid: item.is_invalid
        }
      }
      if (item.frame_out) {
        frameOutRoutes.push(obj)
      } else {
        result.push(obj)
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
 * 将前端的侧边菜单进行处理
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
