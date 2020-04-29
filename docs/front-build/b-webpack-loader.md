# 2 loaders

webpack 可以使用 loader 来预处理文件，使用 loader 可以打包除 js 之外的任何文件。loader 本身是一个函数，接受源文件作为参数，返回转换的结果。

## 2.1 babel-loader

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

## 2.1.2 babel-loader 解析 JSX

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

## 2.2 解析 css

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

## 2.2 less-loader

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

## 2.4 file-loader 和 url-loader

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

## 2.5 解析 ts 文件

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

    // Stage 2
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-syntax-import-meta",
    ["@babel/plugin-proposal-class-properties", { "loose": false }],
    "@babel/plugin-proposal-json-strings",
    "react-hot-loader/babel",
]
```

## 2.6 postcss-loader 补齐 css3 前缀

- 安装`postcss-loader autoprefixer`

```JS
/**
 * @func 辅助css生成，开发环境补齐style-loader,生产环境补齐MiniCssExtractPlugin.loader
 * @return loaders
 */
const generateCssLoader = function({ include, exclude, loaders, test }) {
  loaders = Array.isArray(loaders) ? loaders : [loaders]
  test = test || /\.css$/
  return {
    test,
    include,
    exclude,
    use: isStartMode
      ? ['style-loader', ...loaders]
      : [
          {
            loader: MiniCssExtractPlugin.loader
          },
          ...loaders
        ]
  }
}

module.exports = {
    module:{
        generateCssLoader({
        include: path.join(__dirname, './src/'),
        test: /\.less$/,
        loaders: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto: true
              }
            }
          },
          'less-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [require('autoprefixer')]
            }
          }
        ]
      }),
    }
}

// package.json
{
     "browserslist": [
        "defaults",
        "not ie < 11",
        "last 2 versions",
        "> 1%",
        "iOS 7",
        "last 3 iOS versions"
    ]
}

```

**注意在`package.json`添加`browserslist`字段**

## 2.7 px2rem

> 移动端 px 自动转换成 px

借助`lib-flexible`来动态写入`html`的`font-size`

- 使用`px2rem-loader`

```js
module.exports = {
  module: {
    rules: [
      generateCssLoader({
        include: path.join(__dirname, './src/'),
        test: /\.css$/,
        loaders: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto: true
              }
            }
          },
          {
            loader: 'px2rem-loader',
            options: {
              remUnit: 37.5
            }
          }
        ]
      })
    ]
  }
}
```

**注意**，对于个别需要转换的样式可以在 css 后面增加/\*no\*/注释来避免转换

- 使用`postcss-loader postcss-pxtorem`实现

```js
module.exports = {
  module: {
    rules: [
      generateCssLoader({
        include: path.join(__dirname, './src/'),
        test: /\.css$/,
        loaders: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
                auto: true
              }
            }
          },
          'postcss-loader'
        ]
      })
    ]
  }
}

// postcss.config.js
module.exports = {
  plugins: {
    autoprefixer: {
      browsers: ['Android >= 4.0', 'iOS >= 7']
    },
    'postcss-pxtorem': {
      rootValue: 37.5,
      propList: ['*'],
      selectorBlackList: []
    }
  }
}
```

**注意**对于一些不需要转换的样式可以配置`selectorBlackList`选项进行过滤
