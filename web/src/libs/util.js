import cookies from './util.cookies'
import db from './util.db'
import log from './util.log'
import dayjs from 'dayjs'
import filterParams from './util.params'
import { Notification } from 'element-ui'

const util = {
  cookies,
  db,
  log,
  filterParams
}

/**
 * @description 检查开发环境变量
 */
util.checkEnv = function () {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  const api = process.env.VUE_APP_API
  let errorMsg = ''
  if (!api) {
    errorMsg = 'VUE_APP_API 未配置或为空，请检查 .env 文件。'
  } else if (!api.startsWith('http://') && !api.startsWith('https://') && !api.startsWith('/')) {
    errorMsg = `VUE_APP_API (${api}) 格式不规范，建议以 http/https 或 / 开头。`
  }

  if (errorMsg) {
    console.error(`[工程化配置检查] ${errorMsg}`)
    setTimeout(() => {
      Notification({
        title: '前端配置异常',
        message: errorMsg,
        type: 'error',
        duration: 0
      })
    }, 2000)
  }
}

/**
 * @description 统一构建基础URL
 * @param {String} type - 'api' | 'ws'
 */
util.buildBaseUrl = function (type = 'api') {
  let baseURL = process.env.VUE_APP_API || ''
  if (!baseURL) {
    return '/'
  }

  const isTenantMode = window.pluginsAll && window.pluginsAll.indexOf('dvadmin-tenants-web') !== -1
  let param = baseURL.split('/')[3] || ''

  if (isTenantMode && (!param || baseURL.startsWith('/'))) {
    // 租户模式：把域名替换成当前域名+端口
    const host = baseURL.split('/')[2]
    if (host) {
      const prot = baseURL.split(':')[2] || 80
      let newHost = document.domain
      if (prot != 80 && prot != 443) {
        newHost += ':' + prot
      }
      baseURL = baseURL.split('/')[0] + '//' + baseURL.split('/')[1] + newHost + '/' + param
    } else {
      baseURL = location.protocol + '//' + location.hostname + (location.port ? ':' : '') + location.port + baseURL
    }
  }

  // WS协议处理
  if (type === 'ws') {
    if (baseURL.startsWith('/')) {
      baseURL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + (location.port ? ':' : '') + location.port + baseURL
    } else if (baseURL.startsWith('http')) {
      baseURL = baseURL.replace(/^http(s)?:\/\//, 'ws$1://')
    }
  }

  if (!baseURL.endsWith('/')) {
    baseURL += '/'
  }
  return baseURL
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
/**
 * @description 校验是否为租户模式。租户模式把域名替换成 域名 加端口
 */
util.baseURL = function () {
  return util.buildBaseUrl('api')
}

util.baseFileURL = function () {
  if (process.env.VUE_APP_FILE_ENGINE && (process.env.VUE_APP_FILE_ENGINE === 'oss' || process.env.VUE_APP_FILE_ENGINE === 'cos')) {
    return ''
  }
  return util.baseURL()
}

util.wsBaseURL = function () {
  return util.buildBaseUrl('ws')
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
    // 如果子元素里面存在children就直接递归，不存在就生成一个children
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
// 格式化字节大小
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
