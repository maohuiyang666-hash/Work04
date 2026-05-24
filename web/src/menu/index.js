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

/**
 * 生成异常菜单的统一错误信息
 */
function buildMenuErrorMessage (item, err) {
  const menuLabel = item.name || item.title || '未命名菜单'
  const compPath = item.component || '未配置'
  let reason = ''
  if (err) {
    reason = err.message || err.toString()
  } else if (!item.component) {
    reason = '组件路径（component）字段为空'
  } else if (!item.path) {
    reason = '路由路径（path）字段为空'
  } else {
    reason = '组件文件不存在或无法加载'
  }
  return `菜单「${menuLabel}」配置异常：组件路径 "${compPath}" 无法正确加载。原因：${reason}`
}

/**
 * 校验路由是否有效
 * 验证失败时标记 _error 字段，不整体过滤异常菜单
 */
export const checkRouter = function (menuData) {
  const result = []
  for (const item of menuData) {
    // 跳过不需要组件的外链菜单
    if (item.is_link === 1 || item.frame_out) {
      result.push(item)
      continue
    }
    // 检查基本字段完整性
    if (!item.path || !item.component) {
      console.error(`[菜单配置错误] ${buildMenuErrorMessage(item)}`)
      result.push({
        ...item,
        _error: true,
        _errorMessage: buildMenuErrorMessage(item)
      })
      continue
    }
    // 尝试同步加载验证组件（开发模式下有效，生产模式下 _import 返回懒加载函数不抛异常）
    try {
      if (item.component.substr(0, 8) === 'plugins/') {
        pluginImport(item.component.replace('plugins/', ''))
      } else {
        _import(item.component)
      }
      result.push(item)
    } catch (err) {
      console.error(`[菜单配置错误] ${buildMenuErrorMessage(item, err)}`)
      result.push({
        ...item,
        _error: true,
        _errorMessage: buildMenuErrorMessage(item, err)
      })
    }
  }
  return result
}

/**
 * 将获取到的后端菜单数据,解析为前端路由
 * 每个菜单项独立处理，单个异常不影响其他菜单路由注册
 */
export const handleRouter = function (menuData) {
  const result = []
  // 预设错误展示组件
  let errorComponent = null
  try {
    errorComponent = _import('system/error/menuConfigError/index')
  } catch (e) {
    errorComponent = { render: h => h('div') }
  }

  for (const item of menuData) {
    // 外链菜单不生成路由
    if (item.is_link === 1) {
      continue
    }
    try {
      if (item.path !== '' && item.component) {
        let component
        if (item._error) {
          component = errorComponent
        } else {
          const isPlugin = item.component.substr(0, 8) === 'plugins/'
          try {
            component = isPlugin
              ? pluginImport(item.component.replace('plugins/', ''))
              : _import(item.component)
          } catch (err) {
            console.error(`[菜单配置错误] 路由注册失败，菜单「${item.name || '未命名'}」组件 "${item.component}" 加载异常`, err)
            component = errorComponent
          }
        }
        const obj = {
          path: item.path,
          name: item.component_name,
          component: component,
          meta: {
            title: item.name,
            auth: true,
            cache: item._error ? false : item.cache,
            openInNewWindow: item.frame_out,
            menuError: item._error || false,
            menuErrorMessage: item._errorMessage || '',
            menuComponentPath: item.component || ''
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
    } catch (err) {
      // 单个菜单项处理失败，记录日志但不影响其他菜单
      console.error(`[菜单配置错误] 处理菜单「${item.name || '未命名'}」时发生异常，该菜单将不可用`, err)
    }
  }
  frameInRoutes[0].children = [...result]
  return { routes: frameInRoutes, frameOut: frameOutRoutes }
}

/**
 * 将前端的侧边菜单进行处理
 * 异常菜单保留在侧边栏中，但标记 error 以便视觉区分
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