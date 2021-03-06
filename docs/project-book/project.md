# 踩坑记录

## 1. H5 页面适配 IPHONEX

> iphonex 取消了物理按键，改成底部小黑条。
> ios11 新增特性，苹果公司为了适配 iPhoneX 对现有 viewport meta 标签的一个扩展,

- contain: 可视窗口完全包含网页内容（左图）
- cover：网页内容完全覆盖可视窗口（右图）
- auto：默认值，跟 contain 表现一致

> 需要适配 iPhoneX 必须设置 viewport-fit=cover，这是适配的关键步骤。

### env() 和 constant()

iOS11 新增特性，Webkit 的一个 CSS 函数，用于设定安全区域与边界的距离，有四个预定义的变量：

- safe-area-inset-left：安全区域距离左边边界距离
- safe-area-inset-right：安全区域距离右边边界距离
- safe-area-inset-top：安全区域距离顶部边界距离
- safe-area-inset-bottom：安全区域距离底部边界距离

> 适配底部 fixed 元素的 tabbar 时，使用 safe-area-inset-bottom 这个变量，因为它对应的就是小黑条的高度 <br> > _注意：当 viewport-fit=contain 时 env() 是不起作用的，必须要配合 viewport-fit=cover 使用。对于不支持 env() 的浏览器，浏览器将会忽略它。_

```css
padding-bottom: constant(
  safe-area-inset-bottom
); /* 兼容 iOS < 11.2 */ /*constant() 在 iOS11.2 之后就不能使用的*/
padding-bottom: env(safe-area-inset-bottom); /* 兼容 iOS >= 11.2 */
```

### 适配开始

- 1 设置 viewport

```html
<meta
  name="viewport"
  content="initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no,viewport-fit=cover"
/>
```

- 2 使用@supports 隔离兼容样式 如果我们只希望 iPhoneX 才需要新增适配样式，我们可以配合 @supports 来隔离兼容样式

```css
@supports (bottom: constant(safe-area-inset-bottom)) or
  (bottom: env(safe-area-inset-bottom)) {
  div {
    margin-bottom: constant(safe-area-inset-bottom);
    margin-bottom: env(safe-area-inset-bottom);
  }
}
```

- 3 页面主体内容限定在安全区域内

