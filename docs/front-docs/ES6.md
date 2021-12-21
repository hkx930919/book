# ES6

## ES6介绍
1. ECMAScript 和 JavaScript 的关系

ECMAScript 和 JavaScript 的关系是，前者是后者的规格，后者是前者的一种实现（另外的 ECMAScript 方言还有 JScript 和 ActionScript）。日常场合，这两个词是可以互换的。

>1996 年 11 月，JavaScript 的创造者 Netscape 公司，决定将 JavaScript 提交给标准化组织 ECMA，希望这种语言能够成为国际标准。次年，ECMA 发布 262 号标准文件（ECMA-262）的第一版，规定了浏览器脚本语言的标准，并将这种语言称为 ECMAScript，这个版本就是 1.0 版。

>该标准从一开始就是针对 JavaScript 语言制定的，但是之所以不叫 JavaScript，有两个原因。一是商标，Java 是 Sun 公司的商标，根据授权协议，只有 Netscape 公司可以合法地使用 JavaScript 这个名字，且 JavaScript 本身也已经被 Netscape 公司注册为商标。二是想体现这门语言的制定者是 ECMA，不是 Netscape，这样有利于保证这门语言的开放性和中立性。

2. ES6 与 ECMAScript 2015 的关系

ECMAScript 2015（简称 ES2015）这个词，也是经常可以看到的。它与 ES6 是什么关系呢？

2011 年，ECMAScript 5.1 版发布后，就开始制定 6.0 版了。因此，ES6 这个词的原意，就是指 JavaScript 语言的下一个版本。但是，因为这个版本引入的语法功能太多，而且制定过程当中，还有很多组织和个人不断提交新功能。事情很快就变得清楚了，不可能在一个版本里面包括所有将要引入的功能。常规的做法是先发布 6.0 版，过一段时间再发 6.1 版，然后是 6.2 版、6.3 版等等。

但是，标准的制定者不想这样做。他们想让标准的升级成为常规流程：**任何人在任何时候，都可以向标准委员会提交新语法的提案，然后标准委员会每个月开一次会，评估这些提案是否可以接受，需要哪些改进。如果经过多次会议以后，一个提案足够成熟了，就可以正式进入标准了**。这就是说，标准的版本升级成为了一个不断滚动的流程，每个月都会有变动。

标准委员会最终决定，标准在每年的 6 月份正式发布一次，作为当年的正式版本。接下来的时间，就在这个版本的基础上做改动，直到下一年的 6 月份，草案就自然变成了新一年的版本。这样一来，就不需要以前的版本号了，只要用年份标记就可以了。

>因此，ES6 既是一个历史名词，也是一个泛指，含义是 5.1 版以后的 JavaScript 的下一代标准，涵盖了 ES2015、ES2016、ES2017 等等，而 ES2015 则是正式名称，特指该年发布的正式版本的语言标准。本书中提到 ES6 的地方，一般是指 ES2015 标准，但有时也是泛指“下一代 JavaScript 语言”。

## ES6常用知识点

### let 和 const 
####  `let`
>用来声明变量。它的用法类似于var，但是所声明的变量，只在let命令所在的代码块内有效。

注意事项：
- 不存在变量提升
  - `var`命令会发生“变量提升”现象，即变量可以在声明之前使用，值为`undefined`.为了纠正这种现象，let命令改变了语法行为，它所声明的变量一定要在声明后使用，否则报错。
```js
  // var 的情况
console.log(foo); // 输出undefined
var foo = 2;

// let 的情况
console.log(bar); // 报错 bar is not defined ReferenceError
let bar = 2;

```
- 暂时性死区
> ES6 明确规定，如果区块中存在let和const命令，这个区块对这些命令声明的变量，从一开始就形成了封闭作用域。凡是在声明之前就使用这些变量，就会报错.总之，在代码块内，使用let命令声明变量之前，该变量都是不可用的。这在语法上，称为“暂时性死区”（temporal dead zone，简称 TDZ）。
```js
if (true) {
  // TDZ开始
  tmp = 'abc'; // ReferenceError
  console.log(tmp); // ReferenceError

  let tmp; // TDZ结束
  console.log(tmp); // undefined

  tmp = 123;
  console.log(tmp); // 123
}
```

- 不允许重复声明
>不允许在相同作用域内，重复声明同一个变量。
```js
// 报错 Identifier 'a' has already been declared
function func() {
  let a = 10;
  var a = 1;
}

// 报错 Identifier 'a' has already been declared
function func() {
  let a = 10;
  let a = 1;
}
```

