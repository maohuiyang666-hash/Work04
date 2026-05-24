import { uniqueId } from 'lodash'
import { request } from '@/api/service'
import XEUtils from 'xe-utils'
import { frameInRoutes } from '@/router/routes'
const _import = require('@/libs/util.import.' + process.env.NODE_ENV)
const pluginImport = require('@/libs/util.import.plugin')

// 存储异常菜单信息，供其他模块使用
export const invalidMenus = []

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

/**
 * 尝试加载组件，返回 { success, component, error }
 */
function tryLoadComponent (componentPath) {
  try {
    const isPlugin = componentPath && componentPath.substr(0, 8) === 'plugins/'
    const actualPath = isPlugin ? componentPath.replace('plugins/', '') : componentPath
    const component = isPlugin ? pluginImport(actualPath) : _import(actualPath)
    return { success: true, component }
  } catch (err) {
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * 校验路由是否有效，过滤掉组件加载失败的菜单项
 * 同时记录异常菜单信息
 */
export const checkRouter = function (menuData) {
  // 清空历史异常记录
  invalidMenus.length = 0

  const result = []
  for (const item of menuData) {
    // 没有 path 或 component 的菜单（通常是目录/分组）保留
    if (!item.path || !item.component) {
      result.push(item)
      continue
    }

    const loadResult = tryLoadComponent(item.component)
    if (loadResult.success) {
      result.push(item)
    } else {
      // 记录异常菜单信息
      const errorInfo = {
        id: item.id,
        name: item.name || '未命名菜单',
        component: item.component,
        path: item.path,
        reason: `组件加载失败: ${loadResult.error}`
      }
      invalidMenus.push(errorInfo)
      console.error(
        `[菜单配置异常] 菜单 "${errorInfo.name}" 配置有误，组件路径 "${errorInfo.component}" 无法加载。\n` +
        `请检查后台菜单配置，确认组件路径是否正确。`
      )
    }
  }
  return result
}

/**
 * 判断菜单是否为异常菜单
 */
export function isInvalidMenu (path) {
  return invalidMenus.some(m => m.path === path)
}

/**
 * 获取异常菜单的错误信息
 */
export function getInvalidMenuInfo (path) {
  return invalidMenus.find(m => m.path === path) || null
}

/**
 * 过滤掉异常菜单（用于侧边栏、搜索池等）
 */
export function filterInvalidMenus (menuList) {
  return menuList.filter(item => {
    // 如果有子菜单，递归过滤
    if (item.children && item.children.length > 0) {
      item.children = filterInvalidMenus(item.children)
    }
    // 过滤掉在 invalidMenus 中的菜单
    return !isInvalidMenu(item.path)
  })
}

/**
 * 将获取到的后端菜单数据,解析为前端路由
 * 增加容错：单个菜单组件加载失败不影响其他菜单
 */
export const handleRouter = function (menuData) {
  // 清空之前的动态路由，避免重复累积
  const frameInChildren = []
  const frameOut = []

  for (const item of menuData) {
    // 跳过没有 path 或 component 的菜单（目录/分组）
    if (!item.path || !item.component) {
      if (item.is_link === 0) {
        delete item.path
      }
      continue
    }

    try {
      const isPlugin = item.component && item.component.substr(0, 8) === 'plugins/'
      const actualPath = isPlugin ? item.component.replace('plugins/', '') : item.component
      const component = isPlugin ? pluginImport(actualPath) : _import(actualPath)

      const obj = {
        path: item.path,
        name: item.component_name,
        component,
        meta: {
          title: item.name,
          auth: true,
          cache: item.cache,
          openInNewWindow: item.frame_out
        }
      }
      if (item.frame_out) {
        frameOut.push(obj)
      } else {
        frameInChildren.push(obj)
      }
    } catch (err) {
      // 组件加载失败时跳过该菜单，不影响其他菜单
      console.error(
        `[路由注册异常] 菜单 "${item.name}" 的组件 "${item.component}" 加载失败:`,
        err.message || err
      )
    }
  }
  // 更新 frameInRoutes 的子路由
  frameInRoutes[0].children = frameInChildren
  return { routes: frameInRoutes, frameOut }
}

/**
 * 将前端的侧边菜单进行处理
 * 过滤掉异常菜单
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
  // 过滤掉异常菜单
  return supplementPath(filterInvalidMenus(menu))
}
