---
sidebar: auto
---

# 一：jenkins+nginx 前端自动构建

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