#### `const`
>声明一个只读的常量。一旦声明，常量的值就不能改变

```js
const PI = 3.1415;

PI = 3; // error: Assignment to constant variable
```
对于const来说，只声明不赋值，就会报错
```js
const foo // Missing initializer in const declaration
```

`const`的特点和`let`一样。
- 只在声明所在的块级作用域内有效。
- 声明的常量也是不提升，同样存在暂时性死区，只能在声明的位置后面使用。
- 不可重复声明
### 解构赋值
>ES6 允许按照一定模式，从数组和对象中提取值，对变量进行赋值，这被称为解构

#### 1 数组的解构赋值
```js
// before
let a = 1;
let b = 2;
let c = 3;


// 解构赋值 可以从数组中提取值，按照对应位置，对变量赋值。
let [a, b, c] = [1, 2, 3];
```

- 如果解构不成功，变量的值就等于`undefined`。

```js
let [foo] = [];
let [bar, foo] = [1];
```
以上两种情况都属于解构不成功，foo的值都会等于undefined。

- 不完全解构.即等号左边的模式，只匹配一部分的等号右边的数组
```js
let [x, y] = [1, 2, 3];
x // 1
y // 2

let [a, [b], d] = [1, [2, 3], 4];
a // 1
b // 2
d // 4
```

上面两个例子，都属于不完全解构，但是可以成功。

> 只要某种数据结构具有 Iterator 接口，都可以采用数组形式的解构赋值。

- 解构赋值允许指定默认值。
```js
let [foo = true] = [];
foo // true

let [x, y = 'b'] = ['a']; // x='a', y='b'
let [x, y = 'b'] = ['a', undefined]; // x='a', y='b'
```
>ES6 内部使用严格相等运算符（===），判断一个位置是否有值。所以，只有当一个数组成员严格等于`undefined`，默认值才会生效。
```js
let [x = 1] = [undefined];
x // 1

let [x = 1] = [null];
x // null 因为null不严格等于undefined,所以x为null
```
#### 2 对象的解构赋值
解构不仅可以用于数组，还可以用于对象。
```js
let { foo, bar } = { foo: 'aaa', bar: 'bbb' };
foo // "aaa"
bar // "bbb"
```
对象的解构与数组有一个重要的不同。数组的元素是按次序排列的，变量的取值由它的位置决定；而对象的属性没有次序，变量必须与属性同名，才能取到正确的值。
```js
let { bar, foo } = { foo: 'aaa', bar: 'bbb' };
foo // "aaa"
bar // "bbb"

let { baz } = { foo: 'aaa', bar: 'bbb' };
baz // undefined  解构失败，变量的值等于undefined。
```
对象的解构赋值，可以很方便地将现有对象的方法，赋值到某个变量。
```js
// 例一
let { log, sin, cos } = Math;

// 例二
const { log } = console;
log('hello') // hello
```

如果变量名与属性名不一致，必须写成下面这样。
```js
let { foo: baz } = { foo: 'aaa', bar: 'bbb' };
baz // "aaa"

let obj = { first: 'hello', last: 'world' };
let { first: f, last: l } = obj;
f // 'hello'
l // 'world'
```

实际上说明，对象的解构赋值是下面形式的简写

```js
let { foo: foo, bar: bar } = { foo: 'aaa', bar: 'bbb' };
```
对象的解构赋值的内部机制，是先找到同名属性，然后再赋给对应的变量。真正被赋值的是后者，而不是前者。
```js
let { foo: baz } = { foo: 'aaa', bar: 'bbb' };
baz // "aaa"
foo // error: foo is not defined
```
- 对象的解构也可以指定默认值。
```js
const {x = 3} = {x: undefined};
x // 3

const {x = 3} = {x: null};
x // null
```

- 由于数组本质是特殊的对象，因此可以对数组进行对象属性的解构。
```js
let arr = [1, 2, 3];
let {0 : first, [arr.length - 1] : last} = arr;
first // 1
last // 3
```
上面代码对数组进行对象解构。数组`arr`的`0`键对应的值是`1`，`[arr.length - 1]`就是`2`键，对应的值是`3`。方括号这种写法，属于`“属性名表达式”`

#### 3 字符串的解构赋值
字符串也可以解构赋值。这是因为此时，字符串被转换成了一个类似数组的对象。
```js
const [a, b, c, d, e] = 'hello';
a // "h"
b // "e"
c // "l"
d // "l"
e // "o"
```
类似数组的对象都有一个length属性，因此还可以对这个属性解构赋值。
```js
let {length : len} = 'hello';
len // 5
```

