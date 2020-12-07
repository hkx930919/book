# git 命令学习

## git 设置 user 信息

- `git config --local user.name 'xxx'`设置该仓库的 user 信息
- `git config --global user.name 'xxx'`设置该账户瞎所有的 user 信息
  当`local global`同时存在时，`local`的设置优先

## git add

- 对于已经在 git 管理的文件里，使用`-u`参数添加到暂存区。
- 一般使用`git add .`来添加所有的文件到暂存区

## mv rm

- 将文件重命名，`git mv readme readme.md`，将`readme`文件重命名为`readme.md`
- 将文件删除，`git rm <file>`，将`file`文件删除

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
- 合并多个且连续的`commit`信息，使用`git rebase -i commitId`，在要合并的 commit 使用`s`
- 合并不连续的 commit，也是使用`git rebase -i commitId`，只不过在编辑时，要手动调整不连续`commitid`的顺序。退出后使用`git rebase --continue`继续进入编辑状态

## diff

- 比较暂存区和 HEAD 之间的差异，使用`git diff --cached`，要加上`cached`参数
- 比较 暂存区 和 工作区 之间的差异，使用`git diff`会比较暂存区和工作区所有文件的差异。指定文件比较的命令是`git diff -- 文件的path`
- 比较两个分支的差异，`git diff branch1 branch2 -- <file>`，本质和比较两个 commit 的差异是一样的，分支的 HEAD 都是指向 commit。比较两个不同的 commit：`git diff commit1 commit2 -- <file>`

## reset checkout

- 将暂存区恢复到 HEAD，使用`git reset HEAD`，即清空暂存区的内容
- 将暂存区的某个文件恢复到 HEAD，使用`git reset HEAD -- <file>`，即清空暂存区指定文件的内容，将之前暂存区的修改纳入到工作区
- 清空工作区的内容，使用`git checkout -- <file>`
- git 历史回退，回退到某个 commit，丢弃一些 commit，`git reset --hard commitId`

## stash

- `git stash`存储工作区的内容，将工作区变的干净。
- 恢复`stash`的内容使用`git apply`，恢复`stash`的内容且`stash list`的这一项还存在，不会被删除
- `git stashi pop`，恢复`stash`的内容且删除恢复香的`stash`

## .gitignore

- 编写`.gitignore`文件时，注意`doc`和`doc/`的区别。`doc`包含`doc`文件和文件夹，而`doc/`只包含文件夹，不包含文件

## push pull fetch

- 推送本地所有的分支到远端，`git push remoteName --all`，有多个远端时，`push`要指定远端名称`git push remoteName`
- `git pull` `git fetch`都可以从远端拉取代码，不同的是`fetch`只是将远程代码拉取回来，而`pull`会将代码拉取回来后再和本地的分支做一个`merge`的操作

## 新建分支

- `git checkout -b branchName fromBranch` 从`fromBranch`创建`branchName`分支，并切换到`branchName`分支
