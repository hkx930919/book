## 1 服务器按照 ssh 服务

- 安装 ssh
  `yum install openssh-server`
- 启动 ssh
  `service sshd start`
- 设置开机运行
  `chkconfig shhd on`

## 2 使用 ssh 连接服务器

输入命令`shh 用户名@ip地址`，例如输入`ssh root@192.168.1.4`

## 3 使用 config 批量管理多个 ssh

进入虚拟机后，`cd ~/.ssh/`切换进.ssh 文件夹，查看是否有`config`文件，如果没有，`touch config`新建 config 文件，编辑 config 文件，输入配置内容，如下所示：

```
<!-- 多个配置就输入多个 -->
Host "hkx" // 注意这里要用双引号，单引号获取不到
    HostName 192.168.1.4
    User root
    Port 22
Host "hkx1" // 注意这里要用双引号，单引号获取不到
    HostName 192.168.1.4
    User root
    Port 22

```

配置成功后，输入`ssh hkx(Host名称)`即可等同于`ssh root@192.168.1.4`一样的效果

## 4 ssh 免密登录

个人电脑生成公钥和私钥，将公钥放进服务器的`~/.ssh/authorized_keys` 文件中

windows 平台

- 1 windows 生成公钥私钥，借助 xshell6，点击`工具`=>`用户秘钥管理者`，点击`生成`，将文件保存下来
- 2 xshell6 中新建一个连接，输入名称、主机、端口号后，将`用户身份验证`的方法选为`Public Key`,输入用户名，选择刚生成的用户秘钥
- 2 在 linux 虚拟机中，在`~/.ssh/authorized_keys`中将公钥放进去即可免密登录

linux 平台

- 1 进入`~/.ssh/`文件夹，输入`ssh-keygen` 生成公钥和私钥
- 2 在服务器中中，打开`~/.ssh/authorized_keys`文件，将生成的公钥放进去
- 3 在本地的 linux 系统中，`ssh-add ~/.ssh/imooc_rsa`将私钥加载到 ssh 服务中去，即可免密登录

## 5 修改 ssh 端口号

编辑`/etc/ssh/sshd_confg`配置，可以同时监听多个端口。改完配置后，`service sshd restart`重启服务
