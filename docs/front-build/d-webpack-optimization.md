# 4 构建优化

## 4.1 speed-measure-webpack-plugin

分析每个 loader 和 plugin 的耗时
**util.js**

```js
/**
 * @func 使用peed-measure-webpack-plugin分析plugin和loader执行时间
 * @param {object} config webpack配置文件
 * @param {bool} isMeature 是否需要speed-measure-webpack-plugin包裹，默认为true
 */
const speedMeatureWebpack = (config, isMeature = true) => {
  const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
  const smp = new SpeedMeasurePlugin()
  if (isMeature) {
    return smp.wrap(config)
  }
  return config
}
```

**webpacl.dev.js**

```js
global.mode = 'start'
const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const webpackBaseConfig = require('./webpack.base')
const { speedMeatureWebpack } = require('./util')
module.exports = speedMeatureWebpack(
  merge(webpackBaseConfig, {
    mode: 'development',
    output: {
      filename: '[name].js',
      chunkFilename: '[id].js',
      publicPath: '/'
    },
    plugins: [new webpack.HotModuleReplacementPlugin()],
    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      compress: true,
      port: 9000
    }
  })
)
```

**bug** `speed-measure-webpack-plugin`和`html-webpack-externals-plugin`一起使用时，会导致`html-webpack-externals-plugin`加的 cdn 文件没有引入到 html 里去

## 4.2 webpack-bundle-analyzer

分析打包后包的体积，依赖的第三方文件，业务组件的代码

```js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
module.exports = {
  plugins: [new BundleAnalyzerPlugin()]
}
```

## 4.3 优化手段
