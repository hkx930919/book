## nest-认证过程
1. 借助`passport-local`创建`local`策略并使用`@UseGuards(AuthGuard('local'))`守卫，将`local`策略服务注册为`provider`
    ```ts 
    import { Strategy } from 'passport-local';
    import { PassportStrategy } from '@nestjs/passport';
    import { Injectable, UnauthorizedException } from '@nestjs/common';
    import { AuthService } from './auth.service';

    @Injectable()
    // 继承PassportStrategy的local策略
    export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super();
    }
        // 实现validate方法，local策略中会将validate的返回值注入到request.user中
    async validate(username: string, password: string): Promise<any> {
        //   默认请求体的key是`username password`
        const user = await this.authService.validateUser(username, password);
        if (!user) {
        throw new UnauthorizedException();
        }
        return user;
    }
    }

    // module修改
    @Module({
    // 导入PassportModule
    imports: [UsersModule, PassportModule],
    // 将LocalStrategy设为provider
    providers: [AuthService, LocalStrategy],
    })
    ```
2. `nest`会掉用`local`策略的`validate`方法，并将`user`（登录成功后获取到的用户信息）注入到`requeest`中去
    ```ts 
    @UseGuards(AuthGuard('local')) // 指定策略并使用
    @Post('/login')
    async login(@Request() req) {
        console.log('req.user', req.user);
        const data = await this.authService.login(req.user);
        return data;
    }
    ```
    -  `local`策略中的`validate`方法默认从请求体中的`username password`读取信息，可以`local`策略类中通过`super({usernameField: 'userName', passwordField: 'password',});`修改读取的key
    - 如果登录功能包含验证码等其他参数时，可以在`local`策略类中传递` super({passReqToCallback: true});`,在实例方法`validate`中可以获取到`request`参数`validate( request: Request,username: string,password: string)`，从而拿到其他参数
3. 借助`JwtService.sign(payload)`生成`jwt`返回给前端，同时将`JwtModule.register()`生成的`module`导入到使用的模块中去    
    ```ts 
     constructor(
        // 实例化jwtservice
        private readonly jwtService: JwtService,
    ) {}
    // 生成jwt
    this.jwtService.sign(payLoad),

    
    @Module({
    imports: [
        UsersModule,
        PassportModule,
        // 导入JwtModule 调用register方法
        JwtModule.register({
        secret: jwtConstants.secret, // 自定义的盐 生产环境中最好放在机密库、环境变量或配置服务等中去
        signOptions: { expiresIn: '60s' }, // 可以使用各种日期 "2 days", "10h", "7d"
        }),
    ],
    providers: [AuthService, LocalStrategy],
    exports: [AuthService],
    })
    ```
4. 借助`passport-jwt`继承`jwt.strategy`策略。然后将`JwtStrategy`设为`provider`
    ```ts 
    import { ExtractJwt, Strategy } from 'passport-jwt';
    import { PassportStrategy } from '@nestjs/passport';
    import { Injectable } from '@nestjs/common';
    import { jwtConstants } from './constants';

    @Injectable()
    export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            // 会从请求头中的Authorization提取token，token为 “Bearer tokenValue”
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: jwtConstants.secret, // JwtModule.register注册时使用功能的secret
        });
    }
    /**
    * 通过passport的内置守卫JwtAuthGuard触发jwt策略
    * Passport 验证Authorization后调用validate方法，并将payload当做参数传递进去
    * validate返回的数据会重新注入到request.user中去
    */
    async validate(payload: any) {
        return { userId: payload.sub, username: payload.username };
    }
    }

    //  新增JwtStrategy provider
    providers: [AuthService, LocalStrategy, JwtStrategy], 
    ```
5. 使用jwt守卫，获取`jwt.strategy`策略中的`validate()`注入的`request.user`
    ```ts
    
    @Controller('auth')
    export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @UseGuards(LocalAuthGuard) // local守卫生成token
    @Post('/login')
    async login(@Request() req) {
        console.log('req.user', req.user);
        const data = await this.authService.login(req.user);
        return data;
    }

    @UseGuards(JwtAuthGuard) // 使用jwt守卫 解析token
    @Get()
    findAll(@Request() req) {
        console.log(req.user); // req.user为jwtStrategy.validate()返回的数据

        return {
        code: 0,
        data: req.user,
        };
    }
    }
    ``` 

