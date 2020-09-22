---
sidebarDepth: 2
---

# vue 3.0

## 1 响应式数据

### 1.1 watchEffect

`packages\runtime-core\src\apiWatch.ts`文件打开`watchEffect`方法

```ts
// Simple effect.
export function watchEffect(effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle {
  // doWatch 在watch、watchEffect、instanceWatch（this.$watch）方法中都有使用
  return doWatch(effect, null, options);
}

function doWatch(
  //   可以是ref,computed,reactive object,和一个getter函数，或者以上的集合
  source: WatchSource | WatchSource[] | WatchEffect,
  //   watch中有cb参数，watchEffect方法中cb为null
  cb: WatchCallback | null,
  //   watchEffect方法中只有flush, onTrack, onTrigger三个参数，immediate, deep是watch独有的参数
  {immediate, deep, flush, onTrack, onTrigger}: WatchOptions = EMPTY_OBJ,
  //   默认为currentInstance
  instance = currentInstance
): WatchStopHandle {
  if (__DEV__ && !cb) {
    //   提示 watchEffect 方法没有immediate参数
    if (immediate !== undefined) {
      warn(
        `watch() "immediate" option is only respected when using the ` + `watch(source, callback, options?) signature.`
      );
    }
    //   提示 watchEffect 方法没有deep参数
    if (deep !== undefined) {
      warn(`watch() "deep" option is only respected when using the ` + `watch(source, callback, options?) signature.`);
    }
  }

  const warnInvalidSource = (s: unknown) => {
    warn(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` + `a reactive object, or an array of these types.`
    );
  };
  let getter: () => any;
  const isRefSource = isRef(source);
  //   source 为ref，设置getter为返回ref.value
  if (isRefSource) {
    getter = () => (source as Ref).value;
  } else if (isReactive(source)) {
    //   reactive object 默认deep=true
    getter = () => source;
    deep = true;
  } else if (isArray(source)) {
    //   列表时循环读取列表的值进行观测
    getter = () =>
      source.map(s => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER);
        } else {
          __DEV__ && warnInvalidSource(s);
        }
      });
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = () => callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER);
    } else {
      // no cb -> simple effect
      //   watchEffect 的getter
      getter = () => {
        if (instance && instance.isUnmounted) {
          return;
        }
        if (cleanup) {
          // watchEffect的onInvalidate里传入的清除副作用参数，在getter时会清除一次副作用
          cleanup();
        }
        // 执行source函数
        return callWithErrorHandling(source, instance, ErrorCodes.WATCH_CALLBACK, [onInvalidate]);
      };
    }
  } else {
    getter = NOOP;
    __DEV__ && warnInvalidSource(source);
  }
  // watch方法deep为true时，getter为递归的读取source的值，包含object,array,set,map,ref
  if (cb && deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  let cleanup: () => void;
  // 借助onInvalidate赋值cleanup函数
  const onInvalidate: InvalidateCbRegistrator = (fn: () => void) => {
    cleanup = runner.options.onStop = () => {
      callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP);
    };
  };

  // in SSR there is no need to setup an actual effect, and it should be noop
  // unless it's eager
  if (__NODE_JS__ && isInSSRComponentSetup) {
    if (!cb) {
      getter();
    } else if (immediate) {
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [getter(), undefined, onInvalidate]);
    }
    return NOOP;
  }
  // watch方法中的初始oldVal，source为数组时初始oldVal为[]，否则为{}
  let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE;
  // job函数：执行runner函数，获取getter的返回值。如果有cb参数，调用cleanup函数，调用cb（newVal,oldVal,onInvalidate），赋值oldVal;
  const job: SchedulerJob = () => {
    if (!runner.active) {
      return;
    }
    if (cb) {
      // watch(source, cb)，根据getter获取newvAL
      const newValue = runner();
      if (deep || isRefSource || hasChanged(newValue, oldValue)) {
        // cleanup before running cb again
        if (cleanup) {
          cleanup();
        }
        // 执行cb函数，传递newValue、oldValue、onInvalidate参数
        callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
          newValue,
          // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
          onInvalidate
        ]);
        oldValue = newValue;
      }
    } else {
      // watchEffect
      runner();
    }
  };

  // important: mark the job as a watcher callback so that scheduler knows it
  // it is allowed to self-trigger (#1727)
  job.allowRecurse = !!cb;
  // schedule有三个队列，preQueue，queue,postQueue
  let scheduler: (job: () => any) => void;
  // getter同步执行
  if (flush === "sync") {
    scheduler = job;
  } else if (flush === "pre") {
    // getter,cb在组件更新之前运行
    // ensure it's queued before component updates (which have positive ids)
    job.id = -1;
    scheduler = () => {
      if (!instance || instance.isMounted) {
        queuePreFlushCb(job);
      } else {
        // with 'pre' option, the first call must happen before
        // the component is mounted so it is called synchronously.
        job();
      }
    };
  } else {
    scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
  }
  /**
   * 创建个副作用，返回的runner函数是一个effect函数，包含静态属性（{id，_isEffect=true，active=true，raw=fn,deps=[],options}），最终还是执行getter并返回getter的值
   *    effect函数中，调用createReactiveEffect函数创建一个effect，如果lazy不为true，立即执行getter函数
   *        enableTracking（），shouldTrack设为true，将创建的effect推入effectStack队列，赋值activeEffect为创建的effect，
   *         返回getter值。完了之后，effectStack队列pop删除effect,resetTracking()，将shouldTrack改为上一次的值，activeEffect赋值为effectStack队列的最后一项
   */
  const runner = effect(getter, {
    lazy: true,
    onTrack,
    onTrigger,
    scheduler
  });
  // currentInstance的effects队列收集runner
  recordInstanceBoundEffect(runner);

  // initial run
  if (cb) {
    // 立即执行job，调用cb函数
    if (immediate) {
      job();
    } else {
      // 赋值oldValue
      oldValue = runner();
    }
  } else {
    // watchEffect方法立即执行
    runner();
  }

  return () => {
    // 遍历runner这个effect的deps数组，将deps的每个deep删除该effect，并清空deps。调用options.onStop函数,cleanup赋值过程中赋值了onStop函数
    stop(runner);
    if (instance) {
      // instance.effects删除该effect
      remove(instance.effects!, runner);
    }
  };
}
```

以上，`watchEffect`中的`doWatch`方法主要流程如下：

- 组合`getter`函数，对不同`source`做不同的处理，最终`getter`是读取`source`或执行`source`的并返回值的函数
  - 不含`cb`参数，即`watchEffect`方法，`getter`函数中会调用`cleanup`函数。`cleanup`是`onInvalidate(fn)`里传入的`fn`函数
- 对于`deep`为`true`的情况，调用`traverse`方法递归的读取`source`。source 为`Reactive Object`，`deep`默认`true`
- 赋值`cleanup` `runner.options.onStop`函数，该值为`onInvalidate(fn)`函数的`fn`参数，`fn`是清理副作用参数
  。`onInvalidate`是`watch`方法`cb`执行的参数，也是`watchEffect`中`getter`函数执行的参数。
- `Node`环境中到这里就结束了。执行没有`cb`时，`getter`函数。有`cb`且`immediate`为`true`时，执行`cb`
- 创建`job:SchedulerJob`函数。`job:SchedulerJob`函数体包含以下内容：
  - 如果含有`cb`，`job`会在执行时调用`runner`函数获取`newValue`，调用`cleanup`函数。调用`cb`函数，并传
    入`newValue oldValue onInvalidate`
  - 没有`cb`参数，直接调用`runner`函数
- 创建`scheduler`函数，`scheduler`会在创建`effect`传递进去，在`trigger`函数中会执行`scheduler`函数。`trigger`会在响应式
  数据`set delete`时触发。根据`flush`的值分为三种情况：
  - `flush === "sync"`时，`scheduler = job`
  - `flush === "pre"`时，`scheduler`内部执行`queuePreFlushCb(job)`，将`job`放入`preQueue`队列里并执行队列。
  - 当以上都不是，即默认`flush === "post"`，`scheduler`内部执行`queuePostRenderEffect(job)`，将`job`放入`postQueue`队列
    里并执行队列。
- 创建`runner`函数，使用`effect`创建一个副作用函数，传入`getter`函数当做参数，并将上一步创建的`scheduler`当做参数传入
  - `onInvalidate`执行时会赋值`runner`的`options.onStop`
- `currentInstance.effects`收集`runner`这个`effect`函数
- 初始化`runner`函数，收集依赖
  - 含有`cb`参数
    - `immediate`为`true`，调用`job`函数，`job`调用`runner`和`cb`函数
    - 赋值`oldValue`为`runner`执行后的值
  - 直接调用`runner`函数，间接调用`runner`函数，收集依赖
- 返回一个函数，用来卸载各种数据。该函数流程：
  - 执行`stop(runner);`
    - 遍历`runner`这个`effect`的`deps`数组，将`deps`的每个`deep`删除该`effect`，并清空`deps`。调用`options.onStop`函数
      ,`cleanup`赋值过程中赋值了 o`nStop`函数
  - `remove(instance.effects!, runner)`；`instance.effects`删除该`effect`

### 1.2 scheduler 队列

`scheduler`分成三种队列

- `PreFlush`，前置队列
- `queue`，常规队列
- `PostFlush`，后置队列

```ts
export interface SchedulerJob {
  (): void;
  /**
   * unique job id, only present on raw effects, e.g. component render effect
   */
  id?: number;
  /**
   * Indicates whether the job is allowed to recursively trigger itself.
   * By default, a job cannot trigger itself because some built-in method calls,
   * e.g. Array.prototype.push actually performs reads as well (#1740) which
   * can lead to confusing infinite loops.
   * The allowed cases are component update functions and watch callbacks.
   * Component update functions may update child component props, which in turn
   * trigger flush: "pre" watch callbacks that mutates state that the parent
   * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
   * triggers itself again, it's likely intentional and it is the user's
   * responsibility to perform recursive state mutation that eventually
   * stabilizes (#1727).
   */
  allowRecurse?: boolean;
}

