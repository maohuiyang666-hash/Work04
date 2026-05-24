import { request } from '@/api/service'
export default {
  namespaced: true,
  state: {
    unread: 0
  },
  getters: {
    unread (state) {
      return state.unread
    }
  },
  actions: {
    async setUnread ({ commit }, number) {
      if (number !== undefined && number !== null) {
        commit('set', number)
        return number
      }
      const res = await request({
        url: '/api/system/message_center/get_unread_msg/',
        method: 'get',
        params: {}
      })
      const { data } = res
      commit('set', data.count)
      return data.count
    }
  },
  mutations: {
    set (state, number) {
      state.unread = number
    }
  }
}
