# typescript

## 1 枚举 Enum

提高代码可读性

- 常量枚举：常量枚举通过在枚举上使用 const 修饰符来定义，常量枚举不同于常规的枚举，他们会在编译阶段被删除。

```typescript
const enum Size {
  WIDTH = 10,
  HEIGHT = 20
}
const area = Size.WIDTH * Size.HEIGHT // 200
```

## 2 interface 和 class

- `class`使用