export type SchedulerCb = Function & {id?: number};
export type SchedulerCbs = SchedulerCb | SchedulerCb[];

let isFlushing = false;
let isFlushPending = false;

// 正常队列
const queue: (SchedulerJob | null)[] = [];
// 队列执行索引
let flushIndex = 0;

// 等待中的前置队列
const pendingPreFlushCbs: SchedulerCb[] = [];
// 执行中的前置队列
let activePreFlushCbs: SchedulerCb[] | null = null;
// 前置队列执行索引
let preFlushIndex = 0;

// 等待中的后置队列
const pendingPostFlushCbs: SchedulerCb[] = [];
// 执行中的后置队列
let activePostFlushCbs: SchedulerCb[] | null = null;
// 后置队列执行索引
let postFlushIndex = 0;

const resolvedPromise: Promise<any> = Promise.resolve();
// 执行队列的promise
let currentFlushPromise: Promise<void> | null = null;
// 当前前置队列的父任务
let currentPreFlushParentJob: SchedulerJob | null = null;
// 最大执行次数限制
const RECURSION_LIMIT = 100;
type CountMap = Map<SchedulerJob | SchedulerCb, number>;

export function nextTick(fn?: () => void): Promise<void> {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}
/**
 * 将job推入到正常队列中，执行queueFlush
 */
