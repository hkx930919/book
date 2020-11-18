# nest
Nest 是一个用于构建高效，可扩展的 Node.js 服务器端应用程序的框架。它使用渐进式 JavaScript，内置并完全支持 TypeScript并结合了 OOP（面向对象编程），FP（函数式编程）和 FRP（函数式响应编程）的元素。

在底层，Nest使用强大的 HTTP Server 框架，如 Express（默认）和 Fastify。Nest 在这些框架之上提供了一定程度的抽象，同时也将其 API 直接暴露给开发人员。

## 控制器(Controller)

>控制器负责处理传入的 **请求** 和向客户端返回**响应**，使用`Controller`装饰器来描述对应的路由。

>可以使用`nest g controller controllerName`快速生成控制器相关的代码。

```ts
import { sleep } from './../../utils/util';
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CatsService,
  CreateCatDto,
} from './cats.service';
import { setResData } from '../../utils';

@Controller('cats') // 控制器对应的路由
export class CatsController1 {
  constructor(
    // 对应的服务 要在module中提供CatsService服务
    private readonly catService: CatsService,
  ) {}
  /**
   * get方法 /cats
   */
  @Get()
  async findAll(@Request() request: Request): Promise<any> {
    await sleep(4000);
    return setResData(this.catService.findAll());
  }

  /**
   * post方法 /cats
   */
  @Post()
  create(@Body() cat: CreateCatDto) {
    this.catService.create(cat);
    return setResData(true);
  }
  /**
   * get方法 /cats/err
   */
  @Get('/err')
  error() {
    throw new HttpException(
      {
        status: HttpStatus.FORBIDDEN,
        error: 'This is a custom message',
      },
      HttpStatus.FORBIDDEN,
    );
  }
  // 路由参数，可以使用@Param获取
  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return `This action updates a #${id} cat`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes a #${id} cat`;
  }
}
```
可以在`Controller`中的方法和属性中使用各种装饰器

### 资源装饰器
> 可以在这些装饰器中提供路由参数，`routeName`可以使用通配符
- `@Get(routeName)`
- `@Post(routeName)`
- `@Put(routeName)`
- `@Delete(routeName)`
- `@Patch(routeName)`
- `@Options(routeName)`
- `@Head(routeName)`
- `@All(routeName)`
### 其他装饰器
- `@Param(key?: string)` `req.params / req.params[key]`  获取路由参数
- `@Body(key?: string)`  `req.body / req.body[key]`      获取请求体中的数据
- `@Query(key?: string)` `req.query / req.query[key]`    获取url后的拼接参数
- `@Headers(name?: string)` `req.headers / req.headers[name]`    获取请求头的值
- `@Req()`    获取整个请求
- `@Res()`    获取整个响应
- `@Redirect(url, httpCode)`  重定向

## 提供者（Providers）
>使用 @Injectable() 装饰的类就是一个 Provider，装饰器方法会优先于类被解析执行

- 创建一个`Providers`,可以使用 CLI 工具自动生成一个 Service $ `nest g service cats`
```ts
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}
```
- 注册`Provider`，在`Module`中注册
```ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class ApplicationModule {}
```
- 使用`Service`，在`Controller`中使用
```ts
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}
  // 等同于
  private readonly catsService: CatsService
  constructor(catsService: CatsService) {
    this.catsService = catsService
  }

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```
## 模块（Module）
>模块（Module）是一个使用了 @Module() 装饰的类。每个应用都至少有一个根模块，根模块就是 Nest 应用的入口。Nest 会从这里查找出整个应用的依赖/调用图

- 功能模块，将相关的控制器和 Service 包装成一个模块：
```ts
import { Module,Global } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Global() // 全局模块
@Module({
  imports: [CommonModule], // 导入其他模块，其他模块导出的service在该模块中也可以使用
  controllers: [CatsController],
  providers: [CatsService], 
  exports: [CatsService], // 导出的Service在其他模块中也可以使用
})
export class CatsModule {}
```

### 动态模块
>动态模块提供`forRoot`或者`register`静态方法，返回一个模块的配置。返回的配置必须包含`module`属性
```ts
import { Module, DynamicModule } from '@nestjs/common';
import { createDatabaseProviders } from './database.providers';
import { Connection } from './connection.provider';

