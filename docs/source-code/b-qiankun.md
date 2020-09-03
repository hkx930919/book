# qiankun

> qiankun 是一个基于 single-spa 的微前端实现库，旨在帮助大家能更简单、无痛的构建一个生产可用微前端架构系统。<br> >
> [qiankun 官方文档](https://qiankun.umijs.org/zh/api#startopts)

## 流程

1. **start**流程

- `doPrefetchStrategy`预加载子应用，`import-html-entry`的`importEntry`请求子应用`index.html`的`script style link`标签，
  请求完毕后的`js`和`css`会被缓存，下次进入该子应用时，不会在请求入口文件的`js`和`css`
- 调用`single-spa`的`start`方法
- 将`frameworkStartedDefer`start promise resolved

2. **registerMicroApps**流程

- 对`unregisteredApps`做一次防重复处理
- 对未注册的 apps 调用`single-spa`的`registerApplication`方法，

  - 调用`loadApp`获取到配置，并将配置 return 出去

    - `importEntry`获取`template execScripts assetPublicPath`
    - 单应用模式下等待上一个应用卸载完成
    - 开启`scoped-css`，创建`render`函数，第一次加载设置应用可见区域 dom 结构，调用`render`函数
    - 根据传入的不同参数创建沙箱，并返回一个配置对象

      - 根据不同条件创建三种不一样的沙箱，IE11 不支持`proxy`时强制改成单应用模式，并创造快照沙箱

      - `patchAtBootstrapping`，Bootstrapping 过程调用`patchDynamicAppend`拦截`element`创建，删除，插入

        - 多应用模式下拦截`Document.prototype.createElement`方法，给新建的`element`增加`attachDocProxySymbol`属性，值为
          该应用的`proxy`（沙箱环境的 window）

        - 拦截`appendChild insertBefore`，对黑名单里的标签进行拦截`style link script`

          - `link style`标签，判断是否开启`scopedCSS`，开启后插入属性前缀，并将该元素推入`dynamicStyleSheetElements`列表
            中，再次进入该应用下可以快速`rebuild`

          - `script`标签

            - 含有`src`属性，调用`import-html-entry`的`execScripts`方法，将`src`对应的代码`fetch`下来，并用沙箱当做全局
              环境执行一遍，最后将一行`qiankun`注释插入到 `document` 中，之前的标签不会再注入到`document`中。对应的代码
              执行成功后，调用该`script`标签的`onload`或者`onerror`方法，或者`dispatchEvent` `load error `事件

            - `script`是文本代码，也是使用`execScripts`方法在沙箱的全局环境执行代码，并将注释插入到`document`，原有
              的`element`不会插入到文档中，`execScripts`最后执行该`script`元素的`load`或`error`事件

        - 拦截 `removeChild`，被删除的元素属于黑名单里的元素标签，且该元素有`attachElementContainerSymbol`属性，将获取
          的`storedContainerInfo`的`container`元素删除掉该`element`。上诉条件都不满足的话，调用原生的删除方法

      - 返回`proxy`，沙箱的全局环境

      - 返回`mount`函数
        - 激活沙箱
        - 获取`sideEffectsRebuildersAtBootstrapping sideEffectsRebuildersAtMounting`rebuilders
        - 如果是再次唤醒该子应用，调用`sideEffectsRebuildersAtBootstrapping`，重建`RebuildersAtBootstrapping`
        - `mounting`时劫持各类的全局监听，包
          含`window.setInterval window.clearInterval window.addEventListener window.removeEventListener window.g_history.listen Document.prototype.createElement appendChild insertBefore removeChild`
        - 重建`sideEffectsRebuildersAtMounting`
        - 清除`sideEffectsRebuilders`
      - 返回`unmount`函数
        - 收集`sideEffectsRebuilders`，`sideEffectsRebuilders`的值为`bootstrappingFreers mountingFreers`列表函数的返回值
          列表
        - 卸载沙箱

    - 合并`lifeCycles`和`getAddOns`方法返回的生命周期函数

      - `lifeCycles`是注册微应用时传递的参数，包含`beforeLoad beforeMount afterMount beforeUnmount afterUnmount`
      - `getAddOns`方法包含`__POWERED_BY_QIANKUN__`和`__INJECTED_PUBLIC_PATH_BY_QIANKUN__`的注入和
        - `beforeLoad beforeMount`函数中将`__POWERED_BY_QIANKUN__`设为`true`，`beforeUnmount`删
          除`__POWERED_BY_QIANKUN__`变量
        - `beforeLoad beforeMount`函数中将`__INJECTED_PUBLIC_PATH_BY_QIANKUN__`设为`qiankun`获取
          的`publicPath`，`beforeUnmount`删除`__INJECTED_PUBLIC_PATH_BY_QIANKUN__`或者
          将`__INJECTED_PUBLIC_PATH_BY_QIANKUN__`还原成之前的微应用

    - 串联执行`beforeLoad`生命周期钩子函数，传递参数`app`和沙箱的全局环境`proxy`
    - 调用`importEntry`返回的`execScripts`函数，获取子应用导出的生命周期钩子函数
    - 获取`qiankun`的数据通信函数`onGlobalStateChange, setGlobalState, offGlobalStateChange`

      - `qiankun`的`GlobalState`是主应用和子应用共享的，每次`setGlobalState`触发时是主应用和子应用所有的监听函
        数`onGlobalStateChange`都触发

    - 返回`parcelConfig`配置 -`name`，根据`appname`+时间戳+随机数生成的子应用唯一标识

      - `bootstrap`，子应用导出的`bootstrap`方法

      - `mount`生命周期钩子列表

        - 开发环境中开启性能检测
        - 单应用模式下，等待上一个应用卸载完成
        - 调用`render`函数，保证每次应用加载前容器 dom 结构已经设置完毕，`loading`为`true`
        - 调用创建沙箱时返回的`mount`配置，即`mountSandbox`
        - 串联执行`beforeMount`生命周期钩子函数，传递参数`app`和沙箱的全局环境`proxy`
        - 调用子应用返回的`mount`钩子，传递参数`container setGlobalState onGlobalStateChange`和`single-spa`的参数
        - 应用 mount 完成后结束 loading，再一次调用`render`函数，`loading`为`false`
        - 串联执行`afterMount`生命周期钩子函数，传递参数`app`和沙箱的全局环境`proxy`
        - 单应用模式给`prevAppUnmountedDeferred`赋值一个`promise`，卸载完成时让该`promise` `resolved`
        - 性能检测结束

      - `unmount`生命周期钩子列表
        - 串联执行`beforeUnmount`生命周期钩子函数，传递参数`app`和沙箱的全局环境`proxy`
        - 调用子应用返回的`unmount`钩子，传递参数`container`和`single-spa`的参数
        - 串联执行`afterUnmount`生命周期钩子函数，传递参数`app`和沙箱的全局环境`proxy`
        - 调用`render`函数，将视图渲染为`null`，卸载对`GlobalState`的监听，将`element`清除
        - 单应用模式下，将`prevAppUnmountedDeferred`这个` promise``resolved `掉

    - 如果子应用返回了`update`函数钩子，将`update`赋值给`parcelConfig`的`update`属性

## 1.0 start

```ts
export function start(opts: FrameworkConfiguration = {}) {
  frameworkConfiguration = {prefetch: true, singular: true, sandbox: true, ...opts};
  const {prefetch, sandbox, singular, urlRerouteOnly, ...importEntryOpts} = frameworkConfiguration;
  //  预加载子应用
  if (prefetch) {
    doPrefetchStrategy(microApps, prefetch, importEntryOpts);
  }

  if (sandbox) {
    if (!window.Proxy) {
      console.warn("[qiankun] Miss window.Proxy, proxySandbox will degenerate into snapshotSandbox");
      // 快照沙箱不支持非 singular 模式
      if (!singular) {
        console.error("[qiankun] singular is forced to be true when sandbox enable but proxySandbox unavailable");
        frameworkConfiguration.singular = true;
      }
    }
  }

  startSingleSpa({urlRerouteOnly});
  // startPromise resolve
  frameworkStartedDefer.resolve();
}
```

进入`src\apis.ts`文件，查看`start`方法，`start`方法做了三件事：

1. 给参数添加默认值
   - `prefetch`默认为 true，即默认预加载所有的子应用
   - `singular`默认为 true，默认单实例场景，单实例指的是同一时间只会渲染一个微应用
   - `sandbox`默认为 true，默认开启沙箱，即隔离子应用的全局变量
2. 预加载子应用
   - 调用`doPrefetchStrategy`方法，根据`prefetch`参数实现不同的预加载模式
3. 调用`single-spa`的`start`方法

## 1.1 doPrefetchStrategy 预加载子应用

```ts
export function doPrefetchStrategy(
  apps: AppMetadata[],
  prefetchStrategy: PrefetchStrategy,
  importEntryOpts?: ImportEntryOpts
) {
  const appsName2Apps = (names: string[]): AppMetadata[] => apps.filter(app => names.includes(app.name));

  if (Array.isArray(prefetchStrategy)) {
    prefetchAfterFirstMounted(appsName2Apps(prefetchStrategy as string[]), importEntryOpts);
  } else if (isFunction(prefetchStrategy)) {
    (async () => {
      // critical rendering apps would be prefetch as earlier as possible
      const {criticalAppNames = [], minorAppsName = []} = await prefetchStrategy(apps);
      prefetchImmediately(appsName2Apps(criticalAppNames), importEntryOpts);
      prefetchAfterFirstMounted(appsName2Apps(minorAppsName), importEntryOpts);
    })();
  } else {
    switch (prefetchStrategy) {
      case true:
        prefetchAfterFirstMounted(apps, importEntryOpts);
        break;

      case "all":
        prefetchImmediately(apps, importEntryOpts);
        break;

      default:
        break;
    }
  }
}
```

不管是`prefetchAfterFirstMounted`还是`prefetchImmediately`,调用的都是`prefetch`方法.

```ts
/**
 * prefetch assets, do nothing while in mobile network
 * @param entry
 * @param opts
 */
function prefetch(entry: Entry, opts?: ImportEntryOpts): void {
  if (!navigator.onLine || isSlowNetwork) {
    // Don't prefetch if in a slow network or offline
    return;
  }

  requestIdleCallback(async () => {
    // 主要是根据entry获取到html页面内容,使用fetch获取js和css
    const {getExternalScripts, getExternalStyleSheets} = await importEntry(entry, opts);
    requestIdleCallback(getExternalStyleSheets);
    requestIdleCallback(getExternalScripts);
  });
}
```

`prefetch`在浏览器闲暇时间调用`import-html-entry`库的`importEntry`方法.`requestIdleCallback`优先使
用`window.requestIdleCallback`,随后用`setTimeout`方法兜底.

> 涉及到`import-html-entry`库的方法等后续分析

```ts
// RIC and shim for browsers setTimeout() without it
const requestIdleCallback =
  window.requestIdleCallback ||
  function requestIdleCallback(cb: CallableFunction) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };
```

## 2.0 registerMicroApps 注册子应用

```ts
let microApps: RegistrableApp[] = []; // 子应用列表
const frameworkStartedDefer = new Deferred<void>(); // 返回一个promise类实例
export function registerMicroApps<T extends object = {}>(
  apps: Array<RegistrableApp<T>>,
  lifeCycles?: FrameworkLifeCycles<T> // 全局的生命钩子参数,为所有的子应用都加上这个生命周期
) {
  // Each app only needs to be registered once
  const unregisteredApps = apps.filter(app => !microApps.some(registeredApp => registeredApp.name === app.name));
  // 没有注册过的子应用列表+之前的子应用列表
  microApps = [...microApps, ...unregisteredApps];

  unregisteredApps.forEach(app => {
    const {name, activeRule, loader = noop, props, ...appConfig} = app;
    // 执行single-spa的registerApplication方法
    registerApplication({
      name,
      app: async () => {
        loader(true);
        // 等待start方法执行完毕
        await frameworkStartedDefer.promise;
        const {mount, ...otherMicroAppConfigs} = await loadApp(
          {name, props, ...appConfig},
          // start 方法传递的所有参数
          frameworkConfiguration,
          // 生命周期钩子
          lifeCycles
        );

        return {
          mount: [async () => loader(true), ...toArray(mount), async () => loader(false)],
          ...otherMicroAppConfigs
        };
      },
      activeWhen: activeRule,
      customProps: props
    });
  });
}
```

`registerMicroApps`收集`microApps`子应用列表,对为注册的子应用调用`registerApplication`进行注册,在`app`钩子里创建沙箱环境

## 2.1 loadApp 加载子应用

`loadApp`方法代码比较多,分批进行阅读,剔除掉一些性能检测的代码

1. 调用`importEntry`获取子应用首页

```ts
const {template, execScripts, assetPublicPath} = await importEntry(entry, importEntryOpts);
```

2. 如果是单应用模式,等待上一个应用完全卸载,默认是单应用

```ts
if (await validateSingularMode(singular, app)) {
  await(prevAppUnmountedDeferred && prevAppUnmountedDeferred.promise);
}

async function validateSingularMode<T extends object>(
  validate: FrameworkConfiguration["singular"],
  app: LoadableApp<T>
): Promise<boolean> {
  return typeof validate === "function" ? validate(app) : !!validate;
}
```

3. 创建一个 element

```ts
// 是否开启严格的样式隔离模式
const strictStyleIsolation = typeof sandbox === "object" && !!sandbox.strictStyleIsolation;
// 实验性的方式来支持样式隔离,动态改写一个特殊的选择器约束来限制 css 的生效范围
const enableScopedCSS = isEnableScopedCSS(configuration);
// 根据entry返回的template,获取一个tplWrap,用div包了一层,div的id为appInstanceId
const appContent = getDefaultTplWrapper(appInstanceId, appName)(template);
// 创建元素
let element: HTMLElement | null = createElement(appContent, strictStyleIsolation);
// 创建特殊的选择器约束css
if (element && isEnableScopedCSS(configuration)) {
  const styleNodes = element.querySelectorAll("style") || [];
  styleNodes.forEach(stylesheetElement => {
    css.process(element!, stylesheetElement, appName);
  });
}
```

4. 如果开启了样式隔离模式,那么使用`ele.attachShadow||ele.createShadowRoot`方法创建`shadow dom`进行样式隔离

```ts
const supportShadowDOM = document.head.attachShadow || document.head.createShadowRoot;
function createElement(appContent: string, strictStyleIsolation: boolean): HTMLElement {
  const containerElement = document.createElement("div");
  containerElement.innerHTML = appContent;
  // appContent always wrapped with a singular div
  const appElement = containerElement.firstChild as HTMLElement;
  if (strictStyleIsolation) {
    if (!supportShadowDOM) {
      console.warn(
        "[qiankun]: As current browser not support shadow dom, your strictStyleIsolation configuration will be ignored!"
      );
    } else {
      const {innerHTML} = appElement;
      appElement.innerHTML = "";
      let shadow: ShadowRoot;

      if (appElement.attachShadow) {
        shadow = appElement.attachShadow({mode: "open"});
      } else {
        // createShadowRoot was proposed in initial spec, which has then been deprecated
        shadow = (appElement as any).createShadowRoot();
      }
      shadow.innerHTML = innerHTML;
    }
  }

  return appElement;
}
```

5. 获取`render`函数,并调用`render`函数

```ts
const container = "container" in app ? app.container : undefined;
const legacyRender = "render" in app ? app.render : undefined;

const render = getRender(appName, appContent, container, legacyRender);
render({element, loading: true}, "loading");
// 获取element的函数
const containerGetter = getAppWrapperGetter(
  appName,
  appInstanceId,
  !!legacyRender,
  strictStyleIsolation,
  enableScopedCSS,
  () => element
);
```

```ts
/**
 * Get the render function
 * If the legacy render function is provide, used as it, otherwise we will insert the app element to target container by qiankun
 * @param appName
 * @param appContent
 * @param container
 * @param legacyRender
 */
function getRender(
  appName: string,
  appContent: string,
  container?: string | HTMLElement,
  legacyRender?: HTMLContentRender
) {
  const render: ElementRender = ({element, loading}, phase) => {
    if (legacyRender) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[qiankun] Custom rendering function is deprecated, you can use the container element setting instead!"
        );
      }

      return legacyRender({loading, appContent: element ? appContent : ""});
    }

    const containerElement = typeof container === "string" ? document.querySelector(container) : container;

    // The container might have be removed after micro app unmounted.
    // Such as the micro app unmount lifecycle called by a react componentWillUnmount lifecycle, after micro app unmounted, the react component might also be removed
    if (phase !== "unmounted") {
      const errorMsg = (() => {
        switch (phase) {
          case "loading":
          case "mounting":
            return `[qiankun] Target container with ${container} not existed while ${appName} ${phase}!`;

          case "mounted":
            return `[qiankun] Target container with ${container} not existed after ${appName} ${phase}!`;

          default:
            return `[qiankun] Target container with ${container} not existed while ${appName} rendering!`;
        }
      })();
      assertElementExist(containerElement, errorMsg);
    }

    if (containerElement && !containerElement.contains(element)) {
      // clear the container
      while (containerElement!.firstChild) {
        rawRemoveChild.call(containerElement, containerElement!.firstChild);
      }

      // append the element to container if it exist
      if (element) {
        rawAppendChild.call(containerElement, element);
      }
    }

    return undefined;
  };

  return render;
}
```

`render`方法是将`element`插入到`container`中,如果`container`含有子元素,会将子元素先清空,然后添加`element`为子元素,即给页
面展示内容

```ts
/** generate app wrapper dom getter */
function getAppWrapperGetter(
  appName: string,
  appInstanceId: string,
  useLegacyRender: boolean,
  strictStyleIsolation: boolean,
  enableScopedCSS: boolean,
  elementGetter: () => HTMLElement | null
) {
  return () => {
    if (useLegacyRender) {
      if (strictStyleIsolation) throw new Error("[qiankun]: strictStyleIsolation can not be used with legacy render!");
      if (enableScopedCSS) throw new Error("[qiankun]: experimentalStyleIsolation can not be used with legacy render!");

      const appWrapper = document.getElementById(getWrapperId(appInstanceId));
      assertElementExist(
        appWrapper,
        `[qiankun] Wrapper element for ${appName} with instance ${appInstanceId} is not existed!`
      );
      return appWrapper!;
    }

    const element = elementGetter();
    assertElementExist(
      element,
      `[qiankun] Wrapper element for ${appName} with instance ${appInstanceId} is not existed!`
    );

    if (enableScopedCSS) {
      const attr = element!.getAttribute(css.QiankunCSSRewriteAttr);
      if (!attr) {
        element!.setAttribute(css.QiankunCSSRewriteAttr, appName);
      }
    }

    if (strictStyleIsolation) {
      return element!.shadowRoot!;
    }

    return element!;
  };
}
```

`getAppWrapperGetter`获取嵌套`<div id='qiankunid'>${tpl}</div>`的元素,如果是样式严格分离的,获取的是`element.shadowRoot`

6. `createSandbox` 沙箱环境实现

```ts
if (sandbox) {
  let global = window;
  let mountSandbox = () => Promise.resolve();
  let unmountSandbox = () => Promise.resolve();
  const sandboxInstance = createSandbox(
    appName,
    containerGetter,
    Boolean(singular),
    enableScopedCSS,
    excludeAssetFilter
  );
  // 用沙箱的代理对象作为接下来使用的全局对象
  global = sandboxInstance.proxy as typeof window;
  mountSandbox = sandboxInstance.mount;
  unmountSandbox = sandboxInstance.unmount;
}
```

根据不同的条件,实现不同的沙箱

```ts
let sandbox: SandBox;
if (window.Proxy) {
  sandbox = singular ? new LegacySandbox(appName) : new ProxySandbox(appName);
} else {
  sandbox = new SnapshotSandbox(appName);
}
// some side effect could be be invoked while bootstrapping, such as dynamic stylesheet injection with style-loader, especially during the development phase
// 开发环境下bootstrapping过程中，对创建元素，新增元素，删除元素进行拦截
const bootstrappingFreers = patchAtBootstrapping(
  appName,
  elementGetter,
  sandbox,
  singular,
  scopedCSS,
  excludeAssetFilter
);
// mounting freers are one-off and should be re-init at every mounting time
// mounting过程中拦截的全局属性的还原函数列表
let mountingFreers: Freer[] = [];
// 再次加载子应用时，在重新mounting过程中重新拦截
let sideEffectsRebuilders: Rebuilder[] = [];
return {
  proxy: sandbox.proxy,

  /**
   * 沙箱被 mount
   * 可能是从 bootstrap 状态进入的 mount
   * 也可能是从 unmount 之后再次唤醒进入 mount
   */
  async mount() {
    /* ------------------------------------------ 因为有上下文依赖（window），以下代码执行顺序不能变 ------------------------------------------ */

    /* ------------------------------------------ 1. 启动/恢复 沙箱------------------------------------------ */
    sandbox.active();
    // 再次进入mount的判断
    const sideEffectsRebuildersAtBootstrapping = sideEffectsRebuilders.slice(0, bootstrappingFreers.length);
    const sideEffectsRebuildersAtMounting = sideEffectsRebuilders.slice(bootstrappingFreers.length);

    // must rebuild the side effects which added at bootstrapping firstly to recovery to nature state
    if (sideEffectsRebuildersAtBootstrapping.length) {
      sideEffectsRebuildersAtBootstrapping.forEach(rebuild => rebuild());
    }

    /* ------------------------------------------ 2. 开启全局变量补丁 ------------------------------------------*/
    // render 沙箱启动时开始劫持各类全局监听，尽量不要在应用初始化阶段有 事件监听/定时器 等副作用
    mountingFreers = patchAtMounting(appName, elementGetter, sandbox, singular, scopedCSS, excludeAssetFilter);

    /* ------------------------------------------ 3. 重置一些初始化时的副作用 ------------------------------------------*/
    // 存在 rebuilder 则表明有些副作用需要重建
    if (sideEffectsRebuildersAtMounting.length) {
      sideEffectsRebuildersAtMounting.forEach(rebuild => rebuild());
    }

    // clean up rebuilders
    sideEffectsRebuilders = [];
  },

  /**
   * 恢复 global 状态，使其能回到应用加载之前的状态
   */
  async unmount() {
    // record the rebuilders of window side effects (event listeners or timers)
    // note that the frees of mounting phase are one-off as it will be re-init at next mounting
    sideEffectsRebuilders = [...bootstrappingFreers, ...mountingFreers].map(free => free());

    sandbox.inactive();
  }
};
```

- `LegacySandbox` 单实例模式沙箱实现

```ts
/**
 * 基于 Proxy 实现的沙箱
 */
export default class SingularProxySandbox implements SandBox {
  /** 沙箱期间新增的全局变量 */
  private addedPropsMapInSandbox = new Map<PropertyKey, any>();
  /** 沙箱期间更新的全局变量 */
  private modifiedPropsOriginalValueMapInSandbox = new Map<PropertyKey, any>();
  /** 持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做 snapshot */
  private currentUpdatedPropsValueMap = new Map<PropertyKey, any>();
  name: string;
  proxy: WindowProxy;
  type: SandBoxType;
  sandboxRunning = true;
  active() {
    if (!this.sandboxRunning) {
      // 激活沙箱,将之前记录过的全局变量全部恢复
      this.currentUpdatedPropsValueMap.forEach((v, p) => setWindowProp(p, v));
    }
    this.sandboxRunning = true;
  }
  inactive() {
    // 还原成之前的全局变量
    this.modifiedPropsOriginalValueMapInSandbox.forEach((v, p) => setWindowProp(p, v));
    // 该应用运行时新增的全局变量进行还原
    this.addedPropsMapInSandbox.forEach((_, p) => setWindowProp(p, undefined, true));
    this.sandboxRunning = false;
  }
  constructor(name: string) {
    this.name = name;
    this.type = SandBoxType.LegacyProxy;
    const {addedPropsMapInSandbox, modifiedPropsOriginalValueMapInSandbox, currentUpdatedPropsValueMap} = this;
    const self = this;
    const rawWindow = window;
    const fakeWindow = Object.create(null) as Window;
    const proxy = new Proxy(fakeWindow, {
      set(_: Window, p: PropertyKey, value: any): boolean {
        if (self.sandboxRunning) {
          if (!rawWindow.hasOwnProperty(p)) {
            // 新增的全局变量
            addedPropsMapInSandbox.set(p, value);
          } else if (!modifiedPropsOriginalValueMapInSandbox.has(p)) {
            // 如果当前 window 对象存在该属性，且 record map 中未记录过，则记录该属性初始值
            const originalValue = (rawWindow as any)[p];
            modifiedPropsOriginalValueMapInSandbox.set(p, originalValue);
          }
          currentUpdatedPropsValueMap.set(p, value);
          // 必须重新设置 window 对象保证下次 get 时能拿到已更新的数据
          // eslint-disable-next-line no-param-reassign
          (rawWindow as any)[p] = value;
          return true;
        }
        // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
        return true;
      },
      get(_: Window, p: PropertyKey): any {
        if (p === "top" || p === "parent" || p === "window" || p === "self") {
          return proxy;
        }
        const value = (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },
      has(_: Window, p: string | number | symbol): boolean {
        return p in rawWindow;
      }
    });
    this.proxy = proxy;
  }
}
```

- `LegacySandbox`沙箱主要是拦截全局变量的`set`.

  - 使用`addedPropsMapInSandbox`记录运行过程中新增的全局变量,卸载时将这些变量还原.
  - 使用`modifiedPropsOriginalValueMapInSandbox`记录最早之前的全局变量,卸载时还原这些全局变量
  - 使用`currentUpdatedPropsValueMap`记录运行过程时修改的全局变量,再次激活时将这些全局变量挂载到`window`中去

- `ProxySandbox`实现
  > 目前是多例子应用运行时使用该中方式实现,后续稳定后单利模式也用该方式实现沙箱

```ts
export default class ProxySandbox implements SandBox {
  /** window 值变更记录 */
  private updatedValueSet = new Set<PropertyKey>();
  name: string;
  type: SandBoxType;
  proxy: WindowProxy;
  sandboxRunning = true;
  active() {
    if (!this.sandboxRunning) activeSandboxCount++;
    this.sandboxRunning = true;
  }
  inactive() {
    clearSystemJsProps(this.proxy, --activeSandboxCount === 0);
    this.sandboxRunning = false;
  }

  constructor(name: string) {
    this.name = name;
    this.type = SandBoxType.Proxy;
    const {updatedValueSet} = this;
    const self = this;
    const rawWindow = window;
    /**
     * fakeWindow:copy window中configurable为false的属性，即window中不能删除的属性
     * propertiesWithGetter:window中configurable为false,且没有get描述符的属性，该属性可以被修改，new Map<PropertyKey, boolean>();
     */
    const {fakeWindow, propertiesWithGetter} = createFakeWindow(rawWindow);
    const descriptorTargetMap = new Map<PropertyKey, SymbolTarget>();
    const hasOwnProperty = (key: PropertyKey) => fakeWindow.hasOwnProperty(key) || rawWindow.hasOwnProperty(key);
    const proxy = new Proxy(fakeWindow, {
      set(target: FakeWindow, p: PropertyKey, value: any): boolean {
        if (self.sandboxRunning) {
          target[p] = value;
          updatedValueSet.add(p);
          interceptSystemJsProps(p, value);
          return true;
        }
        // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
        return true;
      },
      get(target: FakeWindow, p: PropertyKey): any {
        if (p === Symbol.unscopables) return unscopables;
        if (
          p === "top" ||
          p === "parent" ||
          p === "window" ||
          p === "self" ||
          (process.env.NODE_ENV === "test" && (p === "mockTop" || p === "mockSafariTop"))
        ) {
          return proxy;
        }
        if (p === "hasOwnProperty") {
          return hasOwnProperty;
        }
        if (p === "document") {
          document[attachDocProxySymbol] = proxy;
          return document;
        }
        // eslint-disable-next-line no-bitwise
        const value = propertiesWithGetter.has(p) ? (rawWindow as any)[p] : (target as any)[p] || (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },
      has(target: FakeWindow, p: string | number | symbol): boolean {
        return p in unscopables || p in target || p in rawWindow;
      },
      getOwnPropertyDescriptor(target: FakeWindow, p: string | number | symbol): PropertyDescriptor | undefined {
        if (target.hasOwnProperty(p)) {
          const descriptor = Object.getOwnPropertyDescriptor(target, p);
          descriptorTargetMap.set(p, "target");
          return descriptor;
        }
        if (rawWindow.hasOwnProperty(p)) {
          const descriptor = Object.getOwnPropertyDescriptor(rawWindow, p);
          descriptorTargetMap.set(p, "rawWindow");
          return descriptor;
        }
        return undefined;
      },

      ownKeys(target: FakeWindow): PropertyKey[] {
        return uniq(Reflect.ownKeys(rawWindow).concat(Reflect.ownKeys(target)));
      },

      defineProperty(target: Window, p: PropertyKey, attributes: PropertyDescriptor): boolean {
        const from = descriptorTargetMap.get(p);
        switch (from) {
          case "rawWindow":
            return Reflect.defineProperty(rawWindow, p, attributes);
          default:
            return Reflect.defineProperty(target, p, attributes);
        }
      },
      deleteProperty(target: FakeWindow, p: string | number | symbol): boolean {
        if (target.hasOwnProperty(p)) {
          delete target[p];
          updatedValueSet.delete(p);
          return true;
        }
        return true;
      }
    });
    this.proxy = proxy;
  }
}
```

- `patchAtBootstrapping`bootstrapping 过程中打补丁

```ts
// 返回一个还原补丁的函数
const bootstrappingFreers = patchAtBootstrapping(
  appName,
  elementGetter,
  sandbox,
  singular,
  scopedCSS,
  excludeAssetFilter
);
export function patchAtBootstrapping(
  appName: string,
  elementGetter: () => HTMLElement | ShadowRoot,
  sandbox: SandBox,
  singular: boolean,
  scopedCSS: boolean,
  excludeAssetFilter?: Function
): Freer[] {
  const basePatchers = [
    () => patchDynamicAppend(appName, elementGetter, sandbox.proxy, false, singular, scopedCSS, excludeAssetFilter)
  ];

  const patchersInSandbox = {
    [SandBoxType.LegacyProxy]: basePatchers,
    [SandBoxType.Proxy]: basePatchers,
    [SandBoxType.Snapshot]: basePatchers
  };

  return patchersInSandbox[sandbox.type]?.map(patch => patch());
}
```

`patchDynamicAppend`函数，拦截`patchDocumentCreateElement patchHTMLDynamicAppendPrototypeFunctions`

```ts
export default function patch(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  proxy: Window,
  mounting = true,
  singular = true,
  scopedCSS = false,
  excludeAssetFilter?: CallableFunction
): Freer {
  let dynamicStyleSheetElements: Array<HTMLLinkElement | HTMLStyleElement> = [];
  const unpatchDocumentCreate = patchDocumentCreateElement(
    appName,
    appWrapperGetter,
    singular,
    proxy,
    dynamicStyleSheetElements
  );
  const unpatchDynamicAppendPrototypeFunctions = patchHTMLDynamicAppendPrototypeFunctions(
    appName,
    appWrapperGetter,
    proxy,
    singular,
    scopedCSS,
    dynamicStyleSheetElements,
    excludeAssetFilter
  );
  if (!mounting) bootstrappingPatchCount++;
  if (mounting) mountingPatchCount++;
  // 返回free函数，之前的拦截释放掉
  return function free() {
    if (!mounting && bootstrappingPatchCount !== 0) bootstrappingPatchCount--;
    if (mounting) mountingPatchCount--;
    const allMicroAppUnmounted = mountingPatchCount === 0 && bootstrappingPatchCount === 0;
    unpatchDynamicAppendPrototypeFunctions(allMicroAppUnmounted);
    unpatchDocumentCreate(allMicroAppUnmounted);
    dynamicStyleSheetElements.forEach(stylesheetElement => {
      if (stylesheetElement instanceof HTMLStyleElement && isStyledComponentsLike(stylesheetElement)) {
        if (stylesheetElement.sheet) {
          setCachedRules(stylesheetElement, (stylesheetElement.sheet as CSSStyleSheet).cssRules);
        }
      }
    });
    // 返回rebuild函数，再次mount时可以直接rebuild
    return function rebuild() {
      dynamicStyleSheetElements.forEach(stylesheetElement => {
        document.head.appendChild.call(appWrapperGetter(), stylesheetElement);
        if (stylesheetElement instanceof HTMLStyleElement && isStyledComponentsLike(stylesheetElement)) {
          const cssRules = getCachedRules(stylesheetElement);
          if (cssRules) {
            for (let i = 0; i < cssRules.length; i++) {
              const cssRule = cssRules[i];
              (stylesheetElement.sheet as CSSStyleSheet).insertRule(cssRule.cssText);
            }
          }
        }
      });
      if (mounting) {
        dynamicStyleSheetElements = [];
      }
    };
  };
}
```

`patchDocumentCreateElement`创建元素方法

```ts
function patchDocumentCreateElement(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  singular: boolean,
  proxy: Window,
  dynamicStyleSheetElements: HTMLStyleElement[]
) {
  // 单应用模式直接返回
  if (singular) {
    return noop;
  }
  // 多应用模式处理
  proxyContainerInfoMapper.set(proxy, {appName, proxy, appWrapperGetter, dynamicStyleSheetElements, singular});

  if (Document.prototype.createElement === rawDocumentCreateElement) {
    Document.prototype.createElement = function createElement<K extends keyof HTMLElementTagNameMap>(
      this: Document,
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElement {
      // 之前原生的createElement
      const element = rawDocumentCreateElement.call(this, tagName, options);
      // link style script标签
      if (isHijackingTag(tagName)) {
        // proxyContainerInfo 为每个应用对应的proxy，即代理后fakeWindow
        const proxyContainerInfo = proxyContainerInfoMapper.get(this[attachDocProxySymbol]);
        if (proxyContainerInfo) {
          // 给元素定义attachElementContainerSymbol属性值为proxy
          Object.defineProperty(element, attachElementContainerSymbol, {
            value: proxyContainerInfo,
            enumerable: false
          });
        }
      }

      return element;
    };
  }

  return function unpatch(recoverPrototype: boolean) {
    // proxyContainerInfoMapper map删除proxy属性
    proxyContainerInfoMapper.delete(proxy);
    if (recoverPrototype) {
      // 还原成原生的createElement
      Document.prototype.createElement = rawDocumentCreateElement;
    }
  };
}
```

- `patchHTMLDynamicAppendPrototypeFunctions`拦截`appendChild insertBefore removeChild`三种方法

```ts
function patchHTMLDynamicAppendPrototypeFunctions(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  proxy: Window,
  singular = true,
  scopedCSS = false,
  dynamicStyleSheetElements: HTMLStyleElement[],
  excludeAssetFilter?: CallableFunction
) {
  // Just overwrite it while it have not been overwrite
  if (
    HTMLHeadElement.prototype.appendChild === rawHeadAppendChild &&
    HTMLBodyElement.prototype.appendChild === rawBodyAppendChild &&
    HTMLHeadElement.prototype.insertBefore === rawHeadInsertBefore
  ) {
    HTMLHeadElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawHeadAppendChild,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter
    }) as typeof rawHeadAppendChild;
    HTMLBodyElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawBodyAppendChild,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter
    }) as typeof rawBodyAppendChild;

    HTMLHeadElement.prototype.insertBefore = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawHeadInsertBefore as any,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter
    }) as typeof rawHeadInsertBefore;
  }

  // Just overwrite it while it have not been overwrite
  if (
    HTMLHeadElement.prototype.removeChild === rawHeadRemoveChild &&
    HTMLBodyElement.prototype.removeChild === rawBodyRemoveChild
  ) {
    HTMLHeadElement.prototype.removeChild = getNewRemoveChild({
      appWrapperGetter,
      headOrBodyRemoveChild: rawHeadRemoveChild
    });
    HTMLBodyElement.prototype.removeChild = getNewRemoveChild({
      appWrapperGetter,
      headOrBodyRemoveChild: rawBodyRemoveChild
    });
  }

  return function unpatch(recoverPrototype: boolean) {
    if (recoverPrototype) {
      HTMLHeadElement.prototype.appendChild = rawHeadAppendChild;
      HTMLHeadElement.prototype.removeChild = rawHeadRemoveChild;
      HTMLBodyElement.prototype.appendChild = rawBodyAppendChild;
      HTMLBodyElement.prototype.removeChild = rawBodyRemoveChild;

      HTMLHeadElement.prototype.insertBefore = rawHeadInsertBefore;
    }
  };
}
```

- 主要是`getOverwrittenAppendChildOrInsertBefore getNewRemoveChild`两种方法

```ts
function getOverwrittenAppendChildOrInsertBefore(opts: {
  appName: string;
  proxy: WindowProxy;
  singular: boolean;
  dynamicStyleSheetElements: HTMLStyleElement[];
  appWrapperGetter: CallableFunction;
  rawDOMAppendOrInsertBefore: <T extends Node>(newChild: T, refChild?: Node | null) => T;
  scopedCSS: boolean;
  excludeAssetFilter?: CallableFunction;
}) {
  return function appendChildOrInsertBefore<T extends Node>(
    this: HTMLHeadElement | HTMLBodyElement,
    newChild: T,
    refChild?: Node | null
  ) {
    const element = newChild as any;
    // 原生的插入方法
    const {rawDOMAppendOrInsertBefore} = opts;
    if (element.tagName) {
      let {appName, appWrapperGetter, proxy, singular, dynamicStyleSheetElements} = opts;
      const {scopedCSS, excludeAssetFilter} = opts;
      // createElement方法做的拦截，多应用情况下会将新建的元素增加attachElementContainerSymbol属性，存储的是代理后的全局变量fakeWindow
      const storedContainerInfo = element[attachElementContainerSymbol];
      if (storedContainerInfo) {
        appName = storedContainerInfo.appName;
        singular = storedContainerInfo.singular;
        appWrapperGetter = storedContainerInfo.appWrapperGetter;
        dynamicStyleSheetElements = storedContainerInfo.dynamicStyleSheetElements;
        proxy = storedContainerInfo.proxy;
      }

      const invokedByMicroApp = singular
        ? // check if the currently specified application is active
          // While we switch page from qiankun app to a normal react routing page, the normal one may load stylesheet dynamically while page rendering,
          // but the url change listener must to wait until the current call stack is flushed.
          // This scenario may cause we record the stylesheet from react routing page dynamic injection,
          // and remove them after the url change triggered and qiankun app is unmouting
          // see https://github.com/ReactTraining/history/blob/master/modules/createHashHistory.js#L222-L230
          checkActivityFunctions(window.location).some(name => name === appName)
        : // have storedContainerInfo means it invoked by a micro app in multiply mode
          !!storedContainerInfo;

      switch (element.tagName) {
        case LINK_TAG_NAME:
        case STYLE_TAG_NAME: {
          const stylesheetElement: HTMLLinkElement | HTMLStyleElement = newChild as any;
          if (!invokedByMicroApp) {
            return rawDOMAppendOrInsertBefore.call(this, element, refChild) as T;
          }

          const mountDOM = appWrapperGetter();
          const {href} = stylesheetElement as HTMLLinkElement;
          // 不被拦截的url直接新增
          if (excludeAssetFilter && href && excludeAssetFilter(href)) {
            return rawDOMAppendOrInsertBefore.call(mountDOM, element, refChild) as T;
          }
          // 给css增加scope
          if (scopedCSS) {
            css.process(mountDOM, stylesheetElement, appName);
          }

          dynamicStyleSheetElements.push(stylesheetElement);
          const referenceNode = mountDOM.contains(refChild) ? refChild : null;
          return rawDOMAppendOrInsertBefore.call(mountDOM, stylesheetElement, referenceNode);
        }

        case SCRIPT_TAG_NAME: {
          // 不在qiankun拦截的
          if (!invokedByMicroApp) {
            return rawDOMAppendOrInsertBefore.call(this, element, refChild) as T;
          }

          const mountDOM = appWrapperGetter();
          const {src, text} = element as HTMLScriptElement;

          // 直接过滤的script
          if (excludeAssetFilter && src && excludeAssetFilter(src)) {
            return rawDOMAppendOrInsertBefore.call(mountDOM, element, refChild) as T;
          }

          const {fetch} = frameworkConfiguration;
          const referenceNode = mountDOM.contains(refChild) ? refChild : null;

          if (src) {
            // 用proxy当全局变量执行脚本
            execScripts(null, [src], proxy, {
              fetch,
              strictGlobal: !singular,
              success: () => {
                const loadEvent = new CustomEvent("load");
                if (isFunction(element.onload)) {
                  element.onload(loadEvent);
                } else {
                  element.dispatchEvent(loadEvent);
                }
              },
              error: () => {
                const errorEvent = new CustomEvent("error");
                if (isFunction(element.onerror)) {
                  element.onerror(errorEvent);
                } else {
                  element.dispatchEvent(errorEvent);
                }
              }
            });

            const dynamicScriptCommentElement = document.createComment(`dynamic script ${src} replaced by qiankun`);
            return rawDOMAppendOrInsertBefore.call(mountDOM, dynamicScriptCommentElement, referenceNode);
          }
          // 用proxy当全局变量执行脚本
          execScripts(null, [`<script>${text}</script>`], proxy, {
            strictGlobal: !singular,
            success: element.onload,
            error: element.onerror
          });
          const dynamicInlineScriptCommentElement = document.createComment("dynamic inline script replaced by qiankun");
          return rawDOMAppendOrInsertBefore.call(mountDOM, dynamicInlineScriptCommentElement, referenceNode);
        }
        default:
          break;
      }
    }

    return rawDOMAppendOrInsertBefore.call(this, element, refChild);
  };
}
```

- `createSandbox`的返回值

```ts
return {
  proxy: sandbox.proxy,
  /**
   * 沙箱被 mount
   * 可能是从 bootstrap 状态进入的 mount
   * 也可能是从 unmount 之后再次唤醒进入 mount
   */
  async mount() {
    /* ------------------------------------------ 因为有上下文依赖（window），以下代码执行顺序不能变 ------------------------------------------ */

    /* ------------------------------------------ 1. 启动/恢复 沙箱------------------------------------------ */
    sandbox.active();
    const sideEffectsRebuildersAtBootstrapping = sideEffectsRebuilders.slice(0, bootstrappingFreers.length);
    const sideEffectsRebuildersAtMounting = sideEffectsRebuilders.slice(bootstrappingFreers.length);
    //  unmount 之后再次唤醒的重新激活Bootstrapping的拦截
    if (sideEffectsRebuildersAtBootstrapping.length) {
      sideEffectsRebuildersAtBootstrapping.forEach(rebuild => rebuild());
    }

    /* ------------------------------------------ 2. 开启全局变量补丁 ------------------------------------------*/
    // render 沙箱启动时开始劫持各类全局监听，尽量不要在应用初始化阶段有 事件监听/定时器 等副作用
    mountingFreers = patchAtMounting(appName, elementGetter, sandbox, singular, scopedCSS, excludeAssetFilter);
    /* ------------------------------------------ 3. 重置一些初始化时的副作用 ------------------------------------------*/
    // 存在 rebuilder 则表明有些副作用需要重建
    if (sideEffectsRebuildersAtMounting.length) {
      sideEffectsRebuildersAtMounting.forEach(rebuild => rebuild());
    }
    // clean up rebuilders
    sideEffectsRebuilders = [];
  },
  /**
   * 恢复 global 状态，使其能回到应用加载之前的状态
   */
  async unmount() {
    // record the rebuilders of window side effects (event listeners or timers)
    // note that the frees of mounting phase are one-off as it will be re-init at next mounting
    sideEffectsRebuilders = [...bootstrappingFreers, ...mountingFreers].map(free => free());
    sandbox.inactive();
  }
};
```

- `patchAtMounting`挂载时的拦截，
  对`window.setInterval window.addEventListener window.removeEventListener window.g_history ele.createElement ele.removeElement ele.appendChild ele.insertBefore`做
  拦截，因为 js 的运行环境会使用代理的全局变量，所以要对这些进行一次拦截。

  > [remove setTimeout patcher](https://github.com/umijs/qiankun/pull/491) >
  > [clearInterval 是否可以做的更加灵活](https://github.com/umijs/qiankun/issues/52)

- 至此`createSandbox`方法到此结束，继续回到`loadApp`方法中。

```ts
const {beforeUnmount = [], afterUnmount = [], afterMount = [], beforeMount = [], beforeLoad = []} = mergeWith(
  {},
  getAddOns(global, assetPublicPath),
  lifeCycles,
  (v1, v2) => concat(v1 ?? [], v2 ?? [])
);
// 串行执行promise链
await execHooksChain(toArray(beforeLoad), app, global);

// 获取qiankun添加的钩子周期
function getAddOns<T extends object>(global: Window, publicPath: string): FrameworkLifeCycles<T> {
  return mergeWith({}, getEngineFlagAddon(global), getRuntimePublicPathAddOn(global, publicPath), (v1, v2) =>
    concat(v1 ?? [], v2 ?? [])
  );
}
// beforeLoad beforeMount注入__POWERED_BY_QIANKUN__，beforeUnmount删除__POWERED_BY_QIANKUN__
function getEngineFlagAddon(global: Window): FrameworkLifeCycles<any> {
  return {
    async beforeLoad() {
      // eslint-disable-next-line no-param-reassign
      global.__POWERED_BY_QIANKUN__ = true;
    },

    async beforeMount() {
      // eslint-disable-next-line no-param-reassign
      global.__POWERED_BY_QIANKUN__ = true;
    },

    async beforeUnmount() {
      // eslint-disable-next-line no-param-reassign
      delete global.__POWERED_BY_QIANKUN__;
    }
  };
}
// 注入运行时__INJECTED_PUBLIC_PATH_BY_QIANKUN__，
const rawPublicPath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
function getRuntimePublicPathAddOn(global: Window, publicPath = "/"): FrameworkLifeCycles<any> {
  let hasMountedOnce = false;

  return {
    async beforeLoad() {
      // eslint-disable-next-line no-param-reassign
      global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = publicPath;
    },

    async beforeMount() {
      if (hasMountedOnce) {
        // eslint-disable-next-line no-param-reassign
        global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = publicPath;
      }
    },

    async beforeUnmount() {
      if (rawPublicPath === undefined) {
        // eslint-disable-next-line no-param-reassign
        delete global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
      } else {
        // eslint-disable-next-line no-param-reassign
        global.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = rawPublicPath;
      }

      hasMountedOnce = true;
    }
  };
}
```

- `execHooksChain`，串行执行 promise 数组

```ts
function execHooksChain<T extends object>(
  hooks: Array<LifeCycleFn<T>>,
  app: LoadableApp<T>,
  global = window
): Promise<any> {
  if (hooks.length) {
    return hooks.reduce((chain, hook) => chain.then(() => hook(app, global)), Promise.resolve());
  }
  return Promise.resolve();
}
```

- 获取子应用导出的 exports

```ts
// 执行importEntry导出的execScripts方法，返回子应用主文件导出的exports
// get the lifecycle hooks from module exports
const scriptExports: any = await execScripts(global, !singular);
// 获取导出的函数
const {bootstrap, mount, unmount, update} = getLifecyclesFromExports(scriptExports, appName, global);
```

- 获取`parcelConfig`配置

```ts
// 类似event事件
const {onGlobalStateChange, setGlobalState, offGlobalStateChange}: Record<string, Function> = getMicroAppStateActions(
  appInstanceId
);

const parcelConfig: ParcelConfigObject = {
  name: appInstanceId,
  // 子应用的bootstrap
  bootstrap,
  mount: [
    async () => {
      if (process.env.NODE_ENV === "development") {
        const marks = performance.getEntriesByName(markName, "mark");
        // mark length is zero means the app is remounting
        if (!marks.length) {
          performanceMark(markName);
        }
      }
    },
    async () => {
      if ((await validateSingularMode(singular, app)) && prevAppUnmountedDeferred) {
        // 等待前一个子应用卸载完成
        return prevAppUnmountedDeferred.promise;
      }

      return undefined;
    },
    // 添加 mount hook, 确保每次应用加载前容器 dom 结构已经设置完毕
    async () => {
      // element would be destroyed after unmounted, we need to recreate it if it not exist
      element = element || createElement(appContent, strictStyleIsolation);
      render({element, loading: true}, "mounting");
    },
    // createSandbox的mount函数，沙箱激活，沙箱对处于黑名单的全局函数进行监听
    mountSandbox,
    // exec the chain after rendering to keep the behavior with beforeLoad
    async () => execHooksChain(toArray(beforeMount), app, global),
    // 子应用mount函数，自动注入setGlobalState，onGlobalStateChange
    async props => mount({...props, container: containerGetter(), setGlobalState, onGlobalStateChange}),
    // 应用 mount 完成后结束 loading，子应用mounted完成
    async () => render({element, loading: false}, "mounted"),
    async () => execHooksChain(toArray(afterMount), app, global),
    // initialize the unmount defer after app mounted and resolve the defer after it unmounted
    async () => {
      if (await validateSingularMode(singular, app)) {
        // 单应用模式生成一个卸载的promise
        prevAppUnmountedDeferred = new Deferred<void>();
      }
    },
    async () => {
      if (process.env.NODE_ENV === "development") {
        const measureName = `[qiankun] App ${appInstanceId} Loading Consuming`;
        performanceMeasure(measureName, markName);
      }
    }
  ],
  unmount: [
    // 卸载前的钩子
    async () => execHooksChain(toArray(beforeUnmount), app, global),
    // 子应用的unmount函数
    async props => unmount({...props, container: containerGetter()}),
    // 沙箱卸载，并将劫持的全局函数还原
    unmountSandbox,
    async () => execHooksChain(toArray(afterUnmount), app, global),
    async () => {
      render({element: null, loading: false}, "unmounted");
      offGlobalStateChange(appInstanceId);
      // for gc
      element = null;
    },
    async () => {
      if ((await validateSingularMode(singular, app)) && prevAppUnmountedDeferred) {
        // 卸载的promise resolve，下一个应用加载前会等待这个promise结束
        prevAppUnmountedDeferred.resolve();
      }
    }
  ]
};
```
