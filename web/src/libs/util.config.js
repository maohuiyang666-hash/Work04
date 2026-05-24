/**
 * 配置校验与管理模块
 * 用于统一管理 API 地址、WebSocket 地址、文件上传地址等配置，
 * 并提供校验机制，避免配置不一致导致的问题
 */

// 校验结果对象
const validationErrors = {
  api: null,
  websocket: null,
  fileUpload: null
}

/**
 * 检查是否是开发环境
 */
function isDevelopment () {
  return process.env.NODE_ENV === 'development'
}

/**
 * 校验 API 地址配置
 * @param {string} apiUrl - 从环境变量获取的 API 地址
 * @returns {boolean} - 是否校验通过
 */
function validateApiUrl (apiUrl) {
  if (!apiUrl) {
    validationErrors.api = 'API 地址配置为空 (VUE_APP_API)'
    return false
  }

  // 检查相对路径格式（如 /api/）
  if (apiUrl.startsWith('/')) {
    // 相对路径，校验通过
    return true
  }

  // 检查绝对路径格式（如 http:// 或 https://）
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    validationErrors.api = 'API 地址格式错误，缺少 http:// 或 https:// 协议头'
    return false
  }

  // 基本格式正确
  return true
}

/**
 * 统一的基地址构建逻辑，避免 baseURL 和 wsBaseURL 中的重复代码
 * @param {string} baseApiUrl - 原始 API 地址
 * @param {object} options - 选项
 * @returns {string} - 构建后的地址
 */
function buildBaseUrl (baseApiUrl, options = { isWebsocket: false }) {
  let baseURL = baseApiUrl
  const param = baseURL.split('/')[3] || ''
  const isTenantMode = window.pluginsAll && window.pluginsAll.indexOf('dvadmin-tenants-web') !== -1 && (!param || baseURL.startsWith('/'))

  if (isTenantMode) {
    const host = baseURL.split('/')[2]
    if (host) {
      let prot = baseURL.split(':')[2] || 80
      // 修复：正确提取端口号，处理 https 443 的情况
      const hasProtocol = baseURL.startsWith('https://') || baseURL.startsWith('http://')
      if (hasProtocol) {
        const protocol = baseURL.startsWith('https://') ? 'https' : 'http'
        const parts = baseURL.split('/')
        const hostPart = parts[2]
        const hostPortParts = hostPart.split(':')
        if (hostPortParts.length > 1) {
          prot = hostPortParts[1]
        } else {
          prot = protocol === 'https' ? 443 : 80
        }
      }

      let finalHost
      if (prot === 80 || prot === 443) {
        finalHost = document.domain
      } else {
        finalHost = document.domain + ':' + prot
      }
      baseURL = baseURL.split('/')[0] + '//' + finalHost + '/' + param
    } else {
      baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' : '') + location.port + baseURL
    }
  } else if (options.isWebsocket && (param !== '' || baseURL.startsWith('/'))) {
    // WebSocket 模式，且是相对路径或带 param 的路径
    baseURL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + (location.port ? ':' : '') + location.port + baseURL
  }

  // 确保以斜杠结尾
  if (!baseURL.endsWith('/')) {
    baseURL += '/'
  }

  // 如果是 WebSocket 模式且以 http 开头，转换为 ws/wss
  if (options.isWebsocket && baseURL.startsWith('http')) {
    baseURL = baseURL.replace('http', 'ws')
  }

  return baseURL
}

/**
 * 获取 API 基地址
 * @returns {string} - API 基地址
 */
function getApiBaseUrl () {
  return buildBaseUrl(process.env.VUE_APP_API, { isWebsocket: false })
}

/**
 * 获取 WebSocket 基地址
 * @returns {string} - WebSocket 基地址
 */
function getWebSocketBaseUrl () {
  return buildBaseUrl(process.env.VUE_APP_API, { isWebsocket: true })
}

/**
 * 获取文件上传基地址
 * @returns {string} - 文件上传基地址
 */
function getFileUploadBaseUrl () {
  if (process.env.VUE_APP_FILE_ENGINE && (process.env.VUE_APP_FILE_ENGINE === 'oss' || process.env.VUE_APP_FILE_ENGINE === 'cos')) {
    return ''
  }
  return getApiBaseUrl()
}

/**
 * 执行所有配置校验
 * @returns {object} - 校验结果
 */
function validateAll () {
  const apiValid = validateApiUrl(process.env.VUE_APP_API)

  // 只在开发环境显示错误提示
  if (isDevelopment()) {
    const hasErrors = Object.values(validationErrors).some(e => e !== null)
    if (hasErrors) {
      console.error('==== 前端配置校验失败 ====')
      for (const [key, error] of Object.entries(validationErrors)) {
        if (error) {
          console.error(`[${key}] ${error}`)
        }
      }
      console.error('=========================')
    }
  }

  return {
    valid: apiValid,
    errors: { ...validationErrors }
  }
}

/**
 * 在开发环境显示配置错误提示
 */
function showDevErrors () {
  if (!isDevelopment()) return

  const hasErrors = Object.values(validationErrors).some(e => e !== null)
  if (!hasErrors) return

  // 使用控制台警告，避免阻塞页面加载
  console.warn('注意：当前环境配置存在问题，请检查 .env 或 .env.development 文件')

  // 也可以选择在页面显示错误提示（可选）
  if (window && window.ElementUI && window.ElementUI.Message) {
    const errorMsgs = Object.values(validationErrors).filter(e => e !== null)
    window.ElementUI.Message({
      message: `配置问题：${errorMsgs.join('; ')}`,
      type: 'error',
      duration: 0
    })
  }
}

export default {
  validateAll,
  validateApiUrl,
  getApiBaseUrl,
  getWebSocketBaseUrl,
  getFileUploadBaseUrl,
  showDevErrors,
  isDevelopment,
  buildBaseUrl
}
