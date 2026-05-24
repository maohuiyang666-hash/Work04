/**
 * @description 前端环境配置校验与地址构建统一模块
 *   目标：减少因环境变量、接口地址、WebSocket 地址、文件上传地址配置不一致导致的开发/测试问题
 *   原则：
 *   1. 应用启动时尽早校验关键环境变量（"早失败"）
 *   2. 统一 API / WebSocket / 上传地址的构建入口，消除各处重复的拼接差异
 *   3. 仅在开发环境给出可识别的错误提示，不暴露给生产用户
 *   4. 兼容普通模式和租户模式，不对租户场景误判
 */
import log from './util.log'

// ---------------------------------------------------------------------------
// 常量和工具函数
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === 'development'

/**
 * 仅在开发环境输出带样式的 console 警告，不阻塞应用运行
 * 线上环境（production）静默跳过，不向用户暴露调试信息
 */
function devWarn (label, detail) {
  if (!isDev) return
  const style = 'color: #e6a23c; font-weight: bold;'
  console.group('%c[ConfigValidator] ' + label, style)
  console.warn(detail)
  console.groupEnd()
}

/**
 * 是否为租户模式：需要同时满足插件已加载且存在租户插件
 * 不依赖 window.pluginsAll 可能尚未就绪的情况（校验放在启动早期可能
 * plugin 还没注册完），因此这里只做简单的运行时探测，不硬编码。
 */
function isTenantMode () {
  try {
    return !!(window.pluginsAll && window.pluginsAll.indexOf('dvadmin-tenants-web') !== -1)
  } catch (_) {
    return false
  }
}

// ---------------------------------------------------------------------------
// 环境变量校验
// ---------------------------------------------------------------------------

/**
 * 校验 VUE_APP_API 的格式合法性
 * 支持的合法格式：
 *   - 相对路径： /api/ 或 /api
 *   - 绝对 URL：  http://127.0.0.1:8000/ 或 https://example.com/api/
 *   - 不带协议但以 // 开头：//example.com/api/
 *
 * 返回 { valid: boolean, reason: string }
 */
function validateApiEnv () {
  const api = process.env.VUE_APP_API

  // 1. 空值/未定义检查
  if (api === undefined || api === null) {
    return {
      valid: false,
      reason: 'VUE_APP_API 未定义。请检查 .env 文件，确保设置了 VUE_APP_API（例如 VUE_APP_API=/api/ 或 VUE_APP_API=http://127.0.0.1:8000）'
    }
  }

  const trimmed = String(api).trim()

  // 2. 去除引号后仍为空
  if (trimmed === '') {
    return {
      valid: false,
      reason: 'VUE_APP_API 值为空字符串。请设置合法的接口前缀，如 VUE_APP_API=/api/'
    }
  }

  // 3. 相对路径检查：必须以 / 开头
  if (trimmed.startsWith('/')) {
    // 相对路径至少要有一个路径段，不能只是 "/"
    if (trimmed === '/') {
      return {
        valid: false,
        reason: 'VUE_APP_API 配置为 "/"，这会导致 API 路径异常。请使用 /api/ 或其它的具体路径前缀。'
      }
    }
    return { valid: true, reason: '' }
  }

  // 4. 以 // 开头（协议相对路径）
  if (trimmed.startsWith('//')) {
    return { valid: true, reason: '' }
  }

  // 5. 绝对 URL 检查
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // 检查是否有 host 部分
    const withoutProtocol = trimmed.replace(/^https?:\/\//, '')
    if (!withoutProtocol || withoutProtocol === '/') {
      return {
        valid: false,
        reason: 'VUE_APP_API 缺少主机名部分，当前值为 "' + trimmed + '"。正确格式示例：http://127.0.0.1:8000'
      }
    }
    return { valid: true, reason: '' }
  }

  // 6. 无法识别的格式
  return {
    valid: false,
    reason: 'VUE_APP_API 格式无法识别（"' + trimmed + '"）。支持格式：相对路径（如 /api/）、绝对 URL（如 http://127.0.0.1:8000）、或协议相对路径（如 //example.com/api/）'
  }
}

/**
 * 校验 VUE_APP_FILE_ENGINE 如果不为空，是否在合法范围内
 */
