# qiankun

> qiankun 是一个基于 single-spa 的微前端实现库，旨在帮助大家能更简单、无痛的构建一个生产可用微前端架构系统。<br> >
> [qiankun 官方文档](https://qiankun.umijs.org/zh/api#startopts)

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
     * fakeWindow:copy window中configurable为false的属性
     * propertiesWithGetter:window中configurable为false,且没有get描述符的属性
     *
     *
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
