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

## 1.1 output 单入口

```JS
module.exports = {
    entry:'./src/index.js',
    output:{
        filename:'main.js',
        path:path.join(__dirname,'./dist')
    }
}
```

## 1.2 output 多入口

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

# 3 loaders

webpack 可以使用 loader 来预处理文件，使用 loader 可以打包除 js 之外的任何文件。loader 本身是一个函数，接受源文件作为参数，返回转换的结果。

## 3.1 babel-loader

可以用来解析 ES6 语法，bable 的配置文件是`.bablerc`，先安装`bable-loader @bable/preset-env`

```JS
const path = require('path')
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      }
    ]
  }
}

```

.babelrc 文件配置

```JSON
{
    "presets":[
        "@babel/preset-env"
    ]
}
```

## 3.1.2 babel-loader 解析 JSX

先安装`@babel/preset-react`
.babelrc 文件配置

```JSON
{
    "presets":[
        "@babel/preset-env",
        "@babel/preset-react",
    ]
}
```

## 3.2 解析 css

先安装`style-loader css-loader`

```JS
const path = require('path')
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}

```

- 开启 css module

```JS
  {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
              }
            }
          }
        ]
  }
```

- 让`*.moudle.css`开启模块化

```JS
  {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto:true
              }
            }
          }
        ]
  }
```

## 3.3 less-loader

安装`less less-loader`

```JS
module.exports = {
  entry: './src//index.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
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
  }
}
```

- 开启 css module 与`css`开启 module 一致，配置`css-loader`即可

## 3.4 file-loader 和 url-loader

安装`file-loader url-loader`

> 二者都可以用来解析图片、字体等文件资源

```JS
module.exports = {
  entry: './src//index.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
      //   {
      //     test: /\.(png|jpg|gif|svg)$/,
      //     use: 'file-loader'
      //   },
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
      },
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
  }
}

```

- `url-loader` 功能类似于 `file-loader`，但是在文件大小（单位 byte）低于指定的限制时，可以返回一个 DataURL,而不需要生成对应文件，可以减少 http 请求数。

## 3.5 解析 ts 文件

- 可以使用`ts-loader`来解析`ts tsx`文件
- 也可以使用`babel-loader ForkTsCheckerWebpackPlugin @bable/preset-typescript`来解析

个人喜欢用第二种方式，`babel ts`完美结合的方式，对于旧项目来说，改造 ts 成本太高，当 js 和 ts 共存时，第二种方式解析速度更快，由 babel 做主要解析。

```JS
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
module.exports = {
  module: {
    rules: [
            {
            test: /\.(j|t)sx?$/,
            exclude: /node_modules/,
            use:[
                    {
                        loader: 'babel-loader',
                        options: { cacheDirectory: true }
                    }
                ]
            }
    ]
  },
  plugins:[
    new ForkTsCheckerWebpackPlugin(),
  ]
}

```

.babelrc 文件配置

```JSON
{
  "presets": [
      ["@babel/env",{ "targets": { "browsers": "last 2 versions" } } ],
      "@babel/preset-typescript",
      "@babel/react"
    ],
  "plugins": [
    // Stage 2
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    "@babel/plugin-proposal-function-sent",
    "@babel/plugin-proposal-export-namespace-from",
    "@babel/plugin-proposal-numeric-separator",
    "@babel/plugin-proposal-throw-expressions",

    // Stage 3
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-syntax-import-meta",
    ["@babel/plugin-proposal-class-properties", { "loose": false }],
    "@babel/plugin-proposal-json-strings",
    "react-hot-loader/babel",
]
```
