# jenkins+nginx 前端自动构建

## 1 准备工作

### 1.1 下载 jenkins

- 1 或得一台 linux 服务器，可以在阿里云或者腾讯云购买一台,系统选择 CentOS7.3 64 位。
- 2 安装 Jenkins 的前提需要安装 jdk,使用 yum 进行安装
  - 2.1 查看可安装的 java 版本 `yum -y list java*`
    ![java-list](~./images/java-list.png)
  - 2.2 选择安装 java1.8 64 位版本的 `yum install -y java-1.8.0-openjdk-devel.x86_64`
  - 2.3 `java -version` 查看已安装的 jdk 版本,当出现如下输出表示安装成功。最终被安装到`/usr/lib/jvm`目录中
    ![java-list](~./images/java-version.png)
  - 2.4 yum 安装的时候，会自动创建超链接，如果你自己下载包安装的话，这个超链接就需要你手动创建了。
    ```
    ln -s /home/java/jdk1.8.0_131/bin/java /usr/bin/java
    ```
- 3 yum 安装 Jenkins

  > yum 的 repos 中默认是没有 Jenkins 的，需要先将 Jenkins 存储库添加到 yum repos。

  ```
  sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo

  sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key

  ```

  - 3.1 `yum install jenkins`安装,输入 y，等待安装完成

- 4 修改 jenkins 配置文件

  - 4.1 默认情况 Jenkins 是使用 Jenkins 用户启动的，但这个用户目前系统并没有赋予权限，这里我们将启动用户修改为 root；另外 Jenkins 默认端口是 8080，这个跟 nginx 的默认端口冲突，我们也修改一下默认端口。

  - 4.2 `vi /etc/sysconfig/jenkins`打开 jenkins 配置文件，修改用户为 root,端口号为 8081
    ![java-list](~./images/jenkins-conf.png)
  - 4.3 `service jenkins start`启动 Jenkins 服务。出现 OK 后表示启动成功，在浏览器输入服务器 IP 地址:8081 打开 Jenkins 登录页面,进入登录页面后，Jenkins 提示我们需要输入超级管理员密码进行解锁。根据提示，我们可以在`/var/lib/jenkins/secrets/initialAdminPassword`文件里找到密码。输入`tail /var/lib/jenkins/secrets/initialAdminPassword`打开文件
  - 4.4 进入页面后，安装默认插件,注册账户，进入 Jenkins 主页面
    ![java-list](~./images/jenkins-plugin-install.png)
    ![java-list](~./images/jenkins-create-user.png)
    ![java-list](~./images/jenkins-home.png)

## 2 实现 git 钩子

我们向 github/码云等远程仓库 push 我们的代码时，jenkins 能知道我们提交了代码，这是自动构建自动部署的前提，钩子的实现原理是在远端仓库上配置一个 Jenkins 服务器的接口地址，当本地向远端仓库发起 push 时，远端仓库会向配置的 Jenkins 服务器的接口地址发起一个带参数的请求，jenkins 收到后开始工作。

- 2.1 打开刚创建的任务，选择配置，添加远程仓库地址，配置登录名及密码及分支。
  ![java-list](~./images/jenkins-git.png)
- 2.2 安装 Generic Webhook Trigger Plugin 插件（系统管理-插件管理-搜索 Generic Webhook Trigger Plugin）如果可选插件列表为空，点击高级标签页，替换升级站点的 URL 为：http://mirror.xmission.com/jenkins/updates/update-center.json并且点击提交和立即获取。
- 2.3 添加触发器</br>
  第 2 步安装的触发器插件功能很强大，可以根据不同的触发参数触发不同的构建操作，比如我向远程仓库提交的是 master 分支的代码，就执行代码部署工作，我向远程仓库提交的是某个 feature 分支，就执行单元测试，单元测试通过后合并至 dev 分支。灵活性很高，可以自定义配置适合自己公司的方案，这里方便演示我们不做任何条件判断，只要有提交就触发。在任务配置里勾选 Generic Webhook Trigger 即可

  ![java-list](~./images/jenkins-webhook.png)

- 2.4 仓库配置钩子 以 github 为例,进入仓库=>setting=>webhooks,
  - 2.4.1 Payload URL 的格式为`http://<User ID>:<API Token>@<Jenkins IP地址>:端口/generic-webhook-trigger/invoke`,
  - 2.4.2 userid 和 api token 在 jenkins 的系统管理-管理用户-admin-设置里,
  - 2.4.3 Secret 是 jenkins 里 userid 对应的密码
    ![java-list](~./images/jenkins-github-webhooks.png)
- 2.4 此时提交代码后，jenkins 也会开始一个任务,目前我们没有配置任务开始后让它做什么，所以默认它只会在你提交新代码后，将新代码拉取到 jenkins 服务器上。到此为止，git 钩子我们配置完成。

## 3 实现自动化构建

git push 触发钩子后，jenkins 就要开始工作了，自动化的构建任务可以有很多种，比如说安装升级依赖包，单元测试，e2e 测试，压缩静态资源，批量重命名等等，无论是 npm script 还是 webpack，gulp 之类的工作流，你之前在本地能做的，在这里同样可以做。

