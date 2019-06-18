---
sidebar: auto
---

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
