import ElementUI from 'element-ui'
import util from '@/libs/util'
import store from '@/store'

function initWebSocket () {
  const token = util.cookies.get('token')
  if (token) {
    const wsUri = util.wsBaseURL() + 'ws/' + token + '/'
    this.socket = new WebSocket(wsUri)
    this.socket.onerror = webSocketOnError
    this.socket.onmessage = webSocketOnMessage
    this.socket.onclose = closeWebsocket
  }
}

function webSocketOnError (e) {
  ElementUI.Notification({
    title: '',
    message: 'WebSocket连接发生错误' + JSON.stringify(e),
    type: 'error',
    position: 'bottom-right',
    duration: 3000
  })
}

function getRefreshUnread (data) {
  return data.refreshUnread !== undefined ? data.refreshUnread : data.refresh_unread
}

function showNotification (data) {
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

function webSocketOnMessage (e) {
  const data = JSON.parse(e.data)
  const refreshUnread = getRefreshUnread(data)
  if (refreshUnread) {
    store.dispatch('d2admin/messagecenter/setUnread')
  }
  if (data.systemConfig) {
    store.dispatch('d2admin/settings/load')
  }
  if (data.skipNotify || data.silent || !data.content) {
    return
  }
  showNotification(data)
}

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

function webSocketSend (message) {
  this.socket.send(JSON.stringify(message))
}

export default {
  initWebSocket,
  closeWebsocket,
  webSocketSend
}