export function queueJob(job: SchedulerJob) {
  // the dedupe search uses the startIndex argument of Array.includes()
  // by default the search index includes the current job that is being run
  // so it cannot recursively trigger itself again.
  // if the job is a watch() callback, the search will start with a +1 index to
  // allow it recursively trigger itself - it is the user's responsibility to
  // ensure it doesn't end up in an infinite loop.
  if (
    (!queue.length || !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) &&
    job !== currentPreFlushParentJob
  ) {
    queue.push(job);
    queueFlush();
  }
}

/**
 * isFlushing和isFlushPending都为false情况下，isFlushPending设为true，下个微任务执行flushJobs
 */
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}

export function invalidateJob(job: SchedulerJob) {
  const i = queue.indexOf(job);
  if (i > -1) {
    queue[i] = null;
  }
}
/**
 * 单个job不在执行的队列中时，将该任务推入等待中的队列，之后在下个微任务看情况执行所有的队列
 */
function queueCb(cb: SchedulerCbs, activeQueue: SchedulerCb[] | null, pendingQueue: SchedulerCb[], index: number) {
  if (!isArray(cb)) {
    if (!activeQueue || !activeQueue.includes(cb, (cb as SchedulerJob).allowRecurse ? index + 1 : index)) {
      pendingQueue.push(cb);
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingQueue.push(...cb);
  }
  queueFlush();
}

/**
 * 将cb推入前置队列里，并在下个microTask执行所有的队列
 */
export function queuePreFlushCb(cb: SchedulerCb) {
  queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
}
/**
 * 将cb推入后置队列里，并在下个microTask执行所有的队列
 */
export function queuePostFlushCb(cb: SchedulerCbs) {
  queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
}

/**
 * 执行前置队列。将等待队列赋值给执行队列，清空等待队列，然后对执行的队列遍历调用队列的所有job，直到等待队列真正为空。
 */
export function flushPreFlushCbs(seen?: CountMap, parentJob: SchedulerJob | null = null) {
  if (pendingPreFlushCbs.length) {
    currentPreFlushParentJob = parentJob;
    activePreFlushCbs = [...new Set(pendingPreFlushCbs)];
    pendingPreFlushCbs.length = 0;
    if (__DEV__) {
      seen = seen || new Map();
    }
    for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
      if (__DEV__) {
        checkRecursiveUpdates(seen!, activePreFlushCbs[preFlushIndex]);
      }
      activePreFlushCbs[preFlushIndex]();
    }
    activePreFlushCbs = null;
    preFlushIndex = 0;
    currentPreFlushParentJob = null;
    // recursively flush until it drains
    flushPreFlushCbs(seen, parentJob);
  }
}

