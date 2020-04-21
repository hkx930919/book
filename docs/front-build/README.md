# webpack

> webpack 是一个现代 JavaScript 应用程序的静态模块打包器(module bundler)。当 webpack 处理应用程序时，它会递归地构建一个依赖关系图(dependency graph)，其中包含应用程序需要的每个模块，然后将所有这些模块打包成一个或多个 bundle。

> 它可以转换 ES6 语法，转换 JSX，CSS 前缀补齐，JS 压缩，图片压缩等等

## 1 entry

entry 对象是用于 webpack 查找启动并构建 bundle。

### 1.1 单入口

> entry 是一个字符串

```JS
module.exports = {
    entry:'./src/index.js'
}
```

### 1.2 多入口

> entry 是一个对象

```JS
module.exports = {
    entry:{
        app:'./app.js',
        adminApp:'./admin/app.js'
    }
}
```

## 2 output

output 用来告诉 webpack 如何将编译后的文件输出到磁盘。

### 1.1 单入口

```JS
module.exports = {
    entry:'./src/index.js',
    output:{
        filename:'main.js',
        path:path.join(__dirname,'./dist')
    }
}
```

### 1.2 多入口

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

## 3 loaders

webpack 可以使用 loader 来预处理文件，使用 loader 可以打包除 js 之外的任何文件。loader 本身是一个函数，接受源文件作为参数，返回转换的结果。

### 3.1 babel-loader

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

### 3.1.2 babel-loader 解析 JSX

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

### 3.2 解析 css

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