@Module({
  providers: [Connection],
})
export class DatabaseModule {
  static forRoot(entities = [], options?): DynamicModule {
    const providers = createDatabaseProviders(options, entities);
    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}
```

## 中间件（Middleware）
>中间件就是一个函数，在路由处理器之前调用。这就表示中间件函数可以访问到请求和响应对象以及应用的请求响应周期中的 next() 中间间函数。

>如果用类实现，则需要使用 `@Injectable()`装饰，并且实现 `NestMiddleware` 接口，且含有`use`方法。
- 中间件实现
```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    console.log('Request...');
    next();
  }
}
```
- 应用中间件：在模块类中实现`configure`方法，在里面调用`forRoutes`方法匹配中间件的路由
```ts
@Module({
  imports: [CatsModule],
})
export class ApplicationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware,cors(), helmet()) // 可以使用多个中间件
      .forRoutes('cats'); // 匹配路由
  }
}
```
```ts
// 指定路由和对应的方法
.forRoutes({ path: 'cats', method: RequestMethod.GET });
.forRoutes({ path: 'ab*cd', method: RequestMethod.ALL });

// exclude：不包含某些路由
consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'cats', method: RequestMethod.GET },
    { path: 'cats', method: RequestMethod.POST }
  )
  .forRoutes(CatsController);

```
- 全局中间件
```ts
const app = await NestFactory.create(ApplicationModule);
app.use(logger);
await app.listen(3000);
```

## 异常过滤器（Filter）
>Nest 框架内部实现了一个异常处理层，专门用来负责应用程序中未处理的异常。默认情况未处理的异常会被全局过滤异常器 HttpException 或者它的子类处理。如果一个未识别的异常（非 HttpException 或未继承自 HttpException）被抛出，下面的信息将被返回给客户端：
    ```ts
    {
    "statusCode": 500,
    "message": "Internal server error"
    }
    ```
### 基础异常
```ts
@Get()
async findAll() {
  throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
//   自定义返回状态值和错误信息
//   throw new HttpException({
//     status: HttpStatus.FORBIDDEN,
//     error: 'This is a custom message',
//   }, 403);
}

// 客户端收到如下信息
{
  "statusCode": 403,
  "message": "Forbidden"
}
```
### 自定义异常类
> 继承 `HttpException`
```ts
export class ForbiddenException extends HttpException {
  constructor() {
    super('Forbidden', HttpStatus.FORBIDDEN);
  }
}

@Get()
async findAll() {
  throw new ForbiddenException();
}
```

### 实现异常过滤器
> 使用`@Catch`装饰器实现`ExceptionFilter`接口，并实现类中的`catch`方法

```ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

// 这里只会处理 HttpException 错误 如果想处理所有的错误，把HttpException参数去掉即可
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}

```
### 绑定过滤器
```ts
// 方法作用域
@Post()
@UseFilters(HttpExceptionFilter) 
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}

// 控制器作用域
@UseFilters(new HttpExceptionFilter())
export class CatsController {}

// 全局作用域 这样注册的全局过滤器无法进入依赖注入，因为它在模块作用域之外
async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();

// 全局作用域 在根模块上面注册一个全局作用域的过滤器。可以启动依赖注入
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class ApplicationModule {}
```
### 捕获所有异常
```ts
// 将@Catch里的装饰器参数去掉即可
@Catch(HttpException) => @Catch() 
```

## 管道（Pipes）
>管道（Pipes）是一个用 @Injectable() 装饰过的类，它必须实现 PipeTransform 接口。

- **转换/变形**：转换输入数据为目标格式
- **验证**：对输入数据时行验证，如果合法让数据通过管道，否则抛出异常。

### 内置管道
- `ValidationPipe` 借助`class-validator`对参数进行校验
- `ParseIntPipe` 转换成数字
- `ParseBoolPipe` 
- `ParseArrayPipe`
- `ParseUUIDPipe`
- `DefaultValuePipe`

### 绑定管道：ValidationPipe 

```ts
import { ValidationPipe } from '@nestjs/common';

// 参数作用 UsePipes
@Post()
async create(
  @Body(new ValidationPipe()) createCatDto: CreateCatDto,
) {
  this.catsService.create(createCatDto);
}

// 方法作用域 UsePipes
@Post()
@UsePipes(new ValidationPipe()) // 使用实例
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
// 或者
@Post()
@UsePipes(ValidationPipe) // 使用类
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}


// 全局作用域 useGlobalPipes
async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
```
借助`class-validator`配置`ValidationPipe`验证
```ts
import {
  IsString,
  IsInt,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Max,
  Min,
} from 'class-validator';