export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)];
    pendingPostFlushCbs.length = 0;

    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }

    activePostFlushCbs = deduped;
    if (__DEV__) {
      seen = seen || new Map();
    }

    activePostFlushCbs.sort((a, b) => getId(a) - getId(b));

    for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
      if (__DEV__) {
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex]);
      }
      activePostFlushCbs[postFlushIndex]();
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}

const getId = (job: SchedulerJob | SchedulerCb) => (job.id == null ? Infinity : job.id);

/**
 * 最终把队列的job都给执行一遍
 * 1 isFlushPending设为false,isFlushing设为true
 * 2 执行PreFlush前置队列，将队列里的job全给执行一次
 * 3 将queue队列按照id先后顺序排列，id小的在前面
 * 4 执行queue队列，并清空queue队列
 * 5 执行PostFlush后置队列，将队列里的job全给执行一次isFlushing设为false
 * 6 如果queue或者pendingPostFlush还有数据，递归调用flushJobs函数
 */
function flushJobs(seen?: CountMap) {
  isFlushPending = false;
  isFlushing = true;
  if (__DEV__) {
    seen = seen || new Map();
  }

  flushPreFlushCbs(seen);

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child so its render effect will have smaller
  //    priority number)
  // 2. If a component is unmounted during a parent component's update,
  //    its update can be skipped.
  // Jobs can never be null before flush starts, since they are only invalidated
  // during execution of another flushed job.
  queue.sort((a, b) => getId(a!) - getId(b!));

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job) {
        if (__DEV__) {
          checkRecursiveUpdates(seen!, job);
        }
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER);
      }
    }
  } finally {
    flushIndex = 0;
    queue.length = 0;

    flushPostFlushCbs(seen);

    isFlushing = false;
    currentFlushPromise = null;
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen);
    }
  }
}
/**
 * 检查函数执行次数，超过最大次数发出警告
 */
function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob | SchedulerCb) {
  if (!seen.has(fn)) {
    seen.set(fn, 1);
  } else {
    const count = seen.get(fn)!;
    if (count > RECURSION_LIMIT) {
      throw new Error(
        `Maximum recursive updates exceeded. ` +
          `This means you have a reactive effect that is mutating its own ` +
          `dependencies and thus recursively triggering itself. Possible sources ` +
          `include component template, render function, updated hook or ` +
          `watcher source function.`
      );
    } else {
      seen.set(fn, count + 1);
    }
  }
}
```

以上，`scheduler`文件里包含三种队列，常规队列`queue`、前置队列`PreFlush`、后置队列`PostFlush`。执行队列的时间是
在`nextMicroTask`执行所有的队列，按照`PreFlush=>queue>PostFlush`执行队列，每次执行都是递归的执行，直到三个队列里都没
有`job`

### 1.3 effect

在`doWatch`方法中使用`effect`方法借助`getter`创建了个`runner`副作用，打开`packages\reactivity\src\effect.ts`文件：

```ts
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import {EMPTY_OBJ, isArray, isIntegerKey, isMap} from "@vue/shared";

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type Dep = Set<ReactiveEffect>;
type KeyToDepMap = Map<any, Dep>;
const targetMap = new WeakMap<any, KeyToDepMap>();

export interface ReactiveEffect<T = any> {
  (): T;
  _isEffect: true;
  id: number;
  active: boolean;
  raw: () => T;
  deps: Array<Dep>;
  options: ReactiveEffectOptions;
}

export interface ReactiveEffectOptions {
  lazy?: boolean;
  scheduler?: (job: ReactiveEffect) => void;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  onStop?: () => void;
}

export type DebuggerEvent = {
  effect: ReactiveEffect;
  target: object;
  type: TrackOpTypes | TriggerOpTypes;
  key: any;
} & DebuggerEventExtraInfo;

export interface DebuggerEventExtraInfo {
  newValue?: any;
  oldValue?: any;
  oldTarget?: Map<any, any> | Set<any>;
}

const effectStack: ReactiveEffect[] = [];
let activeEffect: ReactiveEffect | undefined;

export const ITERATE_KEY = Symbol(__DEV__ ? "iterate" : "");
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? "Map key iterate" : "");

export function isEffect(fn: any): fn is ReactiveEffect {
  return fn && fn._isEffect === true;
}

/**
 * 创建一个响应式的函数effect，
 */
export function effect<T = any>(fn: () => T, options: ReactiveEffectOptions = EMPTY_OBJ): ReactiveEffect<T> {
  // 获取原方法
  if (isEffect(fn)) {
    fn = fn.raw;
  }
  // 创建响应式的effect
  const effect = createReactiveEffect(fn, options);
  // 不是懒加载的话先调用
  if (!options.lazy) {
    effect();
  }
  // 返回副作用函数
  return effect;
}

/**
 * 让effect失效，修改active状态。清除effect的deps依赖，清空effect.deps，调用onStop函数
 */
