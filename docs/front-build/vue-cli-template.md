# vue-cli 自定义文件模板

`vue-cli`默认生成的文件模板不一定满足公司里业务开发的需求，所以很多时候需要自定义文件模板。

这里借助`vue-cli`的[插件开发指南](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html)，新建一套新的模板。

1.  新建文件夹`vue-preset`，包含`generator.js||generator/index.js`，`prompts.js`，`preset.json`
    - `preset.json`预设好的配置信息
    - `prompts`配置提供问题的选项，后续传递到`generator`的`options`参数中
    - `generator.js` 在这里生成模板文件
2.  实现一个自定义模板

    - `preset.json`;可以先用`vue-cli`先生成一套简单的，然后进入`~/.vuerc`文件查看该`preset`

    ```json with comment
    {
      "useConfigFiles": true,
      "plugins": {
        "@vue/cli-plugin-babel": {},

        // "@vue/cli-plugin-router": {
        //   "historyMode": false
        // },
        // "@vue/cli-plugin-vuex": {},
        "@vue/cli-plugin-eslint": {
          "config": "airbnb",
          "lintOn": ["save"]
        }
      },
      "cssPreprocessor": "less"
    }
    ```

    > 在`preset.json`中注释掉对`vue-router vuex`的引用，加了这两个后在`main.js`中会引用 <code>import store from
    > "./store"; import router from "./router</code>，导致和我们模板里的引用冲突。

    - `prompts.js`；设置一系列的问题和选项，最终选择的值会传递到`generator`的`options`参数中

    ```js
    module.exports = [
      {
        name: "application",
        type: "list",
        message: "Choose whether your app is a PC or a mobile(default:mobile)",
        choices: [
          {
            name: "PC",
            value: "pc"
          },
          {
            name: "mobile",
            value: "mobile"
          }
        ],
        default: "mobile"
      }
    ];
    ```

    - `generator.js`；导出一个函数，这个函数接收三个参数，
      - 一个 `GeneratorAPI` 实例：自定义模版必然用到 `GeneratorAPI` 的 `render()` 方法
      - `options`:用户对 prompts.js 中问题所提供的答案
      - 整个 `preset(presets.json) ` 将会作为第三个参数传入。

    ```js
    module.exports = (api, options, rootOptions) => {
      console.log("!!options", options);
      console.log("!!rootOptions", rootOptions);
      // 复制package.json的内容
      api.extendPackage({
        scripts: {
          serve: "vue-cli-service serve",
          build: "vue-cli-service build --report",
          lint: "vue-cli-service lint",
          prettier: "prettier --write src/**/*.{js,vue}"
        },
        // 命令
        scripts: {
          serve: "vue-cli-service serve",
          build: "vue-cli-service build",
          lint: "vue-cli-service lint"
        },
        dependencies: {
          "core-js": "^3.6.4",
          axios: "^0.19.2",
          "element-ui": "^2.13.2",
          lodash: "^4.17.20",
          moment: "^2.25.3",
          vue: "^2.6.10",
          "vue-router": "^3.1.3",
          vuex: "^3.1.2"
        },
        devDependencies: {
          "@babel/plugin-proposal-decorators": "^7.12.1",
          "@babel/plugin-proposal-nullish-coalescing-operator": "^7.10.4",
          "@babel/plugin-proposal-optional-chaining": "^7.11.0",
          "@vue/cli-plugin-babel": "^4.5.4",
          "@vue/cli-plugin-eslint": "~4.4.0",
          "@vue/cli-service": "^4.1.0",
          "@vue/eslint-config-prettier": "^6.0.0",
          "babel-eslint": "^10.1.0",
          "babel-plugin-component": "^1.1.1",
          // eslint: "7.2.0",
          "eslint-config-airbnb-base": "14.2.0",
          "eslint-plugin-import": "2.21.2",
          "eslint-plugin-prettier": "^3.1.3",
          "eslint-plugin-vue": "^6.2.2",
          fibers: ">= 3.1.0",
          prettier: "^1.19.1",
          // "less-loader": "^7.0.2",
          less: "^3.12.2",
          "terser-webpack-plugin": "^3.0.2",
          "vue-template-compiler": "^2.6.10",
          "webpack-bundle-analyzer": "^3.6.1"
        }
      });
      // 删除 vue-cli3 默认目录
      api.render(files => {
        Object.keys(files)
          .filter(path => path.startsWith("src/") || path.startsWith("public/"))
          .forEach(path => delete files[path]);
      });

      // 复制 template 模版
      api.render("./template");
    };
    ```

    - `template`文件夹，这就是自定义模板的内容。`template`自定义模板内容里的以`.`开头的文件要转换成`_`开头，例
      如`.eslintrc.js=>_eslintrc.js .gitignore=>_gitignore .prettierrc.json=>_prettierrc.json`。然后删除 `template` 的
      `package.json` 文件

- 最后可以在本地环境用这个自定义模板测试，`vue create --preset ./vue-preset project-name`。
- 测试完成后，可以把这个文件夹传到 `github`，这样可以远程使用该自定义模板
  。`vue create --preset github-name/github-project your-project-name`
