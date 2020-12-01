# provider
## 标准提供者
```ts 
// cat.controller
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
```
providers属性接受一个提供者数组。实际上，该语法`providers: [CatsService]`是以下的简写：
```ts 
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```
即是`provide useClass`的简写

## useValue（值提供者）
`useValue` 语法对于注入常量值、将外部库放入 Nest 容器或使用模拟对象替换实际实现非常有。
```ts 
import { CatsService } from './cats.service';

const mockCatsService = {
  /* mock implementation
  ...
  */
};

@Module({
  imports: [CatsModule],
  providers: [
    {
      provide: CatsService,
      useValue: mockCatsService, // 使用mock数据代替实际的catservice
    },
  ],
})
export class AppModule {}
```
在本例中，`CatsService` 令牌将解析为 `mockCatsService` 模拟对象。它与要替换的 `CatsService` 类具有相同的接口。由于 `TypeScript` 的结构类型化，您可以使用任何具有兼容接口的对象，包括文本对象或用 new 实例化的类实例。

到目前为止，已经使用了类名作为我们的提供者标记（`providers` 数组中列出的提供者中的 `Provide` 属性的值都是类名）。这与基于构造函数的注入所使用的标准模式相匹配，其中令牌也是类名。

```ts
// 构造函数注入的标准模式
@Injectable() 
class CatService {
  /* implementation details */
}
```

当然，也可以使用其他字符串或者符号作为令牌。
```ts 
import { connection } from './connection';

@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useValue: connection,
    },
  ],
})
export class AppModule {}
```
注入字符串值令牌的提供者。使用`Inject`且传入`provide`的值作为参数。
```ts 
@Injectable()
export class CatsRepository {
  constructor(@Inject('CONNECTION') connection: Connection) {}
}
```
## 类提供者（useClass）

`useClass`语法允许您动态确定令牌应解析为的类。 例如，假设我们有一个抽象的 `ConfigService` 类。 根据当前环境，我们希望 `Nest` 提供配置服务的不同实现。
```ts 
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```
先定义对象 configServiceProvider，然后将其传递给模块装饰器的 providers 属性。另外使用 `ConfigService` 类名称作为令牌。 对于任何依赖 `ConfigService` `的类，Nest` 都会注入提供的类的实例（ `DevelopmentConfigService` 或 `ProductionConfigService` ），该实例将覆盖在其他地方已声明的任何默认实现（例如，使用 `@Injectable()` 装饰器声明的 `ConfigService` ）。

## 工厂提供者（useFactory）
`useFactory` 语法允许动态创建提供程序，工厂函数的返回实际的 `provider`。个简单的工厂可能不依赖于任何其他的提供者。更复杂的工厂可以自己注入它需要的其他提供者来计算结果。对于后一种情况，工厂提供程序语法有一对相关的机制:
1. 工厂函数可以接受(可选)参数。
2. `inject` 属性接受一个提供者数组，在实例化过程中，Nest 将解析该数组并将其作为参数传递给工厂函数。这两个列表应该是相关的: Nest 将从 `inject` 列表中以相同的顺序将实例作为参数传递给工厂函数。

```ts 
// 工厂提供者
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider], // inject的值作为参数传递给useFactory
};

@Module({
  providers: [connectionFactory],
})
export class AppModule {}
```

## 别名提供者(useExisting)
useExisting 语法允许您为现有的提供程序创建别名，这将创建两种访问同一提供者的方法。

```ts 
@Injectable()
class LoggerService {
  /* implementation details */
}

const loggerAliasProvider = {
  provide: 'AliasedLoggerService',
  useExisting: LoggerService,
};

@Module({
  providers: [LoggerService, loggerAliasProvider],
})
export class AppModule {}
```
在上面的代码中，(基于string)令牌 `'AliasedLoggerService'` 是(基于类的)令牌 `LoggerService` 的别名。假设有两个不同的依赖项，一个用于 `'AlilasedLoggerService'` ，另一个用于 `LoggerService` 。如果两个依赖项都用单例作用域指定，它们将解析为同一个实例。

## 异步提供者
在完成一些异步任务之前，应用程序必须等待启动状态, 例如，在与数据库的连接建立之前，您可能不希望开始接受请求。 在这种情况下你应该考虑使用异步 `provider`。
其语法是使用 `useFactory` 语法的 `async/await`。工厂返回一个`Promise`，工厂函数可以等待异步任务。在实例化依赖于(注入)这样一个提供程序的任何类之前，Nest将等待`Promise resolve`。
```ts 
// 定义异步提供者
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
}

// 注入提供者
@Inject('ASYNC_CONNECTION')
```

## 导出自定义提供者
要导出自定义提供程序，我们可以使用其令牌（ `provide` 值）或完整的提供程序对象。
```ts 
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: ['CONNECTION'], // 导出provide值
  exports: ['connectionFactory'], // 导出整个对象
})
export class AppModule {}
```

## 动态模块
相对于常规模块或者静态模块来说，动态模块可以在不同的条件下配置不同的行为。例如，开发人员的开发数据库，测试环境的数据库等。通过将配置参数的管理委派给配置模块，应用程序源代码保持独立于配置参数。

实现一个 `ConfigModule` 接受选项对象以对其进行自定义，以便可以在选择的任何文件夹中管理` .env `文件

>AppModule
```ts 
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
注意`imports`的`ConfigModule`:
1. `ConfigModule` 是一个普通类，有一个名为 `register()` 的静态方法
2. `register()` 方法可以接受任何定义好的参数
3. `register()` 方法必须返回类似模块的内容

动态模块必须返回具有完全相同接口的对象，外加一个称为`module`的附加属性。 模块属性用作模块的名称，并且应与模块的类名相同。
```ts 
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(): DynamicModule {
    return {
      module: ConfigModule, // module属性的值应与模块的类名相同
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
```

调用 `ConfigModule.register(...)` 将返回一个 `DynamicModule` 对象，该对象的属性基本上与我们通过`@Module()` 装饰器提供的元数据相同。

`ConfigModule` 基本上是一个提供和导出可注入服务( `ConfigService` )供其他提供者使用。所以接下来就是要将`ConfigModule.register`的参数传递给`ConfigService`。`ConfigModule` 提供` ConfigService`，而 `ConfigService` 又依赖于只在运行时提供的 `options` 对象。因此，在运行时，我们需要首先将 `options` 对象绑定到 `Nest IoC` 容器，然后让 `Nest` 将其注入 `ConfigService`。

>ConfigModule
```ts 
@Module({})
export class ConfigModule {
  static register(options): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        // 使用自定义提供者，将options暴露给ConfigService
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
```
>ConfigService 
```ts 
import { Injectable, Inject } from '@nestjs/common';

import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { EnvConfig } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;
  //  使用Inject获得ConfigModule提供的options
  constructor(@Inject('CONFIG_OPTIONS') private options) {
    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```