export function stop(effect: ReactiveEffect) {
  if (effect.active) {
    cleanup(effect);
    if (effect.options.onStop) {
      effect.options.onStop();
    }
    effect.active = false;
  }
}

let uid = 0;

/**
 * 返回一个函数effect，包含静态属性{id,_isEffect,active,raw,deps=[],options}
 */
function createReactiveEffect<T = any>(fn: () => T, options: ReactiveEffectOptions): ReactiveEffect<T> {
  const effect = function reactiveEffect(): unknown {
    // 已经注销的
    if (!effect.active) {
      return options.scheduler ? undefined : fn();
    }
    //
    if (!effectStack.includes(effect)) {
      // 清除该effect的依赖
      cleanup(effect);
      try {
        enableTracking();
        // 赋值activeEffect，将effect推入effectStack队列
        effectStack.push(effect);
        activeEffect = effect;
        // 返回fn的值
        return fn();
      } finally {
        // 删除队列的最后一项
        effectStack.pop();
        // 还原effectStack值
        resetTracking();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  } as ReactiveEffect;
  effect.id = uid++;
  effect._isEffect = true;
  effect.active = true;
  effect.raw = fn;
  effect.deps = [];
  effect.options = options;
  return effect;
}

/**
 * 清空effect的deps，每个dep删除effect
 * @param effect
 */
function cleanup(effect: ReactiveEffect) {
  const {deps} = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}

let shouldTrack = true;
const trackStack: boolean[] = [];

export function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

/**
 * shouldTrack设为true，trackStack推入shouldTrack
 */
export function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

/**
 * 还原shouldTrack为trackStack队列的最后一项
 */
export function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

/**
 * 追踪数据，targetMap.get(target).get(key)获取到dep，dep收集activeEffect。同时activeEffect.deps收集dep
 */
export function track(target: object, type: TrackOpTypes, key: unknown) {
  // 没有监听的函数，不追踪
  if (!shouldTrack || activeEffect === undefined) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    if (__DEV__ && activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      });
    }
  }
}

/**
 * 数据变动时，获取到所有的deps，deps里的effect全都执行一遍
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    // never been tracked
    return;
  }

  const effects = new Set<ReactiveEffect>();
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => effects.add(effect));
    }
  };

  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(add);
  } else if (key === "length" && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === "length" || key >= (newValue as number)) {
        add(dep);
      }
    });
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key));
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          add(depsMap.get("length"));
        }
        break;
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          add(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }

  const run = (effect: ReactiveEffect) => {
    if (__DEV__ && effect.options.onTrigger) {
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      });
    }
    // doWatch方法中的runner就传入了scheduler参数，优先调用scheduler方法
    if (effect.options.scheduler) {
      effect.options.scheduler(effect);
    } else {
      effect();
    }
  };

  effects.forEach(run);
}
```

`effect`页面主要包含三项

1. `createReactiveEffect`:创建一个函数`effect`，包含静态属性`{id,_isEffect,active,raw,deps=[],options}`，调
   用`createReactiveEffect`的返回值会赋值`activeEffect`，然后执行`fn`读取响应式数据，读取响应式数据过程中触发`track`函数
   ，`track`收集`target`的依赖，将`activeEffect`放入`dep（targetMap.get(target).get(key)）`中，同时`activeEffect.deps`收
   集该 `dep`
2. `track`函数：在调用响应式数据的`get`时触发，该函数通过`targetMap`收集`target`，然后`depsMap`收集`key=activeEffect`，
   这就会在下次修改数据时在`set`里触发`dep`里的`effect`更新
3. `trigger`:在`set`响应式数据时触发
   - `TriggerOpTypes.CLEAR`：获取到`target`里的所有`key`的`effect`，将这些`effect`全部执行一遍
   - `target`为数组时，当修改的`key`为`length`或者`key >= (newValue as number)`，收集这些`key`的`effect`，将这
     些`effect`全部执行一遍
   - 正常的修改`target`某个`key`时，只收集该`key`对应的`effect`，然后执行这些`effects`
4. `effects`调用`run`函数，优先调用`effect.options.scheduler`，其次执行`effect`本身

### 1.4 reactive

进入`reactive`函数，看`reactive`如何创建响应式对象。

```ts
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers);
}
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  // target不为对象，给个惊涛
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target;
  }
  // target already has corresponding Proxy
  const proxyMap = isReadonly ? readonlyMap : reactiveMap;
  const existingProxy = proxyMap.get(target);
  // 做了一层缓存
  if (existingProxy) {
    return existingProxy;
  }
  // only a whitelist of value types can be observed.
  const targetType = getTargetType(target);
  // 无效的数据或者不可扩展的对象，直接返回target
  if (targetType === TargetType.INVALID) {
    return target;
  }
  // 创建代理对象，如果是Map|Set|WeakMap|WeakSet，使用collectionHandlers
  const proxy = new Proxy(target, targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}
```

先查看`baseHandlers`如何做的拦截，对应的是`Array Object`的数据劫持

```ts
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
};
const arrayInstrumentations: Record<string, Function> = {};
["includes", "indexOf", "lastIndexOf"].forEach(key => {
  arrayInstrumentations[key] = function (...args: any[]): any {
    // this指向的是receiver proxy对象
    const arr = toRaw(this) as any;
    //
    for (let i = 0, l = (this as any).length; i < l; i++) {
      // 为什么这三个方法对每个index都做追踪？那every、some等等要不要做遍历
      // 因为这三个方法用到了原生对象，而没有用代理对象，为了增加依赖，所以对每个index都增加了依赖追踪
      track(arr, TrackOpTypes.GET, i + "");
    }
    // we run the method using the original args first (which may be reactive)
    // 这里使用原生对象进行调用函数，那么是不会触发代理对象的 length,index,方法名 的依赖添加，所以上面遍历数组增加了依赖添加
    const res = arr[key](...args);
    if (res === -1 || res === false) {
      // if that didn't work, run it again using raw values.
      // 变成原始对象再进行一次操作，存在以下情况做判断
      /**
       *  const raw = {};
       *  const arr = reactive([{}, {}]);
       *  arr.push(raw);
       *  console.log(arr[2] === raw);
       */
      return arr[key](...args.map(toRaw));
    } else {
      return res;
    }
  };
});

