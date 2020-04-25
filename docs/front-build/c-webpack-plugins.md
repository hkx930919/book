# 3 plugins

插件⽤于 bundle ⽂件的优化，资源管理和环境变量注⼊，作⽤于整个构建过程

## 3.1 DefinePlugin

使用它来配置全局的常量，针对测试、预发、正式环境做不同的配置。

- 可以用它与`cross-env`配置，使用`cross-env`定义的全局变量存放在`process.env`中，在`node`环境中可以访问到。而`DefinePlugin`定义的常量在前端环境中可以访问

```JS
// package.json 使用cross-env定义环境变量
{
  "scripts": {
        "dev": "cross-env BUILD_ENV=dev  webpack-dev-server --config webpack.dev.js --open",
        "dev:pre": "cross-env BUILD_ENV=pre  webpack-dev-server --config webpack.dev.js --open",
        "dev:prod": "cross-env BUILD_ENV=prod  webpack-dev-server --config webpack.dev.js --open",
        "build": "cross-env BUILD_ENV=prod webpack --config webpack.prod.js"
    },
}

// webpack配置文件
// 配合`cross-env`获取环境变量，然后获得对应环境下的常量
const baseEnv = require(`./config/${process.env.BUILD_ENV}.env`)
module.exports = {
    plugins: [
        new webpack.DefinePlugin({
        'process.env': baseEnv,
        'process.env.BUILD_ENV': JSON.stringify(process.env.BUILD_ENV)
        })
    ]
}
```

## 3.2 CleanWebpackPlugin

> 每次构建前清楚 output 文件夹

```js
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
module.exports = {
  plugins: [new CleanWebpackPlugin()] // 默认清除outpu文件夹
}
```

## 3.3 MiniCssExtractPlugin

> 提取 css 文件

```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
module.exports = {
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
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[name].[contenthash].css'
    })
  ]
}
```

## 3.4 HtmlWebpackPlugin

> 可以根据 html 文件生成一个 HTML5 文件， 其中自动引入打包后的资源。

```js
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      filename: `pageName/index.html?[contenthash:8]`,
      template: path.join(__dirname, 'pageName', 'index.html'),
      chunks: [`pageName/index`],
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    })
  ] // 默认清除outpu文件夹
}
```

## 3.5 HtmlWebpackPlugin

> 可以根据 html 文件生成一个 HTML5 文件， 其中自动引入打包后的资源,还可以压缩 HTML 文件。

```js
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      filename: `pageName/index.html?[contenthash:8]`,
      template: path.join(__dirname, 'pageName', 'index.html'),
      chunks: [`pageName/index`],
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    })
  ] // 默认清除outpu文件夹
}
```

## 3.6 TerserWebpackPlugin

> 压缩 js 文件，可多进程并行压缩,去除代码中的打印。

```js
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
        cache:true，
         parallel: true,
         terserOptions:{
             compress: {
              warnings: false,
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log']
          },
         }
    })]
  }
}
```
