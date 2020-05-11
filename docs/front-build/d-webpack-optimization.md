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

- 使用`DllPlugin DllReferencePlugin`提前打包好一些库，

  - 第一步创建好`webpack.dll`
    **webpack.config.dll**

    ```js
    const webpack = require('webpack')
    const path = require('path')

    module.exports = {
      context: process.cwd(),
      mode: 'production',
      entry: {
        library: ['react', 'react-dom', 'mobx', 'mobx-react']
      },
      output: {
        filename: '[name].dll.js',
        path: path.join(__dirname, '../dll/library'),
        library: '[name]'
      },
      plugins: [
        new webpack.DllPlugin({
          name: '[name]',
          path: path.join(__dirname, '../dll/library/[name].json')
        })
      ]
    }
    ```

  - 在`webpack.config.base`引入对应的 dll.json，如果使用了`moment`且没有国际化的需求，可以减小`moment`的体积。
    **webpack.config.base**

    ```js
    const webpack = require('webpack')
    const path = require('path')
    const CopyPlugin = require('copy-webpack-plugin')
    const dllJsonPath = require('../dll/library/library')
    module.exports = {
      plugins: [
        // copy打包好的dll文件
        new CopyPlugin([
          {
            from: join(__dirname, '../dll'),
            to: outputPath
          }
        ]),
        new webpack.DllReferencePlugin({
          manifest: dllJsonPath
        }),
        new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /zh-cn/)
      ]
    }
    ```

  - 配置`package.josn`和`index.html`

  ```JSON
  {
    "scripts": {
      "clean:dll": "rimraf dll",
      "dll": "npm run clean:dll && webpack --colors --config webpack/webpack.config.dll.js"
    },
  }

  ```

  ```html
  <body>
    <div id="root" class="react-root"></div>
    <!-- dll文件引入 -->
    <script src="./library/library.dll.js"></script>
  </body>
  ```
