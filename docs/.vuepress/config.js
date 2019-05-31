let config = {
  // 页面标题
  base: '/book-view/',

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
    // sidebar: 'auto',
    sidebar: [
      {
        title: '前端',
        path: '/front-docs/',
        collapsable: false,
        children: ['vue', 'webpack']
      }
    ],
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
      { text: '前端', link: '/front-docs/' },
      { text: 'nodejs', link: '/node/' },
      { text: 'react-native', link: '/react-native/' },
      { text: '踩坑记录', link: '/project-book/' }
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
const hasSidebar = config.themeConfig && config.themeConfig.sidebar
if (hasSidebar) {
  const sidebar = config.themeConfig.sidebar.map(value => {
    if (value.hasOwnProperty('children') && value.hasOwnProperty('path')) {
      return {
        ...value,
        children: value.children.map(child => `${value.path}${child}`)
      }
    }
    return value
  })
  config.themeConfig.sidebar = sidebar
}
module.exports = config
