# 5 webpack 之 tabpable

`webpack` 的核心对象`Compiler Compilation`都是`Tapable`的子类.</br>
`Tapable` 是一个类似于`Node.js` 的 `EventEmitter` 的库, 主要是控制钩子函数的发布 与订阅,控制着 `webpack` 的插件系统。

## 5.1 tabpable-hooks

- tapable 的 hook 接受一个数组参数,表示回调时接受参数的个数,触发钩子时,多余的参数不会传递过去.
- hook 使用`tap tapAsync tapPromise`注册事件,使用`call callAsync promise`触发事件,`tapAsync tapPromise`不能用于`Sync`开头的钩子类.call 对应 tap、callAsync 对应 tapAsync 和 promise 对应 tapPromise。一般来说，我们注册事件回调时用了什么方法，触发时最好也使用对应的方法。
- **事件回调的运行逻辑**
  - Basic:基础类型,单纯的调用注册的事件回调,并不关心其内部的运行逻辑
  - Bail:保险类型(熔断类型),当一个事件回调在运行时返回的值不为`undefined`时,停止后面事件回调的执行
  - Waterfall:瀑布类型,如果当前执行的事件回调返回的值不为`undefined`时,那么就把下一个事件回调的第一个参数替换成这个值
  - Loop:循环类型,如果当前执行的事件回调返回的值不为`undefined`时,重新从第一个注册的事件回调处执行,直到当前执行的事件回调没有返回值
- **触发事件的方式**
  - Sync:Sync 开头的 HOOK 类只能使用`tap`方法注册事件回调,这类事件回调会同步执行,如果使用`tapAsync tapPromise`方法注册会报错
  - AsyncSeries:Async 开头的 HOOK 类,不能用`call`方法触发事件,必须用`callAsync promise`方法触发,这两个方法都能触发`tap tapAsync tapPromise`注册的事件回调,`AsyncSeries`按照顺序执行,如果事件回调时异步的,那么回调等到当前异步执行完毕才会执行下一个事件回调
  - AsyncParalle:与`AsyncSeries`类似,只不过`AsyncParalle`会并行的执行所有的事件回调

## 5.2 事件注册的先后顺序

注册事件时,使用`stage before`控制执行顺序

```js
const { SyncHook } = require('tapable')
const hook = new SyncHook(['name'])
/**
 * 1 注册事件时，可以传递stage参数控制执行顺序，stage越大，执行的越后,不传默认为0
 * 2 传递before参数，可以是字符串也可以是数组，控制在哪个事件之前执行
 * 这两个属性最好不要同时使用，容易造成混乱
 */
hook.tap(
  {
    name: 'first',
    stage: 1
  },
  (name, other) => {
    console.log('trigger first', name, other)
  }
)
hook.tap(
  {
    name: 'second',
    stage: 0
  },
  (name, other) => {
    console.log('trigger second', name, other)
  }
)
hook.tap(
  {
    name: 'third',
    before: 'second'
  },
  (name, other) => {
    console.log('trigger third', name, other)
  }
)

hook.call('test')
/**
 * output
 *
 * trigger third test undefined
 * trigger second test undefined
 * trigger first test undefined
 */
```

## 5.3 事件注册和触发

- 1 call|tap</br>call 传入参数的数量需要与实例化时传递给钩子类构造函数的数组长度保持一致。

```js
const { SyncHook } = require('tapable')
// 1.实例化钩子类时传入的数组，实际上只用上了数组的长度，名称是为了便于维护
const hook = new SyncHook(['name'])

// 3.other 会是 undefined，因为这个参数并没有在实例化钩子类的数组中声明
hook.tap('first', (name, other) => {
  console.log('first', name, other)
})

// 2.实例化钩子类的数组长度为 1，这里却传了 2 个传入参数
hook.call('call', 'test')

/**
 * Console output:
 *
 * first call undefined
 */
```

