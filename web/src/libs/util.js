import cookies from './util.cookies'
import db from './util.db'
import log from './util.log'
import dayjs from 'dayjs'
import filterParams from './util.params'

const HTTP_URL_REGEXP = /^https?:\/\//i
const WS_URL_REGEXP = /^wss?:\/\//i
const DEV_CONFIG_ERROR_FLAG = '__dvadminRuntimeConfigErrorShown__'

const util = {
  cookies,
  db,
  log,
  filterParams
}

function normalizeValue (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function ensureTrailingSlash (value) {
  if (!value) {
    return value
  }
  return value.endsWith('/') ? value : `${value}/`
}

function trimLeadingSlash (value) {
  return normalizeValue(value).replace(/^\/+/, '')
}

function getLocationOrigin () {
  return location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')
}

function buildTenantBaseURL (baseURL, param) {
  var host = baseURL.split('/')[2]
  if (host) {
    try {
      const parsedURL = new URL(baseURL)
      const port = parsedURL.port || (parsedURL.protocol === 'https:' ? '443' : '80')
      const tenantHost = port === '80' || port === '443' ? document.domain : document.domain + ':' + port
      return parsedURL.protocol + '//' + tenantHost + (param ? '/' + param : '/')
    } catch (error) {
      return baseURL
    }
  }
  return getLocationOrigin() + baseURL
}

function buildWsURLFromApiBase (baseURL) {
  const normalizedBaseURL = ensureTrailingSlash(normalizeValue(baseURL))
  if (!normalizedBaseURL) {
    return ''
  }
  if (WS_URL_REGEXP.test(normalizedBaseURL)) {
    return normalizedBaseURL
  }
  if (HTTP_URL_REGEXP.test(normalizedBaseURL)) {
    return normalizedBaseURL.replace(/^http/i, 'ws')
  }
  if (normalizedBaseURL.startsWith('/')) {
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + normalizedBaseURL
  }
  return ''
}

function buildApiTargetURL (path) {
  const baseURL = util.baseURL()
  const normalizedPath = trimLeadingSlash(path)
  if (!baseURL) {
    return normalizedPath
  }
  return normalizedPath ? ensureTrailingSlash(baseURL) + normalizedPath : ensureTrailingSlash(baseURL)
}

function getRuntimeConfigSnapshot () {
  const apiBaseURL = util.baseURL()
  const wsBaseURL = util.wsBaseURL()
  const fileBaseURL = util.baseFileURL()
  return {
    apiBaseURL,
    wsBaseURL,
    fileBaseURL,
    uploadURL: util.buildUploadURL(),
    ueditorServerURL: util.buildUeditorServerURL()
  }
}

/**
 * @description 更新标题
 * @param {String} titleText 标题
 */
util.title = function (titleText) {
  const processTitle = process.env.VUE_APP_TITLE || 'D2Admin'
  window.document.title = `${processTitle}${titleText ? ` | ${titleText}` : ''}`
}

/**
 * @description 打开新页面
 * @param {String} url 地址
 */
util.open = function (url) {
  var a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('target', '_blank')
  a.setAttribute('id', 'd2admin-link-temp')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(document.getElementById('d2admin-link-temp'))
}

util.isTenantMode = function () {
  return !!(window.pluginsAll && window.pluginsAll.indexOf('dvadmin-tenants-web') !== -1)
}

util.getRawApiBaseURL = function () {
  return normalizeValue(process.env.VUE_APP_API)
}

/**
 * @description 校验是否为租户模式。租户模式把域名替换成 域名 加端口
 */
util.baseURL = function () {
  var baseURL = util.getRawApiBaseURL()
  if (!baseURL) {
    return ''
  }
  var param = baseURL.split('/')[3] || ''
  if (util.isTenantMode() && (!param || baseURL.startsWith('/'))) {
    baseURL = buildTenantBaseURL(baseURL, param)
  }
  return ensureTrailingSlash(baseURL)
}

util.baseFileURL = function () {
  if (process.env.VUE_APP_FILE_ENGINE && (process.env.VUE_APP_FILE_ENGINE === 'oss' || process.env.VUE_APP_FILE_ENGINE === 'cos')) {
    return ''
  }
  return util.baseURL()
}

util.wsBaseURL = function () {
  return buildWsURLFromApiBase(util.baseURL())
}

util.buildApiURL = function (path = '') {
  return buildApiTargetURL(path)
}

util.buildUploadURL = function () {
  return util.buildApiURL('api/system/file/')
}

util.buildUeditorServerURL = function () {
  return util.buildApiURL('api/system/file/ueditor/')
}

util.createUeditorConfig = function () {
  const token = util.cookies.get('token')
  const fileBaseURL = util.baseFileURL()
  const headers = token ? { Authorization: 'JWT ' + token } : {}
  return {
    serverUrl: util.buildUeditorServerURL(),
    headers,
    imageUrlPrefix: fileBaseURL,
    scrawlUrlPrefix: fileBaseURL,
    snapscreenUrlPrefix: fileBaseURL,
    catcherUrlPrefix: fileBaseURL,
    videoUrlPrefix: fileBaseURL,
    fileUrlPrefix: fileBaseURL,
    imageManagerUrlPrefix: fileBaseURL,
    fileManagerUrlPrefix: fileBaseURL
  }
}

util.inspectRuntimeConfig = function () {
  const rawApiBaseURL = util.getRawApiBaseURL()
  const snapshot = getRuntimeConfigSnapshot()
  const errors = []

  if (!rawApiBaseURL) {
    errors.push({ field: 'VUE_APP_API', message: '不能为空，请配置接口基础地址' })
  } else {
    if (rawApiBaseURL.indexOf('\\') !== -1) {
      errors.push({ field: 'VUE_APP_API', message: '不能包含反斜杠，请使用标准 URL 或以 / 开头的相对路径' })
    }
    if (/^https?:\/[^/]/i.test(rawApiBaseURL)) {
      errors.push({ field: 'VUE_APP_API', message: '协议后缺少一个斜杠，应为 http:// 或 https://' })
    }
    if (/^\/\//.test(rawApiBaseURL)) {
      errors.push({ field: 'VUE_APP_API', message: '缺少协议前缀，请使用 http://、https:// 或以 / 开头的相对路径' })
    }
    if (WS_URL_REGEXP.test(rawApiBaseURL)) {
      errors.push({ field: 'VUE_APP_API', message: '当前值看起来是 WebSocket 地址，请改为 http:// 或 https:// 接口地址' })
    }
    if (!rawApiBaseURL.startsWith('/') && !HTTP_URL_REGEXP.test(rawApiBaseURL)) {
      errors.push({ field: 'VUE_APP_API', message: '应配置为 http(s):// 开头的绝对地址，或以 / 开头的相对路径' })
    }
  }

  if (rawApiBaseURL && !snapshot.apiBaseURL) {
    errors.push({ field: 'API 地址', message: '无法根据当前配置生成可用的接口基础地址' })
  }
  if (rawApiBaseURL && !snapshot.wsBaseURL) {
    errors.push({ field: 'WebSocket 地址', message: '无法根据当前接口地址推导出可用的 WebSocket 地址' })
  }
  if (rawApiBaseURL && !snapshot.uploadURL) {
    errors.push({ field: '文件上传地址', message: '无法根据当前接口地址生成上传地址' })
  }
  if (rawApiBaseURL && !snapshot.ueditorServerURL) {
    errors.push({ field: '富文本上传地址', message: '无法根据当前接口地址生成富文本上传地址' })
  }

  return {
    rawApiBaseURL,
    errors,
    ...snapshot
  }
}

util.ensureRuntimeConfig = function () {
  const configResult = util.inspectRuntimeConfig()
  if (!configResult.errors.length || process.env.NODE_ENV !== 'development') {
    return configResult
  }

  const lines = [
    '前端环境配置校验失败：',
    ...configResult.errors.map(item => `${item.field}：${item.message}`),
    `VUE_APP_API：${configResult.rawApiBaseURL || '(空)'}`,
    `API 地址：${configResult.apiBaseURL || '(空)'}`,
    `WebSocket 地址：${configResult.wsBaseURL || '(空)'}`,
    `文件上传地址：${configResult.uploadURL || '(空)'}`,
    `富文本上传地址：${configResult.ueditorServerURL || '(空)'}`
  ]
  const errorMessage = lines.join('\n')

  if (typeof window !== 'undefined' && !window[DEV_CONFIG_ERROR_FLAG]) {
    window[DEV_CONFIG_ERROR_FLAG] = true
    console.error(errorMessage)
  }

  throw new Error(errorMessage)
}

/**
 * 自动生成ID
 */
util.autoCreateCode = function () {
  return dayjs().format('YYYYMMDDHHmmssms') + Math.round(Math.random() * 80 + 20)
}
/**
 * 自动生成短 ID
 */
util.autoShortCreateCode = function () {
  var Num = ''
  for (var i = 0; i < 4; i++) {
    Num += Math.floor(Math.random() * 10)
  }
  return dayjs().format('YYMMDD') + Num
}

/**
 * 生产随机字符串
 */
util.randomString = function (e) {
  e = e || 32
  var t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
  var a = t.length
  var n = ''
  for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a))
  return n
}

