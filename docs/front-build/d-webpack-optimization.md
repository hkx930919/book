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

- 1 使用更高版本的`node webpack`.更高版本的本身就可以提高很大的性能。
- 2 `thread-loader`多进程构建

  ```js
  // 对于比较耗时的loader可以使用thread-loader，一般是css-loader、babel-loader、eslint-loader
  module.exports = {
    module: {
      rules: [
        {
          test: /\.(j|t)sx?$/,
          include: [appPath],
          exclude: /node_modules/,
          use: isStartMode()
            ? [
                'thread-loader',
                ('react-hot-loader/webpack',
                {
                  loader: 'babel-loader',
                  options: { cacheDirectory: true }
                })
              ]
            : [
                'thread-loader',
                {
                  loader: 'babel-loader',
                  options: { cacheDirectory: true }
                }
              ]
        },
        {
          test: /\.(js|jsx|ts|tsx)$/,
          loaders: [
            'thread-loader',
            {
              loader: 'eslint-loader',
              options: {
                cache: true
              }
            }
          ],
          enforce: 'pre',
          include: [resolve('src')]
        }
      ]
    }
  }
  ```

- 3 `terser-webpack-plugin`开启多进程压缩，修改`parallel`参数
- 4 设置 Externals，使用`html-webpack-externals-plugin`分离基础包到 cdn

- 5 使用`DllPlugin DllReferencePlugin`提前打包好一些库，

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

- 6 开启缓存，对`babel-loader eslint-loader terser-webpack-plugin`开启缓存，对于不支持缓存的 loader 或 plugin，使用`cache-loader` 或者 `hard-source-webpack-plugin`
- 7 `purgecss-webpack-plugin`删除无用的 css
  > **慎用**：对于`css modules`无效，且会把 css 文件删除，设置`whitelistPatterns`也没多大意义

```js
const webpackBaseConfig = require('./webpack.base')
const merge = require('webpack-merge')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const webpack = require('webpack')
const cssnano = require('cssnano')
const { speedMeatureWebpack } = require('./util')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const PurgecssPlugin = require('purgecss-webpack-plugin')
const glob = require('glob')
const path = require('path')

const PATH_SRC = path.join(__dirname, '../src')
module.exports = speedMeatureWebpack(
  merge(webpackBaseConfig, {
    output: {
      publicPath: '../',
      chunkFilename: `[name].js?[contenthash]`
    },
    mode: 'production',
    plugins: [
      new webpack.HashedModuleIdsPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css',
        chunkFilename: '[name].[contenthash].css'
      }),
      new OptimizeCssAssetsPlugin({
        assetNameRegExp: /\.css$/g,
        cssProcessor: cssnano,
        cssProcessorOptions: {
          discardComments: { removeAll: true },
          // 避免 cssnano 重新计算 z-index
          safe: true,
          autoprefixer: false
        }
      }),
      new PurgecssPlugin({
        paths: glob.sync(`${PATH_SRC}/**/*`, { nodir: true })
      }),
      new BundleAnalyzerPlugin()
    ],
    optimization: {
      namedChunks: true,
      splitChunks: {
        cacheGroups: {
          common: {
            chunks: 'all',
            minChunks: 2,
            minSize: 0
          }
        }
      }
    }
  }),
  false
)
```

- 8 动态`Polyfill`
  > 每次打开页面，浏览器都会向 Polyfill Service 发送请求，Polyfill Service 识别 User Agent，下发不同的 Polyfill，做到按需加载 Polyfill 的效果
  - [polyfill.io](https://polyfill.io/v3/) 官方提供的服务
  ```html
  <script src="https://polyfill.io/v3/polyfill.min.js"></script>
  ```
  - 基于官方自建 polyfill 服务
  ```
  //huayang.qq.com/polyfill_service/v2/polyfill.min.js?unknown=polyfill&features=Promise,Map,Set
  ```
- 9 压缩图片
  > 配置 `image-webpack-loader`,一般比较少用，因为图片都放到 CDN 上去了，不会直接引用图片
  ```js
  module.exports = {
    module: {
      rules: [
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
            {
              loader: 'file-loader'
            },
            {
              loader: 'image-webpack-loader',
              options: {
                mozjpeg: {
                  progressive: true,
                  quality: 65
                },
                // optipng.enabled: false will disable optipng
                optipng: {
                  enabled: false
                },
                pngquant: {
                  quality: [0.65, 0.9],
                  speed: 4
                },
                gifsicle: {
                  interlaced: false
                },
                // the webp option will enable WEBP
                webp: {
                  quality: 75
                }
              }
            }
          ]
        }
      ]
    }
  }
  ```
- 10 `tree-shaking`
- 11 减少文件搜索范围和缩小构建目标

```js
module.exports = {
  reolve: {
    modules: [path.resolve(__dirname, 'node_modules')] //
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.join(__dirname, '../src/'), // 尽可能少的构建模块，只解析src目录
        loaders: ['babel-loader']
      }
    ]
  }
}
```
