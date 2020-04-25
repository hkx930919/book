# 1 webpack 基本配置

# 1 entry

entry 对象是用于 webpack 查找启动并构建 bundle。

## 1.1 entry 单入口

> entry 是一个字符串

```JS
module.exports = {
    entry:'./src/index.js'
}
```

## 1.2 entry 多入口

> entry 是一个对象

```JS
module.exports = {
    entry:{
        app:'./app.js',
        adminApp:'./admin/app.js'
    }
}
```

# 2 output

output 用来告诉 webpack 如何将编译后的文件输出到磁盘。

## 2.1 output 单入口

```JS
module.exports = {
    entry:'./src/index.js',
    output:{
        filename:'main.js',
        path:path.join(__dirname,'./dist')
    }
}
```

## 2.2 output 多入口

> entry 是一个对象

```JS
module.exports = {
    entry:{
        app:'./app.js',
        adminApp:'./admin/app.js'
    },
    output:{
        filename:'[name].js',
        path:path.join(__dirname,'./dist')
    }
}
```

# 文件指纹

## 2.3 hash chunkhash `contenthash`

- hash：和整个项⽬的构建相关，只要项⽬⽂件有修改，整个项⽬构建的 hash 值就会更改
- Chunkhash：和 webpack 打包的 `chunk` 有关，不同的 entry 会⽣成不同的 chunkhash 值,
- `contenthash`：根据⽂件内容来定义 hash ，⽂件内容不变，则 `contenthash` 不变

一般在入口的 `entry` 中使用 `chunkhash`，当别的入口文件修改时不会影响到其他的路口文件。针对 `css` 使用 `contenthash` 来保证修改 js 时不会影响到 css，提取 `js` 和 `css` 的 `chunk` 时也可以使用`contenthash`来保持缓存

```JS
// 入口 chunkhash
module.exports = {
  entry: {
    app: './src/index.js',
    search: './src/search.js'
  },
  output: {
    filename: '[name]_[chunkhash:8].js',
    chunkFilename: '[name]_[contenthash:8].js', //  `contenthash`，保持缓存
    path: path.join(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },

    ]
  },
}
```

```JS
module.exports = merge(webpackBaseConfig, {
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
    new MiniCssExtractPlugin({
      filename: '[name].[`contenthash`].css', // css `contenthash`，保持缓存
      chunkFilename: '[id].[`contenthash`].css'
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
  ]
})
```
