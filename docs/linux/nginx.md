# linux 安装 nginx

## 1 服务器安装 nginx

- 安装 ssh
  `yum install nginx`
- 启动 ssh
  `service nginx start`
- 设置开机运行
  `chkconfig nginx on`

## 2 nginx 默认配置

- nginx 的配置信息在`/etc/nginx/`目录下，`/etc/nginx/nginx.conf`文件是 nginx 的默认配置
  ![nginx-config]('./images/nginx-config.png')
- `nginx.conf`文件默认引入`/etc/nginx/conf.d`目录下的`*.conf`配置文件
  ![nginx_conf]('./images/nginx_conf.png')

## 3 server 虚拟机配置

在`/etc/nginx/conf.d`目录新建`hhh.conf`配置文件,配置虚拟机,配置信息要以 `;` 分号结尾

```sh
http{
  log_format  hhh   '$remote_addr（地址）  $remote_user [$time_local]（时间） "$request"（请求）'; # 格式化日志
  access_log  /var/log/nginx/access.log  hhh;# 日志存放地址
  server {

        listen       8081; #监听端口号
        listen       [::]:8081;
        server_name  www.hhh.abc; # 监听的域名,如果以该域名访问,那么会读取该配置文件
        location / {
            root    /data/www; # 静态文件存放地址
            index   index.html; # 首页
            rewrite ^(.*)\.ng$ /index.html; # 将以`.ng`结尾的文件重定向到首页
        }

        error_page 404 /404.html;
            location = /40x.html {
        }

        error_page 500 502 503 504 /50x.html;
            location = /50x.html {
        }
    }
}
```

## 4 反向代理

在`hhh.conf`配置文件,配置`upstream name_hosts`,在`server/location`配置`proxy_pass`
eg:

```sh
upstream other {
    server 118.89.106.129:80;
}
server {

    listen       8081;
    listen       [::]:8081;
    server_name  www.hhh.abc www.kkk.abc; # 监听的域名,如果以该域名访问,那么会读取该配置文件
    location / {
        root    /data/www;
        index   index.html;
        rewrite ^(.*)\.ng$ /index.html;
        proxy_pass http://other; # 反向代理到ohter host
        proxy_set_header Host www.hhh.abc; # 以www.hhh.abc访问118.89.106.129:80
    }

    error_page 404 /404.html;
        location = /40x.html {
    }

    error_page 500 502 503 504 /50x.html;
        location = /50x.html {
    }
}
```

![nginx_conf]('./images/nginx_反向代理.jpg')

## 5 负载均衡

在 upstream 配置多个 server,使用 weight 控制权重
![nginx_conf]('./images/nginx_负载均衡.png')