/**
 * get函数
 * 创建响应式数据：1 对ReactiveFlags.IS_REACTIVE,ReactiveFlags.IS_READONLY,ReactiveFlags.RAW三个属性特殊处理。
 *                2 "includes", "indexOf", "lastIndexOf"三种key做特殊处理？？这里不知道为啥
 *                3 symbol属性、__proto__、__v_isRef属性直接返回得到的值，不需要track
 *                4 正常的key直接 track(target, TrackOpTypes.GET, key);
 *                5 shallow浅层观察模式直接退出，不再观测子属性
 *                6 ref做处理
 *                7 对象和数组
 */
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // ReactiveFlags.IS_REACTIVE、ReactiveFlags.IS_READONLY、ReactiveFlags.RAW 三个特殊属性做的处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.RAW && receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)) {
      return target;
    }
    // "includes", "indexOf", "lastIndexOf"三种key做特殊处理,用原生的方法来获取，而不是使用代理对象
    const targetIsArray = isArray(target);
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    const res = Reflect.get(target, key, receiver);

    const keyIsSymbol = isSymbol(key);
    // symbol属性、__proto__、__v_isRef属性直接返回得到的值，不需要track跟踪值
    if (keyIsSymbol ? builtInSymbols.has(key as symbol) : key === `__proto__` || key === `__v_isRef`) {
      return res;
    }
    // 不是readonly的数据，
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);
    }
    // 浅层响应式代理，获取一层就退出
    if (shallow) {
      return res;
    }

    if (isRef(res)) {
      // ref unwrapping - does not apply for Array + integer key.
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
      return shouldUnwrap ? res.value : res;
    }

    // 对象和数组，递归的设置响应式数据
    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  };
}
/**
 * 1 非浅层观测情况下，如果修改的是ref值，且新值不为ref，那么只改ref的value
 * 2 不是修改原型链上的数据时，根据该key是否存在过，触发ADD或者SET的更新
 */
function createSetter(shallow = false) {
  return function set(target: object, key: string | symbol, value: unknown, receiver: object): boolean {
    const oldValue = (target as any)[key];
    // 非浅层观测情况
    if (!shallow) {
      // 获取原始值
      value = toRaw(value);
      // 旧值为ref，新值不为ref，只修改旧值ref的value
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }
    // 新设置的key是否是之前对象就有的
    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
    // 设置的结果
    const result = Reflect.set(target, key, value, receiver);
    // don't trigger if target is something up in the prototype chain of original
    // target!==toRaw(receiver)代表在原型链上修改数据不触发更新（target修改一个原型链上的属性，且原型链上有一个 proxy，那个 proxy 的 set() 处理器会被调用，而此时，obj 会作为 receiver 参数传进来）
    if (target === toRaw(receiver)) {
      // 触发更新，分为ADD和SET模式
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }
    return result;
  };
}
/**
 * delete 做一次简单的拦截，然后触发更新
 */
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key);
  const oldValue = (target as any)[key];
  const result = Reflect.deleteProperty(target, key);
  // 删除成功且key之前存在过，触发更新
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  }
  return result;
}
/**
 * has ownKeys 简单的代理一层，做响应式数据追踪
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key);
  }
  return result;
}

function ownKeys(target: object): (string | number | symbol)[] {
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY);
  return Reflect.ownKeys(target);
}
```

`collectionHandlers`对应`Map Set WeakMap WeakSet`的数据劫持。`get ow`

```ts
// 只需要做一个get拦截，因为在map set的内部实现中必须通过 this 才能访问它们的数据，但是通过Reflect 反射的时候，target 内部的 this 其实是指向 proxy 实例的，如果使用Reflect拦截会报错。在vue中使用的get代理的方式处理
export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, false)
};

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations;

  return (target: CollectionTypes, key: string | symbol, receiver: CollectionTypes) => {
    // 三个特殊属性的处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.RAW) {
      return target;
    }

    return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
  };
}
```

主要是看`mutableInstrumentations`里的内容

```ts
const mutableInstrumentations: Record<string, Function> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key);
  },
  get size() {
    return size((this as unknown) as IterableCollections);
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
};
/**map
 * 1 对key和rawKey进行依赖收集
 * 2 使用原生方法获取值，将得到的值进行递归的依赖收集
 */