- 2 callAsync|tapAsync

  > `callAsync` 与 `call` 不同的是：在传入了与实例化钩子类的数组长度一致个数的传入参数时，还需要在最后添加一个回调函数，否则在事件回调中执行回调函数可能会报错</br> `tapAsync`注册的回调`callback`,`callback`必须要执行，否则不会执行后续的事件回调和 callAsync 传入的回调，这是因为事件回调接收的 callback 已经是对 callAsync 传入的回调做了一层封装的结果了

  - 如果 callback 执行时不传入值，就会继续执行后续的事件回调。
  - 如果传入错误信息，就会直接执行 callAsync 传入的回调，不再执行后续的事件回调；这实际上意味着事件回调执行有错误，也就是说 callAsync 传入的是一个错误优先回调，既然是错误优先回调，那它是可以接收第二个参数的，这个参数将被传入正确的值

```js
const { AsyncSeriesHook } = require('tapable')
const hook = new AsyncSeriesHook(['name'])
hook.tapAsync('first', (name, cb) => {
  setTimeout(() => {
    // 1s后打印
    console.log('first', name, cb)
    cb()
  }, 1000)
})
hook.tapAsync('second', (name, cb) => {
  setTimeout(() => {
    // 等待first执行后再执行,2s后会打印
    console.log('second', name, cb)
    cb()
    /**
    cb(1)
    third不会执行
    **/
  }, 1000)
})
hook.tapAsync('third', (name, cb) => {
  console.log('third', name, cb)
  cb()
})

hook.callAsync('tom', (err, ...args) => {
  console.log('callAsync', err, args)
})
console.timeEnd('hook start') // hook start: 2.308ms
```

- 3 promise|tapPromise
  > `promise` 执行之后会返回一个 Promise 对象。在使用 `tapPromise` 注册事件回调时，事件回调必须返回一个 Promise 对象，否则会报错，这是为了确保事件回调能够按照顺序执行。

```js
const { AsyncSeriesHook } = require('tapable')
const hook = new AsyncSeriesHook(['name'])
hook.tapPromise('first', name => {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('first', name)
      resolve('first')
    }, 1000)
  })
})
hook.tapAsync('second', (name, cb) => {
  setTimeout(() => {
    console.log('second', name)
    cb()
  }, 1000)
})
/**
 * 如果最后一个注册事件不是tapPromise,那么promise不会执行
 */
hook.tapAsync('third', name => {
  console.log('third', name)
  return Promise.resolve('third')
})

const promise = hook.promise('tom')
console.timeEnd('hook start') // hook start: 2.308ms
console.log('p', promise)

promise.then(
  v => {
    console.log('value', v) // value undefined 值不会传递过来
  },
  e => {
    console.log('reason', e)
  }
)
```

## 5.4 拦截器

- 可以给钩子类添加拦截器，这样就能对事件回调的注册、调用以及事件的触发进行监听
- 用 `tap` 或者其他方法注册事件回调以及添加拦截器时，可以把配置对象中的 `context` 设置为 `true`，这将让我们在事件回调或者拦截器方法中获取 `context` 对象，这个对象会变成它们的第一个参数。

```js
/**
 * hook拦截器
 */
const { SyncHook } = require('tapable')
const hook = new SyncHook()

hook.intercept({
  context: true,
  // 注册时执行
  register(tap) {
    console.log('register', tap)
    return tap
  },
  // 触发事件时执行
  call(...args) {
    console.log('call', args)
  },
  // 在 call 拦截器之后执行
  loop(...args) {
    console.log('loop', args)
  },
  // 事件回调调用前执行
  tap(tap) {
    console.log('tap', tap)
  }
})
hook.tap({ name: 'first', context: true }, context => {
  console.log('first', context)
})
hook.tap('second', () => {
  console.log('first')
})
hook.call()
```

## 5.5 SyncHook

`Basic` 类型的钩子类很简单就是按照顺序执行事件回调，没有任何其他功能。

```js
const { SyncHook } = require('tapable')
const hook = new SyncHook(['name'])

// 注册事件回调
hook.tap('first', name => {
  console.log('first', name)
})

hook.tap('second', name => {
  console.log('second', name)
})

// 触发事件
hook.call('call')

/**
 * Console output:
 *
 * first call
 * second call
 */
```

