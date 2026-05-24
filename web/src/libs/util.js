import cookies from './util.cookies'
import db from './util.db'
import log from './util.log'
import dayjs from 'dayjs'
import filterParams from './util.params'
import {
  buildBaseURL,
  buildWsBaseURL,
  buildFileURL,
  buildUploadURL,
  validateOnStartup
} from './util.config'
const util = {
  cookies,
  db,
  log,
  filterParams
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
 * @description 校验是否为租户模式并构建 API 基地址
 *   租户模式下将域名替换为当前浏览器域名 + 端口
 *   统一由 util.config.js 的 buildBaseURL 实现，消除重复拼接差异
 */
util.baseURL = function () {
  return buildBaseURL()
}

/**
 * @description 构建文件上传基地址
 *   oss/cos 云存储模式返回空字符串，否则沿用 API 基地址
 */
util.baseFileURL = function () {
  return buildFileURL()
}
/**
 * @description 构建 WebSocket 基地址
 *   自动处理 http→ws / https→wss 协议转换
 *   租户模式下先做域名替换再转换协议
 *   统一由 util.config.js 的 buildWsBaseURL 实现
 */
util.wsBaseURL = function () {
  return buildWsBaseURL()
}
/**
 * @description 构建文件上传完整地址（基地址 + 文件上传接口路径）
 * @param {string} [uploadPath='api/system/file/'] 文件上传接口路径
 */
util.uploadURL = function (uploadPath) {
  return buildUploadURL(uploadPath)
}
/**
 * @description 启动时环境变量校验，仅在开发环境生效
 */
util.validateOnStartup = function () {
  return validateOnStartup()
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
