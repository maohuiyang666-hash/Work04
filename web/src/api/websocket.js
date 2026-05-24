import ElementUI from 'element-ui'
import util from '@/libs/util'
import store from '@/store'
function initWebSocket (e) {
  const token = util.cookies.get('token')
  if (token) {
    const wsBaseURL = util.wsBaseURL()
    const wsUri = wsBaseURL ? wsBaseURL + 'ws/' + token + '/' : ''
    if (!wsUri) {
      if (process.env.NODE_ENV === 'development') {
        const runtimeConfig = util.inspectRuntimeConfig()
        ElementUI.Notification({
          title: '',
          message: `WebSocket地址无效，请检查配置。当前地址：${runtimeConfig.wsBaseURL || '(空)'}`,
          type: 'error',
          position: 'bottom-right',
          duration: 3000
        })
      }
      return
    }
    this.socket = new WebSocket(wsUri)
    this.socket.wsUri = wsUri
    this.socket.onerror = webSocketOnError
    this.socket.onmessage = webSocketOnMessage
    this.socket.onclose = closeWebsocket
  }
}

function webSocketOnError (e) {
  const runtimeConfig = util.inspectRuntimeConfig()
  const detail = process.env.NODE_ENV === 'development' ? `，请检查 WebSocket 地址：${runtimeConfig.wsBaseURL || '(空)'}` : ''
  ElementUI.Notification({
    title: '',
    message: 'WebSocket连接发生错误' + detail,
    type: 'error',
    position: 'bottom-right',
    duration: 3000
  })
}

/**
 * 接收消息
 * @param e
 * @returns {any}
 */
function webSocketOnMessage (e) {
  const data = JSON.parse(e.data)
  const { refreshUnread, systemConfig } = data
  if (refreshUnread) {
    // 更新消息通知条数
    store.dispatch('d2admin/messagecenter/setUnread')
  }
  if (systemConfig) {
    // 更新系统配置
    this.$store.dispatch('d2admin/settings/load')
  }
  if (data.contentType === 'SYSTEM') {
    ElementUI.Notification({
      title: '系统消息',
      message: data.content,
      type: 'success',
      position: 'bottom-right',
      duration: 3000
    })
  } else if (data.contentType === 'ERROR') {
    ElementUI.Notification({
      title: '',
      message: data.content,
      type: 'error',
      position: 'bottom-right',
      duration: 0
    })
  } else if (data.contentType === 'INFO') {
    ElementUI.Notification({
      title: '温馨提示',
      message: data.content,
      type: 'success',
      position: 'bottom-right',
      duration: 0
    })
  } else {
    ElementUI.Notification({
      title: '温馨提示',
      message: data.content,
      type: 'info',
      position: 'bottom-right',
      duration: 3000
    })
  }
}
// 关闭websiocket
function closeWebsocket () {
  console.log('连接已关闭...')
  ElementUI.Notification({
    title: 'websocket',
    message: '连接已关闭...',
    type: 'danger',
    position: 'bottom-right',
    duration: 3000
  })
}

/**
 * 发送消息
 * @param message
 */
function webSocketSend (message) {
  this.socket.send(JSON.stringify(message))
}
export default {
  initWebSocket, closeWebsocket, webSocketSend
}