## 5.6 AsyncSeriesBailHook

Bail 类型的钩子类在事件回调有返回值时，会终止后续事件回调的运行，但是这只对 tap 方法有效，下面来看下不同的注册事件回调的方法是怎么触发这一功能的。

```js
const { AsyncSeriesBailHook } = require('tapable')
const hook = new AsyncSeriesBailHook(['name'])

hook.tap('first', name => {
  console.log('first', name)
  // return 不为 undefined 的值
  // return 'first return';
  /**
   * Console output:
   *
   * first callAsync
   * end null first return
   */
})

hook.tapAsync('second', (name, callback) => {
  console.log('second', name)
  // callback 的第一个参数需要传入 null，表明没有错误；
  // 第二个参数需要传入不为 undefined 的值；
  // 这便是错误优先回调的标准格式。
  // callback(null, 'second return');
  /**
   * Console output:
   *
   * first callAsync
   * second callAsync
   * end null second return
   */
  callback()
})

hook.tapPromise('third', (name, callback) => {
  console.log('third', name)
  // Promise 最终状态被置为 Fulfilled，并且值不为 undefined
  // return Promise.resolve('third return');
  /**
   * Console output:
   *
   * first callAsync
   * second callAsync
   * third callAsync
   * end null third return
   */
  return Promise.resolve()
})

hook.tap('fourth', name => {
  console.log('fourth', name)
})

hook.callAsync('callAsync', (error, result) => {
  console.log('end', error, result)
})

// 使用 promise 方法触发事件，事件回调中也是用一样的方式来停止后续事件回调执行的；
// 区别主要在于处理错误和值的方式而已，这便是异步回调和 Promise 的不同之处了，
// 并不在本文探讨范围之内。
// const promise = hook.promise('promise');
// promise.then(value => {
//   console.log('value', value);
// }, reason => {
//   console.log('reason', reason);
// });
```

## 5.7 AsyncSeriesWaterfallHook

Waterfall 类型的钩子类在当前事件回调返回不为 undefined 的值时，会把下一个事件回调的第一个参数替换成这个值，当然这也是针对 tap 注册的事件回调，其他注册方法触发这一功能的方式如下：

```js
const { AsyncSeriesWaterfallHook } = require('tapable')
const hook = new AsyncSeriesWaterfallHook(['name'])

hook.tap('first', name => {
  console.log('first', name)
  // 返回不为 undefined 的值
  return name + ' - ' + 'first'
})

hook.tapAsync('second', (name, callback) => {
  // 因为 tap 注册的事件回调返回了值，所以 name 为 callAsync - first
  console.log('second', name)
  // 在第二个参数中传入不为 undefined 的值
  callback(null, name + ' - ' + ' second')
})

hook.tapPromise('third', name => {
  console.log('third', name)
  // Promise 最终状态被置为 Fulfilled，并且值不为 undefined
  return Promise.resolve(name + ' - ' + 'third')
})

hook.tap('fourth', name => {
  // 当前事件回调没有返回不为 undefined 的值，因此 name 没有被替换
  console.log('fourth', name)
})

hook.callAsync('callAsync', (error, result) => {
  console.log('end', error, result)
})

/**
 * Console output:
 *
 * first callAsync
 * second callAsync - first
 * third callAsync - first -  second
 * fourth callAsync - first -  second - third
 * end null callAsync - first -  second - third
 */
```

## 5.8 SyncLoopHook

Loop 类型的钩子类在当前执行的事件回调的返回值不是 undefined 时，会重新从第一个注册的事件回调处执行，直到当前执行的事件回调没有返回值。