- 3.1 首先，和本地运行 npm script 一样，我们要想在 jenkins 里面执行 npm 命令，先要在 jenkins 里面配置 node 的环境，可以通过配置环境变量的方式引入 node，也可以通过安装插件的方式，这里使用了插件的方式，安装一下 nvm wrapper 这个插件。
- 3.2 打开刚刚的 jenkins 任务，点击配置里面的构建环境，勾选这个，并指定一个 node 版本。
  ![java-list](~./images/jenkins-autobuild.png)
- 3.3 点击构建，把要执行的命令输进去，多个命令使用&&分开。
  ![java-list](~./images/jenkins-build-shell.png)

## 4 实现自动化部署

自动化部署可能是我们最需要的功能了，公司就一台服务器，我们可以使用人工部署的方式，但是如果公司有 100 台服务器呢，人工部署就有些吃力了，而且一旦线上出了问题，回滚也很麻烦。所以这一节实现一下自动部署的功能。

1. 首先，先在 Jenkins 上装一个插件 Publish Over SSH，我们将通过这个工具实现服务器部署功能。
2. 在要部署代码的服务器上创建一个文件夹用于接收 Jenkins 传过来的代码，我在服务器上建了一个 testjenkins 的文件夹。
3. Jenkins 想要往服务器上部署代码必须登录服务器才可以，这里有两种登录验证方式，一种是 ssh 验证，一种是密码验证，就像你自己登录你的服务器，你可以使用 ssh 免密登录，也可以每次输密码登录，系统管理-系统设置里找到 Publish over SSH 这一项。
   重点参数说明：

   ```
    Passphrase：密码（key的密码，没设置就是空）
    Path to key：key文件（私钥）的路径
    Key：将私钥复制到这个框中(path to key和key写一个即可)
       SSH Servers 的配置：
    SSH Server Name：标识的名字（随便你取什么）
    Hostname：需要连接 ssh 的主机名或 ip 地址（建议 ip）
    Username：用户名
    Remote Directory：远程目录（上面第二步建的 testjenkins 文件夹的路径）

    高级配置：
    Use password authentication, or use a different key：勾选这个可以使用密码登录，不想配 ssh 的可以用这个先试试
    Passphrase / Password：密码登录模式的密码
    Port：端口（默认 22）
    Timeout (ms)：超时时间（毫秒）默认 300000
   ```

   配置完成后，点击 Test Configuration 测试一下是否可以连接上，如果成功会返回 success，失败会返回报错信息，根据报错信息改正即可。
   ![java-list](~./images/jenkins-ssh.png)

4. 接下来进入我们创建的任务，点击构建，增加 2 行代码，意思是将 dist 里面的东西打包成一个文件，因为我们要传输。

   ```
   cd dist&&
   tar -zcvf dist.tar.gz *
   ```

   ![java-list](~./images/jenkins-shh-step.png)

5. 点击构建后操作，增加构建后操作步骤，选择 send build artificial over SSH， 参数说明：

   ```
   Name:选择一个你配好的ssh服务器
   Source files ：写你要传输的文件路径
   Remove prefix ：要去掉的前缀，不写远程服务器的目录结构将和Source files写的一致
   Remote directory ：写你要部署在远程服务器的那个目录地址下，不写就是SSH Servers配置里默认远程目录
   Exec command ：传输完了要执行的命令，我这里执行了解压缩和解压缩完成后删除压缩包2个命令

   ```

   ![java-list](~./images/jenkins-push-run.png)

6. 现在当我们在本地将 Welcome to Your Vue.js App 修改为 Jenkins 后发出一个 git push，过一会就会发现我们的服务器上已经部署好了最新的代码

## 5 安裝 nginx

```
nginx -v  //输入查看
```

1. 安装 nginx

   ```
   yum install nginx //输入下载
   or
   yum install epel-release //如果上一步安装失败
   yum install nginx //再次下载
   ```

   ![java-list](~./images/nginx-install.png)

2. 安装完毕后,修改 nginx 配置
   ```
   nginx -t //查看配置文件地址
   cd /etc/nginx
   ls //可以看到 nginx.conf 配置文件
   ```
   ![java-list](~./images/nginx-config.png)
   ```
   // 编辑配置文件
   vim nginx.conf
   or
   yum install vim //如果没有可以安装vim 再次执行上步
   ```
3. 修改用户名和默认的存放地址

   > 修改配置 user 改成 root (服务器用户名 我的是 root)

   ![java-list](~./images/nginx-config-user.png)
   ![java-list](~./images/nginx-location.png)

## 6 安装 nginx 后配置 jenkins 配置

最后将 jenkins 项目配置改成如下,即可完成在该服务器的自动部署

```
npm config set registry http://registry.npm.taobao.org/ &&
npm install&&
npm run build &&
rm -rf /root/www/book-view/* &&
mv docs/.vuepress/dist/* /root/www/book-view
```

## 7 参考文章

[jenkins +nginx 搭建前端构建环境](https://juejin.im/post/5b371678f265da599f68dfa2)<br>
[实战笔记：Jenkins 打造强大的前端自动化工作流](https://juejin.im/post/5ad1980e6fb9a028c42ea1be)<br>
[在 linux 服务器上安装 Jenkins](https://www.jianshu.com/p/c517f09df025)<br>
[在 linux 服务器上安装 jdk](https://www.jianshu.com/p/10949f44ce9c)<br>