#### 4 数值和布尔值的解构赋值
解构赋值时，如果等号右边是数值和布尔值，则会先转为对象。
```js
let {toString: s} = 123;
s === Number.prototype.toString // true

let {toString: t} = true;
t=== Boolean.prototype.toString // true
```
上面代码中，数值和布尔值的包装对象都有toString属性，因此变量s都能取到值。

解构赋值的规则是，只要等号右边的值不是对象或数组，就先将其转为对象。由于undefined和null无法转为对象，所以对它们进行解构赋值，都会报错。
```js
let { prop: x } = undefined; // TypeError Cannot destructure property 'prop' of 'undefined' as it is undefined.
let { prop: y } = null; // TypeError Cannot destructure property 'prop' of 'null' as it is null.
```
#### 5 函数参数的解构赋值
```js
function add([x, y]){
  return x + y;
}

add([1, 2]); // 3
```
上面代码中，函数add的参数表面上是一个数组，但在传入参数的那一刻，数组参数就被解构成变量x和y。对于函数内部的代码来说，它们能感受到的参数就是x和y。

- 函数参数的解构也可以使用默认值。

```js
function move({x = 0, y = 0} = {}) {
  return [x, y];
}

move({x: 3, y: 8}); // [3, 8]
move({x: 3}); // [3, 0]
move({}); // [0, 0]
move(); // [0, 0]
```
上面代码中，函数move的参数是一个对象，通过对这个对象进行解构，得到变量x和y的值。如果解构失败，x和y等于默认值。

### 字符串的扩展
- 字符串的遍历器接口

ES6 为字符串添加了遍历器接口,使得字符串可以被for...of循环遍历。
```js
for (let codePoint of 'foo') {
  console.log(codePoint)
}
// "f"
// "o"
// "o"
```

- 模板字符串
传统的 JavaScript 语言，输出模板通常是这样写的
```js
$('#result').append(
  'There are <b>' + basket.count + '</b> ' +
  'items in your basket, ' +
  '<em>' + basket.onSale +
  '</em> are on sale!'
);
```

上面这种写法相当繁琐不方便，ES6 引入了模板字符串解决这个问题。
```js
$('#result').append(`
  There are <b>${basket.count}</b> items
   in your basket, <em>${basket.onSale}</em>
  are on sale!
`);
```
模板字符串（template string）是增强版的字符串，用反引号（`）标识。它可以当作普通字符串使用，也可以用来定义多行字符串，或者在字符串中嵌入变量。
```js
// 普通字符串
`In JavaScript '\n' is a line-feed.`

// 多行字符串
`In JavaScript this is
 not legal.`

console.log(`string text line 1
string text line 2`);

// 字符串中嵌入变量
let name = "Bob", time = "today";
`Hello ${name}, how are you ${time}?`
```

- 上面代码中的模板字符串，都是用反引号表示。如果在模板字符串中需要使用反引号，则前面要用反斜杠转义。
```js
let greeting = `\`Yo\` World!`;
```

- 如果使用模板字符串表示多行字符串，所有的空格和缩进都会被保留在输出之中。

```js
$('#list').html(`
<ul>
  <li>first</li>
  <li>second</li>
</ul>
`);
```

上面代码中，所有模板字符串的空格和换行，都是被保留的，比如`<ul>`标签前面会有一个换行。如果你不想要这个换行，可以使用trim方法消除它。

```js
$('#list').html(`
<ul>
  <li>first</li>
  <li>second</li>
</ul>
`.trim());
```
- 模板字符串中嵌入变量，需要将变量名写在`${}`之中。
```js
let x = 1;
let y = 2;

`${x} + ${y} = ${x + y}`
// "1 + 2 = 3"

`${x} + ${y * 2} = ${x + y * 2}`
// "1 + 4 = 5"