util.randomColor = function () {
  const color = [
    '#50A8F4FF',
    '#FD6165FF',
    '#E679D8FF',
    '#F9AB5BFF'
  ]
  const ran = Math.floor(Math.random() * color.length)
  return color[ran]
}

util.randomBackground = function () {
  const background = [
    'linear-gradient(150deg, #accaff 0%, #3b88ec 100%)',
    'linear-gradient(150deg, #c5f8e6 0%, #10a465 100%)',
    'linear-gradient(150deg, #e8d6ff 0%, #9f55ff 100%)',
    'linear-gradient(150deg, #fdda45 0%, #fe6b62 100%)',
    'linear-gradient(150deg, #cefbc8 0%, #00aec5 100%)',
    'linear-gradient(150deg, #c5f8e6 0%, #10a465 100%)'
  ]
  const ran = Math.floor(Math.random() * background.length)
  return background[ran]
}

util.ArrayToTree = function (rootList, parentValue, parentName, list) {
  for (const item of rootList) {
    if (item.parent === parentValue) {
      if (parentName) {
        item.name = parentName + '/' + item.name
      }
      list.push(item)
    }
  }

  for (const i of list) {
    if (i.children) {
      util.ArrayToTree(rootList, i.id, i.name, i.children)
    } else {
      i.children = []
      util.ArrayToTree(rootList, i.id, i.name, i.children)
    }

    if (i.children.length === 0) {
      delete i.children
    }
  }
  return list
}

util.formatBytes = function (bytes, decimals = 2) {
  if (isNaN(bytes)) {
    return bytes
  }

  if (bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default util
