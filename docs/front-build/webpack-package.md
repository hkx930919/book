# webpack 通用配置做成 npm 包

## 1 mocha

使用`mocha chai`来写包的测试用例

- 安装`mocha chai`,并在`package.json`定义测试用例的 script

```JSON
{
"scripts": {
    "test:unit": "mocha test/unit/*.js", // mocha指定文件的参数可以使用通配符
    "test:smoke": "node ./test/smoke",
    "lint": "eslint src",
    "dev": "cross-env BUILD_ENV=dev  webpack-dev-server --config scripts/webpack.dev.js --open",
    "dev:pre": "cross-env BUILD_ENV=pre  webpack-dev-server --config scripts/webpack.dev.js --open",
    "dev:prod": "cross-env BUILD_ENV=prod  webpack-dev-server --config scripts/webpack.dev.js --open",
    "build": "cross-env BUILD_ENV=prod  webpack --config scripts/webpack.prod.js",
    "build:dev": "cross-env BUILD_ENV=dev  webpack --config webpack.prod.js",
    "build:pre": "cross-env BUILD_ENV=pre  webpack --config webpack.prod.js",
  },
}
```

- `mocha`默认运行 test 子目录里面的测试脚本。所以，一般都会把测试脚本放在 test 目录里面，然后执行 mocha 就不需要参数了

- `mocha`默认只执行 test 子目录下面第一层的测试用例，不会执行更下层的用例。为了改变这种行为，就必须加上`--recursive`参数，这时 test 子目录下面所有的测试用例不管在哪一层都会执行。

```
$ mocha --recursive
```

- `--reporter, -R`参数用来指定测试报告的格式，默认是`spec`。使用`mochawesome`模块，可以生成漂亮的 HTML 格式的报告。安装 mochawesome`yarn add mochawesome -D`
- 配置文件。`mocha` 允许在 test 目录下面，放置配置文件 mocha.opts，把命令行参数写在里面

```shell
--reporter mochawesome
--recursive
--growl
```

- 测试脚本中，使用`only`方法，describe 块和 it 块都允许调用 only 方法，表示只运行某个测试套件或测试用例。

```js
const { expect } = require('chai')
describe('#only', function() {
  it.only('1 加 1 应该等于 2', function() {
    expect(1 + 1).to.be.equal(2)
  })
})
```

## 2 chai

使用`chai`做断言库，并且指定`expect`断言风格。`expect`风格的常用方法

```js
const { expect } = require('chai')
describe('#chai', function() {
  it('不包含4', function() {
    expect([1, 2, 3]).to.not.include(4)
  })
  /**
   * 将.equal, .include, .members, .keys 和 .property放在.deep链式之后将导致使用深度相等的方式来代替严格相等(===)
   */
  it('has deep {a:1}', function() {
    // expect(new Set([{ a: 1 }])).to.have.deep.keys([{ a: 1 }])
    // expect(new Set([{ a: 1 }])).to.have.keys([{ a: 1 }])
    // expect([{ a: 1 }]).to.include({ a: 1 })
    expect([{ a: 1 }]).to.deep.include({ a: 1 })
  })

  /**
   * 在其后使用的.property 和 .include断言中可以使用.和括号表示法。
   * .nested不可与.own断言连用
   */
  it('nested', function() {
    expect({
      a: { b: ['x', 'y'] }
    }).to.have.nested.property('a.b[1]')
  })

  /**
   * 使得其后的.property 和 .include断言中的继承属性被忽略。
   * .nested不可与.own断言连用
   */
  it('own', function() {
    Object.prototype.b = 2
    // expect({
    //   a: 1
    // }).to.have.own.property('b')
    expect({
      a: 1
    }).to.have.property('b')
  })
  /**
   * 使得其后的.members断言需求以相同（译注：不加ordered时member断言值断言成员存在性而忽视顺序）的顺序断言其成员
   */
  it('ordered', function() {
    // expect([1, 2]).to.have.ordered.members([2, 1])
    expect([1, 2]).to.have.members([2, 1])
  })
  /**
   * 使得跟在其后的.key断言仅需求目标包含至少一个所给定的键名，它与需求目标满足所有所给键的.all断言是相反的。
   */
  it('any', function() {
    expect({ c: 1, d: 2 }).to.have.any.keys('d', 'e')
  })
  /**
   * 使得跟在其后的.key断言仅需求目标需要包含所有所给的键名，它与仅需求目标包含至少一个所给定的键名.any断言是相反
   */
  it('all', function() {
    // expect({ c: 1, d: 2 }).to.have.all.keys('d')
    expect({ c: 1, d: 2 }).to.have.all.keys('d', 'c')
  })
  /**
   * 断言目标的length或size与给定值相同，接受参数msg在断言错误时给出提示。
   */
  it('lengthOf', function() {
    // expect([1, 2, 3], 'nooo why fail??').to.have.lengthOf(3)
    expect('12').to.have.lengthOf(2, 'nooo why fail??')
  })
  /**
    断言目标字符串包含所给子串，支持message在出错时给出用户信息。
   *
   */
  it('string', function() {
    expect('12').string('2')
  })
})
```