let obj = {x: 1, y: 2};
`${obj.x + obj.y}`
// "3"
```
ES6中，字符串的新增方法也有很多
- `String.fromCodePoint()`
- `String.raw()`
- `实例方法：codePointAt()`
- `实例方法：normalize()`
- `实例方法：includes(), startsWith(), endsWith()`
- `实例方法：repeat()`
- `实例方法：padStart()，padEnd()`
- `实例方法：trimStart()，trimEnd()`
- `实例方法：matchAll()`
- `实例方法：replaceAll()`
- `实例方法：at()`

### 数值的扩展
- `二进制和八进制表示法`
>ES6 提供了二进制和八进制数值的新的写法，分别用前缀0b（或0B）和0o（或0O）表示。

```js
0b111110111 === 503 // true
0o767 === 503 // true
```
- `数值分隔符`
>欧美语言中，较长的数值允许每三位添加一个分隔符（通常是一个逗号），增加数值的可读性。比如，1000可以写作1,000。
```js
let budget = 1_000_000_000_000;
budget === 10 ** 12 // true
```
这个数值分隔符没有指定间隔的位数，也就是说，可以每三位添加一个分隔符，也可以每一位、每两位、每四位添加一个。
- `Number.isFinite(), Number.isNaN()`
- `Number.parseInt(), Number.parseFloat()`
- `Number.isInteger()`
- `Number.EPSILON`
- `安全整数和 Number.isSafeInteger()`
>JavaScript 能够准确表示的整数范围在-2^53到2^53之间（不含两个端点），超过这个范围，无法精确表示这个值。

ES6 引入了`Number.MAX_SAFE_INTEGER`和`Number.MIN_SAFE_INTEGER`这两个常量，用来表示这个范围的上下限。

```js
Number.MAX_SAFE_INTEGER === Math.pow(2, 53) - 1
// true
Number.MAX_SAFE_INTEGER === 9007199254740991
// true

Number.MIN_SAFE_INTEGER === -Number.MAX_SAFE_INTEGER
// true
Number.MIN_SAFE_INTEGER === -9007199254740991
// true
```

`Number.isSafeInteger()`则是用来判断一个整数是否落在这个范围之内。
```js
Number.isSafeInteger('a') // false
Number.isSafeInteger(null) // false
Number.isSafeInteger(NaN) // false
Number.isSafeInteger(Infinity) // false
Number.isSafeInteger(-Infinity) // false

Number.isSafeInteger(3) // true
Number.isSafeInteger(1.2) // false
Number.isSafeInteger(9007199254740990) // true
Number.isSafeInteger(9007199254740992) // false

Number.isSafeInteger(Number.MIN_SAFE_INTEGER - 1) // false
Number.isSafeInteger(Number.MIN_SAFE_INTEGER) // true
Number.isSafeInteger(Number.MAX_SAFE_INTEGER) // true
Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1) // false
```
- `Math 对象的扩展`
- `BigInt 数据类型`
>`ES2020` 引入了一种新的数据类型 `BigInt`（大整数），来解决这个问题，这是 ECMAScript 的第八种数据类型。`BigInt` 只用来表示整数，没有位数的限制，任何位数的整数都可以精确表示。

```js
const a = 2172141653n;
const b = 15346349309n;

// BigInt 可以保持精度
a * b // 33334444555566667777n

// 普通整数无法保持精度
Number(a) * Number(b) // 33334444555566670000
```
为了与 `Number` 类型区别，`BigInt` 类型的数据必须添加后缀`n`。
```js
1234 // 普通整数
1234n // BigInt

// BigInt 的运算
1n + 2n // 3n
```
`BigInt` 与`普通整数`是两种值，它们之间并不相等。
```js
42n === 42 // false
```
`typeof`运算符对于 `BigInt` 类型的数据返回`bigint`。
```js
typeof 123n // 'bigint'
```

可以使用`Boolean()`、`Number()`和`String()`这三个方法，将 `BigInt` 可以转为布尔值、数值和字符串类型。
```js
Boolean(0n) // false
Boolean(1n) // true
Number(1n)  // 1
String(1n)  // "1"
```
数学运算方面，`BigInt` 类型的+、-、*和**这四个二元运算符，与 Number 类型的行为一致。`除法运算/会舍去小数部分，返回一个整数。`

### 函数的扩展
1. 函数参数的默认值

ES6 之前，不能直接为函数的参数指定默认值，只能采用变通的方法。
```js
function log(x, y) {
  y = y || 'World';
  console.log(x, y);
}

log('Hello') // Hello World
log('Hello', 'China') // Hello China
log('Hello', '') // Hello World
```
ES6 允许为函数的参数设置默认值，即直接写在参数定义的后面。
```js
function log(x, y = 'World') {
  console.log(x, y);
}

log('Hello') // Hello World
log('Hello', 'China') // Hello China
log('Hello', '') // Hello
```
可以看到，ES6 的写法比 ES5 简洁许多，而且非常自然。下面是另一个例子。
```js
function Point(x = 0, y = 0) {
  this.x = x;
  this.y = y;
}

const p = new Point();
p // { x: 0, y: 0 }
```
除了简洁，ES6 的写法还有两个好处：首先，阅读代码的人，可以立刻意识到哪些参数是可以省略的，不用查看函数体或文档；其次，有利于将来的代码优化，即使未来的版本在对外接口中，彻底拿掉这个参数，也不会导致以前的代码无法运行。

**与解构赋值默认值结合使用**
参数默认值可以与解构赋值的默认值，结合起来使用。
```js
function foo({x, y = 5}) {
  console.log(x, y);
}

