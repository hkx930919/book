# mysql

## 安装

[mysql 安装教程](https://blog.csdn.net/zhouzezhou/article/details/52446608)
[安装 community 版本](https://dev.mysql.com/downloads/installer/)

- 安装完毕配置环境变量，并启动服务：`net start mysql80`，关闭服务命令：`net stop mysql80`
  > `mysql80`是安装时起的名称，安装时可以修改该名称，启动服务时就要填写对应的名称即可。<br/> > `net`是 windows 下的命令
  > ，`net start serviceName`和`net stop serviceName`

## 登录

`mysql -u root -p` 输入密码:123456

## 查询 mysql 端口号

登入 mysql 后，输入`show global variables like 'port';`可以得到运行的 mysql 端口号