## 3 封装通用配置

- 将之前通用配置里涉及到`__dirname`改成`process.cwd()`

## 4 测试用例

- 写用例之前，需要修改`process.cwd()`,将上下文切换到测试用例的文件夹
  **index.js**

```js
// 冒烟测试，检测打包后是否生成html，js，ss
const webpack = require('webpack')
const path = require('path')
const Mocha = require('mocha')
const rimraf = require('rimraf')

const mocha = new Mocha({
  timeout: '10000ms'
})
process.chdir(path.join(__dirname, 'template')) // 切换上下文

rimraf(path.join(__dirname, './template/dist'), () => {
  const webpackConfig = require('../../lib/webpack.prod')
  webpack(webpackConfig, (err, stats) => {
    console.log('err', err)
    if (err) {
      console.error(err)
      process.exit(2)
    }
    console.log(
      stats.toString({
        colors: true,
        modules: false,
        children: false
      })
    )
    console.log('Webpack build success, begin run test.')
    mocha.addFile(path.join(__dirname, 'html.test.js'))
    mocha.addFile(path.join(__dirname, 'css-js.test.js'))
    mocha.run()
  })
})
```

**html.test**

```js
const glob = require('glob')
const path = require('path')
describe('生成html文件', () => {
  it('html', done => {
    const files = glob.sync('dist/*/*.html')
    console.log('--files', files)

    if (files.length) {
      done()
    } else {
      throw new Error('没有html')
    }
  })
})
```

**css-js.test**

```js
const glob = require('glob')
describe('生成js|css文件', () => {
  it('js', done => {
    const files = glob.sync('dist/*/*.js')
    console.log('files', files)

    if (files.length) {
      done()
    } else {
      throw new Error('没有js')
    }
  })
  it('css', done => {
    const files = glob.sync('dist/*/*.css')
    console.log('files', files)
    if (files.length) {
      done()
    } else {
      throw new Error('没有css')
    }
  })
})
```

**webpack.entry.test.js**

```js
// 测试入口文件
const { expect } = require('chai')
const path = require('path')

process.chdir(path.join(__dirname, '../smoke/template'))
describe('entry', () => {
  it('has search page', () => {
    const webpackConfig = require('../../lib/webpack.prod')
    expect(webpackConfig.entry).to.property('search/index')
  })
})
```

## 5 lint git 提交规范

使用`husky commitlint lint-staged eslint`规范`commit`日志，并在每次`commit`前做 eslint 校验

### 1 规范`commit`日志

安装`husky @commitlint/cli @commitlint/config-conventional`，项目根目录配置`commitlint.config.js`，配置`package.json`

**commitlint.config.js**配置`commit-msg`规范

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'chore', // 新增依赖
        'docs', // 文档
        'feat', // 新特性
        'fix', // bug修复
        'perf', // 性能优化
        'refactor', // 功能重构
        'revert', // 代码回滚
        'style', // 样式
        'test' // 测试
      ]
    ]
  }
}
```

**package.json**配置`husky`里的`commit-msg`钩子

```JSON
{
"husky": {
  "hooks": {
    "commit-msg": "commitlint -e $HUSKY_GIT_PARAMS"
    }
  }
}

```

### 2 git`commit`前校验

安装`husky lint-staged eslint`，配置`package.json`

**commitlint.config.js**配置`commit-msg`规范

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'chore', // 新增依赖
        'docs', // 文档
        'feat', // 新特性
        'fix', // bug修复
        'perf', // 性能优化
        'refactor', // 功能重构
        'revert', // 代码回滚
        'style', // 样式
        'test' // 测试
      ]
    ]
  }
}
```

**package.json**配置`husky`里的`commit-msg`钩子

```JSON
{
"husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E $HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "src/**/*.js": [
      "eslint --fix",
      "git add"
    ]
  }
}


```