export class CreateCatDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10, {
    message: '姓名不能超过50个字符',
  })
  @MinLength(2, {
    message: '姓名不能少于2个字符',
  })
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Max(30, {
    message: '111',
  })
  @Min(0)
  age: number;

  @IsString()
  breed: string;
}
```

### 自实现ValidationPipe
```ts
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToClass(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

## 守卫（Guards）
>守卫（Guards）是一个使用 @Injectable() 装饰的类，它必须实现 CanActivate 接口。

> 守卫只有一个职责，就是决定请求是否需要被控制器处理。一般用在权限、角色的场景中。

>守卫和中间件的区别在于：中间件很简单，next 方法调用后中间的任务就完成了。但是守卫需要关心上下游，它需要鉴别请求与控制器之间的关系。

>守卫会在中间件逻辑之后、拦截器/管道之前执行。即 中间件=》守卫=》拦截器=》管道=》控制器

### 授权守卫
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}
```
### 执行上下文（ExecutionContext）
ExecutionContext 不但继承了 ArgumentsHost，还有两个额外方法：
```ts
export interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>;// 返回处理器对应的控制器类。
  getHandler(): Function; // 返回一个将被调用的方法处理器
}
```

### 绑定守卫
使用`UseGuards`绑定守卫
```ts
// 控制器作用域
@Controller('cats')
@UseGuards(RolesGuard)
export class CatsController {}

// 全局作用域 useGlobalGuards无法注入依赖
const app = await NestFactory.create(ApplicationModule);
app.useGlobalGuards(new RolesGuard());

// 全局作用域 根模块注册，可以全局使用
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class ApplicationModule {}
```
## 反射
使用`@SetMetadata`对控制器（或方法）添加一些元数据，用来标记这个控制器的权限类型
```ts
@Post()
@SetMetadata('roles', ['admin'])
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```
守卫和反射器一起使用
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  // 实例化反射器
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    //   获取反射器注入的数据
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const hasRole = () => user.roles.some((role) => roles.includes(role));
    return user && user.roles && hasRole();
  }
}
```

## 拦截器（Interceptors）
>拦截器（Interceptors）是一个使用 `@Injectable()` 装饰的类，它必须实现 `NestInterceptor` 接口。类中包含`intercept(ExecutionContext,CallHandler)`方法

拦截器有一系列的功能，这些功能的设计灵感都来自于面向切面的编程（AOP）技术。这使得下面这些功能成为可能：
- 在函数执行前/后绑定额外的逻辑
- 转换一个函数的返回值
- 转换函数抛出的异常
- 扩展基础函数的行为
- 根据特定的条件完全的重写一个函数（比如：缓存）
### intercept方法
拦截器类中的`intercept`方法包含两个参数：
- `ExecutionContext`:执行上下文，和守卫中的上下文一样。

```ts
export interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
}
```
-  `CallHandler`:调用处理器，`CallHandler` 接口实现了 `handle() `方法，这个方法可以在拦截器某个地方调用的路由处理器。如果`intercept()` 方法中没调用 `handle()` 方法，那么路由处理器将不会被执行。
    - `handle() `方法返回的是一个 `Observable`，我们可以使用 RxJS 做到修改后来的响应
    - 路由处理器的调用被称做一个 切点（Pointcut），这表示一个我们的自定义的逻辑插入的地方。

不像守卫与过滤器，拦截器对于一次请求响应有完全的**控制权与责任**。这样的方式意味着 `intercept()` 方法可以高效地包装请求/响应流。

### 切面拦截
```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After... ${Date.now() - now}ms`)),
      );
  }
}
```
### 绑定拦截器
>使用`@UseInterceptors()`装饰器来绑定一个拦截器，和管道、守卫一样，可以绑定方法作用域、控制器作用域、全局作用域

```ts
@UseInterceptors(LoggingInterceptor)
export class CatsController {}
```

### 响应映射
由于`handle()`方法返回一个 `Observable`。流包含路由处理器返回的值，因此可以使用`RxJS`操作符改变它。

下面的代码可以将响应的值做一个封装
```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({ data })));
  }
}
// 有请求进入时，响应看起来将会是下面这样：
{
  "data": []
}
```
下面的可以对null做处理
```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}

```
### 异常映射
使用 RxJS 的 catchError() 操作符来重写异常捕获：
```ts 
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  BadGatewayException,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(new BadGatewayException())),
      );
  }
}
```

### 流重写
有一些情况下希望完全阻止处理器的调用并返回一个不同的值，比如缓存的实现。
```ts 
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
```

### 更多的操作符
RxJS 的操作符有很多种能力，例如处理路由请求的超时问题
```ts 
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(timeout(5000))
  }
}
```