foo({}) // undefined 5
foo({x: 1}) // 1 5
foo({x: 1, y: 2}) // 1 2
foo() // TypeError: Cannot read property 'x' of undefined
```
上面代码只使用了对象的解构赋值默认值，没有使用函数参数的默认值。只有当函数foo的参数是一个对象时，变量x和y才会通过解构赋值生成。如果函数foo调用时没提供参数，变量x和y就不会生成，从而报错。通过提供函数参数的默认值，就可以避免这种情况。
```js
function foo({x, y = 5} = {}) {
  console.log(x, y);
}

foo() // undefined 5
```
上面代码指定，如果没有提供参数，函数foo的参数默认为一个空对象。

请问下面两种写法有什么差别？
```js
// 写法一
function m1({x = 0, y = 0} = {}) {
  return [x, y];
}

// 写法二
function m2({x, y} = { x: 0, y: 0 }) {
  return [x, y];
}
```
上面两种写法都对函数的参数设定了默认值，区别是写法一函数参数的默认值是空对象，但是设置了对象解构赋值的默认值；写法二函数参数的默认值是一个有具体属性的对象，但是没有设置对象解构赋值的默认值。
```js
// 函数没有参数的情况
m1() // [0, 0]
m2() // [0, 0]

// x 和 y 都有值的情况
m1({x: 3, y: 8}) // [3, 8]
m2({x: 3, y: 8}) // [3, 8]

// x 有值，y 无值的情况
m1({x: 3}) // [3, 0]
m2({x: 3}) // [3, undefined]

// x 和 y 都无值的情况
m1({}) // [0, 0];
m2({}) // [undefined, undefined]

m1({z: 3}) // [0, 0]
m2({z: 3}) // [undefined, undefined]
```
2. rest 参数
ES6 引入 rest 参数（形式为...变量名），用于获取函数的多余参数，这样就不需要使用arguments对象了。rest 参数搭配的变量是一个数组，该变量将多余的参数放入数组中。
```js
function add(...values) {
  let sum = 0;

  for (var val of values) {
    sum += val;
  }

  return sum;
}

add(2, 5, 3) // 10 此时values=[2,5,3]
```
3. 箭头函数
>ES6 允许使用“箭头”（=>）定义函数。

```js
const f = v => v;

// 等同于
const f = function (v) {
  return v;
};
```

- 如果箭头函数不需要参数或需要多个参数，就使用一个圆括号代表参数部分
```js
const f = () => 5;
// 等同于
const f = function () { return 5 };

const sum = (num1, num2) => num1 + num2;
// 等同于
const sum = function(num1, num2) {
  return num1 + num2;
};
```
- 如果箭头函数的代码块部分多于一条语句，就要使用大括号将它们括起来，并且使用return语句返回。
```js
const sum = (num1, num2) => { return num1 + num2; }
```
- 由于大括号被解释为代码块，所以如果箭头函数直接返回一个对象，必须在对象外面加上括号，否则会报错。
```js
// 报错
const getTempItem = id => { id: id, name: "Temp" };

// 不报错
const getTempItem = id => ({ id: id, name: "Temp" });
```
- 箭头函数可以与变量解构结合使用。与正常函数的结构一致
```js
const full = ({ first, last }) => first + ' ' + last;

// 等同于
function full(person) {
  return person.first + ' ' + person.last;
}
```

注意点：
（1）箭头函数没有自己的this对象。箭头函数的this指向作用域上一层的this

（2）不可以当作构造函数，也就是说，不可以对箭头函数使用new命令，否则会抛出一个错误。

（3）不可以使用arguments对象，该对象在函数体内不存在。如果要用，可以用 rest 参数代替。

（4）不可以使用yield命令，因此箭头函数不能用作 Generator 函数。

```js
const handler = {
  id: '123456',

  init: function() {
    document.addEventListener('click',
      event => this.doSomething(event.type), false); // 此处的this不会指向document,而是指向handler对象。
  },

  doSomething: function(type) {
    console.log('Handling ' + type  + ' for ' + this.id);
  }
};
```

### 数组的扩展
1. 扩展运算符
扩展运算符（spread）是三个点（...）。它好比 rest 参数的逆运算，将一个数组转为用逗号分隔的参数序列。

```js
console.log(...[1, 2, 3])
// 1 2 3

console.log(1, ...[2, 3, 4], 5)
// 1 2 3 4 5