### passport-local

>借助`passport passport-local`，安装`@nestjs/passport passport passport-local @types/passport-local`这些包。

在登录接口中使用`passport-local`往`request`注入数据。

- 建立`user.service auth.service auth.module`
>auth/auth.service.ts
```ts 
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    //   借助usersService获取user
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
```
>auth/auth.module.ts 导入UsersModule，获取UsersService
```ts 
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

- 创建`passport-local`策略
>local.strategy
```ts 
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
// 继承PassportStrategy的local策略
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }
    // 实现validate方法，local策略中会将validate的返回值注入到request.user中
  async validate(username: string, password: string): Promise<any> {
    //   默认请求体的key是`username password`
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```
>auth.module
```ts 
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Module({
  // 导入PassportModule
  imports: [UsersModule, PassportModule],
  // 将LocalStrategy设为provider
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
```

创建完`LocalStrategy`并将`LocalStrategy`设为`provider`后，接下来需要借助`AuthGuard`使用`LocalStrategy`

>auth.controller

```ts 
import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local.strategy';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
//   @UseGuards(LocalAuthGuard)  // 直接将策略写好
  @UseGuards(AuthGuard('local')) // 指定策略
  @Post('/login')
  async login(@Request() req) {
    console.log('req.user', req.user);
    const data = await this.authService.login(req.user);
    return data;
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    console.log(req.user);

    return {
      code: 0,
      data: req.user,
    };
  }
}

```
>LocaLAuthGuard
```ts 
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

在`auth/login`方法中指定了`AuthGuard('local')`守卫，在访问`auth/login`路由时会`Passport`根据`LocalStrategy`的`validate`方法的返回值自动创建了一个`user`对象，并挂载在`resquest.user`上。

### passport-jwt
1. 生成jwt
>通过`local`策略的`validate`函数后，通过`passport-jwt`生成jwt

安装`@nestjs/jwt passport-jwt @types/passport-jwt`
修改`auth.service`

>auth.service
```ts 
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/controllers/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    // 实例化jwtservice
    private readonly jwtService: JwtService,
  ) {}
  async validateUser(userName: string, pass: string): Promise<any> {
    const user = await this.userService.findOne(userName);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
  async login(payLoad: any) {
    //  使用sign方法生成accessToken
    return {
      accessToken: this.jwtService.sign(payLoad),
    };
  }
```

将`JwtModule`导入到`auth.module`中去
>auth.module
```ts 
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // 导入JwtModule 调用register方法
    JwtModule.register({
      secret: jwtConstants.secret, // 自定义的盐 生产环境中最好放在机密库、环境变量或配置服务等中去
      signOptions: { expiresIn: '60s' }, // 可以使用各种日期 "2 days", "10h", "7d"
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

需改`auth.controller`，在登录中返回`token`、
```ts 
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('auth/login')
  async login(@Request() req) {
    //   返回token
    return this.authService.login(req.user);
  }
}
```

2. 使用jwt
对于需要`jwt`验证的接口，需要先创建`jwt策略`
>auth/jwt.strategy.ts
```ts 
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
        // 会从请求头中的Authorization提取token，token为 “Bearer tokenValue”
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret, // JwtModule.register注册时使用功能的secret
    });
  }
  /**
   * 通过passport的内置守卫JwtAuthGuard触发jwt策略
   * Passport 验证Authorization后调用validate方法，并将payload当做参数传递进去
   * validate返回的数据会重新注入到request.user中去
   */
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

在`auth.module`将`JwtStrategy`设为`provider`
>auth.module
```ts 
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  //  新增JwtStrategy provider
  providers: [AuthService, LocalStrategy, JwtStrategy], 
  exports: [AuthService],
})
export class AuthModule {}
```

对于受权限控制的路由，使用`@UseGuards(AuthGuard('jwt'))`
>auth.controller
```ts 
import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local.strategy';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req) {
    console.log('req.user', req.user);
    const data = await this.authService.login(req.user);
    return data;
  }

  @UseGuards(JwtAuthGuard) // 使用jwt守卫
  @Get()
  findAll(@Request() req) {
    console.log(req.user);

    return {
      code: 0,
      data: req.user,
    };
  }
}


/**
 * JwtAuthGuard：jwt守卫
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```