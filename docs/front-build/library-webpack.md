# 打包库和组件

- 打包压缩版和非压缩版
- 支持 AMD/CJS/ESM 模块引入

**webpack 配置**

```js
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  entry: {
    'large-number': './src/index.js', // 非压缩版本
    'large-number.min': './src/index.js' // 压缩版本
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: 'largeNumber', // 指定库的全局变量
    libraryTarget: 'umd' // 打包成umd，支持AMD/CJS/ESM
  },
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader']
      }
    ]
  },
  optimization: {
    minimize: true, // 开启压缩
    minimizer: [
      new TerserPlugin({
        include: /\.min\.js$/ // 对.min.js文件进行压缩
      })
    ]
  },
  plugins: [new CleanWebpackPlugin()]
}
```

**package.json**

```json
{
  "name": "addNumber",
  "version": "1.0.0",
  "description": "",
  "main": "index.js", // 指定main字段
  "scripts": {
    "build": "webpack",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "jin_gang ",
  "license": "ISC",
  "dependencies": {
    "clean-webpack-plugin": "^3.0.0",
    "webpack": "^4.42.1",
    "webpack-cli": "^3.3.11"
  },
  "devDependencies": {
    "@babel/core": "^7.9.0",
    "@babel/preset-env": "^7.9.0",
    "babel-loader": "^8.1.0",
    "terser-webpack-plugin": "^2.3.5"
  }
}
```

**index.js**

```js
// 不同环境导出不同的文件
if (process.env.NODE_ENV === 'development') {
  module.exports = require('./dist/large-number.js')
} else {
  module.exports = require('./dist/large-number-min')
}
```