```css
body {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

- 4 适配 fixed 吸底元素
  > 1 使用 margin-bottom 或者 padding-bottom <br>
  > 2 通过 calc 扩展元素高度

```css
/* 1 更改padding-bottom*/
 {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 2 覆盖高度*/
 {
  height: calc(60px (假设值) + constant(safe-area-inset-bottom));
  height: calc(60px (假设值) + env(safe-area-inset-bottom));
}
```

## 2. 苹果微信浏览器滑动，出现网站标识

> 微信自带浏览器往下拖动会动态查看网页网址，影响网页的用户体验，尤其是苹果小屏手机，滑动列表页时，因为这个默认行为导致滑动不顺畅。<br>
> 可以在 _touchstart touchmove_ 事件中**阻止默认行为**解决该问题

网上搜索的一种方法：

```js
/**
 * 这种方法的缺点是如果有多个地方滚动，那么就要在这些容器上调用overscroll方法
 */
const overscroll = function(el) {
  el.addEventListener('touchstart', function() {
    var top = el.scrollTop,
      totalScroll = el.scrollHeight,
      currentScroll = top + el.offsetHeight
    // 顶部下滑
    if (top === 0) {
      el.scrollTop = 1
    } else if (currentScroll === totalScroll) {
      // 底部赏花
      el.scrollTop = top - 1
    }
  })
  el.addEventListener('touchmove', function(evt) {
    if (el.offsetHeight < el.scrollHeight) evt._isScroller = true
  })
}

overscroll(document.querySelector('.scroll'))
document.body.addEventListener('touchmove', function(evt) {
  if (!evt._isScroller) {
    evt.preventDefault()
  }
})
```

如果只是单页面某个路由控制这问题，参考以下：

```js
// mounted
this.$el.addEventListener('touchstart', this.handleTouchStart)
this.$el.addEventListener('touchmove', this.handleTouchMove)

// start
handleTouchStart(e) {
      this.startY = e.touches[0].pageY
    },
// move 中间有个坑，如果在start 和move 事件中阻止冒泡（e.stopPropagation()），那么会导致用了fastclick的dom上监听click事件失效
handleTouchMove(e) {
    const endY = e.changedTouches[0].pageY
    const changedY = endY - this.startY
    const scroll_top = this.$el.scrollTop
    // 判断是否在顶部，且向下拖动
    if (scroll_top === 0 && changedY > 0) {
    e.preventDefault()
    }
    // 判断是否在底部，且向上拖动
    const totalScroll = this.$el.scrollHeight
    const currentScroll = scroll_top + this.$el.offsetHeight
    if (currentScroll === totalScroll && changedY < 0) {
    e.preventDefault()
    }
},

// unmounted
this.$el.removeEventListener('touchstart', this.handleTouchStart)
this.$el.removeEventListener('touchmove', this.handleTouchMove)
```

## 3. video 标签在移动端的坑

> 需求描述：实现类似于斗鱼客户端中的直播列表页面，滑动到对应的直播位置播放该直播的视频。

### 坑 1 自动播放

自动播放的需求还是很多的，但是由于消耗用户流量，浏览器和系统的限制了自动播放。即在无交互的情况下调用 play()方法会没有效果。<br>
在 webview，微信浏览器和小米自带的浏览器试了后，至少的一个前提是要静音且有交互。

<!--
- ios

  > 早期必须要有用户手势（user gesture）video 标签才可以播放； 从版本 10 开始修改了 video 的规则，苹果放宽了 inline 和 autoplay，策略如下（仅适用于 Safari 浏览器）：

  1. 无音频源的 video 元素 允许自动播放
  2. 禁音的 video 元素允许自动播放
  3. 如果 video 元素在没有用户手势下有了音频源或者变成非禁音，会暂停播放
  4. video 元素屏幕可见才开始播放
  5. video 元素不可见后停止播放

- 安卓早期同样需要用户手势才可以播放,安卓的 chrome 53 后放宽了自动播放策略，策略不同于 IOS 的 Safari，需要同时对 video 设置 autoplay 和 muted（是否禁音），才允许自动播放； 安卓的 FireFox 和 UC 浏览器支持任何情况下的自动播放；
  1. 即要开启静音 -->

考虑到需求，在监听页面的滚动事件时来控制 video 的播放，播放完毕后调用 paly 播放下一个视频。至此，在公司 app 里的 webview 和小米手机浏览器中可以完成播放功能。但是在微信浏览器（安卓）中并不行，最多只会播放第一个视频，下个视频不会自动播放，一定要与用户交互，第一个坑到此结束

### 坑 2 局域播放

直播列表，那就注定视频在列表页不是全屏播放，所以要局域播放。此时需要 `playsinline` 属性，考虑到兼容性，加上 `webkit-playsinline` 和 `x5-playsinline`

```js
<video
  muted="muted"
  v-show="index != loop"
  :poster="videoPoster"
  x5-playsinline="true" /*在微信浏览器中小屏播放*/
  x5-video-orientation="portraint"
  playsinline // 小屏播放
  webkit-playsinline="true" /*ios 10 以下设置区域播放*/
  preload="auto"
  :src="videoSrc"
  ref="cardVideo"
  @ended="videoEnd"
  @pause="videoPause"
  @playing="videoPlaying"
></video>
```

`x5-video-player-type="h5" /_启用 H5 播放器,是 wechat 安卓版特性_/` 注意这个属性，启用这个属性，视频不会在区域内播放，而是开启个全屏播放。

### 3 video 层级最高

在安卓中，视频播放后，视频的渲染就被浏览器接管了，此时的 video 标签层级最高。需求是点击视频跳到直播也，但是 video 被浏览器接管后，点击会出现 video 的控制跳，video 的点击事件监听不到，导致该需求在播放视频时实现不了。<br>
后来想到用 canvas 绘制视频，在谷歌浏览器调试时一切正常，但是在安卓中打开会让视频区域黑屏，遂放弃这个方案

```js
video.addEventListener(
  'play',
  () => {
    var i = window.setInterval(function() {
      // 此处可改成window.requestAnimationFrame
      if (video.ended || video.pause) {
        clearInterval(i)
      }
      ctx.drawImage(v, 0, 0, 270, 135)
    }, 16)
  },
  false
)
```

### 4 参考文章

[视频播放--踩坑小计 ](https://juejin.im/post/5b189712f265da6e235488c1#heading-13)

## 4 fastclick 在部分 ios 引起的问题

在 ios11 以上的机型上，由于引入了 fastclick 导致点击 input 需要点好几次才能聚焦。由于 ios11 以上已经没有 300ms 的延迟，调用 fastclick 的 focus 方法不会聚焦，修改其原型方法。

```js
FastClick.prototype.focus = function(targetElement) {
  let length

  // Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
  if (
    deviceIsIOS &&
    targetElement.setSelectionRange &&
    targetElement.type.indexOf('date') !== 0 &&
    targetElement.type !== 'time' &&
    targetElement.type !== 'month'
  ) {
    targetElement.focus()
    length = targetElement.value.length
    targetElement.setSelectionRange(length, length)
  } else {
    targetElement.focus()
  }
}
```
