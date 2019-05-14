module.exports = {
  // 页面标题
  title: '日常所得',
  // 网页描述
  description: '一个前端的个人站点',
  head: [
    // 页面icon
    ['link', { rel: 'icon', href: '/icon.png' }]
  ],
  markdown: {
    // 代码块行号
    lineNumbers: true
  },
  themeConfig: {
    // 最后更新时间
    lastUpdated: '最后更新时间',
    // 所有页面自动生成侧边栏
    sidebar: 'auto',
    // 仓库地址
    repo: 'https://github.com/hkx930919/book',
    // 仓库链接label
    repoLabel: 'Github',
    // 编辑链接
    editLinks: true,
    // 编辑链接label
    editLinkText: '编辑此页',
    // 导航
    nav: [
      { text: 'webpack', link: '/webpack/' },
      { text: 'nodejs', link: '/node/' },
      { text: 'react-native', link: '/react-native/' }
    ]
  },
  configureWebpack: {
    resolve: {
      // 静态资源的别名
      alias: {
        '@vue': '../images/vue'
      }
    }
  }
}