function validateFileEngineEnv () {
  const engine = process.env.VUE_APP_FILE_ENGINE
  if (engine === undefined || engine === null || String(engine).trim() === '') {
    return { valid: true, reason: '' } // 允许为空，默认按 local 处理
  }
  const normalized = String(engine).trim().replace(/['"]/g, '')
  const validEngines = ['local', 'oss', 'cos']
  if (validEngines.indexOf(normalized) === -1) {
    return {
      valid: false,
      reason: 'VUE_APP_FILE_ENGINE 配置无效（"' + normalized + '"）。支持的值：local、oss、cos'
    }
  }
  return { valid: true, reason: '' }
}

// ---------------------------------------------------------------------------
// 统一地址构建
// ---------------------------------------------------------------------------

/**
 * 获取原始 API 配置值（不做租户模式域名替换）
 * 供内部使用，与后续的租户模式 URL 构建区分开
 */
function getRawApi () {
  return (process.env.VUE_APP_API || '').trim()
}

/**
 * 是否为相对路径形式的 API 配置（以 / 开头但不是 //）
 */
function isRelativeApiPath () {
  const api = getRawApi()
  return api.startsWith('/') && !api.startsWith('//')
}

/**
 * 是否为绝对 URL 形式的 API 配置
 */
function isAbsoluteApiUrl () {
  const api = getRawApi()
  return api.startsWith('http://') || api.startsWith('https://')
}

/**
 * 确保 URL 以 / 结尾
 */
function ensureTrailingSlash (url) {
  if (!url) return '/'
  return url.endsWith('/') ? url : url + '/'
}

/**
 * 构建 API 基地址
 * 与原有的 util.baseURL() 逻辑保持一致，但消除重复代码
 *
 * 逻辑：
 * 1. 非租户模式：直接返回 VUE_APP_API（确保尾部有 /）
 * 2. 租户模式 + 相对路径 API：拼接到当前域名端口上
 * 3. 租户模式 + 绝对 URL API：替换 ip/域名部分为当前浏览器域名
 */
function buildBaseURL () {
  var baseURL = getRawApi()
  var param = baseURL.split('/')[3] || ''

  if (isTenantMode() && (!param || baseURL.startsWith('/'))) {
    var host = baseURL.split('/')[2]
    if (host) {
      var prot = baseURL.split(':')[2] || 80
      if (prot === 80 || prot === 443) {
        host = document.domain
      } else {
        host = document.domain + ':' + prot
      }
      baseURL = baseURL.split('/')[0] + '//' + baseURL.split('/')[1] + host + '/' + param
    } else {
      baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' : '') + location.port + baseURL
    }
  }

  return ensureTrailingSlash(baseURL)
}

/**
 * 构建 WebSocket 基地址（含协议转换 http→ws, https→wss）
 *
 * 逻辑：
 * 1. 非租户模式 + 绝对 URL API：将协议替换为 ws/wss，保留原 host
 * 2. 非租户模式 + 相对路径 API：拼接到当前域名端口，协议用 ws/wss
 * 3. 租户模式：先做租户域名替换，再转换协议
 */
function buildWsBaseURL () {
  var baseURL = getRawApi()
  var param = baseURL.split('/')[3] || ''

  if (isTenantMode() && (!param || baseURL.startsWith('/'))) {
    // 租户模式：先替换域名
    var host = baseURL.split('/')[2]
    if (host) {
      var prot = baseURL.split(':')[2] || 80
      if (prot === 80 || prot === 443) {
        host = document.domain
      } else {
        host = document.domain + ':' + prot
      }
      baseURL = baseURL.split('/')[0] + '//' + baseURL.split('/')[1] + host + '/' + param
    } else {
      baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' : '') + location.port + baseURL
    }
  } else if (param !== '' || baseURL.startsWith('/')) {
    // 非租户模式 + 相对路径或仅含 path：拼接到当前域名
    baseURL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + (location.port ? ':' : '') + location.port + baseURL
  }

  // 协议转换：http→ws, https→wss
  if (baseURL.startsWith('https://')) {
    baseURL = baseURL.replace('https://', 'wss://')
  } else if (baseURL.startsWith('http://')) {
    baseURL = baseURL.replace('http://', 'ws://')
  }
  // 如果非租户模式但 API 本身就是 ws/wss 则不重复替换

  return ensureTrailingSlash(baseURL)
}

/**
 * 构建文件上传基地址
 * 当文件存储引擎为 oss/cos 时返回空字符串（使用云存储），否则沿用 API 基地址
 */
function buildFileURL () {
  const engine = (process.env.VUE_APP_FILE_ENGINE || '').trim().replace(/['"]/g, '')
  if (engine === 'oss' || engine === 'cos') {
    return ''
  }
  return buildBaseURL()
}

/**
 * 构建完整的文件上传地址（基地址 + 文件上传接口路径）
 * @param {string} [uploadPath='api/system/file/'] 文件上传接口路径
 */
function buildUploadURL (uploadPath) {
  const path = uploadPath || 'api/system/file/'
  if (buildFileURL() === '') {
    // oss/cos 模式无本地上传地址
    return ''
  }
  return buildFileURL() + path
}

// ---------------------------------------------------------------------------
// 启动时统一校验入口（在 main.js 中调用）
// ---------------------------------------------------------------------------

/**
 * 应用启动时执行环境变量校验
 * 仅在开发环境下输出警告，生产环境静默跳过
 *
 * 调用时机：main.js 中尽早调用（放到 Vue 实例化之前）
 */
function validateOnStartup () {
  if (!isDev) return

  log.info('[ConfigValidator] 启动环境配置校验...')

  // 1. 校验 VUE_APP_API
  const apiResult = validateApiEnv()
  if (!apiResult.valid) {
    devWarn('API 地址配置异常', apiResult.reason)
  }

  // 2. 校验 VUE_APP_FILE_ENGINE
  const engineResult = validateFileEngineEnv()
  if (!engineResult.valid) {
    devWarn('文件存储引擎配置异常', engineResult.reason)
  }

  // 3. 输出当前解析结果（帮助开发者快速确认）
  if (apiResult.valid) {
    const apiUrl = buildBaseURL()
    const wsUrl = buildWsBaseURL()
    const fileUrl = buildFileURL()
    const uploadUrl = buildUploadURL()

    log.info('[ConfigValidator] 地址解析结果：')
    log.info('  API 基地址     :', apiUrl)
    log.info('  WebSocket 基地址:', wsUrl)
    log.info('  文件上传基地址  :', fileUrl || '(oss/cos 云存储)')
    log.info('  文件上传完整地址:', uploadUrl || '(oss/cos 云存储)')

    // 4. 额外维度校验：API/WS 协议一致性校验
    // 确保不会出现一个用 http 另一个用 ws 的情况
    if (apiUrl.startsWith('https://') && !wsUrl.startsWith('wss://')) {
      devWarn('WebSocket 协议不匹配',
        'API 使用 HTTPS，但 WebSocket 地址未使用 WSS（当前: ' + wsUrl + '）。' +
        '这可能导致浏览器安全策略阻止 WebSocket 连接。' +
        '请检查 VUE_APP_API 配置和 WebSocket 地址构建逻辑。')
    }
    if (apiUrl.startsWith('http://') && wsUrl.startsWith('wss://')) {
      devWarn('WebSocket 协议不匹配',
        'API 使用 HTTP，但 WebSocket 地址使用了 WSS（当前: ' + wsUrl + '）。' +
        '虽然功能上可工作，但协议不一致可能引起跨域问题。')
    }

    // 5. 相对路径模式下提示：确认 nginx/devServer 代理已配置
    if (isRelativeApiPath()) {
      log.info('[ConfigValidator] 检测到相对路径 API 配置，请确保 devServer proxy 或 nginx 反向代理已正确配置。')
    }
  }

  // 6. 租户模式提示（不做校验，仅做信息展示）
  if (isTenantMode()) {
    log.info('[ConfigValidator] 检测到租户模式，API 地址将根据当前浏览器域名动态拼接。')
  }
}

// ---------------------------------------------------------------------------
// 对外暴露
// ---------------------------------------------------------------------------

export {
  // 校验
  validateApiEnv,
  validateFileEngineEnv,
  validateOnStartup,

  // 地址构建（统一入口）
  buildBaseURL,
  buildWsBaseURL,
  buildFileURL,
  buildUploadURL,
  ensureTrailingSlash,

  // 状态查询
  isRelativeApiPath,
  isAbsoluteApiUrl,
  isTenantMode
}

export default {
  validateApiEnv,
  validateFileEngineEnv,
  validateOnStartup,
  buildBaseURL,
  buildWsBaseURL,
  buildFileURL,
  buildUploadURL,
  ensureTrailingSlash,
  isRelativeApiPath,
  isAbsoluteApiUrl,
  isTenantMode
}