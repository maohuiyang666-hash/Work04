/*
 * @创建文件时间: 2021-06-01 22:41:21
 * @Auther: 猿小天
 * @最后修改人: 猿小天
 * @最后修改时间: 2021-08-13 00:06:07
 * 联系Qq:1638245306
 * @文件介绍: 登录和登出
 */
import { Message, MessageBox } from 'element-ui'
import util from '@/libs/util.js'
import router from '@/router'
import store from '@/store/index'
import { SYS_USER_LOGIN, SYS_USER_LOGOUT } from '@/views/system/login/api'
import { request } from '@/api/service'

export default {
  namespaced: true,
  actions: {
    async login ({ dispatch }, {
      username = '',
      password = '',
      captcha = '',
      captchaKey = ''
    } = {}) {
      let res = await SYS_USER_LOGIN({
        username,
        password,
        captcha,
        captchaKey
      })
      res = res.data
      util.cookies.set('uuid', res.userId)
      util.cookies.set('token', res.access)
      util.cookies.set('refresh', res.refresh)
      const userInfoRes = await request({
        url: '/api/system/user/user_info/',
        method: 'get',
        params: {}
      })
      await store.dispatch('d2admin/user/set', userInfoRes.data, { root: true })
      await dispatch('load')
    },
    logout ({ commit, dispatch }, { confirm = false, refresh = true } = {}) {
      async function logout () {
        await SYS_USER_LOGOUT({ refresh: util.cookies.get('refresh') }).then(() => {
          util.cookies.remove('token')
          util.cookies.remove('uuid')
          util.cookies.remove('refresh')
        })
        await dispatch('d2admin/user/set', {}, { root: true })
        store.commit('d2admin/menu/asideSet', [])
        store.commit('d2admin/menu/issuesSet', {
          list: [],
          byKey: {},
          byOriginalPath: {}
        })
        store.commit('d2admin/search/init', [])
        sessionStorage.removeItem('menuData')
        sessionStorage.removeItem('menuIssues')
        store.dispatch('d2admin/db/databaseClear')
        router.push({ name: 'login' })
        if (refresh) {
          router.go(0)
        }
      }
      if (confirm) {
        commit('d2admin/gray/set', true, { root: true })
        MessageBox.confirm('确定要注销当前用户吗', '注销用户', { type: 'warning' })
          .then(() => {
            commit('d2admin/gray/set', false, { root: true })
            logout()
          })
          .catch(() => {
            commit('d2admin/gray/set', false, { root: true })
            Message({ message: '取消注销操作' })
          })
      } else {
        logout()
      }
    },
    async load ({ dispatch }) {
      await dispatch('d2admin/user/load', null, { root: true })
      await dispatch('d2admin/theme/load', null, { root: true })
      await dispatch('d2admin/transition/load', null, { root: true })
      await dispatch('d2admin/page/openedLoad', null, { root: true })
      await dispatch('d2admin/menu/asideLoad', null, { root: true })
      await dispatch('d2admin/size/load', null, { root: true })
      await dispatch('d2admin/color/load', null, { root: true })
    }
  }
}
