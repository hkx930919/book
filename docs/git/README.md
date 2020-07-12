# git 命令学习

## git 设置 user 信息

- `git config --local user.name 'xxx'`设置该仓库的 user 信息
- `git config --global user.name 'xxx'`设置该账户瞎所有的 user 信息
  当`local global`同时存在时，`local`的设置优先

## git add

- 对于已经在 git 管理的文件里，使用`-u`参数添加到暂存区。
- 一般使用`git add .`来添加所有的文件到暂存区

## git mv

将文件重命名，`git mv readme readme.md`，将`readme`文件重命名为`readme.md`

## git log

- 查看最近几次的提交，`git log -n5`
- 查看简洁信息，`git log --oneline`
- 查看所有分支，`git log --all`
- 图形方式查看，`git log --graph`
- 合在一起，`git log --oneline --all --graph`

## commit tree 和 blob 之间的关系

每次`commit`都会生成一个`commitId`，每次`commit`都会有个对应的`tree`,`tree`由`子tre`和`blob`组成，即文件夹和文件

- `git cat-file -t xxxid` 查看某个 id 的类型，是`commit tree blob`的一种
- `git cat-file -p xxxid` 查看某个 id 的内容，对于`blob`可以查看文件内容

## commit

- 修改最近一次 commit 的 msg，`git commit --amend`
- 修改之前的 commit msg，使用`git rebase -i commitId`，进入后修改。此处的`commitid`是想修改的 commit 的上一个`commitid`。
- 合并多个`commit`信息
