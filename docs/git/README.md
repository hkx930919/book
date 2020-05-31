# git 命令学习

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