```js
const { SyncLoopHook } = require('tapable')
const hook = new SyncLoopHook(['name'])
const INDENT_SPACE = 4
let firstCount = 0
let secondCount = 0
let thirdCount = 0
let indent = 0

function indentLog(...text) {
  console.log(new Array(indent).join(' '), ...text)
}

hook.tap('first', name => {
  if (firstCount === 1) {
    firstCount = 0
    indent -= INDENT_SPACE
    indentLog('</callback-first>')
    return
  }
  firstCount++
  indentLog('<callback-first>')
  indent += INDENT_SPACE
  return true
})

hook.tap('second', name => {
  if (secondCount === 1) {
    secondCount = 0
    indent -= INDENT_SPACE
    indentLog('</callback-second>')
    return
  }
  secondCount++
  indentLog('<callback-second>')
  indent += INDENT_SPACE
  return true
})

hook.tap('third', name => {
  if (thirdCount === 1) {
    thirdCount = 0
    indent -= INDENT_SPACE
    indentLog('</callback-third>')
    return
  }
  thirdCount++
  indentLog('<callback-third>')
  indent += INDENT_SPACE
  return true
})

hook.call('call')

/**
 * Console output:
 *
 *  <callback-first>
 *  </callback-first>
 *  <callback-second>
 *     <callback-first>
 *     </callback-first>
 *  </callback-second>
 *  <callback-third>
 *     <callback-first>
 *     </callback-first>
 *     <callback-second>
 *         <callback-first>
 *         </callback-first>
 *     </callback-second>
 *  </callback-third>
 */
```

## 5.9 AsyncParallelHook

会并行执行所有的事件回调，因此异步的事件回调中的错误并不会阻止其他事件回调的运行。会执行第一个抛出错误的函数,后续的错误不会再执行

```js
const { AsyncParallelHook } = require('tapable')
const hook = new AsyncParallelHook(['name'])

hook.tap('first', name => {
  console.log('first', name)
})

hook.tapAsync('second', (name, callback) => {
  setTimeout(() => {
    console.log('second', name)
    callback()
  }, 2000)
})

hook.tapPromise('third', name => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('third', name)
      // 抛出了错误，但是只是提前执行了 callAsync 传入回调函数，并不会阻止其他事件回调运行
      reject('third error')
    }, 1000)
  })
})

hook.callAsync('callAsync', error => {
  console.log('end', error)
})

/**
 * Console output:
 *
 * first callAsync
 * third callAsync
 * end third error
 * second callAsync
 */
```

## 5.10 AsyncParallelBailHook

会并行执行所有事件回调，但是这个钩子类中的事件回调返回值如果不为 undefined，那么 callAsync 传入的回调函数的第二参数会是最先拥有返回值（这里的返回值有多种方式：return result、callback(null, result) 和 return Promise.resolve(result)）逻辑的事件回调的那个返回值.

> 这里与`AsyncParallelHook`类似,只不过`AsyncParallelHook`的回调优先执行最先出错的,`AsyncParallelBailHook`优先执行最先有返回值的

```js
onst { AsyncParallelBailHook } = require('tapable')
const hook = new AsyncParallelBailHook(['name'])

hook.tap('first', name => {
  console.log('first', name)
})

// 最先拥有返回值逻辑的事件回调
hook.tapAsync('second', (name, callback) => {
  setTimeout(() => {
    console.log('second', name)
    // 使用 callback 传入了不是 undefined 的返回值。
    callback(null, 'second result')
  }, 1000)
})

// 虽然这个异步的事件回调中的 Promise 对象会比第二个异步的事件回调早执行完毕，
// 但是因为第二个事件回调中已经拥有了返回值的逻辑，
// 因此这个事件回调不会执行 callAsync 传入的回调函数。
// 除非将third的执行顺序放到前面去,就会先执行这个值的回调
hook.tapPromise('third', name => {
  console.log('third', name)
  // 返回了一个 Promise 对象，并且它的状态是 Fulfilled, 值不为 undefined。
  return Promise.resolve('third result')
})

hook.callAsync('callAsync', (error, result) => {
  console.log('end', error, result)
})

/**
 * Console output:
 *
 * first callAsync
 * third callAsync
 * second callAsync
 * end null second result
 */

```
