import util from '@/libs/util.js'
import { formatMenuIssueMessage } from '@/menu'

export default {
  methods: {
    handleMenuSelect (index) {
      const issue = this.$store.state.d2admin.menu.issuesByKey[index]
      if (issue) {
        this.$message.error({
          message: formatMenuIssueMessage(issue),
          duration: 7000,
          showClose: true
        })
      } else if (/^d2-menu-empty-\d+$/.test(index) || index === undefined) {
        this.$message.warning('临时菜单')
      } else if (/^https:\/\/|http:\/\//.test(index)) {
        util.open(index)
      } else {
        this.$router.push({
          path: index
        })
      }
    }
  }
}