function get(target: MapTypes, key: unknown, isReadonly = false, isShallow = false) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = (target as any)[ReactiveFlags.RAW];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  // 对key进行依赖追踪
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.GET, key);
  }
  // 对rawKey进行依赖追踪
  !isReadonly && track(rawTarget, TrackOpTypes.GET, rawKey);
  const {has} = getProto(rawTarget);
  const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
  // 使用原生方法判断该key之前是否存在，避免key被重复收集
  if (has.call(rawTarget, key)) {
    // 对target.get(key)进行递归的追踪
    return wrap(target.get(key));
    // 对target.get(rawKey)进行递归的追踪
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  }
}
/**map、set
 * 1 对key和rawKey进行依赖收集
 * 2 使用target调用has方法并返回
 */
function has(this: CollectionTypes, key: unknown, isReadonly = false): boolean {
  const target = (this as any)[ReactiveFlags.RAW];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.HAS, key);
  }
  !isReadonly && track(rawTarget, TrackOpTypes.HAS, rawKey);
  return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
}
/**map、set
 * 对ITERATE_KEY进行依赖收集
 */
function size(target: IterableCollections, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW];
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY);
  return Reflect.get(target, "size", target);
}
/**set
 * 对之前没有的值进行依赖收集
 */
function add(this: SetTypes, value: unknown) {
  value = toRaw(value);
  const target = toRaw(this);
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);
  const result = target.add(value);
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, value, value);
  }
  return result;
}

/**map
 * 根据是否含有key的情况，触发两种模式的依赖更新
 * 返回target的set返回值
 */
function set(this: MapTypes, key: unknown, value: unknown) {
  value = toRaw(value);
  const target = toRaw(this);
  const {has, get} = getProto(target);

  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key);
  }

  const oldValue = get.call(target, key);
  const result = target.set(key, value);
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value);
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue);
  }
  return result;
}
/**map set
 * 如果hadkey，触发delete依赖更新
 * 返回target的delete返回值
 */
function deleteEntry(this: CollectionTypes, key: unknown) {
  const target = toRaw(this);
  const {has, get} = getProto(target);
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key);
  }

  const oldValue = get ? get.call(target, key) : undefined;
  // forward the operation before queueing reactions
  const result = target.delete(key);
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  }
  return result;
}

/**map set
 * 如果target的size不为0，触发clear模式依赖更新
 * 返回target的clear返回值
 */