[...document.querySelectorAll('div')]
// [<div>, <div>, <div>]
```
可以作用于函数调用
```js
// ES6的写法
function f(x, y, z) {
  // ...
}
let args = [0, 1, 2];
f(...args);
```
```js
// ES5 的写法
Math.max.apply(null, [14, 3, 77])

// ES6 的写法
Math.max(...[14, 3, 77])

// 等同于
Math.max(14, 3, 77);

```
可以用于复制数组和合并数组
```js
const a1 = [1, 2];
// 写法一
const a2 = [...a1];
// 写法二
const [...a2] = a1;
```
```js
const arr1 = ['a', 'b'];
const arr2 = ['c'];
const arr3 = ['d', 'e'];

// ES5 的合并数组
arr1.concat(arr2, arr3);
// [ 'a', 'b', 'c', 'd', 'e' ]

// ES6 的合并数组
[...arr1, ...arr2, ...arr3]
// [ 'a', 'b', 'c', 'd', 'e' ]
```

这两种方法都是浅拷贝，使用的时候需要注意。

扩展运算符可以与解构赋值结合起来，用于生成数组。
```js
const [first, ...rest] = [1, 2, 3, 4, 5];
first // 1
rest  // [2, 3, 4, 5]

const [first, ...rest] = [];
first // undefined
rest  // []

const [first, ...rest] = ["foo"];
first  // "foo"
rest   // []
```

### 对象的扩展
1. 属性的简洁表示法

ES6 允许在大括号里面，直接写入变量和函数，作为对象的属性和方法。这样的书写更加简洁。
```js
const foo = 'bar';
const baz = {foo};
baz // {foo: "bar"}

// 等同于
const baz = {foo: foo};
```
除了属性简写，方法也可以简写。
```js
const o = {
  method() {
    return "Hello!";
  }
};

// 等同于

const o = {
  method: function() {
    return "Hello!";
  }
};
```
下面是一个实际的例子。
```js
let birth = '2000/01/01';

const Person = {

  name: '张三',

  //等同于birth: birth
  birth,

  // 等同于hello: function ()...
  hello() { console.log('我的名字是', this.name); }

};
```

2. 属性名表达式

ES6 允许字面量定义对象时，用表达式作为对象的属性名，即把表达式放在方括号内。
```js
let propKey = 'foo';

let obj = {
  [propKey]: true,
  ['a' + 'bc']: 123
};

let lastWord = 'last word';

const a = {
  'first word': 'hello',
  [lastWord]: 'world'
};

a['first word'] // "hello"
a[lastWord] // "world"
a['last word'] // "world"
```

表达式还可以用于定义方法名。
```js
let obj = {
  ['h' + 'ello']() {
    return 'hi';
  }
};

obj.hello() // hi
```
注意，属性名表达式与简洁表示法，不能同时使用，会报错。
```js
// 报错
const foo = 'bar';
const bar = 'abc';
const baz = { [foo] };

// 正确
const foo = 'bar';
const baz = { [foo]: 'abc'};
```
`Object.is()`

`Object.assign()`

`Object.getOwnPropertyDescriptors()`

`__proto__属性，Object.setPrototypeOf()，Object.getPrototypeOf()`

`Object.keys()，Object.values()，Object.entries()`

`Object.fromEntries()`

`方法的 name 属性`

`属性的可枚举性和遍历`

`super 关键字`

`对象的扩展运算符`

`AggregateError 错误对象`

### Module

历史上，JavaScript 一直没有模块（module）体系，无法将一个大程序拆分成互相依赖的小文件，再用简单的方法拼装起来。其他语言都有这项功能，比如 Ruby 的require、Python 的import，甚至就连 CSS 都有@import，但是 JavaScript 任何这方面的支持都没有，这对开发大型的、复杂的项目形成了巨大障碍。

在 ES6 之前，社区制定了一些模块加载方案，最主要的有 CommonJS 和 AMD 两种。前者用于服务器，后者用于浏览器。ES6 在语言标准的层面上，实现了模块功能，而且实现得相当简单，完全可以取代 CommonJS 和 AMD 规范，成为浏览器和服务器通用的模块解决方案。

ES6 模块的设计思想是尽量的静态化，使得编译时就能确定模块的依赖关系，以及输入和输出的变量。CommonJS 和 AMD 模块，都只能在运行时确定这些东西。比如，CommonJS 模块就是对象，输入时必须查找对象属性。

```js
// CommonJS模块
let { stat, exists, readfile } = require('fs');

