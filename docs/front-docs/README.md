<!-- # vue

## 1 Vue.extend 方法使用

> 使用 extend 将单文件组件变成构造器，使用 new 实例化对象。最后修改组件里的值，改变组件的状态
> 常用于 loading 组件，message 组件

```js
import Vue from 'vue'
import LoadingVue from '../../create-order/components/Loading'
// 生成构造器
const LoadingConstructor = Vue.extend(LoadingVue)
let instance
// 实例化
const initInstance = () => {
  instance = new LoadingConstructor({
    el: document.createElement('div')
  })
  // 挂载到dom
  document.body.appendChild(instance.$el)
}
function Loading() {
  if (!instance) {
    initInstance()
  }
}
Loading.show = function() {
  Loading()
  //改变实例的值，显示loading组件
  instance.value = true
}

Loading.close = function() {
  //改变实例的值，关闭loading组件
  instance && (instance.value = false)
}

export default Loading
``` -->
