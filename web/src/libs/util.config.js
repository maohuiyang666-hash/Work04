/**
 * @description 前端环境配置校验模块
 * 功能：配置早失败、地址拼接统一、租户模式兼容
 */

/**
 * @description 获取 VUE_APP_API 配置值
 */
function getApiConfig () {
  return process.env.VUE_APP_API || ''
}

/**
 * @description 检查是否为相对路径
 */
function isRelativePath (path) {
  return path && (path.startsWith('/') && !path.startsWith('//'))
}

/**
 * @description 检查是否为绝对路径(带协议)
 */
function isAbsolutePath (path) {
  return path && (path.startsWith('http://') || path.startsWith('https://'))
}

/**
 * @description 标准化 API 地址
 * @param {string} api - 原始 API 地址
 * @returns {string} 标准化后的地址
 */
export function normalizeApiUrl (api) {
  if (!api) return ''
  api = api.trim()
  // 确保尾部有斜杠
  if (!api.endsWith('/')) {
    api += '/'
  }
  return api
}

/**
 * @description 获取协议和主机部分
 * @param {string} url - URL 地址
 * @returns {object} { protocol, host }
 */
function getProtocolAndHost (url) {
  if (isRelativePath(url)) {
    // 相对路径：使用当前页面协议和主机
    return {
      protocol: location.protocol,
      host: location.hostname + (location.port ? ':' + location.port : '')
    }
  }
  if (isAbsolutePath(url)) {
    // 绝对路径：解析 URL
    try {
      const urlObj = new URL(url)
      return {
        protocol: urlObj.protocol,
        host: urlObj.host
      }
    } catch (e) {
      return { protocol: '', host: '' }
    }
  }
  return { protocol: '', host: '' }
}

/**
 * @description 构建 WebSocket 地址（基于 API 地址）
 * @param {string} baseURL - API 基地址
 * @returns {string} WebSocket 地址
 */
export function buildWsUrl (baseURL) {
  if (!baseURL) return ''

  const { protocol, host } = getProtocolAndHost(baseURL)

  // 判断是否为相对路径
  if (isRelativePath(baseURL)) {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return wsProtocol + '//' + host + baseURL
  }

  // 绝对路径：替换协议为 ws/wss
  if (protocol === 'https:') {
    return 'wss://' + host + '/' + baseURL.split('/').slice(3).join('/')
  } else {
    return 'ws://' + host + '/' + baseURL.split('/').slice(3).join('/')
  }
}

/**
 * @description 校验配置错误
 */
export function validateConfig () {
  const errors = []
  const apiConfig = getApiConfig()

  // 1. 检查 API 地址是否为空
  if (!apiConfig) {
    errors.push({
      type: 'API',
      field: 'VUE_APP_API',
      message: '接口地址(VUE_APP_API)未配置，请检查环境变量文件(.env)',
      suggestion: '例如：VUE_APP_API=/api/ 或 VUE_APP_API=http://127.0.0.1:8000'
    })
    return errors // 严重错误，直接返回
  }

  // 2. 检查相对路径格式
  if (isRelativePath(apiConfig)) {
    // 相对路径只需要检查格式是否正确
    if (!apiConfig.startsWith('/')) {
      errors.push({
        type: 'API',
        field: 'VUE_APP_API',
        message: '相对路径格式错误：' + apiConfig,
        suggestion: '相对路径必须以 / 开头，例如：/api/'
      })
    }
  }

  // 3. 检查绝对路径格式
  if (isAbsolutePath(apiConfig)) {
    // 检查协议
    if (!apiConfig.startsWith('http://') && !apiConfig.startsWith('https://')) {
      errors.push({
        type: 'API',
        field: 'VUE_APP_API',
        message: '绝对地址协议错误：' + apiConfig,
        suggestion: '协议必须是 http:// 或 https://，例如：http://127.0.0.1:8000'
      })
    }

    // 检查是否缺少主机部分
    try {
      const urlObj = new URL(apiConfig)
      if (!urlObj.host) {
        errors.push({
          type: 'API',
          field: 'VUE_APP_API',
          message: '地址缺少主机名：' + apiConfig,
          suggestion: '请检查地址格式，例如：http://127.0.0.1:8000'
        })
      }
    } catch (e) {
      errors.push({
        type: 'API',
        field: 'VUE_APP_API',
        message: '地址格式错误：' + apiConfig,
        suggestion: '请检查地址格式是否合法'
      })
    }
  }

  // 4. 检查常见的配置错误
  // 双斜杠问题（但 http:// 开头的是正常的）
  if (apiConfig.includes('//') && !apiConfig.startsWith('http://') && !apiConfig.startsWith('https://')) {
    errors.push({
      type: 'API',
      field: 'VUE_APP_API',
      message: '地址存在多余斜杠：' + apiConfig,
      suggestion: '检查是否有多余的 // 符号'
    })
  }

  return errors
}

/**
 * @description 输出配置警告到控制台（仅开发模式）
 * @param {Array} errors - 错误列表
 */
export function logConfigErrors (errors) {
  if (!errors || errors.length === 0) return
  if (process.env.NODE_ENV === 'production') return // 生产环境不输出

  console.group('%c[配置警告] 检测到环境配置存在问题', 'color: #E6A23C; font-weight: bold;')
  errors.forEach((err, index) => {
    console.error(
      '%c[' + err.type + '错误 ' + (index + 1) + ']%c ' + err.message + '\n%c建议:%c ' + err.suggestion,
      'color: #F56C6C; font-weight: bold;',
      'color: #303133;',
      'color: #909399;',
      'color: #67C23A;'
    )
  })
  console.groupEnd()

  // 开发环境弹出警告
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    const message = errors.map(function (e) {
      return '[' + e.type + '] ' + e.message
    }).join('\n')
    console.warn('%c[DvAdmin配置警告]', 'background: #E6A23C; color: white;', message)
  }
}

/**
 * @description 初始化配置校验（在应用启动时调用）
 * @returns {boolean} 配置是否有效
 */
export function initConfigValidation () {
  const errors = validateConfig()
  logConfigErrors(errors)

  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('配置校验完成，发现', errors.length, '个问题')
  }

  return errors.length === 0
}

/**
 * @description 获取 API 地址配置描述（仅用于调试提示，不做实际拼接）
 * @returns {object} { raw: 原始值, type: relative|absolute|empty }
 */
export function getApiConfigInfo () {
  const apiConfig = getApiConfig()
  if (!apiConfig) {
    return { raw: '', type: 'empty' }
  }
  if (isRelativePath(apiConfig)) {
    return { raw: apiConfig, type: 'relative' }
  }
  if (isAbsolutePath(apiConfig)) {
    return { raw: apiConfig, type: 'absolute' }
  }
  return { raw: apiConfig, type: 'unknown' }
}

export default {
  normalizeApiUrl,
  buildWsUrl,
  validateConfig,
  logConfigErrors,
  initConfigValidation,
  getApiConfigInfo
}
