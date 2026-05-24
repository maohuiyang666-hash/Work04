import { uniqueId } from 'lodash'
import { request } from '@/api/service'
import XEUtils from 'xe-utils'
import { frameInRoutes, frameOutRoutes } from '@/router/routes'
const _import = require('@/libs/util.import.' + process.env.NODE_ENV)
const pluginImport = require('@/libs/util.import.plugin')
const viewModules = require.context('@/views', true, /\.vue$/)
const INVALID_MENU_PATH_PREFIX = 'd2-menu-error-'

function supplementPath (menu) {
  return menu.map(e => ({
    ...e,
    path: e.path || uniqueId('d2-menu-empty-'),
    ...e.children ? {
      children: supplementPath(e.children)
    } : {}
  }))
}

function normalizeText (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toBooleanFlag (value) {
  return value === true || value === 1 || value === '1'
}

function normalizeMenuItem (item) {
  const title = item.title || item.name || '未命名菜单'
  const normalized = {
    ...item,
    title,
    is_catalog: toBooleanFlag(item.is_catalog),
    is_link: toBooleanFlag(item.is_link),
    frame_out: toBooleanFlag(item.frame_out),
    visible: toBooleanFlag(item.visible),
    cache: toBooleanFlag(item.cache)
  }
  if (normalized.path === '' && !normalized.is_link) {
    delete normalized.path
  }
  return normalized
}

function cloneRoutes (routes) {
  return routes.map(route => ({
    ...route,
    children: route.children ? [...route.children] : undefined
  }))
}

function collectRouteIdentifiers (routes, nameSet, pathSet) {
  routes.forEach(route => {
    if (route.name) {
      nameSet.add(route.name)
    }
    if (route.path) {
      pathSet.add(route.path)
    }
    if (route.children && route.children.length) {
      collectRouteIdentifiers(route.children, nameSet, pathSet)
    }
  })
}

function createMenuIssue (item, reason, detail = '') {
  return {
    key: uniqueId(INVALID_MENU_PATH_PREFIX),
    title: item.title || item.name || '未命名菜单',
    reason,
    detail,
    originalPath: normalizeText(item.path),
    component: normalizeText(item.component),
    componentName: normalizeText(item.component_name),
    id: item.id,
    visible: item.visible
  }
}

function getMenuIssueTitle (title) {
  return `${title}（配置异常）`
}

function buildIssueMenuItem (item, issue) {
  return {
    ...item,
    path: issue.key,
    title: getMenuIssueTitle(issue.title),
    menuIssue: true,
    menuIssueKey: issue.key
  }
}

function resolveLocalComponent (component) {
  const normalizedComponent = normalizeText(component).replace(/^\//, '')
  const modulePath = `./${normalizedComponent}.vue`
  if (!viewModules.keys().includes(modulePath)) {
    throw new Error(`页面组件不存在：${normalizedComponent}`)
  }
  const module = viewModules(modulePath)
  const viewComponent = module && module.default ? module.default : module
  return {
    routeComponent: _import(normalizedComponent),
    viewName: viewComponent && viewComponent.name ? normalizeText(viewComponent.name) : ''
  }
}

function resolveMenuComponent (component) {
  const normalizedComponent = normalizeText(component)
  if (normalizedComponent.startsWith('plugins/')) {
    const routeComponent = pluginImport(normalizedComponent.replace('plugins/', ''))
    return {
      routeComponent,
      viewName: routeComponent && routeComponent.name ? normalizeText(routeComponent.name) : ''
    }
  }
  return resolveLocalComponent(normalizedComponent)
}

function validateRouteMenuItem (item, routeNameSet, routePathSet) {
  const path = normalizeText(item.path)
  const component = normalizeText(item.component)
  const componentName = normalizeText(item.component_name)

  if (!path) {
    return { issue: createMenuIssue(item, '缺少路由地址') }
  }
  if (!component) {
    return { issue: createMenuIssue(item, '缺少组件地址') }
  }
  if (!componentName) {
    return { issue: createMenuIssue(item, '缺少组件名称') }
  }
  if (routePathSet.has(path)) {
    return { issue: createMenuIssue(item, `路由地址重复：${path}`) }
  }
  if (routeNameSet.has(componentName)) {
    return { issue: createMenuIssue(item, `组件名称重复：${componentName}`) }
  }

  try {
    const { routeComponent, viewName } = resolveMenuComponent(component)
    if (viewName && componentName !== viewName) {
      return {
        issue: createMenuIssue(item, `组件名称与页面 name 不一致，应为：${viewName}`)
      }
    }
    return {
      path,
      componentName,
      routeComponent
    }
  } catch (error) {
    return {
      issue: createMenuIssue(item, `组件地址解析失败：${component}`, error.message)
    }
  }
}

export const menuHeader = supplementPath([])

export const menuAside = supplementPath([])

export const getMenu = function () {
  return request({
    url: '/api/system/menu/web_router/',
    method: 'get',
    params: {}
  }).then((res) => {
    return res.data.data || []
  })
}

export const isMenuIssuePath = function (path) {
  return typeof path === 'string' && path.indexOf(INVALID_MENU_PATH_PREFIX) === 0
}

export const formatMenuIssueMessage = function (issue) {
  return [
    `菜单“${issue.title}”配置异常`,
    issue.reason,
    issue.originalPath ? `路由：${issue.originalPath}` : '',
    issue.component ? `组件：${issue.component}` : '',
    issue.componentName ? `组件名称：${issue.componentName}` : '',
    issue.detail ? `详情：${issue.detail}` : ''
  ].filter(Boolean).join('；')
}

export const parseMenuData = function (menuData) {
  const routes = cloneRoutes(frameInRoutes)
  const frameOut = [...frameOutRoutes]
  const routeItems = []
  const validMenus = []
  const asideMenus = []
  const invalidMenus = []
  const issuesByKey = {}
  const issuesByOriginalPath = {}
  const routeNameSet = new Set()
  const routePathSet = new Set()

  collectRouteIdentifiers(routes, routeNameSet, routePathSet)
  collectRouteIdentifiers(frameOut, routeNameSet, routePathSet)
  routeNameSet.add('404')
  routePathSet.add('/404')

  menuData.forEach(rawItem => {
    const item = normalizeMenuItem(rawItem)
    const shouldBuildRoute = !item.is_catalog && !item.is_link

    if (shouldBuildRoute) {
      const validated = validateRouteMenuItem(item, routeNameSet, routePathSet)
      if (validated.issue) {
        invalidMenus.push(validated.issue)
        issuesByKey[validated.issue.key] = validated.issue
        if (validated.issue.originalPath) {
          issuesByOriginalPath[validated.issue.originalPath] = validated.issue
        }
        asideMenus.push(buildIssueMenuItem(item, validated.issue))
        return
      }

      routeNameSet.add(validated.componentName)
      routePathSet.add(validated.path)
      const route = {
        path: validated.path,
        name: validated.componentName,
        component: validated.routeComponent,
        meta: {
          title: item.title,
          auth: true,
          cache: item.cache,
          openInNewWindow: item.frame_out
        }
      }
      if (item.frame_out) {
        frameOut.push(route)
      } else {
        routeItems.push(route)
      }
    }

    validMenus.push(item)
    asideMenus.push(item)
  })

  routes[0].children = [...routeItems]

  return {
    routes,
    frameOut,
    validMenus,
    asideMenus,
    searchMenus: validMenus,
    invalidMenus,
    menuIssues: {
      list: invalidMenus,
      byKey: issuesByKey,
      byOriginalPath: issuesByOriginalPath
    }
  }
}

export const checkRouter = function (menuData) {
  return parseMenuData(menuData).validMenus
}

export const handleRouter = function (menuData) {
  const { routes, frameOut } = parseMenuData(menuData)
  return { routes, frameOut }
}

export const handleAsideMenu = function (menuData) {
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
