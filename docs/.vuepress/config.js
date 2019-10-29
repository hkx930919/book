const fs = require('fs-extra')
const path = require('path')
const getSideBar = () => {
  const sideBar = {}
  const DOCS_PATH = path.join(__dirname, '../../docs/')
  const BLACK_LIST = ['.vuepress']
  const dirs = fs
    .readdirSync(DOCS_PATH)
    .filter(v => !BLACK_LIST.includes(v))
    .filter(p => {
      const dirPath = path.join(DOCS_PATH, p)
      return fs.statSync(dirPath).isDirectory()
    })
  console.log('---dirs', dirs)
  dirs.forEach(d => {
    const dirPath = path.join(DOCS_PATH, d)
    const files = fs
      .readdirSync(dirPath)
      .filter(v => {
        const isMd = v.toLowerCase().includes('md')
        const filePath = path.join(dirPath, v)
        return fs.statSync(filePath).isFile() && isMd
      })
      .map(file => {
        const { name } = path.parse(path.join(dirPath, file))
        return name.toUpperCase() === 'README' ? '' : name
      })

    sideBar[`/${d}/`] = files
  })
  return sideBar
}

let config = {
  // 页面标题
  base: '/book/',

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
    sidebar: {
      '/linux/': ['', 'ssh'],
      '/front-docs/': ['', 'vue', 'webpack', 'cli'],
      '/': ['node', 'linux']
    },
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
      //   { text: 'react-native', link: '/react-native/' },
      { text: '踩坑记录', link: '/project-book/' },
      { text: 'linux', link: '/linux/' }
    ]
  },
  configureWebpack: {
    resolve: {
      // 静态资源的别名
      alias: {
        '@linux': './public/linux',
        '@node': './public/node'
      }
    }
  }
}
config.sidebar = getSideBar()
module.exports = config