// 等同于
let _fs = require('fs');
let stat = _fs.stat;
let exists = _fs.exists;
let readfile = _fs.readfile;
```
上面代码的实质是整体加载fs模块（即加载fs的所有方法），生成一个对象（_fs），然后再从这个对象上面读取 3 个方法。这种加载称为“运行时加载”，因为只有运行时才能得到这个对象，导致完全没办法在编译时做“静态优化”。

ES6 模块不是对象，而是通过`export`命令显式指定输出的代码，再通过`import`命令输入。
```js
// ES6模块
import { stat, exists, readFile } from 'fs';
```
上面代码的实质是从fs模块加载 3 个方法，其他方法不加载。这种加载称为“编译时加载”或者静态加载，即 ES6 可以在编译时就完成模块加载，效率要比 CommonJS 模块的加载方式高。当然，这也导致了没法引用 ES6 模块本身，因为它不是对象。

除了静态加载带来的各种好处，ES6 模块还有以下好处。
- 不再需要UMD模块格式了，将来服务器和浏览器都会支持 ES6 模块格式。目前，通过各种工具库，其实已经做到了这一点。
- 将来浏览器的新 API 就能用模块格式提供，不再必须做成全局变量或者navigator对象的属性。
- 不再需要对象作为命名空间（比如Math对象），未来这些功能可以通过模块提供。

#### export 
模块功能主要由两个命令构成：`export`和`import`。`export`命令用于规定模块的对外接口，`import`命令用于导入其他模块提供的功能。

一个模块就是一个独立的文件。该文件内部的所有变量，外部无法获取。如果你希望外部能够读取模块内部的某个变量，就必须使用export关键字输出该变量。下面是一个 JS 文件，里面使用export命令输出变量。

```js
// profile.js
export const firstName = 'Michael';
export const lastName = 'Jackson';
export const year = 1958;
```
上面代码是`profile.js`文件，保存了用户信息。ES6 将其视为一个模块，里面用`export`命令对外部输出了三个变量。

export的写法，除了像上面这样，还有另外一种。
```js
const firstName = 'Michael';
const lastName = 'Jackson';
const year = 1958;

export { firstName, lastName, year };
```
上面代码在`export`命令后面，使用大括号指定所要输出的一组变量。它与前一种写法（直接放置在var语句前）是等价的，但是应该优先考虑使用这种写法。因为这样就可以在脚本尾部，一眼看清楚输出了哪些变量。

`export`命令除了输出变量，还可以输出`函数`或类（`class`）。
```js
export function multiply(x, y) {
  return x * y;
};
```

通常情况下，`export`输出的变量就是本来的名字，但是可以使用`as`关键字重命名。

```js
function v1() { ... }
function v2() { ... }

export {
  v1 as streamV1,
  v2 as streamV2,
  v2 as streamLatestVersion
};
```
上面代码使用`as`关键字，重命名了函数v1和v2的对外接口。重命名后，v2可以用不同的名字输出两次。

需要特别注意的是，`export`命令规定的是对外的接口，必须与模块内部的变量建立一一对应关系。
```js
// 报错
export 1;

// 报错
var m = 1;
export m;
```
上面两种写法都会报错，因为没有提供对外的接口。第一种写法直接输出 1，第二种写法通过变量m，还是直接输出 1。1只是一个值，不是接口。正确的写法是下面这样。

```js
// 写法一
export var m = 1;

// 写法二
var m = 1;
export {m};

// 写法三
var n = 1;
export {n as m};
```

#### import 命令
使用`export`命令定义了模块的对外接口以后，其他 JS 文件就可以通过`import`命令加载这个模块。

```js
// main.js
import { firstName, lastName, year } from './profile.js';

function setName(element) {
  element.textContent = firstName + ' ' + lastName;
}
```
上面代码的import命令，用于加载profile.js文件，并从中输入变量。import命令接受一对大括号，里面指定要从其他模块导入的变量名。大括号里面的变量名，必须与被导入模块（profile.js）对外接口的名称相同。

如果想为输入的变量重新取一个名字，import命令要使用as关键字，将输入的变量重命名。
```js
import { lastName as surname } from './profile.js';
```

import命令输入的变量都是只读的，因为它的本质是输入接口。也就是说，不允许在加载模块的脚本里面，改写接口。

```js
import {a} from './xxx.js'

a = {}; // Syntax Error : 'a' is read-only;
```
上面代码中，脚本加载了变量a，对其重新赋值就会报错，因为a是一个只读的接口。但是，如果a是一个对象，改写a的属性是允许的。

```js
import {a} from './xxx.js'

