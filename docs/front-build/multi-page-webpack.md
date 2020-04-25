# 多页面打包配置

配置一个多页面打包，打包后的每个页面生成一个文件夹，里面有该页面的所有资源。

## 1 getEntryAndHtmlPluginWithMultiPage

- 多页面打包的核心在于多个 entry 入口，且生成对应`HtmlWebpackPlugin`，项目的目录要遵守一定的规范，一个页面在`src`目录下即是一个文件夹。

```JS
// 生成多个entry和多个HtmlWebpackPlugin
const path = require('path')
const fs = require('fs')
const PATH_SRC = path.join(__dirname, './src')
const BLACK_LIST = ['base', '__base']
const HtmlWebpackPlugin = require('html-webpack-plugin')
const getEntryAndHtmlPluginWithMultiPage = () => {
  const entry = {}
  const HtmlWebpackPlugins = []
  const files = fs.readdirSync(PATH_SRC)
  const dirs = files.filter(file => {
    return (
      fs.statSync(path.join(PATH_SRC, file)).isDirectory() &&
      !BLACK_LIST.includes(file)
    )
  })
  console.log(dirs)
  dirs.forEach(f => {
    entry[`${f}/index`] = path.join(PATH_SRC, f)
    HtmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        filename: `${f}/index.html?[contenthash:8]`, // 此时生成的html文件都在对应的页面目录下
        template: path.join(PATH_SRC, f, 'index.html'),
        chunks: [`${f}/index`],
        inject: true,
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        }
      })
    )
  })
  const data = {
    entry,
    HtmlWebpackPlugins
  }
  return data
}
module.exports = getEntryAndHtmlPluginWithMultiPage
```

> 上面生成多个`entry`和`HtmlWebpackPlugin`方法的重点在于，`HtmlWebpackPlugin.filename`配置，生成的 html 会在对应的目录下,生成的 entry 的 key 是`pagename/index`

## 2 webpack.base.js

**webpack.base.js**

```JS
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const getEntryAndHtmlPluginWithMultiPage = require('./getEntryAndHtmlPluginWithMultiPage')

const { entry, HtmlWebpackPlugins } = getEntryAndHtmlPluginWithMultiPage()
module.exports = {
  entry,
  output: {
    filename: '[name].js?[contenthash]',

    path: path.join(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10240
            }
          }
        ]
      }
    ]
  },
  plugins: [...HtmlWebpackPlugins, new CleanWebpackPlugin()]
}

```

## 3 webpack.dev.js

**webpack.dev.js**

```JS
const path = require('path')
const webpack = require('webpack')
const webpackBaseConfig = require('./webpack.base')
const merge = require('webpack-merge')
module.exports = merge(webpackBaseConfig, {
  mode: 'development',
  output: {
    filename: '[name].js',
    chunkFilename: '[id].js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto: true
              }
            }
          },
          'less-loader'
        ]
      }
    ]
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  }
})

```

> 在`wabpack.dev`中修改`output.filename、output.chunkFilename.publicPath`

## 4 webpack.prod.js

**webpack.prod.js**

```JS
const webpackBaseConfig = require('./webpack.base')
const merge = require('webpack-merge')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const webpack = require('webpack')
const cssnano = require('cssnano')
module.exports = merge(webpackBaseConfig, {
  output: {
    publicPath: '../',
    chunkFilename: `[name].js?[contenthash]`
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto: true
              }
            }
          },
          'less-loader'
        ]
      }
    ]
  },
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
    })
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
})


```

> 在`wabpack.pro`中修改`output.publicPath`为`../`，不然访问页面其他的`chunk`资源会 404