function clear(this: IterableCollections) {
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  const oldTarget = __DEV__ ? (isMap(target) ? new Map(target) : new Set(target)) : undefined;
  // forward the operation before queueing reactions
  const result = target.clear();
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget);
  }
  return result;
}
```

以上，使用`reactive`方法创建响应式数据时，主要是利用`proxy`拦截数据，与`vue2`观测数据最大的区别是，新增的属性不用
做`hack`处理，数组也可以拦截。

- `Array Object`使用`baseHandlers`里的进行拦截
  - `get`对不是`readonly`数据收集依赖，使用`Reflect.get`获取值`res`
    - 读取的`key`,对应`SymbolKey`和其他特殊的`key`做了特殊处理，不会收集依赖。
    - `shallow`浅层观测下，不会对获取的值做进一步处理
    - `res`为`ref`，如果`res`是对象，返回`res.value`；`key`为 0 和正整数且`res`为数组，返回`res`
    - `res`是否是`Array Object`，判断递归的做`proxy`拦截
  - `set`拦截中做触发依赖更新动作
    - 非浅层观测情况下，如果修改的是 `ref` 值，且新值不为 `ref`，那么只改 `ref` 的 `value`
    - 不是修改原型链上的数据时，根据该 `key` 是否存在过，触发 `ADD` 或者 `SET` 的更新
  - `delete`对删除成功的`key`做依赖更新
  - `has ownKeys`方法中进行依赖收集
- `Map Set WeakMap WeakSet`使用`collectionHandlers`拦截，在`collectionHandlers`只做了`get`拦截，并让`this`指向真正
  的`target`而不是`proxy`对象，因为在`map set`的内部实现中必须通过 `this` 才能访问它们的数据，但是通过`Reflect` 反射的时
  候，`target` 内部的 `this` 其实是指向 `proxy` 实例的，如果使用 `Reflect` 拦截会报错
  - `get`方法对 `key` 和 `rawKey` 进行依赖收集，使用原生方法获取值，将得到的值进行递归的依赖收集
  - `has`对 `key` 和 `rawKey` 进行依赖收集，使用 `target` 调用 `has` 方法并返回
  - `size`对 `ITERATE_KEY` 进行依赖收集
  - `add`对之前没有的 `key` 进行依赖收集
  - `set`根据是否含有 `key` 的情况，触发两种模式的依赖更新
  - `deleteEntry` 对 `hadkey`情况触发 `delete` 依赖更新
  - `clear` 对 `target` 的 `size` 不为 0，触发 `clear` 模式依赖更新

### 1.5 ref

使用`ref`对基础数据进行监听，在`vue2`中是不能的。

```ts
export function ref(value?: unknown) {
  return createRef(value);
}
function createRef(rawValue: unknown, shallow = false) {
  // 已经是ref值，返回该值
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
/**
 * 如果是对象就是用 reactive 创建响应式对象
 */
const convert = <T extends unknown>(val: T): T => (isObject(val) ? reactive(val) : val);
class RefImpl<T> {
  // get和set里使用的value
  private _value: T;
  // 用来判断是否是ref
  public readonly __v_isRef = true;

  constructor(private _rawValue: T, private readonly _shallow = false) {
    //
    this._value = _shallow ? _rawValue : convert(_rawValue);
  }
  // 读取value时进行依赖收集
  get value() {
    track(toRaw(this), TrackOpTypes.GET, "value");
    return this._value;
  }
  // 设置value时触发依赖更新
  set value(newVal) {
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      this._rawValue = newVal;
      this._value = this._shallow ? newVal : convert(newVal);
      trigger(toRaw(this), TriggerOpTypes.SET, "value", newVal);
    }
  }
}
```

以上，`ref`其实是返回了一个`RefImpl`类实例对象，该对象定义了属性`value`的`get set`

- `get`里进行依赖收集
- `set`时，如果新值和旧值不一样时，通知依赖更新

### 1.6 computed

传入一个 `getter` 函数，返回一个默认不可手动修改的 `ref` 对象。或者传入一个拥有 `get` 和 `set` 函数的对象，创建一个可手
动修改的计算状态。

```ts
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T>;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = __DEV__
      ? () => {
          console.warn("Write operation failed: computed value is readonly");
        }
      : NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set) as any;
}

class ComputedRefImpl<T> {
  private _value!: T;
  private _dirty = true;

  public readonly effect: ReactiveEffect<T>;

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean;

  constructor(getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>, isReadonly: boolean) {
    // 创建了一个effect
    this.effect = effect(getter, {
      lazy: true,
      // 当getter里引用的值更新触发了依赖调用，那么scheduler会被调用，触发该computed值的依赖触发
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true;
          // 所有的dep都执行时，同时触发computed的依赖更新
          trigger(toRaw(this), TriggerOpTypes.SET, "value");
        }
      }
    });

    this[ReactiveFlags.IS_READONLY] = isReadonly;
  }

  get value() {
    // _dirty为false时直接返回值，为true时执行effect()，这一步设置了activeEffect函数，在读取值后进行依赖收集
    if (this._dirty) {
      this._value = this.effect();
      this._dirty = false;
    }
    // 读取computed值时进行依赖收集
    track(toRaw(this), TrackOpTypes.GET, "value");
    return this._value;
  }

  set value(newValue: T) {
    this._setter(newValue);
  }
}
```

以上，`computed`传入一个`getter`函数，创建了一个`ref`

- `computed`以`getter`函数创建了一个`effect`，在读取`computed`值时会调用`effect`，从而得到`activeEffect`，
  在`value`的`get`函数中调用`track`函数收集了该 `effect`

- `getter`函数里使用了其他的响应式数据，这样在读取`computed`值时，会触发其他响应式数据的 `get`拦截，从而其他的响应式数据
  收集到了`computed`里的`effect`，在`computed.value`的 get 函数中，收集了该 `value` 的依赖
- 当`getter`函数里的其他响应式数据更新，触发`computed`里的`effect`依赖更新，调用`effect.options.scheduler`函数，
  在`scheduler`里触发了`computed.value`依赖更新