a.foo = 'hello'; // 合法操作
```
上面代码中，a的属性可以成功改写，并且其他模块也可以读到改写后的值。不过，这种写法很难查错，建议凡是输入的变量，都当作完全只读，不要轻易改变它的属性。

import后面的from指定模块文件的位置，可以是相对路径，也可以是绝对路径。如果不带有路径，只是一个模块名，那么必须有配置文件，告诉 JavaScript 引擎该模块的位置。
```js
import { myMethod } from 'util';
```
上面代码中，`util`是模块文件名，由于不带有路径，必须通过配置，告诉引擎怎么取到这个模块。

由于`import`是静态执行，所以不能使用表达式和变量，这些只有在运行时才能得到结果的语法结构。
```js
// 报错
import { 'f' + 'oo' } from 'my_module';

// 报错
let module = 'my_module';
import { foo } from module;

// 报错
if (x === 1) {
  import { foo } from 'module1';
} else {
  import { foo } from 'module2';
}
```
上面三种写法都会报错，因为它们用到了表达式、变量和if结构。在静态分析阶段，这些语法都是没法得到值的。

最后，import语句会执行所加载的模块，因此可以有下面的写法。
```js
import 'lodash';
```
上面代码仅仅执行lodash模块，但是不输入任何值。

如果多次重复执行同一句import语句，那么只会执行一次，而不会执行多次。
```js
import 'lodash';
import 'lodash';
```
上面代码加载了两次lodash，但是只会执行一次。

```js
import { foo } from 'my_module';
import { bar } from 'my_module';

// 等同于
import { foo, bar } from 'my_module';
```
上面代码中，虽然foo和bar在两个语句中加载，但是它们对应的是同一个my_module模块。

#### 模块的整体加载 
除了指定加载某个输出值，还可以使用整体加载，即用星号（*）指定一个对象，所有输出值都加载在这个对象上面。

下面是一个circle.js文件，它输出两个方法area和circumference。
```js
// circle.js

export function area(radius) {
  return Math.PI * radius * radius;
}

export function circumference(radius) {
  return 2 * Math.PI * radius;
}
```
现在，加载这个模块。
```js
import * as circle from './circle';

console.log('圆面积：' + circle.area(4));
console.log('圆周长：' + circle.circumference(14));
```
注意，模块整体加载所在的那个对象（上例是circle），应该是可以静态分析的，所以不允许运行时改变。下面的写法都是不允许的。
```js
import * as circle from './circle';

// 下面两行都是不允许的
circle.foo = 'hello';
circle.area = function () {};
```
#### export default 命令
从前面的例子可以看出，使用import命令的时候，用户需要知道所要加载的变量名或函数名，否则无法加载。但是，用户肯定希望快速上手，未必愿意阅读文档，去了解模块有哪些属性和方法。

为了给用户提供方便，让他们不用阅读文档就能加载模块，就要用到`export default`命令，为模块指定默认输出。

```js
// export-default.js
export default function () {
  console.log('foo');
}
```
上面代码是一个模块文件`export-default.js`，它的默认输出是一个函数。

其他模块加载该模块时，`import`命令可以为该匿名函数指定任意名字。
```js
// import-default.js
import customName from './export-default';
customName(); // 'foo'
```
上面代码的import命令，可以用任意名称指向export-default.js输出的方法，这时就不需要知道原模块输出的函数名。需要注意的是，这时import命令后面，不使用大括号。

### 跨模块常量
介绍`const`命令的时候说过，`const`声明的常量只在当前代码块有效。如果想设置跨模块的常量（即跨多个文件），或者说一个值要被多个模块共享，可以采用下面的写法。

```js
// constants.js 模块
export const A = 1;
export const B = 3;
export const C = 4;

// test1.js 模块
import * as constants from './constants';
console.log(constants.A); // 1
console.log(constants.B); // 3

// test2.js 模块
import {A, B} from './constants';
console.log(A); // 1
console.log(B); // 3
```

如果要使用的常量非常多，可以建一个专门的`constants`目录，将各种常量写在不同的文件里面，保存在该目录下。

### 其他
另外，ES6还有很多没有介绍到的东西
- `Promise`
- `Symbol`
- `Set、Map`
- `Class`
- `Iterator 和 for...of 循环`
- `async 函数`
- `Proxy`
- `Reflect`
- `Generator 函数`
- `新增的运算符、链判断运算符、Null 判断运算符、逻辑赋值运算符`
- `ArrayBuffer`
- `函数、对象、数组、字符串、数字新增的扩展和新增的方法`
- 其他最新的提案

这些都需要自己主动的去了解、学习并掌握

